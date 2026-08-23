import React, { useState, useMemo } from 'react';
import {
  FileText,
  ArrowRight,
  Eye,
  Download,
  Copy,
  Check,
  Search,
  CheckSquare,
  Square,
  Wand2,
  Image,
  Filter
} from 'lucide-react';
import { DocFile } from '../types';

interface FileListProps {
  files: DocFile[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (selected: boolean) => void;
  onPreviewFile: (file: DocFile) => void;
  onDownloadSingle: (file: DocFile) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  onToggleSelect,
  onToggleSelectAll,
  onPreviewFile,
  onDownloadSingle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'mxd' | 'assets'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredFiles = useMemo(() => {
    let result = files;

    if (activeFilter === 'mxd') {
      result = result.filter(f => f.isMxdConverted || ['.mdx', '.mxd'].includes(f.originalExtension.toLowerCase()));
    } else if (activeFilter === 'assets') {
      result = result.filter(f => (f.formatStats?.assetLinksReplaced || 0) > 0);
    }

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(
      f =>
        f.originalPath.toLowerCase().includes(q) ||
        f.newName.toLowerCase().includes(q) ||
        f.relativePath.toLowerCase().includes(q)
    );
  }, [files, searchQuery, activeFilter]);

  const allSelected = files.length > 0 && files.every(f => f.selected);
  const someSelected = files.some(f => f.selected);
  const selectedCount = files.filter(f => f.selected).length;

  const mxdCount = files.filter(f => f.isMxdConverted || ['.mdx', '.mxd'].includes(f.originalExtension.toLowerCase())).length;
  const assetLinkFilesCount = files.filter(f => (f.formatStats?.assetLinksReplaced || 0) > 0).length;

  const handleCopyName = (file: DocFile) => {
    navigator.clipboard.writeText(file.newName);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-2xl overflow-hidden flex flex-col transition-all dark:ring-1 dark:ring-pink-500/10">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/70">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="select-all-btn"
            type="button"
            onClick={() => onToggleSelectAll(!allSelected)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-pink-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 rounded-xl shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-pink-500 dark:text-pink-400" />
            ) : someSelected ? (
              <div className="w-4 h-4 rounded bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs">
                -
              </div>
            ) : (
              <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
            <span>
              {selectedCount === files.length
                ? `All ${files.length} Selected`
                : `${selectedCount} of ${files.length} Selected`}
            </span>
          </button>

          {/* Quick Filters */}
          <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-950 p-1 rounded-xl border border-transparent dark:border-slate-800 text-xs">
            <button
              id="filter-all-btn"
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold border border-slate-300 dark:border-slate-700 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent'
              }`}
            >
              All ({files.length})
            </button>
            {mxdCount > 0 && (
              <button
                id="filter-mxd-btn"
                type="button"
                onClick={() => setActiveFilter('mxd')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  activeFilter === 'mxd'
                    ? 'bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 font-bold border border-pink-500/50 shadow-2xs'
                    : 'text-slate-600 dark:text-pink-400/80 hover:text-slate-900 dark:hover:text-pink-300 border border-transparent'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                MDX ({mxdCount})
              </button>
            )}
            {assetLinkFilesCount > 0 && (
              <button
                id="filter-assets-btn"
                type="button"
                onClick={() => setActiveFilter('assets')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  activeFilter === 'assets'
                    ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-yellow-300 font-bold border border-amber-500/50 shadow-2xs'
                    : 'text-slate-600 dark:text-yellow-300/80 hover:text-slate-900 dark:hover:text-yellow-200 border border-transparent'
                }`}
              >
                <Image className="w-3.5 h-3.5" />
                With Assets ({assetLinkFilesCount})
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-pink-400" />
          <input
            id="file-search-input"
            type="text"
            placeholder="Search path or renamed file..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-7 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-pink-500 dark:focus:border-pink-400 focus:ring-2 focus:ring-pink-500/20 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Files List / Table */}
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/90 dark:bg-slate-950/90 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-pink-300/80 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
              <th className="py-3 px-4 w-12 text-center">Sel</th>
              <th className="py-3 px-4">Original Nested Path</th>
              <th className="py-3 px-2 w-8 text-center"></th>
              <th className="py-3 px-4">Flattened & Renamed Output</th>
              <th className="py-3 px-4 w-44">Format & Asset Status</th>
              <th className="py-3 px-4 w-20 text-right">Size</th>
              <th className="py-3 px-4 w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
            {filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  No matching markdown documents found for this filter.
                </td>
              </tr>
            ) : (
              filteredFiles.map(file => {
                const isMxd = file.isMxdConverted || ['.mdx', '.mxd'].includes(file.originalExtension.toLowerCase());
                const assetsCount = file.formatStats?.assetLinksReplaced || 0;

                return (
                  <tr
                    key={file.id}
                    className={`hover:bg-pink-500/5 dark:hover:bg-slate-800/80 transition-colors ${
                      file.selected ? 'bg-white dark:bg-slate-900/90' : 'bg-slate-50/40 dark:bg-slate-950/40 opacity-60'
                    }`}
                  >
                    {/* Select Checkbox */}
                    <td className="py-3 px-4 text-center">
                      <button
                        id={`select-${file.id}`}
                        type="button"
                        onClick={() => onToggleSelect(file.id)}
                        className="text-slate-400 hover:text-pink-500 dark:hover:text-pink-400 focus:outline-none cursor-pointer"
                      >
                        {file.selected ? (
                          <CheckSquare className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-700" />
                        )}
                      </button>
                    </td>

                    {/* Original Path */}
                    <td className="py-3 px-4 max-w-[260px]">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                        <span
                          className="font-mono text-slate-600 dark:text-slate-300 truncate text-[12px]"
                          title={file.originalPath}
                        >
                          {file.relativePath || file.originalPath}
                        </span>
                      </div>
                    </td>

                    {/* Arrow */}
                    <td className="py-3 px-2 text-center text-slate-300 dark:text-slate-700">
                      <ArrowRight className="w-3.5 h-3.5 mx-auto text-pink-500 dark:text-pink-400" />
                    </td>

                    {/* New Renamed File Name */}
                    <td className="py-3 px-4 max-w-[300px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-cyan-900 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-900/60 px-2 py-0.5 rounded-md text-[12px] truncate">
                          {file.newName}
                        </span>
                        <button
                          id={`copy-name-${file.id}`}
                          type="button"
                          onClick={() => handleCopyName(file)}
                          title="Copy transformed filename"
                          className="text-slate-400 hover:text-pink-500 dark:hover:text-pink-400 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        >
                          {copiedId === file.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Format & Asset Status */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isMxd && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/30 px-2 py-0.5 rounded-full">
                            <Wand2 className="w-2.5 h-2.5 text-pink-500 dark:text-pink-400" />
                            MDX Formatted
                          </span>
                        )}
                        {assetsCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 dark:text-yellow-300 bg-amber-50 dark:bg-yellow-500/10 border border-amber-200 dark:border-yellow-500/30 px-2 py-0.5 rounded-full">
                            <Image className="w-2.5 h-2.5 text-amber-600 dark:text-yellow-400" />
                            {assetsCount} Asset {assetsCount === 1 ? 'Link' : 'Links'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">Clean Markdown</span>
                        )}
                      </div>
                    </td>

                    {/* Size */}
                    <td className="py-3 px-4 text-right font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                      {formatFileSize(file.size)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`preview-btn-${file.id}`}
                          type="button"
                          onClick={() => onPreviewFile(file)}
                          title="Inspect Markdown Preview & Conversion Details"
                          className="p-1.5 text-slate-500 hover:text-pink-500 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-500/20 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`download-single-btn-${file.id}`}
                          type="button"
                          onClick={() => onDownloadSingle(file)}
                          title="Download this single formatted .md file"
                          className="p-1.5 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 rounded-lg transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-3.5 px-5 bg-slate-50 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span>
          Showing {filteredFiles.length} of {files.length} document files
        </span>
        <span className="font-mono text-[11px] text-pink-600 dark:text-pink-400 font-semibold">
          Total output size: {formatFileSize(files.reduce((acc, f) => acc + (f.selected ? f.size : 0), 0))}
        </span>
      </div>
    </div>
  );
};
