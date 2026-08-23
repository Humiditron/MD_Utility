import React, { useState, useRef } from 'react';
import { Upload, FileArchive, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { generateDemoGitHubZip } from '../utils/demoData';

interface UploadZoneProps {
  onFileLoaded: (file: File | Blob, name: string) => void;
  isLoading: boolean;
  maxSizeBytes?: number;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFileLoaded,
  isLoading,
  maxSizeBytes = 100 * 1024 * 1024, // 100 MB default
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const validateAndProcess = (file: File) => {
    setErrorMessage(null);
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMessage('Please upload a valid .zip file from GitHub or your repository.');
      return;
    }

    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const limitMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
      setErrorMessage(`File size (${sizeMB} MB) exceeds the limit (${limitMB} MB).`);
      return;
    }

    onFileLoaded(file, file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcess(e.target.files[0]);
    }
  };

  const handleLoadDemo = async () => {
    setErrorMessage(null);
    try {
      const { blob, name } = await generateDemoGitHubZip();
      onFileLoaded(blob, name);
    } catch {
      setErrorMessage('Could not generate sample demo repository archive.');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div
        id="upload-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/40 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-400 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 shadow-sm dark:shadow-2xl'
        } ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-pink-500/10 dark:bg-pink-500/20 text-pink-500 dark:text-pink-400 flex items-center justify-center shadow-inner border border-pink-500/30 neon-glow-pink">
            <FileArchive className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              Drag & Drop your GitHub Docs <span className="text-pink-500 dark:text-pink-400">.ZIP</span> here
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Extracts and isolates all <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-cyan-700 dark:text-cyan-400 text-xs font-mono font-semibold">.md</code> & <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-pink-600 dark:text-pink-400 text-xs font-mono font-semibold">.mdx</code> files, renames them with their full path, and flattens directory nesting.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Client-side extraction
            </span>
            <span>•</span>
            <span>Supports up to 100 MB ZIP</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-yellow-400">Zero server upload</span>
          </div>

          <div className="pt-2">
            <button
              id="browse-files-btn"
              type="button"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-900 hover:bg-pink-50 dark:hover:bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 border border-pink-500 hover:border-pink-600 dark:hover:border-pink-400 text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Browse ZIP Archive
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2.5 text-sm text-rose-700 dark:text-rose-400 animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Instant Demo Option */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-xs text-slate-500 dark:text-slate-400">Want to test right now?</span>
        <button
          id="load-demo-btn"
          type="button"
          onClick={handleLoadDemo}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-yellow-500/10 text-amber-600 dark:text-yellow-400 hover:text-amber-700 dark:hover:text-yellow-300 text-xs font-semibold rounded-xl border border-amber-500/70 dark:border-yellow-500/60 hover:border-amber-500 dark:hover:border-yellow-400 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-yellow-400" />
          Load Sample GitHub Docs ZIP
        </button>
      </div>
    </div>
  );
};
