import React from 'react';
import {
  Sliders,
  Hash,
  FolderTree,
  FileCode,
  Check,
  Sparkles,
  Image,
  FileText,
  Layers,
  Wand2
} from 'lucide-react';
import { TransformSettings } from '../types';

interface SettingsBarProps {
  settings: TransformSettings;
  onChange: (newSettings: TransformSettings) => void;
  commonRoot: string | null;
  totalFound: number;
  totalAssetsReplaced?: number;
  totalMxdConverted?: number;
}

export const SettingsBar: React.FC<SettingsBarProps> = ({
  settings,
  onChange,
  commonRoot,
  totalFound,
  totalAssetsReplaced = 0,
  totalMxdConverted = 0,
}) => {
  const separators = [
    { label: 'Double Underscore ( __ )', value: '__' },
    { label: 'Single Underscore ( _ )', value: '_' },
    { label: 'Double Dash ( -- )', value: '--' },
    { label: 'Single Dash ( - )', value: '-' },
    { label: 'Dot ( . )', value: '.' },
  ];

  const placeholderStyles = [
    {
      value: 'named_banner',
      label: 'Labeled Banner (Asset: filename.png)',
      description: 'Generates a clean neutral banner with the asset filename for crisp PDF & Markdown rendering',
    },
    {
      value: 'image_banner',
      label: 'Generic Image Placeholder',
      description: 'Standard neutral image placeholder (650x320)',
    },
    {
      value: 'text_badge',
      label: 'Compact Text Badge',
      description: 'Renders a streamlined inline placeholder badge banner',
    },
    {
      value: 'custom',
      label: 'Custom URL Template',
      description: 'Specify your own image URL template (use {name} for asset name)',
    },
  ];

  const availableExtensions = ['.md', '.mdx', '.markdown'];

  const toggleExtension = (ext: string) => {
    let nextExts: string[];
    if (settings.includeExtensions.includes(ext)) {
      if (settings.includeExtensions.length <= 1) return; // keep at least 1
      nextExts = settings.includeExtensions.filter(e => e !== ext);
    } else {
      nextExts = [...settings.includeExtensions, ext];
    }
    onChange({ ...settings, includeExtensions: nextExts });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-2xl dark:ring-1 dark:ring-pink-500/10 space-y-5 transition-all">
      {/* Section 1: File Flattening Rules */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-pink-500/10 text-pink-400 rounded-lg border border-pink-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Directory Flattening & Renaming Rules</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unnest nested directory folders into single flattened filenames
              </p>
            </div>
          </div>

          {commonRoot && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-yellow-500/10 border border-amber-200 dark:border-yellow-500/30 rounded-md text-xs text-amber-800 dark:text-yellow-300">
              <FolderTree className="w-3.5 h-3.5 text-amber-600 dark:text-yellow-400" />
              <span>Root detected: <code className="font-mono font-medium text-amber-900 dark:text-yellow-200">{commonRoot}</code></span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Separator Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400" />
              Path Directory Separator
            </label>
            <select
              id="separator-select"
              value={settings.separator}
              onChange={e => onChange({ ...settings, separator: e.target.value })}
              className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 dark:focus:border-pink-400"
            >
              {separators.map(sep => (
                <option key={sep.value} value={sep.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {sep.label}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate font-mono">
              e.g. docs{settings.separator}api{settings.separator}users.md
            </span>
          </div>

          {/* Custom Prefix */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Optional Prefix
            </label>
            <input
              id="custom-prefix-input"
              type="text"
              placeholder="e.g. doc, v1, github"
              value={settings.customPrefix}
              onChange={e => onChange({ ...settings, customPrefix: e.target.value })}
              className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 dark:focus:border-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono"
            />
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
              Prepends to all flattened filenames
            </span>
          </div>

          {/* Extension Filter Chips */}
          <div className="space-y-1.5 lg:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Target Document Extensions
            </label>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {availableExtensions.map(ext => {
                const active = settings.includeExtensions.includes(ext);
                return (
                  <button
                    id={`toggle-ext-${ext.replace('.', '')}`}
                    key={ext}
                    type="button"
                    onClick={() => toggleExtension(ext)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 font-bold border border-pink-500/60 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    {ext}
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
              Extracts {totalFound} matching documentation files
            </span>
          </div>
        </div>

        {/* Checkbox Options */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-6">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
            <input
              id="strip-root-checkbox"
              type="checkbox"
              checked={settings.stripRootFolder}
              onChange={e => onChange({ ...settings, stripRootFolder: e.target.checked })}
              className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-slate-300 dark:border-slate-700 dark:bg-slate-950"
            />
            <span>Strip GitHub Top-Level Folder (e.g. <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">repo-main/</code>)</span>
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
            <input
              id="normalize-ext-checkbox"
              type="checkbox"
              checked={settings.normalizeExtension}
              onChange={e => onChange({ ...settings, normalizeExtension: e.target.checked })}
              className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-slate-300 dark:border-slate-700 dark:bg-slate-950"
            />
            <span>Normalize all extensions to <code className="font-mono text-[11px] font-semibold text-amber-700 dark:text-yellow-300 bg-amber-50 dark:bg-yellow-950/60 border border-amber-200 dark:border-yellow-800/60 px-1 py-0.5 rounded">.md</code> (ideal for PDF converters)</span>
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
            <input
              id="sanitize-chars-checkbox"
              type="checkbox"
              checked={settings.sanitizeCharacters}
              onChange={e => onChange({ ...settings, sanitizeCharacters: e.target.checked })}
              className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-slate-300 dark:border-slate-700 dark:bg-slate-950"
            />
            <span>Sanitize spaces & unsafe path symbols</span>
          </label>
        </div>
      </div>

      {/* Section 2: MDX to MD Reformatting & Asset Placeholder Conversion */}
      <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-pink-500/10 text-pink-500 dark:text-pink-400 rounded-lg border border-pink-500/30">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  MDX to MD Reformatting & Asset Link Handling
                </h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-50 dark:bg-yellow-500/10 text-amber-700 dark:text-yellow-300 rounded-full border border-amber-200 dark:border-yellow-500/30">
                  Clean Parser Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transforms MDX/JSX components into standard Markdown & replaces missing asset links with dummy placeholders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-cyan-900 dark:text-cyan-300">
            {totalMxdConverted > 0 && (
              <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-pink-200 dark:border-pink-500/30 font-mono text-[11px] text-pink-600 dark:text-pink-300 shadow-2xs">
                <FileText className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400" />
                {totalMxdConverted} MDX files reformatted
              </span>
            )}
            {totalAssetsReplaced > 0 && (
              <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-amber-200 dark:border-yellow-500/30 font-mono text-[11px] text-amber-700 dark:text-yellow-300 shadow-2xs">
                <Image className="w-3.5 h-3.5 text-amber-600 dark:text-yellow-400" />
                {totalAssetsReplaced} asset placeholders inserted
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Main Toggles */}
          <div className="space-y-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                id="format-mxd-checkbox"
                type="checkbox"
                checked={settings.formatMxdToMd}
                onChange={e => onChange({ ...settings, formatMxdToMd: e.target.checked })}
                className="w-4 h-4 mt-0.5 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300 dark:border-slate-700 dark:bg-slate-950"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Reformat MDX Document Body
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                  Converts JSX tags (<code className="font-mono text-[10px]">&lt;Note&gt;</code>, <code className="font-mono text-[10px]">&lt;Warning&gt;</code>, <code className="font-mono text-[10px]">&lt;Badge&gt;</code>) to standard Markdown blockquotes, strips import/export statements, and cleans comments.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                id="replace-assets-checkbox"
                type="checkbox"
                checked={settings.replaceAssetLinks}
                onChange={e => onChange({ ...settings, replaceAssetLinks: e.target.checked })}
                className="w-4 h-4 mt-0.5 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300 dark:border-slate-700 dark:bg-slate-950"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Replace Asset Links with Dummy Placeholder Value
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                  Substitutes broken relative asset paths (e.g. <code className="font-mono text-[10px]">./assets/diagram.png</code>) with clean, rendered dummy placeholder images for PDF export.
                </span>
              </div>
            </label>
          </div>

          {/* Placeholder Style Configuration */}
          {settings.replaceAssetLinks && (
            <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-cyan-100 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Dummy Asset Placeholder Style
              </label>
              <select
                id="placeholder-style-select"
                value={settings.assetPlaceholderType}
                onChange={e =>
                  onChange({
                    ...settings,
                    assetPlaceholderType: e.target.value as TransformSettings['assetPlaceholderType'],
                  })
                }
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 dark:focus:border-cyan-400"
              >
                {placeholderStyles.map(style => (
                  <option key={style.value} value={style.value} className="dark:bg-slate-900">
                    {style.label}
                  </option>
                ))}
              </select>

              {settings.assetPlaceholderType === 'custom' ? (
                <div className="pt-1">
                  <input
                    id="custom-placeholder-input"
                    type="text"
                    value={settings.customPlaceholderUrl}
                    onChange={e => onChange({ ...settings, customPlaceholderUrl: e.target.value })}
                    placeholder="https://placehold.co/600x300?text={name}"
                    className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
                    Use <code>{'{name}'}</code> to dynamically embed the asset filename
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {placeholderStyles.find(p => p.value === settings.assetPlaceholderType)?.description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
