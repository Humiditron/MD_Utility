import React, { useState, useCallback } from 'react';
import {
  FileArchive,
  Download,
  FolderSync,
  RefreshCw,
  Printer,
  Sparkles,
  Layers,
  Info,
  CheckCircle,
  FileCheck2,
  Sliders,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Cpu,
  Github,
  Moon,
  Sun,
  Globe,
  Upload
} from 'lucide-react';
import { DocFile, TransformSettings, ZipMetadata, ProcessingProgress } from './types';
import {
  DEFAULT_SETTINGS,
  processZipFile,
  retransformFiles,
  buildFlattenedZip
} from './utils/zipProcessor';
import { resolveGitHubDirectory } from './utils/githubResolver';
import { useTheme } from './context/ThemeContext';
import { UploadZone } from './components/UploadZone';
import { GitHubUrlInput } from './components/GitHubUrlInput';
import { SettingsBar } from './components/SettingsBar';
import { FileList } from './components/FileList';
import { FilePreviewModal } from './components/FilePreviewModal';
import { PdfExportModal } from './components/PdfExportModal';
import { ProgressBar } from './components/ProgressBar';

export default function App() {
  const { isDark, toggleTheme } = useTheme();

  // Source selection: 'github' | 'zip'
  const [sourceMode, setSourceMode] = useState<'github' | 'zip'>('github');

  const [zipData, setZipData] = useState<{
    files: DocFile[];
    metadata: ZipMetadata;
    commonRoot: string | null;
    originalBuffer?: ArrayBuffer | Blob;
    sourceType?: 'zip' | 'github';
  } | null>(null);

  const [settings, setSettings] = useState<TransformSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompilingZip, setIsCompilingZip] = useState(false);
  const [activeProgress, setActiveProgress] = useState<ProcessingProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(true);

  // Modals
  const [previewFile, setPreviewFile] = useState<DocFile | null>(null);
  const [showPdfExport, setShowPdfExport] = useState(false);

  /**
   * Handle GitHub Directory URL Resolution
   */
  const handleResolveGitHub = useCallback(
    async (url: string, token?: string) => {
      setIsLoading(true);
      setErrorMessage(null);
      setActiveProgress({
        stage: 'reading',
        processedCount: 0,
        totalCount: 0,
        percent: 10,
        message: 'Connecting to GitHub API repository tree...',
      });

      try {
        const result = await resolveGitHubDirectory(url, settings, token, progress => {
          setActiveProgress(progress);
        });

        if (result.files.length === 0) {
          setErrorMessage(
            `No matching documentation files (${settings.includeExtensions.join(', ')}) were found at the specified GitHub directory.`
          );
          setIsLoading(false);
          setActiveProgress(null);
          return;
        }

        setZipData({
          files: result.files,
          metadata: result.metadata,
          commonRoot: result.commonRoot,
          sourceType: 'github',
        });
      } catch (err: any) {
        setErrorMessage(
          err?.message || 'Failed to resolve GitHub directory. Please check the URL and permissions.'
        );
      } finally {
        setIsLoading(false);
        setActiveProgress(null);
      }
    },
    [settings]
  );

  /**
   * Handle Local ZIP Archive Upload
   */
  const handleFileLoaded = useCallback(
    async (file: File | Blob, name: string) => {
      setIsLoading(true);
      setErrorMessage(null);
      setActiveProgress({
        stage: 'reading',
        processedCount: 0,
        totalCount: 1,
        percent: 5,
        message: `Opening archive "${name}"...`,
      });

      try {
        const buffer = file instanceof Blob ? await file.arrayBuffer() : file;
        const result = await processZipFile(buffer, name, settings, progress => {
          setActiveProgress(progress);
        });

        if (result.files.length === 0) {
          setErrorMessage(
            `No matching Markdown/MDX files (${settings.includeExtensions.join(', ')}) were found in "${name}".`
          );
          setIsLoading(false);
          setActiveProgress(null);
          return;
        }

        setZipData({
          files: result.files,
          metadata: result.metadata,
          commonRoot: result.commonRoot,
          originalBuffer: buffer,
          sourceType: 'zip',
        });
      } catch (err: any) {
        setErrorMessage(
          err?.message || 'Failed to parse ZIP file. Please ensure it is a valid zip archive.'
        );
      } finally {
        setIsLoading(false);
        setActiveProgress(null);
      }
    },
    [settings]
  );

  const handleSettingsChange = (newSettings: TransformSettings) => {
    setSettings(newSettings);
    if (zipData) {
      const updatedFiles = retransformFiles(
        zipData.files,
        newSettings,
        zipData.commonRoot
      );
      setZipData({
        ...zipData,
        files: updatedFiles,
      });
    }
  };

  const handleToggleSelect = (id: string) => {
    if (!zipData) return;
    const updated = zipData.files.map(f =>
      f.id === id ? { ...f, selected: !f.selected } : f
    );
    setZipData({ ...zipData, files: updated });
  };

  const handleToggleSelectAll = (selected: boolean) => {
    if (!zipData) return;
    const updated = zipData.files.map(f => ({ ...f, selected }));
    setZipData({ ...zipData, files: updated });
  };

  const handleDownloadSingle = (file: DocFile) => {
    const blob = new Blob([file.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.newName;
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    if (!zipData) return;
    const selectedFiles = zipData.files.filter(f => f.selected);
    if (selectedFiles.length === 0) {
      setErrorMessage('Please select at least one file to include in the ZIP.');
      return;
    }

    setIsCompilingZip(true);
    setActiveProgress({
      stage: 'compressing',
      processedCount: 0,
      totalCount: selectedFiles.length,
      percent: 0,
      message: `Starting compression for ${selectedFiles.length} files...`,
    });

    try {
      const zipBlob = await buildFlattenedZip(zipData.files, progress => {
        setActiveProgress(progress);
      });

      const baseName = zipData.metadata.filename.replace(/\.zip$/i, '');
      const downloadName = `${baseName}-flattened-md-docs.zip`;

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error generating new ZIP archive');
    } finally {
      setIsCompilingZip(false);
      setActiveProgress(null);
    }
  };

  const handleReset = () => {
    setZipData(null);
    setErrorMessage(null);
    setActiveProgress(null);
  };

  const selectedCount = zipData?.files.filter(f => f.selected).length || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header Navigation */}
      <header className="bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 shadow-xs dark:shadow-xl dark:shadow-pink-950/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center border border-pink-500/30">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  GitHub Docs Flattener
                </h1>
                <span className="text-[11px] font-bold text-pink-600 dark:text-pink-300 bg-pink-500/10 border border-pink-500/30 px-2.5 py-0.5 rounded-full shadow-2xs">
                  MDX &bull; MD &bull; A4 PDF
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Resolve GitHub directory URLs or ZIPs &bull; Flatten nested paths &bull; Export clean Markdown & A4 PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {zipData && (
              <>
                <button
                  id="print-pdf-top-btn"
                  type="button"
                  onClick={() => setShowPdfExport(true)}
                  disabled={selectedCount === 0}
                  className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-yellow-500/10 text-amber-600 dark:text-yellow-400 hover:text-amber-700 dark:hover:text-yellow-300 text-xs font-semibold rounded-xl border border-amber-500/70 dark:border-yellow-500/60 hover:border-amber-500 dark:hover:border-yellow-400 disabled:border-slate-200 dark:disabled:border-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-500 dark:text-yellow-400" />
                  A4 Print / Save PDF
                </button>

                <button
                  id="download-zip-top-btn"
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={isCompilingZip || selectedCount === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 hover:bg-pink-50 dark:hover:bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 border border-pink-500 hover:border-pink-600 dark:border-pink-500/80 dark:hover:border-pink-400 disabled:border-slate-200 dark:disabled:border-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:bg-slate-100 dark:disabled:bg-slate-950 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {isCompilingZip ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Streaming {activeProgress?.percent || 0}%
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      Download Flat ZIP ({selectedCount})
                    </>
                  )}
                </button>
              </>
            )}

            {/* Dark / Light Theme Toggle */}
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-pink-600 dark:hover:text-pink-400 border border-slate-200 dark:border-slate-700 hover:border-pink-500/50 transition-all cursor-pointer"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-yellow-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Real-time Streaming Progress Bar */}
        {activeProgress && (
          <ProgressBar
            progress={activeProgress}
            title={
              isLoading
                ? sourceMode === 'github'
                  ? 'Fetching & Streaming Documents from GitHub'
                  : 'Streaming & Decompressing ZIP Archive'
                : 'Packaging Output Flat ZIP Archive'
            }
          />
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/80 rounded-xl flex items-center justify-between text-sm text-rose-700 dark:text-rose-300 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 font-medium ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {!zipData ? (
          /* Step 1: Input Selection (GitHub Directory URL vs Local ZIP) */
          <div className="space-y-8 py-4">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Flatten GitHub Documentation for <span className="text-pink-600 dark:text-pink-400">MD to PDF</span> Conversion
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Provide a GitHub directory URL or upload a repository ZIP archive. We isolate all Markdown documents (<code className="font-mono text-xs text-cyan-700 dark:text-cyan-300 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">.md</code>, <code className="font-mono text-xs text-cyan-700 dark:text-cyan-300 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">.mdx</code>), flatten the directory tree into unambiguous path-based filenames, convert JSX/callouts, and format for pristine A4 PDF rendering.
              </p>
            </div>

            {/* Input Mode Switcher Tabs */}
            <div className="flex justify-center">
              <div className="inline-flex p-1 bg-slate-200/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner">
                <button
                  id="source-github-tab"
                  type="button"
                  onClick={() => setSourceMode('github')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    sourceMode === 'github'
                      ? 'bg-white dark:bg-slate-950 text-pink-600 dark:text-pink-400 border border-pink-500/70 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub Directory URL</span>
                </button>

                <button
                  id="source-zip-tab"
                  type="button"
                  onClick={() => setSourceMode('zip')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    sourceMode === 'zip'
                      ? 'bg-white dark:bg-slate-950 text-pink-600 dark:text-pink-400 border border-pink-500/70 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Repository ZIP</span>
                </button>
              </div>
            </div>

            {/* Active Input Panel */}
            {sourceMode === 'github' ? (
              <GitHubUrlInput onResolve={handleResolveGitHub} isLoading={isLoading} />
            ) : (
              <UploadZone
                onFileLoaded={handleFileLoaded}
                isLoading={isLoading}
                maxSizeBytes={100 * 1024 * 1024}
              />
            )}

            {/* Memory Stream Information Banner */}
            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400 shadow-sm dark:shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-900/60 flex-shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">Streaming Memory-Safe Pipeline</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Processes documents sequentially in chunks with automatic memory buffers to prevent browser RAM limits up to 100 MB.
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/80 flex-shrink-0">
                Streaming Active
              </span>
            </div>

            {/* Feature Workflow Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto pt-2">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-md space-y-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-900/60 text-cyan-700 dark:text-cyan-400 flex items-center justify-center font-bold text-xs font-mono">
                  01
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Direct URL or ZIP</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Pass any GitHub tree or docs URL directly, or drag and drop a zipped repo up to 100MB.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-md space-y-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-900/60 text-cyan-700 dark:text-cyan-400 flex items-center justify-center font-bold text-xs font-mono">
                  02
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Reformat MDX & JSX</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Transforms React/JSX tags into clean Markdown blockquotes, strips import statements, and replaces missing assets.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-md space-y-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-900/60 text-cyan-700 dark:text-cyan-400 flex items-center justify-center font-bold text-xs font-mono">
                  03
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Flatten & Rename</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Encodes folder nesting into single flattened filenames like <code className="font-mono text-[11px] text-cyan-700 dark:text-cyan-300 bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded">docs__api__auth.md</code>.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-md space-y-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-900/60 text-cyan-700 dark:text-cyan-400 flex items-center justify-center font-bold text-xs font-mono">
                  04
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">A4 PDF & Flat ZIP</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Export ready-to-print ISO A4 PDFs with table of contents or bundle into a flattened archive for converters.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Step 2: Loaded Archive / GitHub Repository Inspection & Actions */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Archive / Repo Summary Header Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-900/60 text-cyan-700 dark:text-cyan-400 flex items-center justify-center flex-shrink-0">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {zipData.metadata.filename}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 rounded-md font-medium">
                      {zipData.sourceType === 'github' ? 'GitHub API Tree' : 'Extracted Stream'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      <strong className="text-slate-900 dark:text-white">{zipData.files.length}</strong> doc files isolated
                    </span>
                    <span>•</span>
                    <span>
                      Total extracted:{' '}
                      <strong className="text-slate-900 dark:text-white">
                        {(zipData.metadata.totalSize / 1024).toFixed(1)} KB
                      </strong>
                    </span>
                    {zipData.files.some(f => (f.formatStats?.assetLinksReplaced || 0) > 0) && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {zipData.files.reduce((acc, f) => acc + (f.formatStats?.assetLinksReplaced || 0), 0)} asset placeholders
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  id="toggle-settings-btn"
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Renaming Rules</span>
                  {showSettings ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                <button
                  id="upload-different-btn"
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <FolderSync className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Load Different Repo</span>
                </button>
              </div>
            </div>

            {/* Transform Settings Configuration Panel */}
            {showSettings && (
              <SettingsBar
                settings={settings}
                onChange={handleSettingsChange}
                commonRoot={zipData.commonRoot}
                totalFound={zipData.files.length}
                totalAssetsReplaced={zipData.files.reduce(
                  (acc, f) => acc + (f.formatStats?.assetLinksReplaced || 0),
                  0
                )}
                totalMxdConverted={zipData.files.filter(
                  f => f.isMxdConverted || ['.mdx', '.mxd'].includes(f.originalExtension.toLowerCase())
                ).length}
              />
            )}

            {/* Interactive File Transformation Table */}
            <FileList
              files={zipData.files}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onPreviewFile={file => setPreviewFile(file)}
              onDownloadSingle={handleDownloadSingle}
            />

            {/* Bottom Floating/Sticky Action Bar for Quick Download */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md dark:shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <CheckCircle className="w-4 h-4 text-pink-600 dark:text-pink-400 flex-shrink-0" />
                <span>
                  <strong className="text-slate-900 dark:text-white">{selectedCount} of {zipData.files.length}</strong> Markdown files selected for output bundle.
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  id="print-pdf-bottom-btn"
                  type="button"
                  onClick={() => setShowPdfExport(true)}
                  disabled={selectedCount === 0}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-yellow-500/10 text-amber-600 dark:text-yellow-400 hover:text-amber-700 dark:hover:text-yellow-300 text-xs font-semibold rounded-xl border border-amber-500/70 dark:border-yellow-500/60 hover:border-amber-500 dark:hover:border-yellow-400 disabled:border-slate-200 dark:disabled:border-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-500 dark:text-yellow-400" />
                  A4 Print / Save PDF
                </button>

                <button
                  id="download-zip-bottom-btn"
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={isCompilingZip || selectedCount === 0}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-900 hover:bg-pink-50 dark:hover:bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 border border-pink-500 hover:border-pink-600 dark:hover:border-pink-400 disabled:border-slate-200 dark:disabled:border-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:bg-slate-100 dark:disabled:bg-slate-950 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {isCompilingZip ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating ZIP ({activeProgress?.percent || 0}%)
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Compile & Download Flat ZIP ({selectedCount} files)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={handleDownloadSingle}
        />
      )}

      {showPdfExport && zipData && (
        <PdfExportModal
          files={zipData.files}
          metadata={zipData.metadata}
          onClose={() => setShowPdfExport(false)}
        />
      )}
    </div>
  );
}
