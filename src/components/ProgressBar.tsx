import React from 'react';
import { Loader2, Sparkles, Wand2, FileArchive, CheckCircle2, Cpu, Github } from 'lucide-react';
import { ProcessingProgress } from '../types';

interface ProgressBarProps {
  progress: ProcessingProgress | null;
  title?: string;
  isIndeterminate?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  title,
  isIndeterminate = false,
}) => {
  if (!progress) return null;

  const getStageIcon = () => {
    switch (progress.stage) {
      case 'reading':
        return <Github className="w-4 h-4 text-cyan-500 animate-pulse" />;
      case 'extracting':
      case 'reformatting':
        return <Wand2 className="w-4 h-4 text-cyan-500 animate-spin" style={{ animationDuration: '3s' }} />;
      case 'compressing':
        return <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />;
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default:
        return <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />;
    }
  };

  const getStageBadge = () => {
    switch (progress.stage) {
      case 'reading':
        return 'Connecting & Reading';
      case 'extracting':
        return 'Downloading & Extracting';
      case 'reformatting':
        return 'Reformatting MDX & Assets';
      case 'compressing':
        return 'Compressing Output ZIP';
      case 'complete':
        return 'Finished';
      default:
        return 'Processing';
    }
  };

  const percent = Math.min(100, Math.max(0, progress.percent || 0));

  return (
    <div
      id="processing-progress-container"
      className="bg-white dark:bg-slate-900 border border-cyan-200/80 dark:border-cyan-900/60 rounded-2xl p-4 shadow-md dark:shadow-cyan-950/40 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 transition-all"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 rounded-xl flex items-center justify-center border border-cyan-100 dark:border-cyan-900/50">
            {getStageIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {title || 'Processing Documents Stream'}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800">
                {getStageBadge()}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
              {progress.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
            <Cpu className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Streaming Mode (Low RAM)</span>
          </div>

          <span className="font-mono text-xs font-bold text-slate-800 dark:text-white min-w-10 text-right">
            {isIndeterminate ? '--%' : `${percent}%`}
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/80 dark:border-slate-800">
        {isIndeterminate ? (
          <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full w-1/3 animate-[indeterminate_1.5s_infinite_linear]" />
        ) : (
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 rounded-full transition-all duration-300 ease-out shadow-xs"
            style={{ width: `${percent}%` }}
          />
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono">
        <span>
          {progress.processedCount > 0 && progress.totalCount > 0
            ? `Files processed: ${progress.processedCount} / ${progress.totalCount}`
            : 'Streaming chunks into memory buffer'}
        </span>
        {progress.currentFile && (
          <span className="truncate max-w-[280px] text-slate-500 dark:text-slate-400" title={progress.currentFile}>
            {progress.currentFile}
          </span>
        )}
      </div>
    </div>
  );
};
