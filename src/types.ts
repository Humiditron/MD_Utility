import { FormatStats } from './utils/mxdFormatter';

export interface DocFile {
  id: string;
  originalPath: string;
  relativePath: string; // path after optional root strip
  newName: string;
  extension: string;
  originalExtension: string;
  size: number;
  rawContent: string; // original unparsed content
  content: string; // formatted markdown content (ready for parsing / PDF conversion)
  selected: boolean;
  isMxdConverted: boolean;
  formatStats: FormatStats;
}

export interface ProcessingProgress {
  stage: 'reading' | 'extracting' | 'reformatting' | 'compressing' | 'complete' | 'idle';
  currentFile?: string;
  processedCount: number;
  totalCount: number;
  percent: number;
  message: string;
}

export interface TransformSettings {
  separator: string; // '__', '_', '-', '--', '.'
  stripRootFolder: boolean; // strips GitHub repo top-level folder e.g. "repo-name-main/"
  normalizeExtension: boolean; // change .mdx / .mxd / .markdown to .md
  sanitizeCharacters: boolean; // replace spaces and special chars with safe dash/underscore
  customPrefix: string;
  includeExtensions: string[]; // ['.md', '.mdx', '.mxd', '.markdown']
  includeImages: boolean;
  // MXD formatting & asset replacement settings
  formatMxdToMd: boolean; // Reformat JSX/MXD syntax to standard markdown
  replaceAssetLinks: boolean; // Replace local/relative asset links with dummy placeholders
  assetPlaceholderType: 'named_banner' | 'image_banner' | 'text_badge' | 'custom';
  customPlaceholderUrl: string;
  stripImportsExports: boolean;
  convertJsxComponents: boolean;
}

export interface ZipMetadata {
  filename: string;
  totalFilesCount: number;
  matchedFilesCount: number;
  totalSize: number;
  totalAssetsReplaced: number;
  totalMxdConverted: number;
  extractedAt: Date;
}

