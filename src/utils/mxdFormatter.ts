export interface FormatStats {
  assetLinksReplaced: number;
  jsxElementsConverted: number;
  importsExportsRemoved: number;
  commentsCleaned: number;
  headingsNormalized: number;
  replacedAssetsList: Array<{ original: string; replacement: string; type: 'image' | 'html_img' | 'file_link' }>;
}

export interface MxdFormatOptions {
  formatMxdToMd: boolean;
  replaceAssetLinks: boolean;
  assetPlaceholderType: 'named_banner' | 'image_banner' | 'text_badge' | 'custom';
  customPlaceholderUrl?: string;
  stripImportsExports?: boolean;
  convertJsxComponents?: boolean;
  cleanComments?: boolean;
  normalizeSpacing?: boolean;
}

export const DEFAULT_FORMAT_OPTIONS: MxdFormatOptions = {
  formatMxdToMd: true,
  replaceAssetLinks: true,
  assetPlaceholderType: 'named_banner',
  customPlaceholderUrl: 'https://placehold.co/650x320/e2e8f0/334155.png?text=Asset+Placeholder',
  stripImportsExports: true,
  convertJsxComponents: true,
  cleanComments: true,
  normalizeSpacing: true,
};

/**
 * Extracts a human-friendly asset label from a path or URL
 */
function extractAssetLabel(assetPath: string, altText?: string): string {
  if (altText && altText.trim().length > 0 && !altText.toLowerCase().includes('untitled')) {
    return altText.trim();
  }
  const cleanPath = assetPath.split('?')[0].split('#')[0];
  const parts = cleanPath.split(/[/\\]/);
  const filename = parts[parts.length - 1] || 'Asset';
  return filename;
}

/**
 * Generates the dummy placeholder replacement based on settings
 */
function generatePlaceholderValue(
  originalUrl: string,
  altText: string,
  options: MxdFormatOptions
): string {
  const label = extractAssetLabel(originalUrl, altText);
  const safeLabel = encodeURIComponent(label.slice(0, 40));

  switch (options.assetPlaceholderType) {
    case 'named_banner':
      return `https://placehold.co/650x320/e2e8f0/334155.png?text=${encodeURIComponent(`Asset: ${label.slice(0, 35)}`)}`;
    case 'image_banner':
      return 'https://placehold.co/650x320/e2e8f0/334155.png?text=Asset+Placeholder';
    case 'text_badge':
      return `https://placehold.co/650x120/f1f5f9/475569.png?text=${encodeURIComponent(`[Asset Placeholder: ${label.slice(0, 35)}]`)}`;
    case 'custom':
      if (options.customPlaceholderUrl && options.customPlaceholderUrl.trim().length > 0) {
        return options.customPlaceholderUrl.trim().replace('{name}', safeLabel).replace('{url}', encodeURIComponent(originalUrl));
      }
      return 'https://placehold.co/650x320/e2e8f0/334155.png?text=Asset+Placeholder';
    default:
      return `https://placehold.co/650x320/e2e8f0/334155.png?text=${encodeURIComponent(`Asset: ${label.slice(0, 35)}`)}`;
  }
}

/**
 * Checks if a URL is an asset link (relative path, local file, or media/image file)
 */
function isAssetUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  // Any relative or local path
  if (
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('/images/') ||
    trimmed.startsWith('/static/') ||
    trimmed.startsWith('/public/') ||
    trimmed.startsWith('assets/') ||
    trimmed.startsWith('images/') ||
    trimmed.startsWith('static/') ||
    trimmed.startsWith('public/') ||
    trimmed.startsWith('media/') ||
    trimmed.startsWith('attachments/') ||
    trimmed.startsWith('img/')
  ) {
    return true;
  }

  // File extensions that represent assets / media / binaries
  const assetExtensionRegex = /\.(png|jpe?g|gif|svg|webp|bmp|ico|tiff|avif|mp4|mov|webm|pdf|zip|tar\.gz|docx|xlsx)$/i;
  const urlWithoutQuery = trimmed.split('?')[0].split('#')[0];
  if (assetExtensionRegex.test(urlWithoutQuery)) {
    return true;
  }

  return false;
}

/**
 * Reformats MXD / MDX content into clean, properly parsed Markdown
 * and replaces asset links with dummy placeholder values.
 */
export function formatMxdToMarkdown(
  rawContent: string,
  options: Partial<MxdFormatOptions> = {}
): { formattedContent: string; stats: FormatStats } {
  const mergedOptions: MxdFormatOptions = { ...DEFAULT_FORMAT_OPTIONS, ...options };

  const stats: FormatStats = {
    assetLinksReplaced: 0,
    jsxElementsConverted: 0,
    importsExportsRemoved: 0,
    commentsCleaned: 0,
    headingsNormalized: 0,
    replacedAssetsList: [],
  };

  if (!rawContent) {
    return { formattedContent: '', stats };
  }

  let text = rawContent;

  // 1. Separate Frontmatter if present so we don't accidentally corrupt metadata
  let frontmatter = '';
  let body = text;
  const frontmatterMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (frontmatterMatch) {
    frontmatter = frontmatterMatch[0];
    body = text.substring(frontmatter.length);
  }

  // 2. Remove JS imports & exports (common in MDX/MXD)
  if (mergedOptions.formatMxdToMd && mergedOptions.stripImportsExports !== false) {
    // Remove import statements
    const importRegex = /^[ \t]*import\s+(?:[\w*\s{},]*\s+from\s+)?['"][^'"]+['"];?[ \t]*\r?\n?/gm;
    const importMatches = body.match(importRegex);
    if (importMatches) {
      stats.importsExportsRemoved += importMatches.length;
      body = body.replace(importRegex, '');
    }

    // Remove export statements (except if it's metadata title, which we preserve as heading if needed)
    const exportConstMetaRegex = /^[ \t]*export\s+const\s+meta\s*=\s*({[\s\S]*?});?[ \t]*\r?\n?/gm;
    body = body.replace(exportConstMetaRegex, (_match, jsonStr) => {
      stats.importsExportsRemoved++;
      try {
        const titleMatch = jsonStr.match(/title\s*:\s*["']([^"']+)["']/);
        const descMatch = jsonStr.match(/description\s*:\s*["']([^"']+)["']/);
        let replacement = '';
        if (titleMatch && !frontmatter) {
          replacement += `# ${titleMatch[1]}\n\n`;
        }
        if (descMatch) {
          replacement += `*${descMatch[1]}*\n\n`;
        }
        return replacement;
      } catch {
        return '';
      }
    });

    const exportRegex = /^[ \t]*export\s+(?:const|let|var|function|default|type|interface)\s+[^;\n]+(?:;|\{[^}]*\})?[ \t]*\r?\n?/gm;
    const exportMatches = body.match(exportRegex);
    if (exportMatches) {
      stats.importsExportsRemoved += exportMatches.length;
      body = body.replace(exportRegex, '');
    }
  }

  // 3. Clean JSX Comments: {/* comment */}
  if (mergedOptions.cleanComments !== false) {
    const commentRegex = /\{\/\*[\s\S]*?\*\/\}/g;
    const commentMatches = body.match(commentRegex);
    if (commentMatches) {
      stats.commentsCleaned += commentMatches.length;
      body = body.replace(commentRegex, '');
    }
  }

  // 4. Convert Custom JSX Components & MDX Admonitions into clean Markdown
  if (mergedOptions.formatMxdToMd && mergedOptions.convertJsxComponents !== false) {
    // A. Admonitions & Callouts: <Note>text</Note>, <Warning>text</Warning>, <Info>...</Info>, <Tip>...</Tip>, <Callout type="...">...</Callout>
    const calloutRegex = /<(Note|Info|Tip|Warning|Danger|Alert|Caution|Important|Callout)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/gi;
    body = body.replace(calloutRegex, (_match, tag, innerText) => {
      stats.jsxElementsConverted++;
      const tagUpper = tag.toUpperCase();
      const cleanInner = innerText.trim().replace(/^> ?/gm, '');
      const lines = cleanInner.split('\n');
      const quoted = lines.map((line: string) => `> ${line}`).join('\n');
      return `> **[${tagUpper}]**\n${quoted}\n\n`;
    });

    // B. Details / Accordion: <Details summary="...">...</Details> or <Accordion title="...">...</Accordion>
    const accordionRegex = /<(?:Accordion|Details)\s+(?:title|summary)=["']([^"']+)["'](?:\s+[^>]*)?>([\s\S]*?)<\/(?:Accordion|Details)>/gi;
    body = body.replace(accordionRegex, (_match, title, innerContent) => {
      stats.jsxElementsConverted++;
      return `<details>\n<summary><strong>${title.trim()}</strong></summary>\n\n${innerContent.trim()}\n\n</details>\n\n`;
    });

    // C. Badges & Tags: <Badge label="v2.4" /> or <Badge>v2.4</Badge> or <Tag>label</Tag>
    const selfClosingBadgeRegex = /<(?:Badge|Tag|Chip|Pill)\s+(?:label|text)=["']([^"']+)["']\s*(?:\/|>\s*<\/(?:Badge|Tag|Chip|Pill)>)/gi;
    body = body.replace(selfClosingBadgeRegex, (_match, label) => {
      stats.jsxElementsConverted++;
      return `\`[${label.trim()}]\``;
    });

    const pairedBadgeRegex = /<(?:Badge|Tag|Chip|Pill)(?:\s+[^>]*)?>([\s\S]*?)<\/(?:Badge|Tag|Chip|Pill)>/gi;
    body = body.replace(pairedBadgeRegex, (_match, innerText) => {
      stats.jsxElementsConverted++;
      return `\`[${innerText.trim()}]\``;
    });

    // D. Tabs & TabItem: <Tabs><TabItem label="npm">content</TabItem></Tabs>
    const tabsRegex = /<Tabs(?:\s+[^>]*)?>([\s\S]*?)<\/Tabs>/gi;
    body = body.replace(tabsRegex, (_match, innerTabs) => {
      stats.jsxElementsConverted++;
      const itemRegex = /<TabItem\s+label=["']([^"']+)["'](?:\s+[^>]*)?>([\s\S]*?)<\/TabItem>/gi;
      let tabBlocks = '';
      let match;
      while ((match = itemRegex.exec(innerTabs)) !== null) {
        const label = match[1];
        const tabContent = match[2].trim();
        tabBlocks += `\n\n##### Tab: ${label}\n\n${tabContent}\n`;
      }
      return tabBlocks || innerTabs;
    });

    // E. Cards: <Card title="Title" href="...">Content</Card>
    const cardRegex = /<Card\s+title=["']([^"']+)["'](?:\s+href=["']([^"']+)["'])?(?:\s+[^>]*)?>([\s\S]*?)<\/Card>/gi;
    body = body.replace(cardRegex, (_match, title, href, cardBody) => {
      stats.jsxElementsConverted++;
      const linkTitle = href ? `[${title.trim()}](${href.trim()})` : title.trim();
      return `\n\n### ${linkTitle}\n\n${cardBody.trim()}\n\n`;
    });

    // F. Steps: <Step title="Step 1">Content</Step>
    const stepRegex = /<Step\s+title=["']([^"']+)["'](?:\s+[^>]*)?>([\s\S]*?)<\/Step>/gi;
    body = body.replace(stepRegex, (_match, title, stepBody) => {
      stats.jsxElementsConverted++;
      return `\n\n#### ${title.trim()}\n\n${stepBody.trim()}\n\n`;
    });

    // G. Self-closing custom JSX tags (e.g. <Preview ... />, <HeroIcon ... />)
    const genericSelfClosingJsxRegex = /<([A-Z][a-zA-Z0-9]*)(?:\s+[^>]*)?\/>/g;
    body = body.replace(genericSelfClosingJsxRegex, (_match, componentName) => {
      stats.jsxElementsConverted++;
      return `\n*[Component: ${componentName}]*\n`;
    });

    // H. Paired custom JSX components with inner content (e.g. <FeatureGrid>...</FeatureGrid>)
    const genericPairedJsxRegex = /<([A-Z][a-zA-Z0-9]*)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/g;
    body = body.replace(genericPairedJsxRegex, (_match, _componentName, inner) => {
      stats.jsxElementsConverted++;
      return `\n\n${inner.trim()}\n\n`;
    });
  }

  // 5. Replace Asset Links with Dummy Placeholder Value
  if (mergedOptions.replaceAssetLinks) {
    // A. Markdown Images: ![alt](url "optional title")
    const mdImageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
    body = body.replace(mdImageRegex, (fullMatch, alt, url) => {
      if (isAssetUrl(url)) {
        stats.assetLinksReplaced++;
        const placeholder = generatePlaceholderValue(url, alt, mergedOptions);
        stats.replacedAssetsList.push({
          original: url,
          replacement: placeholder,
          type: 'image',
        });
        const finalAlt = alt || extractAssetLabel(url);
        return `![${finalAlt}](${placeholder})`;
      }
      return fullMatch;
    });

    // B. HTML / JSX <img> or <Image> tags: <img src="..." alt="..." /> or <Image src="..." ... />
    const htmlImgRegex = /<(?:img|Image)\s+([^>]*?)src=["']([^"']+)["']([^>]*?)(?:\/?>|>.*?<\/(?:img|Image)>)/gi;
    body = body.replace(htmlImgRegex, (fullMatch, before, src, after) => {
      if (isAssetUrl(src)) {
        stats.assetLinksReplaced++;
        // Extract alt attribute if present
        const combinedAttrs = `${before} ${after}`;
        const altMatch = combinedAttrs.match(/alt=["']([^"']+)["']/i);
        const altText = altMatch ? altMatch[1] : extractAssetLabel(src);
        const placeholder = generatePlaceholderValue(src, altText, mergedOptions);

        stats.replacedAssetsList.push({
          original: src,
          replacement: placeholder,
          type: 'html_img',
        });

        return `![${altText}](${placeholder})`;
      }
      return fullMatch;
    });

    // C. Markdown reference style image definitions: [label]: ./assets/image.png
    const refDefRegex = /^\[([^\]]+)\]:\s*(\S+)(.*)$/gm;
    body = body.replace(refDefRegex, (fullMatch, label, url, trailing) => {
      if (isAssetUrl(url)) {
        stats.assetLinksReplaced++;
        const placeholder = generatePlaceholderValue(url, label, mergedOptions);
        stats.replacedAssetsList.push({
          original: url,
          replacement: placeholder,
          type: 'image',
        });
        return `[${label}]: ${placeholder}${trailing || ''}`;
      }
      return fullMatch;
    });

    // D. Local non-image asset download links: [Download PDF](./assets/manual.pdf)
    const fileLinkRegex = /\[([^\]]+)\]\(([^)\s]+(?:\.pdf|\.zip|\.tar\.gz|\.docx|\.xlsx|\.mp4|\.mov|\.webm|\.bin|\.exe|\.dmg|\.iso))(?:\s+["'][^"']*["'])?\)/gi;
    body = body.replace(fileLinkRegex, (fullMatch, textLabel, url) => {
      if (isAssetUrl(url)) {
        stats.assetLinksReplaced++;
        const filename = extractAssetLabel(url, textLabel);
        const placeholder = `#asset-placeholder-${encodeURIComponent(filename)}`;
        stats.replacedAssetsList.push({
          original: url,
          replacement: placeholder,
          type: 'file_link',
        });
        return `[${textLabel} (Asset Placeholder: ${filename})](${placeholder})`;
      }
      return fullMatch;
    });
  }

  // 6. Spacing & Markdown Structure Normalization
  if (mergedOptions.normalizeSpacing !== false) {
    // Normalize headings: ensure a space after '#' (e.g. '##Heading' -> '## Heading')
    const headingRegex = /^(#{1,6})([^\s#])/gm;
    body = body.replace(headingRegex, (_match, hashes, rest) => {
      stats.headingsNormalized++;
      return `${hashes} ${rest}`;
    });

    // Ensure blank lines around headings
    body = body.replace(/([^\n])\n(#{1,6}\s+[^\n]+)/g, '$1\n\n$2');
    body = body.replace(/(#{1,6}\s+[^\n]+)\n([^\n#])/g, '$1\n\n$2');

    // Ensure blank lines before and after fenced code blocks
    body = body.replace(/([^\n])\n(```[\w-]*\r?\n)/g, '$1\n\n$2');
    body = body.replace(/(\n```)\n([^\n`])/g, '$1\n\n$2');

    // Clean up excessive blank lines (more than 2 consecutive blank lines collapsed to 2)
    body = body.replace(/\n{3,}/g, '\n\n');
  }

  // Recombine Frontmatter and Formatted Body
  let finalFormatted = '';
  if (frontmatter) {
    finalFormatted = `${frontmatter.trim()}\n\n${body.trim()}\n`;
  } else {
    finalFormatted = `${body.trim()}\n`;
  }

  return {
    formattedContent: finalFormatted,
    stats,
  };
}
