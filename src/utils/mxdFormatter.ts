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

    // D. Tabs & TabItem (MDX / JSX): <Tabs><TabItem label="npm">content</TabItem></Tabs>
    const tabsRegex = /<Tabs(?:\s+[^>]*)?>([\s\S]*?)<\/Tabs>/gi;
    body = body.replace(tabsRegex, (_match, innerTabs) => {
      stats.jsxElementsConverted++;
      const itemRegex = /<TabItem\s+(?:label|value)=["']([^"']+)["'](?:\s+[^>]*)?>([\s\S]*?)<\/TabItem>/gi;
      let tabBlocks = '';
      let match;
      while ((match = itemRegex.exec(innerTabs)) !== null) {
        const label = match[1];
        const tabContent = match[2].trim();
        tabBlocks += `\n\n##### Tab: ${label}\n\n${tabContent}\n`;
      }
      return tabBlocks || innerTabs;
    });

    // D2. MkDocs Material & FastAPI Content Tabs: "//// tab | Title" or "/// tab | Title"
    const mkdocsTabRegex = /^[ \t]*\/{3,4}\s*tab\s*\|\s*(.*?)[ \t]*\r?\n([\s\S]*?)(?:^[ \t]*\/{3,4}[ \t]*$|(?=^[ \t]*\/{3,4}\s*tab\s*\|))/gm;
    body = body.replace(mkdocsTabRegex, (_match, tabTitle, tabBody) => {
      stats.jsxElementsConverted++;
      const cleanTitle = tabTitle.trim().replace(/^['"]|['"]$/g, '');
      // Strip any option annotations like "    :new: 0.100.0" or "    :upgrade:"
      const cleanBody = tabBody.replace(/^[ \t]*:[a-zA-Z0-9_-]+:[^\r\n]*\r?\n?/gm, '').trim();
      return `\n\n##### Tab: ${cleanTitle}\n\n${cleanBody}\n\n`;
    });

    // D3. MkDocs / FastAPI Slashed Admonitions: "/// info | Title" or "/// note" or "/// warning" ... "///"
    const mkdocsAdmonitionRegex = /^[ \t]*\/{3,4}\s*(note|info|tip|warning|danger|caution|important|check|example|quote|details|abstract|success|failure|bug)(?:\s*\|\s*([^\r\n]*))?[ \t]*\r?\n([\s\S]*?)(?:^[ \t]*\/{3,4}[ \t]*$|(?=^[ \t]*\/{3,4}\s*(?:note|info|tip|warning|danger|caution|important|check|example|quote|details|abstract|success|failure|bug|tab)))/gim;
    body = body.replace(mkdocsAdmonitionRegex, (_match, tag, title, admonitionBody) => {
      stats.jsxElementsConverted++;
      const tagUpper = tag.toUpperCase();
      const titleStr = title && title.trim() ? ` ${title.trim()}` : '';
      const cleanBody = admonitionBody.trim();
      const quoted = cleanBody.split('\n').map((line: string) => `> ${line}`).join('\n');
      return `\n\n> **[${tagUpper}]${titleStr}**\n${quoted}\n\n`;
    });

    // D4. Classic MkDocs Tabbed Syntax: === "Tab Title"
    const classicTabRegex = /^[ \t]*===\s*["']([^"']+)["'](?:\s*:[\w-]+:)?\r?\n/gm;
    body = body.replace(classicTabRegex, (_match, title) => {
      stats.jsxElementsConverted++;
      return `\n\n##### Tab: ${title.trim()}\n\n`;
    });

    // D5. Standalone Note/Warning with pipe or on own line: e.g. "note | Technical Details" or "warning"
    const standalonePipeAdmonitionRegex = /^[ \t]*(note|info|tip|warning|danger|caution|important)\s*\|\s*([^\r\n]+)\r?\n+((?:(?![ \t]*(?:#|>|```|===|---|\/{3,4})).+\r?\n?)+)/gim;
    body = body.replace(standalonePipeAdmonitionRegex, (_match, tag, title, content) => {
      stats.jsxElementsConverted++;
      const tagUpper = tag.toUpperCase();
      const titleStr = title ? ` ${title.trim()}` : '';
      const quoted = content.trim().split('\n').map((line: string) => `> ${line}`).join('\n');
      return `\n\n> **[${tagUpper}]${titleStr}**\n${quoted}\n\n`;
    });

    const standaloneAdmonitionRegex = /^[ \t]*(tip|warning|info|note|caution|danger|important)\s*$(?:\r?\n)+((?:(?![ \t]*(?:#|>|```|===|---|\/{3,4})).+\r?\n?)+)/gim;
    body = body.replace(standaloneAdmonitionRegex, (_match, tag, content) => {
      stats.jsxElementsConverted++;
      const tagUpper = tag.toUpperCase();
      const quoted = content.trim().split('\n').map((line: string) => `> ${line}`).join('\n');
      return `\n\n> **[${tagUpper}]**\n${quoted}\n\n`;
    });

    // Clean any remaining standalone closing "///" or "////"
    body = body.replace(/^[ \t]*\/{3,4}[ \t]*\r?\n?/gm, '\n');

    // D6. Code Snippets & External File Inclusions: e.g. {* ../../docs_src/... hl[19] *} or { ../../docs_src/... }
    const snippetIncludeRegex = /^[ \t]*\{\*?\s*(\.{1,2}\/[^\s}]+|\S+\.(?:py|js|ts|tsx|jsx|json|yaml|yml|sh|bash|sql|html|css|rs|go|c|cpp|h|java|kt|rb|php|md|txt))(?:\s+(?:hl|ln)\[([^\]]*)\]|\s+([^}*]*))?\s*\*?\}[ \t]*$/gm;
    body = body.replace(snippetIncludeRegex, (_match, filePath, highlights, extra) => {
      stats.jsxElementsConverted++;
      const cleanPath = filePath.trim();
      const filename = cleanPath.split('/').pop() || cleanPath;
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      const langMap: Record<string, string> = {
        py: 'python',
        js: 'javascript',
        ts: 'typescript',
        tsx: 'tsx',
        jsx: 'jsx',
        json: 'json',
        yml: 'yaml',
        yaml: 'yaml',
        sh: 'bash',
        bash: 'bash',
        sql: 'sql',
        html: 'html',
        css: 'css',
        rs: 'rust',
        go: 'go',
        java: 'java',
        kt: 'kotlin',
        rb: 'ruby',
        php: 'php',
        md: 'markdown',
      };
      const lang = langMap[ext] || ext || 'text';
      const highlightInfo = highlights ? ` (Highlighted lines: ${highlights})` : '';
      const extraInfo = extra && extra.trim() ? ` [${extra.trim()}]` : '';

      return `\n\`\`\`${lang}\n# [Code Snippet File: ${filename}]\n# Reference: ${cleanPath}${highlightInfo}${extraInfo}\n\`\`\`\n`;
    });

    // D7. Docusaurus / Markdown-it Triple Colon Admonitions: :::info[Title] ... :::
    const colonAdmonitionRegex = /^[ \t]*:::\s*(note|info|tip|warning|danger|caution|important|details)(?:\[(.*?)\]|[\s:]([^\r\n]*))?\r?\n([\s\S]*?)^[ \t]*:::[ \t]*$/gim;
    body = body.replace(colonAdmonitionRegex, (_match, tag, bracketTitle, spaceTitle, calloutBody) => {
      stats.jsxElementsConverted++;
      const tagUpper = tag.toUpperCase();
      const title = (bracketTitle || spaceTitle || '').trim();
      const titleStr = title ? ` ${title}` : '';
      const quoted = calloutBody.trim().split('\n').map((line: string) => `> ${line}`).join('\n');
      return `\n\n> **[${tagUpper}]${titleStr}**\n${quoted}\n\n`;
    });

    // D8. Classic MkDocs Admonitions: !!! note "Title" or ???+ info "Title"
    const classicAdmonitionRegex = /^[ \t]*(?:!|\?){3}\+?\s*(note|info|tip|warning|danger|caution|important|question|faq|quote|example)\s*(?:"([^"]*)"|'([^']*)')?[ \t]*\r?\n/gim;
    body = body.replace(classicAdmonitionRegex, (_match, tag, title1, title2) => {
      stats.jsxElementsConverted++;
      const title = (title1 || title2 || '').trim();
      const titleStr = title ? ` ${title}` : '';
      return `\n\n> **[${tag.toUpperCase()}]${titleStr}**\n>\n`;
    });

    // D9. Strip Python-Markdown / MkDocs header attribute anchor IDs: e.g. "## code blocks { #code-blocks }" or "{: #custom-id }"
    body = body.replace(/\s*\{:?\s*#[a-zA-Z0-9_-]+(?:\s+[.#a-zA-Z0-9_-]+)*\s*\}\s*$/gm, '');
    body = body.replace(/\s*\{\s*#[a-zA-Z0-9_-]+\s*\}\s*/g, '');

    // D10. Raw image filename references without markdown image syntax: e.g. "!image01.png" -> "![image01.png](...)"
    const rawExclamationImageRegex = /^[ \t]*!([a-zA-Z0-9_\-\.]+\.(?:png|jpe?g|gif|svg|webp|avif))[ \t]*$/gm;
    body = body.replace(rawExclamationImageRegex, (_match, imgFile) => {
      return `\n![${imgFile}](./images/${imgFile})\n`;
    });

    // D11. Clean / Normalize Inline HTML tags (<font>, <u>, <span>, <kbd>, <center>)
    body = body.replace(/<font(?:\s+[^>]*)?>([\s\S]*?)<\/font>/gi, '$1');
    body = body.replace(/<u(?:\s+[^>]*)?>([\s\S]*?)<\/u>/gi, '_$1_');
    body = body.replace(/<span(?:\s+[^>]*)?>([\s\S]*?)<\/span>/gi, '$1');
    body = body.replace(/<kbd(?:\s+[^>]*)?>([\s\S]*?)<\/kbd>/gi, '`$1`');
    body = body.replace(/<center(?:\s+[^>]*)?>([\s\S]*?)<\/center>/gi, '$1');
    body = body.replace(/<a\s+name=["'][^"']*["']\s*(?:\/|>\s*<\/a>)>?/gi, '');

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
