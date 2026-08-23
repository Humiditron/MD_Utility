import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Printer,
  FileText,
  Download,
  BookOpen,
  Layers,
  Sparkles,
  Cpu,
  Loader2,
  FileCode,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DocFile } from '../types';
import { generateA4PdfFromDocuments, generateA4PdfFromElements, printHtmlSafely, buildStandaloneA4Html } from '../utils/pdfGenerator';

interface PdfExportModalProps {
  files: DocFile[];
  onClose: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({ files, onClose }) => {
  const selectedFiles = files.filter(f => f.selected);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // A4 Layout customization states
  const [pageMargin, setPageMargin] = useState<'standard' | 'compact' | 'roomy'>('standard');
  const [forcePageBreak, setForcePageBreak] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [includeCover, setIncludeCover] = useState(true);
  const [previewMode, setPreviewMode] = useState<'sheets' | 'flow'>('sheets');

  // Direct PDF Generation & Download state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ percent: number; message: string } | null>(null);
  const [statusNotification, setStatusNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Progressive streaming batch rendering state for large repositories
  const [renderedCount, setRenderedCount] = useState(Math.min(selectedFiles.length, 25));
  const [isRenderingAll, setIsRenderingAll] = useState(false);

  // Mount incrementally to protect DOM and browser memory
  useEffect(() => {
    if (renderedCount < selectedFiles.length) {
      const timer = setTimeout(() => {
        setRenderedCount(prev => Math.min(prev + 25, selectedFiles.length));
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [renderedCount, selectedFiles.length]);

  const getMarginMm = () => {
    switch (pageMargin) {
      case 'compact': return 10;
      case 'roomy': return 20;
      case 'standard':
      default: return 15;
    }
  };

  const getMarginClass = () => {
    switch (pageMargin) {
      case 'compact': return 'p-[10mm]';
      case 'roomy': return 'p-[20mm]';
      case 'standard':
      default: return 'p-[15mm]';
    }
  };

  /**
   * Generates and downloads a real .PDF binary file directly in browser
   */
  const handleDirectPdfDownload = async () => {
    setIsGeneratingPdf(true);
    setStatusNotification(null);
    setPdfProgress({ percent: 5, message: 'Initializing high-speed A4 PDF generator...' });

    try {
      if (selectedFiles.length === 0) {
        throw new Error('No selected files found to export as PDF');
      }

      // High-speed native vector PDF compilation
      const pdfBlob = await generateA4PdfFromDocuments(selectedFiles, {
        marginMm: getMarginMm(),
        includeCover,
        includeToc,
        pageBreakPerDoc: forcePageBreak,
        fileName: 'documentation-bundle-a4.pdf',
        onProgress: (percent, message) => {
          setPdfProgress({ percent, message });
        },
      });

      // Trigger automatic direct browser download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `docs-bundle-a4-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusNotification({
        type: 'success',
        message: `Successfully compiled and downloaded ${selectedFiles.length} files as an ISO A4 PDF!`,
      });
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      setStatusNotification({
        type: 'error',
        message: err?.message || 'Failed to generate PDF file. Please try browser print or HTML export.',
      });
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress(null);
    }
  };

  /**
   * Triggers browser print dialog using an isolated print iframe to bypass parent sandbox restrictions
   */
  const handlePrint = async () => {
    setStatusNotification(null);
    if (renderedCount < selectedFiles.length) {
      setIsRenderingAll(true);
      setRenderedCount(selectedFiles.length);
      await new Promise(resolve => setTimeout(resolve, 150));
      setIsRenderingAll(false);
    }

    try {
      const container = printAreaRef.current;
      if (container) {
        const printHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Documentation Bundle - A4</title>
            <style>
              @page { size: A4 portrait; margin: ${getMarginMm()}mm; }
              body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }
              .a4-sheet { page-break-before: always; break-before: page; margin-bottom: 20px; }
              .a4-sheet:first-child { page-break-before: auto; break-before: auto; }
              pre { background: #f8fafc; padding: 10px; border-radius: 4px; overflow-x: auto; }
              code { font-family: monospace; background: #f1f5f9; padding: 2px 4px; }
              blockquote { border-left: 3px solid #06b6d4; margin: 0; padding-left: 10px; color: #475569; }
            </style>
          </head>
          <body>
            ${container.innerHTML}
          </body>
          </html>
        `;
        await printHtmlSafely(printHtml);
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  /**
   * Downloads a standalone, offline-ready printable A4 HTML file
   */
  const handleDownloadStandaloneHtml = () => {
    const renderedArticles = selectedFiles.map((file, idx) => {
      return `
        <div style="font-family: monospace; font-size: 9pt; color: #0891b2; margin-bottom: 4px;">
          DOCUMENT ${idx + 1} OF ${selectedFiles.length} &bull; ${file.relativePath}
        </div>
        <h2 style="font-family: monospace; font-size: 14pt; margin: 0 0 12px 0;">${file.newName}</h2>
        <div class="content">${file.content}</div>
      `;
    });

    const html = buildStandaloneA4Html(selectedFiles, renderedArticles, {
      marginMm: getMarginMm(),
      includeCover,
      includeToc,
    });

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `printable-docs-a4-${new Date().toISOString().slice(0, 10)}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Merged markdown download
   */
  const handleDownloadCombinedMd = () => {
    const combinedContent = selectedFiles
      .map((file, idx) => {
        const title = file.newName.replace(/\.md$/i, '').replace(/[_-]+/g, ' ');
        return `# Document ${idx + 1}: ${title}\n\n*Original Path: \`${file.relativePath}\`*\n\n---\n\n${file.content}\n\n`;
      })
      .join('\n\n<div style="page-break-after: always; break-after: page;"></div>\n\n');

    const blob = new Blob([combinedContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'all-documents-a4-combined.md';
    link.click();
    URL.revokeObjectURL(url);
  };

  const displayedFiles = selectedFiles.slice(0, renderedCount);

  return (
    <div 
      id="pdf-export-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md transition-all animate-in fade-in duration-150 overflow-y-auto"
    >
      <div 
        id="pdf-export-modal-dialog"
        onClick={e => e.stopPropagation()}
        className="bg-slate-100 dark:bg-slate-900 rounded-2xl max-w-6xl w-full max-h-[92vh] sm:max-h-[90vh] my-auto flex flex-col shadow-2xl shadow-pink-950/30 border border-slate-200 dark:border-slate-800 dark:ring-1 dark:ring-pink-500/20 overflow-hidden animate-in fade-in zoom-in-95 duration-150 min-w-0 box-border"
      >
        {/* Dynamic @page CSS rule for exact A4 print size */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait;
              margin: ${getMarginMm()}mm;
            }
          `
        }} />

        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-950 print:hidden min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 bg-pink-500/10 text-pink-400 rounded-xl border border-pink-500/30 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                  A4 Print & Direct PDF Generator
                </h3>
                <span className="text-[10px] font-bold text-amber-700 dark:text-yellow-300 bg-amber-50 dark:bg-yellow-500/10 border border-amber-200 dark:border-yellow-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  ISO A4 (210 × 297 mm)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {selectedFiles.length} documentation files prepared for direct PDF download and printing
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Download Combined MD */}
            <button
              id="download-combined-md-btn"
              type="button"
              onClick={handleDownloadCombinedMd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              title="Download merged Markdown file with standard page break dividers"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Merged .MD</span>
            </button>

            {/* Download Standalone A4 HTML */}
            <button
              id="download-standalone-html-btn"
              type="button"
              onClick={handleDownloadStandaloneHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              title="Download standalone offline A4 HTML file"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Printable HTML</span>
            </button>

            {/* Browser Print with Safe Sandbox Bypass */}
            <button
              id="print-pdf-btn"
              type="button"
              onClick={handlePrint}
              disabled={isRenderingAll || isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-yellow-500/10 text-amber-600 dark:text-yellow-400 hover:text-amber-700 dark:hover:text-yellow-300 text-xs font-semibold rounded-xl border border-amber-500/70 dark:border-yellow-500/60 hover:border-amber-500 dark:hover:border-yellow-400 transition-all cursor-pointer whitespace-nowrap"
              title="Trigger browser print dialog (Save as PDF)"
            >
              {isRenderingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5 text-amber-500 dark:text-yellow-400" />
              )}
              <span>Browser Print</span>
            </button>

            {/* Direct PDF File Download (Primary) */}
            <button
              id="direct-pdf-download-btn"
              type="button"
              onClick={handleDirectPdfDownload}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-white dark:bg-slate-900 hover:bg-pink-50 dark:hover:bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 border border-pink-500 hover:border-pink-600 dark:hover:border-pink-400 disabled:border-slate-200 dark:disabled:border-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:bg-slate-100 dark:disabled:bg-slate-950 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating ({pdfProgress?.percent || 0}%)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download .PDF File</span>
                </>
              )}
            </button>

            <button
              id="close-pdf-modal-btn"
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              className="p-1.5 text-slate-400 hover:text-pink-500 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-500/20 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Generation Progress Bar */}
        {isGeneratingPdf && pdfProgress && (
          <div className="bg-cyan-50 dark:bg-cyan-950/50 border-b border-cyan-100 dark:border-cyan-900/60 px-4 py-2.5 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2.5 text-cyan-900 dark:text-cyan-300">
              <Loader2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-spin" />
              <span className="font-medium">{pdfProgress.message}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-36 bg-cyan-200/80 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-200"
                  style={{ width: `${pdfProgress.percent}%` }}
                />
              </div>
              <span className="font-mono font-bold text-cyan-700 dark:text-cyan-300">{pdfProgress.percent}%</span>
            </div>
          </div>
        )}

        {/* Status Notification */}
        {statusNotification && (
          <div className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
            statusNotification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900'
          }`}>
            <div className="flex items-center gap-2">
              {statusNotification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              )}
              <span>{statusNotification.message}</span>
            </div>
            <button
              onClick={() => setStatusNotification(null)}
              className="text-[11px] font-semibold underline hover:opacity-75 cursor-pointer ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* A4 Formatting Toolbar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300 print:hidden">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-200">A4 Margins:</span>
              <div className="inline-flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setPageMargin('compact')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    pageMargin === 'compact' ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Compact (10mm)
                </button>
                <button
                  type="button"
                  onClick={() => setPageMargin('standard')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    pageMargin === 'standard' ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Standard (15mm)
                </button>
                <button
                  type="button"
                  onClick={() => setPageMargin('roomy')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    pageMargin === 'roomy' ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Roomy (20mm)
                </button>
              </div>
            </div>

            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forcePageBreak}
                onChange={e => setForcePageBreak(e.target.checked)}
                className="w-3.5 h-3.5 text-cyan-600 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-950 focus:ring-cyan-500"
              />
              <span>Page break per document</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeCover}
                onChange={e => setIncludeCover(e.target.checked)}
                className="w-3.5 h-3.5 text-cyan-600 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-950 focus:ring-cyan-500"
              />
              <span>Cover page</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeToc}
                onChange={e => setIncludeToc(e.target.checked)}
                className="w-3.5 h-3.5 text-cyan-600 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-950 focus:ring-cyan-500"
              />
              <span>Table of contents</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setPreviewMode('sheets')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  previewMode === 'sheets' ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                A4 Sheets View
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('flow')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  previewMode === 'flow' ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Continuous Flow
              </button>
            </div>

            {renderedCount < selectedFiles.length && (
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                Streaming {renderedCount}/{selectedFiles.length} docs
              </span>
            )}
          </div>
        </div>

        {/* Printable & Scrollable Document Canvas */}
        <div
          ref={printAreaRef}
          className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-200/70 dark:bg-slate-950 text-slate-800 print:bg-white print:p-0"
        >
          {previewMode === 'sheets' ? (
            <div className="max-w-[210mm] mx-auto space-y-6 print:space-y-0">
              {/* Cover Sheet */}
              {includeCover && (
                <div
                  className={`a4-sheet ${getMarginClass()} bg-white flex flex-col justify-between border border-slate-200/80 rounded-sm shadow-sm print:border-none print:shadow-none print:rounded-none`}
                  style={{ minHeight: '297mm' }}
                >
                  <div className="space-y-6 pt-12">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-700 uppercase tracking-widest">
                      <Layers className="w-4 h-4" />
                      Compiled A4 Repository Docs
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                      Documentation Bundle
                    </h1>
                    <p className="text-sm text-slate-600 max-w-lg leading-relaxed">
                      Generated from {selectedFiles.length} Markdown and converted MDX documentation source files, flattened with full relative path mapping.
                    </p>
                  </div>

                  <div className="pt-12 border-t border-slate-200 space-y-2 text-xs text-slate-500 font-mono">
                    <div className="flex justify-between">
                      <span>Standard Paper Format:</span>
                      <strong className="text-slate-700">ISO A4 (210mm × 297mm)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Source Documents:</span>
                      <strong className="text-slate-700">{selectedFiles.length} files</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Compiled Date:</span>
                      <strong className="text-slate-700">{new Date().toLocaleDateString()}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Table of Contents Sheet */}
              {includeToc && (
                <div
                  className={`a4-sheet ${getMarginClass()} bg-white border border-slate-200/80 rounded-sm shadow-sm print:border-none print:shadow-none print:rounded-none`}
                  style={{ minHeight: '297mm', pageBreakBefore: 'always', breakBefore: 'page' }}
                >
                  <div className="border-b border-slate-200 pb-3 mb-6 flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-600" />
                      Table of Contents
                    </h2>
                    <span className="text-xs font-mono text-slate-400">
                      {selectedFiles.length} entries
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={file.id}
                        className="py-2 flex items-baseline justify-between gap-4 text-xs"
                      >
                        <div className="truncate font-mono">
                          <span className="text-slate-400 mr-2">#{String(idx + 1).padStart(2, '0')}</span>
                          <span className="font-semibold text-slate-800">{file.newName}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
                          {file.relativePath}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Individual Document Sheets */}
              {displayedFiles.map((file, index) => (
                <article
                  key={file.id}
                  className={`a4-sheet ${getMarginClass()} bg-white border border-slate-200/80 rounded-sm shadow-sm flex flex-col justify-between print:border-none print:shadow-none print:rounded-none ${
                    forcePageBreak ? 'print:break-before-page' : ''
                  }`}
                  style={{ minHeight: '297mm', pageBreakBefore: forcePageBreak ? 'always' : 'auto' }}
                >
                  <div className="space-y-6 flex-1">
                    {/* Header metadata band */}
                    <div className="border-b border-slate-200 pb-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-cyan-700">
                        <span className="font-bold">DOCUMENT {index + 1} OF {selectedFiles.length}</span>
                        <span className="text-slate-400 truncate max-w-[300px]">{file.relativePath}</span>
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 font-mono tracking-tight">
                        {file.newName}
                      </h2>
                    </div>

                    {/* Formatted Markdown Content */}
                    <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed text-slate-700 break-words [&_pre]:bg-slate-100 [&_pre]:border [&_pre]:border-slate-200/90 [&_pre]:p-3.5 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_code]:text-slate-800 [&_code]:font-mono [&_blockquote]:border-l-4 [&_blockquote]:border-cyan-500 [&_blockquote]:bg-slate-50 [&_blockquote]:py-2 [&_blockquote]:px-3.5 [&_blockquote]:rounded-r">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {file.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* A4 Sheet Running Footer (Pinned to page bottom) */}
                  <div className="pt-6 mt-auto border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>A4 Documentation Archive</span>
                    <span>Document #{index + 1}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            /* Continuous Flow View */
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-slate-200 p-8 sm:p-12 space-y-12 print:shadow-none print:border-none print:p-0">
              {displayedFiles.map((file, index) => (
                <article
                  key={file.id}
                  className="space-y-4 pt-6 border-t border-slate-200 first:border-0 first:pt-0"
                  style={{ pageBreakInside: 'avoid' }}
                >
                  <div className="space-y-1 border-b border-slate-100 pb-3">
                    <div className="flex items-center justify-between text-xs text-cyan-700 font-mono">
                      <span>DOCUMENT #{index + 1}</span>
                      <span className="text-slate-400">{file.relativePath}</span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 font-mono">
                      {file.newName}
                    </h2>
                  </div>

                  <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed text-slate-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {file.content}
                    </ReactMarkdown>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
