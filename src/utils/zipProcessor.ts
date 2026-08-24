import JSZip from 'jszip';
import { DocFile, TransformSettings, ZipMetadata, ProcessingProgress } from '../types';
import { formatMxdToMarkdown } from './mxdFormatter';

export const DEFAULT_SETTINGS: TransformSettings = {
  separator: '__',
  stripRootFolder: true,
  normalizeExtension: true,
  sanitizeCharacters: true,
  customPrefix: '',
  includeExtensions: ['.md', '.mdx', '.mxd', '.markdown'],
  includeImages: false,
  formatMxdToMd: true,
  replaceAssetLinks: true,
  assetPlaceholderType: 'named_banner',
  customPlaceholderUrl: 'https://placehold.co/650x320/e2e8f0/334155.png?text=Asset+Placeholder',
  stripImportsExports: true,
  convertJsxComponents: true,
};

/**
 * Checks if a filename or path has an allowed Markdown/MXD extension
 */
export function isTargetDocFile(path: string, allowedExtensions: string[]): boolean {
  // Ignore macOS hidden files like __MACOSX/ or .DS_Store
  if (path.includes('__MACOSX/') || path.startsWith('.') || path.includes('/.')) {
    return false;
  }
  const lower = path.toLowerCase();
  return allowedExtensions.some(ext => lower.endsWith(ext.toLowerCase()));
}

/**
 * Detects common root folder if all files in the archive share the same top directory
 * (Standard behavior for GitHub zip downloads e.g. "repo-name-main/...")
 */
export function detectCommonRoot(paths: string[]): string | null {
  if (paths.length === 0) return null;
  const firstPath = paths[0];
  const firstSlashIndex = firstPath.indexOf('/');
  if (firstSlashIndex === -1) return null;

  const candidateRoot = firstPath.substring(0, firstSlashIndex + 1);
  const allShareRoot = paths.every(p => p.startsWith(candidateRoot));
  return allShareRoot ? candidateRoot : null;
}

/**
 * Transforms an original relative path into a flat filename based on settings
 */
export function generateFlatFileName(
  originalPath: string,
  settings: TransformSettings,
  commonRoot: string | null
): { relativePath: string; newName: string; extension: string; originalExtension: string } {
  let cleanedPath = originalPath.replace(/\\/g, '/'); // normalize slashes

  // Strip root folder if configured and detected
  if (settings.stripRootFolder && commonRoot && cleanedPath.startsWith(commonRoot)) {
    cleanedPath = cleanedPath.substring(commonRoot.length);
  }

  // Remove leading slashes
  cleanedPath = cleanedPath.replace(/^\/+/, '');

  // Extract extension
  const lastDot = cleanedPath.lastIndexOf('.');
  let originalExtension = lastDot !== -1 ? cleanedPath.substring(lastDot) : '';
  let pathWithoutExt = lastDot !== -1 ? cleanedPath.substring(0, lastDot) : cleanedPath;

  // Split directory segments
  let segments = pathWithoutExt.split('/').filter(s => s.trim().length > 0);

  if (settings.sanitizeCharacters) {
    segments = segments.map(seg =>
      seg
        .replace(/[\s\t\n]+/g, '-')
        .replace(/[^a-zA-Z0-9_\-\.]/g, '')
    );
  }

  let finalBaseName = segments.join(settings.separator);
  if (settings.customPrefix.trim()) {
    finalBaseName = `${settings.customPrefix.trim()}${settings.separator}${finalBaseName}`;
  }

  // Normalize extension to .md if setting is on
  let finalExtension = originalExtension;
  if (
    settings.normalizeExtension &&
    ['.mdx', '.mxd', '.markdown'].includes(originalExtension.toLowerCase())
  ) {
    finalExtension = '.md';
  }

  const newName = `${finalBaseName}${finalExtension}`;

  return {
    relativePath: cleanedPath,
    newName,
    extension: finalExtension,
    originalExtension,
  };
}

/**
 * Extracts and parses a ZIP file buffer using a memory-safe stream pattern with progress updates
 */
export async function processZipFile(
  fileData: ArrayBuffer | Blob,
  fileName: string,
  settings: TransformSettings,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<{ files: DocFile[]; metadata: ZipMetadata; commonRoot: string | null }> {
  if (onProgress) {
    onProgress({
      stage: 'reading',
      processedCount: 0,
      totalCount: 1,
      percent: 5,
      message: `Reading ZIP archive "${fileName}"...`,
    });
  }

  // Yield to allow browser UI to render initial progress state
  await new Promise(resolve => setTimeout(resolve, 15));

  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(fileData);

  const allEntryPaths: string[] = [];
  const targetEntries: { path: string; entry: JSZip.JSZipObject }[] = [];

  loadedZip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir) {
      allEntryPaths.push(relativePath);
      if (isTargetDocFile(relativePath, settings.includeExtensions)) {
        targetEntries.push({ path: relativePath, entry: zipEntry });
      }
    }
  });

  const commonRoot = detectCommonRoot(allEntryPaths);
  const docFiles: DocFile[] = [];

  const totalTargets = targetEntries.length;
  let matchedCount = 0;
  let totalCalculatedSize = 0;
  let totalAssetsReplaced = 0;
  let totalMxdConverted = 0;

  if (onProgress) {
    onProgress({
      stage: 'extracting',
      processedCount: 0,
      totalCount: totalTargets,
      percent: 10,
      message: `Found ${totalTargets} documentation files. Processing stream...`,
    });
  }

  // Process files sequentially in chunks to avoid high memory spikes and GC lockup
  for (let i = 0; i < totalTargets; i++) {
    const { path: rawPath, entry: zipEntry } = targetEntries[i];
    matchedCount++;

    // Yield control periodically to let UI update and browser perform garbage collection on chunks
    if (i % 2 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const currentPercent = 10 + Math.round(((i + 1) / totalTargets) * 85);

    if (onProgress) {
      onProgress({
        stage: 'reformatting',
        currentFile: rawPath,
        processedCount: i + 1,
        totalCount: totalTargets,
        percent: currentPercent,
        message: `Processing (${i + 1}/${totalTargets}): ${rawPath}`,
      });
    }

    // Stream text content out of JSZip
    const rawContent = await zipEntry.async('text');
    const { relativePath, newName, extension, originalExtension } = generateFlatFileName(
      rawPath,
      settings,
      commonRoot
    );

    const isMxd = ['.mxd', '.mdx'].includes(originalExtension.toLowerCase());
    if (isMxd) {
      totalMxdConverted++;
    }

    // Reformat document and replace asset links with dummy placeholder values
    const { formattedContent, stats } = formatMxdToMarkdown(rawContent, {
      formatMxdToMd: settings.formatMxdToMd,
      replaceAssetLinks: settings.replaceAssetLinks,
      assetPlaceholderType: settings.assetPlaceholderType,
      customPlaceholderUrl: settings.customPlaceholderUrl,
      stripImportsExports: settings.stripImportsExports,
      convertJsxComponents: settings.convertJsxComponents,
    });

    totalAssetsReplaced += stats.assetLinksReplaced;

    const size = new Blob([formattedContent]).size;
    totalCalculatedSize += size;

    docFiles.push({
      id: rawPath,
      originalPath: rawPath,
      relativePath,
      newName,
      extension,
      originalExtension,
      size,
      rawContent,
      content: formattedContent,
      selected: true,
      isMxdConverted: isMxd,
      formatStats: stats,
    });
  }

  // Sort files logically by their new flattened name
  docFiles.sort((a, b) => a.newName.localeCompare(b.newName));

  const cleanBaseName = fileName.replace(/\.zip$/i, '');
  const dirName = commonRoot ? commonRoot.replace(/\/$/, '') : '';
  const metadata: ZipMetadata = {
    filename: fileName,
    repoName: cleanBaseName,
    directory: dirName,
    documentTitle: dirName ? `${cleanBaseName} (${dirName})` : cleanBaseName,
    totalFilesCount: allEntryPaths.length,
    matchedFilesCount: matchedCount,
    totalSize: totalCalculatedSize,
    totalAssetsReplaced,
    totalMxdConverted,
    extractedAt: new Date(),
  };

  if (onProgress) {
    onProgress({
      stage: 'complete',
      processedCount: totalTargets,
      totalCount: totalTargets,
      percent: 100,
      message: `Completed processing ${matchedCount} documentation files!`,
    });
  }

  return { files: docFiles, metadata, commonRoot };
}

/**
 * Re-applies transformation settings to already extracted files
 */
export function retransformFiles(
  files: DocFile[],
  settings: TransformSettings,
  commonRoot: string | null
): DocFile[] {
  const updated = files.map(file => {
    const { relativePath, newName, extension, originalExtension } = generateFlatFileName(
      file.originalPath,
      settings,
      commonRoot
    );

    const isMxd = ['.mxd', '.mdx'].includes(originalExtension.toLowerCase());

    const { formattedContent, stats } = formatMxdToMarkdown(file.rawContent, {
      formatMxdToMd: settings.formatMxdToMd,
      replaceAssetLinks: settings.replaceAssetLinks,
      assetPlaceholderType: settings.assetPlaceholderType,
      customPlaceholderUrl: settings.customPlaceholderUrl,
      stripImportsExports: settings.stripImportsExports,
      convertJsxComponents: settings.convertJsxComponents,
    });

    const size = new Blob([formattedContent]).size;

    return {
      ...file,
      relativePath,
      newName,
      extension,
      originalExtension,
      size,
      content: formattedContent,
      isMxdConverted: isMxd,
      formatStats: stats,
    };
  });

  // Check for filename collisions and deduplicate if any
  const nameCounts = new Map<string, number>();
  return updated.map(file => {
    let finalName = file.newName;
    const count = nameCounts.get(finalName) || 0;
    if (count > 0) {
      const lastDot = finalName.lastIndexOf('.');
      const base = lastDot !== -1 ? finalName.substring(0, lastDot) : finalName;
      const ext = lastDot !== -1 ? finalName.substring(lastDot) : '';
      finalName = `${base}-${count + 1}${ext}`;
    }
    nameCounts.set(file.newName, count + 1);
    return { ...file, newName: finalName };
  });
}

/**
 * Builds a flat ZIP file containing all selected renamed Markdown files with streaming memory optimization
 */
export async function buildFlattenedZip(
  files: DocFile[],
  onProgress?: (progress: ProcessingProgress) => void
): Promise<Blob> {
  const newZip = new JSZip();
  const selectedFiles = files.filter(f => f.selected);

  if (selectedFiles.length === 0) {
    throw new Error('No files selected to compile into ZIP');
  }

  for (const file of selectedFiles) {
    // Add directly to the root of the new ZIP (completely unnested flat structure)
    newZip.file(file.newName, file.content, { createFolders: false });
  }

  // Generate the zip blob with streamFiles enabled to minimize memory overhead
  return await newZip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
      streamFiles: true,
    },
    metadata => {
      if (onProgress) {
        onProgress({
          stage: 'compressing',
          currentFile: metadata.currentFile || undefined,
          processedCount: Math.round((metadata.percent / 100) * selectedFiles.length),
          totalCount: selectedFiles.length,
          percent: Math.round(metadata.percent),
          message: metadata.currentFile
            ? `Compressing ${metadata.currentFile} (${Math.round(metadata.percent)}%)`
            : `Generating flat ZIP archive (${Math.round(metadata.percent)}%)...`,
        });
      }
    }
  );
}

/**
 * Merges selected markdown documents into one concatenated markdown string
 * with page breaks for printing or direct conversion
 */
export function mergeMarkdownFiles(files: DocFile[]): string {
  const selected = files.filter(f => f.selected);
  if (selected.length === 0) return '';

  return selected
    .map((file, idx) => {
      const headerTitle = file.newName.replace(/\.md$/i, '').replace(/[_-]+/g, ' ');
      return `# Document ${idx + 1}: ${headerTitle}\n*Source Path: \`${file.relativePath}\`*\n\n---\n\n${file.content}\n\n<div style="page-break-after: always; break-after: page;"></div>\n\n`;
    })
    .join('\n');
}

