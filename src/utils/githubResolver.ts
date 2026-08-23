import { DocFile, TransformSettings, ZipMetadata, ProcessingProgress } from '../types';
import { formatMxdToMarkdown, FormatStats } from './mxdFormatter';
import { isTargetDocFile, generateFlatFileName, detectCommonRoot } from './zipProcessor';

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  branch?: string;
  subPath?: string;
  originalUrl: string;
}

/**
 * Parses various GitHub URL formats into owner, repo, branch, and subPath
 */
export function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Try standard github url
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('github.com')) {
      const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      if (urlObj.hostname.includes('github.com')) {
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          const owner = parts[0];
          const repo = parts[1].replace(/\.git$/i, '');
          
          if (parts.length >= 4 && (parts[2] === 'tree' || parts[2] === 'blob')) {
            const branch = parts[3];
            const subPath = parts.slice(4).join('/');
            return {
              owner,
              repo,
              branch,
              subPath: subPath || undefined,
              originalUrl: trimmed,
            };
          }

          return {
            owner,
            repo,
            branch: undefined,
            subPath: undefined,
            originalUrl: trimmed,
          };
        }
      }
    }
  } catch {
    // Fallback to regex or short form
  }

  // Pattern 2: Short form e.g. "owner/repo" or "owner/repo/tree/main/docs"
  const shortParts = trimmed.split('/').filter(Boolean);
  if (shortParts.length >= 2 && !trimmed.includes(' ')) {
    const owner = shortParts[0];
    const repo = shortParts[1].replace(/\.git$/i, '');
    if (shortParts.length >= 4 && (shortParts[2] === 'tree' || shortParts[2] === 'blob')) {
      const branch = shortParts[3];
      const subPath = shortParts.slice(4).join('/');
      return {
        owner,
        repo,
        branch,
        subPath: subPath || undefined,
        originalUrl: trimmed,
      };
    }
    return {
      owner,
      repo,
      branch: undefined,
      subPath: undefined,
      originalUrl: trimmed,
    };
  }

  return null;
}

/**
 * Resolves a GitHub directory URL, fetches its tree & documentation files,
 * transforms them, and returns structured DocFile array.
 */
export async function resolveGitHubDirectory(
  githubUrl: string,
  settings: TransformSettings,
  token?: string,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<{ files: DocFile[]; metadata: ZipMetadata; commonRoot: string | null }> {
  const parsed = parseGitHubUrl(githubUrl);

  if (!parsed) {
    throw new Error(
      'Invalid GitHub URL. Please enter a valid repository or directory URL (e.g. https://github.com/owner/repo/tree/main/docs).'
    );
  }

  const { owner, repo } = parsed;
  let branch = parsed.branch;
  const subPath = parsed.subPath ? parsed.subPath.replace(/^\/+|\/+$/g, '') : '';

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token && token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  onProgress?.({
    stage: 'reading',
    processedCount: 0,
    totalCount: 1,
    percent: 5,
    message: `Connecting to GitHub repository ${owner}/${repo}...`,
  });

  // Step 1: Detect branch if not provided in URL
  if (!branch) {
    try {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (!repoRes.ok) {
        if (repoRes.status === 404) {
          throw new Error(`Repository "${owner}/${repo}" was not found or is private.`);
        }
        if (repoRes.status === 403) {
          throw new Error('GitHub API rate limit reached. Add a Personal Access Token or try again shortly.');
        }
        throw new Error(`GitHub API error (${repoRes.status}): ${repoRes.statusText}`);
      }
      const repoData = await repoRes.json();
      branch = repoData.default_branch || 'main';
    } catch (e: any) {
      if (e?.message?.includes('GitHub API') || e?.message?.includes('Repository')) throw e;
      branch = 'main'; // fallback
    }
  }

  onProgress?.({
    stage: 'reading',
    processedCount: 0,
    totalCount: 1,
    percent: 15,
    message: `Fetching file tree for "${branch}" branch ${subPath ? `in /${subPath}` : ''}...`,
  });

  // Step 2: Fetch recursive Git tree
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const treeRes = await fetch(treeUrl, { headers });

  if (!treeRes.ok) {
    if (treeRes.status === 404) {
      throw new Error(`Branch or tree "${branch}" not found in ${owner}/${repo}.`);
    }
    if (treeRes.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Provide a GitHub Access Token in options to continue.');
    }
    throw new Error(`Failed to fetch file tree from GitHub (${treeRes.status}).`);
  }

  const treeData = await treeRes.json();
  const rawTree: Array<{ path: string; type: string; size?: number; sha: string }> = treeData.tree || [];

  // Filter blobs in target subPath and with target extensions
  const matchingBlobs = rawTree.filter(item => {
    if (item.type !== 'blob') return false;
    if (subPath) {
      if (!item.path.startsWith(`${subPath}/`) && item.path !== subPath) {
        return false;
      }
    }
    return isTargetDocFile(item.path, settings.includeExtensions);
  });

  if (matchingBlobs.length === 0) {
    const extensionList = settings.includeExtensions.join(', ');
    const pathMsg = subPath ? ` in directory "${subPath}"` : '';
    throw new Error(
      `No matching documentation files (${extensionList}) found${pathMsg} in ${owner}/${repo}@${branch}.`
    );
  }

  onProgress?.({
    stage: 'extracting',
    processedCount: 0,
    totalCount: matchingBlobs.length,
    percent: 25,
    message: `Found ${matchingBlobs.length} documentation files. Downloading contents...`,
  });

  // Step 3: Detect common root
  const allPaths = matchingBlobs.map(b => b.path);
  let commonRoot: string | null = null;
  if (subPath) {
    const lastSlash = subPath.lastIndexOf('/');
    commonRoot = lastSlash !== -1 ? subPath.substring(0, lastSlash + 1) : `${subPath}/`;
  } else {
    commonRoot = detectCommonRoot(allPaths);
  }

  // Step 4: Batch concurrent download of raw markdown contents
  let downloadedCount = 0;
  let totalBytes = 0;
  let totalAssetsReplaced = 0;
  let totalMxdConverted = 0;
  const CONCURRENCY = 6;

  // Function to download a single file
  const downloadBlob = async (blobItem: typeof matchingBlobs[0], index: number): Promise<DocFile> => {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${blobItem.path}`;
    let rawContent = '';

    try {
      const rawRes = await fetch(rawUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!rawRes.ok) {
        // Fallback to GitHub API blob endpoint
        const blobApiUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${blobItem.sha}`;
        const blobApiRes = await fetch(blobApiUrl, { headers });
        if (blobApiRes.ok) {
          const blobData = await blobApiRes.json();
          if (blobData.encoding === 'base64') {
            rawContent = decodeURIComponent(
              escape(atob(blobData.content.replace(/\s/g, '')))
            );
          } else {
            rawContent = blobData.content;
          }
        } else {
          rawContent = `# Error fetching ${blobItem.path}\n\nCould not fetch content from GitHub.`;
        }
      } else {
        rawContent = await rawRes.text();
      }
    } catch {
      rawContent = `# Error loading file: ${blobItem.path}`;
    }

    const contentBytes = new Blob([rawContent]).size;
    totalBytes += contentBytes;

    const originalExtension = blobItem.path.substring(blobItem.path.lastIndexOf('.')).toLowerCase();
    const isMxd = ['.mdx', '.mxd'].includes(originalExtension);

    // Apply MXD / MDX formatting
    const { formattedContent, stats } = formatMxdToMarkdown(rawContent, {
      formatMxdToMd: settings.formatMxdToMd,
      replaceAssetLinks: settings.replaceAssetLinks,
      assetPlaceholderType: settings.assetPlaceholderType,
      customPlaceholderUrl: settings.customPlaceholderUrl,
      stripImportsExports: settings.stripImportsExports,
      convertJsxComponents: settings.convertJsxComponents,
    });

    if (stats.assetLinksReplaced > 0) totalAssetsReplaced += stats.assetLinksReplaced;
    if (isMxd) totalMxdConverted++;

    const flatNameData = generateFlatFileName(blobItem.path, settings, commonRoot);

    const docFile: DocFile = {
      id: `gh-${index}-${Math.random().toString(36).substring(2, 9)}`,
      originalPath: blobItem.path,
      relativePath: flatNameData.relativePath,
      newName: flatNameData.newName,
      extension: flatNameData.extension,
      originalExtension: flatNameData.originalExtension,
      size: new Blob([formattedContent]).size,
      rawContent,
      content: formattedContent,
      selected: true,
      isMxdConverted: isMxd,
      formatStats: stats,
    };

    downloadedCount++;
    const percent = 25 + Math.round((downloadedCount / matchingBlobs.length) * 70);
    onProgress?.({
      stage: 'extracting',
      currentFile: blobItem.path,
      processedCount: downloadedCount,
      totalCount: matchingBlobs.length,
      percent,
      message: `Downloaded ${downloadedCount}/${matchingBlobs.length}: ${blobItem.path}`,
    });

    return docFile;
  };

  // Run in chunks with concurrency pool
  const results: DocFile[] = [];
  for (let i = 0; i < matchingBlobs.length; i += CONCURRENCY) {
    const slice = matchingBlobs.slice(i, i + CONCURRENCY);
    const chunkPromises = slice.map((item, sliceIdx) => downloadBlob(item, i + sliceIdx));
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }

  // Sort files naturally by relativePath
  results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  // Deduplicate any potential filename collisions
  const nameCounts = new Map<string, number>();
  const finalizedFiles = results.map(file => {
    let finalName = file.newName;
    const count = nameCounts.get(finalName) || 0;
    if (count > 0) {
      const lastDot = finalName.lastIndexOf('.');
      const base = lastDot !== -1 ? finalName.substring(0, lastDot) : finalName;
      const ext = lastDot !== -1 ? finalName.substring(lastDot) : '';
      finalName = `${base}-${count + 1}${ext}`;
    }
    nameCounts.set(file.newName, count + 1);
    return { ...file, newName: finalName };
  });

  const metadata: ZipMetadata = {
    filename: `${owner}-${repo}${subPath ? `-${subPath.replace(/\//g, '-')}` : ''}.zip`,
    totalFilesCount: rawTree.length,
    matchedFilesCount: finalizedFiles.length,
    totalSize: totalBytes,
    totalAssetsReplaced,
    totalMxdConverted,
    extractedAt: new Date(),
  };

  onProgress?.({
    stage: 'complete',
    processedCount: finalizedFiles.length,
    totalCount: finalizedFiles.length,
    percent: 100,
    message: `Ready! ${finalizedFiles.length} files resolved from GitHub.`,
  });

  return { files: finalizedFiles, metadata, commonRoot };
}
