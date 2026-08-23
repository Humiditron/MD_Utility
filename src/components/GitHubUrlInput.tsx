import React, { useState, useMemo } from 'react';
import {
  Github,
  ArrowRight,
  FolderGit2,
  GitBranch,
  Folder,
  Key,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { parseGitHubUrl } from '../utils/githubResolver';

interface GitHubUrlInputProps {
  onResolve: (url: string, token?: string) => void;
  isLoading: boolean;
}

interface PresetDoc {
  name: string;
  url: string;
  description: string;
  badge: string;
}

const PRESET_DOCS: PresetDoc[] = [
  {
    name: 'React',
    url: 'https://github.com/facebook/react/tree/main/fixtures/packaging',
    description: 'React core documentation & guides',
    badge: 'react/tree/main/fixtures/packaging',
  },
  {
    name: 'FastAPI',
    url: 'https://github.com/fastapi/fastapi/tree/master/docs/en/docs',
    description: 'FastAPI Python framework markdown docs',
    badge: 'fastapi/tree/master/docs/en/docs',
  },
  {
    name: 'Vite',
    url: 'https://github.com/vitejs/vite/tree/main/docs',
    description: 'Vite modern frontend tooling docs',
    badge: 'vitejs/vite/tree/main/docs',
  },
  {
    name: 'Redux Toolkit',
    url: 'https://github.com/reduxjs/redux-toolkit/tree/master/docs',
    description: 'Official Redux docs & API references',
    badge: 'reduxjs/redux-toolkit/tree/master/docs',
  },
  {
    name: 'Zod',
    url: 'https://github.com/colinhacks/zod',
    description: 'TypeScript-first schema validation library',
    badge: 'colinhacks/zod',
  },
];

export const GitHubUrlInput: React.FC<GitHubUrlInputProps> = ({
  onResolve,
  isLoading,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [token, setToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const parsedInfo = useMemo(() => {
    if (!urlInput.trim()) return null;
    return parseGitHubUrl(urlInput);
  }, [urlInput]);

  const handleFetch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInputError(null);

    const trimmed = urlInput.trim();
    if (!trimmed) {
      setInputError('Please enter a GitHub repository or directory URL.');
      return;
    }

    const parsed = parseGitHubUrl(trimmed);
    if (!parsed) {
      setInputError(
        'Invalid GitHub format. Examples: "https://github.com/owner/repo/tree/main/docs" or "owner/repo"'
      );
      return;
    }

    onResolve(trimmed, token.trim() || undefined);
  };

  const handleSelectPreset = (presetUrl: string) => {
    setUrlInput(presetUrl);
    setInputError(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <form
        onSubmit={handleFetch}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-2xl transition-all space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center border border-pink-500/30">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Resolve GitHub Directory URL
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Directly import nested <code className="font-mono text-cyan-700 dark:text-cyan-400">.md</code> & <code className="font-mono text-pink-600 dark:text-pink-400">.mdx</code> documents from any public or private GitHub repo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-pink-300 hover:text-pink-600 dark:hover:text-pink-400 font-medium transition-colors cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400" />
            <span>{showTokenInput ? 'Hide Token' : 'Add Token (Optional)'}</span>
            {showTokenInput ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Input Bar */}
        <div className="relative flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <input
              id="github-url-input"
              type="text"
              value={urlInput}
              onChange={e => {
                setUrlInput(e.target.value);
                setInputError(null);
              }}
              placeholder="e.g. https://github.com/facebook/react/tree/main/docs"
              disabled={isLoading}
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus:border-pink-500 dark:focus:border-pink-400 focus:ring-2 focus:ring-pink-500/20 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all outline-none"
            />
            {urlInput && (
              <button
                type="button"
                onClick={() => setUrlInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                Clear
              </button>
            )}
          </div>

          <button
            id="resolve-github-btn"
            type="submit"
            disabled={isLoading || !urlInput.trim()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 hover:bg-pink-50 dark:hover:bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 border border-pink-500 hover:border-pink-600 dark:border-pink-500/80 dark:hover:border-pink-400 disabled:border-slate-200 dark:disabled:border-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:bg-slate-100 dark:disabled:bg-slate-950 text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
                <span>Resolving Tree...</span>
              </>
            ) : (
              <>
                <span>Fetch Docs</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Live URL Parsing Feedback */}
        {parsedInfo && (
          <div className="flex flex-wrap items-center gap-2 p-2.5 bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-800/60 rounded-xl text-xs text-slate-700 dark:text-cyan-200 animate-in fade-in">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Target:
            </span>
            <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-900 text-slate-900 dark:text-slate-100">
              {parsedInfo.owner}/{parsedInfo.repo}
            </span>
            {parsedInfo.branch && (
              <span className="font-mono flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-900 text-slate-700 dark:text-slate-300">
                <GitBranch className="w-3 h-3 text-cyan-600 dark:text-cyan-400" /> {parsedInfo.branch}
              </span>
            )}
            {parsedInfo.subPath ? (
              <span className="font-mono flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-900 text-slate-700 dark:text-slate-300">
                <Folder className="w-3 h-3 text-amber-500" /> /{parsedInfo.subPath}
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                (Whole repository tree)
              </span>
            )}
          </div>
        )}

        {/* Optional GitHub Token */}
        {showTokenInput && (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-cyan-500" />
                GitHub Personal Access Token (Optional)
              </label>
              <span className="text-[11px] text-slate-400">
                Stored in client memory only
              </span>
            </div>
            <input
              id="github-token-input"
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (Optional for private repos or rate limit boost)"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Unauthenticated GitHub requests have a limit of 60 requests/hr. Adding a token boosts this to 5,000/hr and allows access to private repos.
            </p>
          </div>
        )}

        {/* Input Error */}
        {inputError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{inputError}</span>
          </div>
        )}

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" /> Direct Git Tree API
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" /> Auto Subfolder Isolation
            </span>
          </div>
          <span>Concurrent raw download</span>
        </div>
      </form>

      {/* Preset Repositories Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          <span>Try with sample open-source documentation directories:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_DOCS.map(preset => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleSelectPreset(preset.url)}
              disabled={isLoading}
              className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800/80 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 text-slate-700 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-700 transition-all cursor-pointer shadow-2xs"
            >
              <span>{preset.name}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                {preset.badge}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
