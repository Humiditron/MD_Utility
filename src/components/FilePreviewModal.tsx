import React, { useState, useEffect } from 'react';
import { X, Copy, Check, FileText, Code2, Download, Wand2, Image, Sparkles, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DocFile } from '../types';

interface FilePreviewModalProps {
  file: DocFile | null;
  onClose: () => void;
  onDownload: (file: DocFile) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  onDownload,
}) => {
  const [viewMode, setViewMode] = useState<'rendered' | 'formatted_raw' | 'original_raw'>('rendered');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!file) return null;

  const handleCopy = () => {
    const textToCopy = viewMode === 'original_raw' ? (file.rawContent || file.content) : file.content;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMdx = file.isMxdConverted || ['.mdx', '.mxd'].includes(file.originalExtension.toLowerCase());
  const stats = file.formatStats;
  const hasFormattingModifications = isMdx || (stats && (stats.assetLinksReplaced > 0 || stats.jsxElementsConverted > 0 || stats.importsExportsRemoved > 0));

  return (
    <div 
      id="file-preview-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md transition-all animate-in fade-in duration-150 overflow-y-auto"
    >
      <div 
        id="file-preview-modal-dialog"
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[92vh] sm:max-h-[90vh] my-auto flex flex-col shadow-2xl shadow-pink-950/30 border border-slate-200 dark:border-slate-800 dark:ring-1 dark:ring-pink-500/20 overflow-hidden animate-in fade-in zoom-in-95 duration-150 min-w-0 box-border"
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/90 min-w-0">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="font-mono text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-full" title={file.newName}>
                {file.newName}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-semibold shrink-0">
                {file.extension}
              </span>
              {isMdx && (
                <span className="text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 font-semibold flex items-center gap-1 border border-pink-500/30 shadow-xs shrink-0">
                  <Wand2 className="w-3 h-3 text-pink-500 dark:text-pink-400" /> Converted MDX
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-mono truncate max-w-full" title={file.originalPath}>
              Original: {file.originalPath}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="inline-flex items-center bg-slate-200/80 dark:bg-slate-950 p-0.5 rounded-xl border border-transparent dark:border-slate-800 text-xs shrink-0">
              <button
                id="view-rendered-tab"
                type="button"
                onClick={() => setViewMode('rendered')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'rendered'
                    ? 'bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 font-bold border border-pink-500/50 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent'
                }`}
              >
                <FileText className="w-3.5 h-3.5 inline mr-1" />
                <span className="hidden sm:inline">Rendered Preview</span>
                <span className="sm:hidden">Preview</span>
              </button>
              <button
                id="view-raw-tab"
                type="button"
                onClick={() => setViewMode('formatted_raw')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'formatted_raw'
                    ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 font-bold border border-cyan-500/50 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 inline mr-1" />
                <span>Clean .md</span>
              </button>
              {file.rawContent && (
                <button
                  id="view-original-tab"
                  type="button"
                  onClick={() => setViewMode('original_raw')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                    viewMode === 'original_raw'
                      ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-yellow-300 font-bold border border-amber-500/50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent'
                  }`}
                  title="View original unformatted raw source"
                >
                  <History className="w-3.5 h-3.5 inline mr-1" />
                  <span className="hidden sm:inline">Original Raw</span>
                  <span className="sm:hidden">Raw</span>
                </button>
              )}
            </div>

            <button
              id="modal-copy-btn"
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              id="modal-download-btn"
              type="button"
              onClick={() => onDownload(file)}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-pink-50 dark:hover:bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 border border-pink-500 hover:border-pink-600 dark:hover:border-pink-400 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <button
              id="modal-close-btn"
              type="button"
              onClick={onClose}
              title="Close Preview (Esc)"
              className="p-1.5 text-slate-400 hover:text-pink-500 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-500/20 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-pink-500/30 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formatting & Asset Stats Banner */}
        {hasFormattingModifications && stats && (
          <div className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs min-w-0">
            <div className="flex items-center gap-2 text-pink-600 dark:text-pink-300 font-semibold shrink-0">
              <Sparkles className="w-4 h-4 text-pink-500 dark:text-pink-400" />
              <span>Format Transformations Applied:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 min-w-0">
              {stats.assetLinksReplaced > 0 && (
                <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-yellow-500/40 font-semibold text-amber-800 dark:text-yellow-300 text-[11px] shadow-xs whitespace-nowrap">
                  <Image className="w-3.5 h-3.5 text-amber-600 dark:text-yellow-400" />
                  {stats.assetLinksReplaced} asset placeholder{stats.assetLinksReplaced > 1 ? 's' : ''}
                </span>
              )}
              {stats.jsxElementsConverted > 0 && (
                <span className="inline-flex items-center gap-1 bg-pink-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-pink-200 dark:border-pink-500/40 font-semibold text-pink-600 dark:text-pink-300 text-[11px] shadow-xs whitespace-nowrap">
                  <Wand2 className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400" />
                  {stats.jsxElementsConverted} JSX blocks &rarr; Markdown
                </span>
              )}
              {stats.importsExportsRemoved > 0 && (
                <span className="inline-flex items-center gap-1 bg-cyan-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-cyan-200 dark:border-cyan-500/40 font-semibold text-cyan-800 dark:text-cyan-300 text-[11px] shadow-xs whitespace-nowrap">
                  {stats.importsExportsRemoved} JS imports stripped
                </span>
              )}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 bg-white dark:bg-slate-900 min-w-0 max-w-full">
          {viewMode === 'rendered' ? (
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed space-y-4 break-words [overflow-wrap:anywhere] [word-break:break-word] [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_code]:break-all [&_table]:overflow-x-auto [&_table]:block [&_table]:max-w-full">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {file.content}
              </ReactMarkdown>
            </div>
          ) : viewMode === 'formatted_raw' ? (
            <pre className="font-mono text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-pre-wrap break-all leading-5 max-w-full">
              {file.content}
            </pre>
          ) : (
            <pre className="font-mono text-xs text-amber-800 dark:text-yellow-300 bg-amber-50/50 dark:bg-slate-950 p-4 rounded-xl border border-amber-200 dark:border-yellow-500/30 overflow-x-auto whitespace-pre-wrap break-all leading-5 max-w-full">
              {file.rawContent || file.content}
            </pre>
          )}
        </div>

        {/* Modal Footer with Close Button */}
        <div className="p-3 sm:p-3.5 px-4 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between min-w-0 gap-3">
          <span className="text-xs text-slate-500 font-mono truncate">
            {file.newName} &bull; {(file.size / 1024).toFixed(1)} KB
          </span>
          <button
            id="modal-bottom-close-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-pink-500 hover:text-white dark:hover:bg-pink-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 whitespace-nowrap"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
