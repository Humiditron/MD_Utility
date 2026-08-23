import { jsPDF } from 'jspdf';
import { toJpeg, toPng } from 'html-to-image';
import { DocFile } from '../types';

export interface PdfGenerationOptions {
  pageSize?: 'a4';
  marginMm?: number;
  fileName?: string;
  onProgress?: (percent: number, message: string) => void;
}

/**
 * Directly compiles rendered DOM elements into a downloadable A4 PDF blob
 * Uses browser-native SVG foreignObject rasterization via html-to-image
 * to avoid any CSS color parsing errors (e.g. oklch, lab, color-mix in Tailwind v4).
 */
export async function generateA4PdfFromElements(
  elements: HTMLElement[],
  options: PdfGenerationOptions = {}
): Promise<Blob> {
  const { marginMm = 15, onProgress } = options;

  onProgress?.(5, 'Initializing A4 PDF engine...');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth = 210; // A4 width in mm
  const pdfHeight = 297; // A4 height in mm

  const totalElements = elements.length;

  for (let i = 0; i < totalElements; i++) {
    const el = elements[i];
    const progressPercent = 10 + Math.round(((i + 1) / totalElements) * 85);
    onProgress?.(
      progressPercent,
      `Rasterizing page ${i + 1} of ${totalElements}...`
    );

    // Rasterize using html-to-image to support modern colors & fonts
    let imgData: string;
    try {
      imgData = await toJpeg(el, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2, // 2x crisp DPI for text & code
        cacheBust: false,
        filter: (node: HTMLElement) => {
          // Exclude anything with print:hidden if present
          if (node?.classList && typeof node.classList.contains === 'function') {
            return !node.classList.contains('print:hidden');
          }
          return true;
        },
      });
    } catch (renderError) {
      console.warn(`Fallback to PNG rendering for page ${i + 1}`, renderError);
      imgData = await toPng(el, {
        backgroundColor: '#ffffff',
        pixelRatio: 1.5,
      });
    }

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    // Create a temporary image to accurately read raster pixel dimensions
    const imgDims = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: el.offsetWidth || 800, height: el.offsetHeight || 1130 });
      img.src = imgData;
    });

    const contentWidth = pdfWidth - marginMm * 2;
    const renderedHeight = (imgDims.height * contentWidth) / imgDims.width;

    if (renderedHeight <= pdfHeight - marginMm * 2 + 5) {
      // Fits neatly on a single A4 page
      pdf.addImage(
        imgData,
        'JPEG',
        marginMm,
        marginMm,
        contentWidth,
        Math.min(renderedHeight, pdfHeight - marginMm * 2),
        undefined,
        'FAST'
      );
    } else {
      // Multi-page slicing if content spans beyond a single A4 page
      let heightLeft = renderedHeight;
      let pageOffset = 0;

      while (heightLeft > 0) {
        if (pageOffset > 0) {
          pdf.addPage('a4', 'portrait');
        }

        pdf.addImage(
          imgData,
          'JPEG',
          marginMm,
          marginMm - pageOffset,
          contentWidth,
          renderedHeight,
          undefined,
          'FAST'
        );

        const pageAvailableHeight = pdfHeight - marginMm * 2;
        heightLeft -= pageAvailableHeight;
        pageOffset += pageAvailableHeight;
      }
    }
  }

  onProgress?.(98, 'Packaging final PDF binary...');
  const pdfBlob = pdf.output('blob');
  onProgress?.(100, 'PDF generation complete!');

  return pdfBlob;
}

/**
 * Triggers safe printing via an isolated hidden iframe, ensuring print works inside parent sandboxes/iframes
 */
export function printHtmlSafely(htmlContent: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';

      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc || !iframe.contentWindow) {
        window.print();
        resolve(true);
        return;
      }

      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch {
          window.print();
          resolve(false);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }
      }, 350);
    } catch {
      window.print();
      resolve(false);
    }
  });
}

/**
 * Generates standalone, offline-ready printable A4 HTML file with standard RGB colors
 */
export function buildStandaloneA4Html(
  files: DocFile[],
  renderedHtmlList: string[],
  options: { marginMm: number; includeToc: boolean; includeCover: boolean }
): string {
  const { marginMm, includeToc, includeCover } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Documentation Bundle - ISO A4</title>
  <style>
    @page {
      size: A4 portrait;
      margin: ${marginMm}mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .a4-page {
      width: 210mm;
      min-height: 297mm;
      padding: ${marginMm}mm;
      margin: 0 auto 20px auto;
      background: #ffffff;
      page-break-before: always;
      break-before: page;
      border: 1px solid #e2e8f0;
    }
    .a4-page:first-child {
      page-break-before: auto;
      break-before: auto;
    }
    @media print {
      body {
        width: 100%;
        margin: 0;
        padding: 0;
      }
      .a4-page {
        width: 100%;
        min-height: auto;
        padding: 0;
        margin: 0;
        border: none;
      }
    }
    h1, h2, h3, h4, h5, h6 {
      color: #0f172a;
      font-weight: 700;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      line-height: 1.3;
    }
    h1 { font-size: 20pt; }
    h2 { font-size: 16pt; }
    h3 { font-size: 13pt; }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9.5pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 5px;
      border-radius: 4px;
    }
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 16px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 9pt;
      line-height: 1.45;
    }
    pre code {
      background: transparent;
      padding: 0;
      color: #f8fafc;
    }
    blockquote {
      border-left: 4px solid #6366f1;
      padding-left: 14px;
      margin-left: 0;
      color: #475569;
      font-style: italic;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 10pt;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
    }
    .header-tag {
      font-size: 9pt;
      color: #4f46e5;
      font-family: monospace;
      margin-bottom: 4px;
    }
    .footer-tag {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 8.5pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  ${includeCover ? `
    <div class="a4-page" style="display: flex; flex-direction: column; justify-content: space-between;">
      <div style="margin-top: 40px;">
        <div style="font-size: 11pt; color: #4f46e5; font-weight: bold; font-family: monospace; letter-spacing: 2px;">
          DOCUMENTATION ARCHIVE
        </div>
        <h1 style="font-size: 28pt; margin-top: 15px; margin-bottom: 10px; color: #0f172a;">
          Compiled Documentation Bundle
        </h1>
        <p style="color: #64748b; font-size: 12pt;">
          Flattened and reformatted from ${files.length} source documents.
        </p>
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 9pt; color: #64748b; font-family: monospace;">
        <div>Paper Format: ISO A4 (210mm × 297mm)</div>
        <div>Total Documents: ${files.length} files</div>
        <div>Generated: ${new Date().toLocaleDateString()}</div>
      </div>
    </div>
  ` : ''}

  ${includeToc ? `
    <div class="a4-page">
      <h2 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; color: #0f172a;">
        Table of Contents (${files.length} items)
      </h2>
      <ul style="list-style: none; padding-left: 0;">
        ${files.map((f, i) => `
          <li style="padding: 6px 0; border-bottom: 1px dashed #f1f5f9; display: flex; justify-content: space-between; font-size: 10pt;">
            <span><strong>#${i + 1}</strong> &nbsp; ${f.newName}</span>
            <span style="color: #94a3b8; font-family: monospace;">${f.relativePath}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  ` : ''}

  ${files.map((file, idx) => `
    <article class="a4-page">
      <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px;">
        <div class="header-tag">DOCUMENT ${idx + 1} OF ${files.length} &bull; ${file.relativePath}</div>
        <h2 style="margin: 0; font-family: monospace; font-size: 14pt; color: #0f172a;">${file.newName}</h2>
      </div>
      <div class="content">
        ${renderedHtmlList[idx] || ''}
      </div>
      <div class="footer-tag">
        <span>A4 Documentation Bundle</span>
        <span>Document #${idx + 1}</span>
      </div>
    </article>
  `).join('')}
</body>
</html>`;
}
