import * as fs from 'fs';
import * as path from 'path';

interface RepoEntry {
  localPath: string;
  remoteUrl: string;
}

let repoCache: RepoEntry[] = [];

function readGitRemote(repoPath: string): string | null {
  try {
    const configPath = path.join(repoPath, '.git', 'config');
    const content = fs.readFileSync(configPath, 'utf8');
    const match = content.match(/\[remote "origin"\][^\[]*url\s*=\s*(.+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function scanDir(dir: string, depth = 0): RepoEntry[] {
  if (depth > 4) return [];
  const entries: RepoEntry[] = [];
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    const hasGit = items.some(i => i.isDirectory() && i.name === '.git');
    if (hasGit) {
      const remoteUrl = readGitRemote(dir);
      if (remoteUrl) entries.push({ localPath: dir, remoteUrl });
      return entries; // don't recurse into a repo
    }
    for (const item of items) {
      if (item.isDirectory() && !item.name.startsWith('.')) {
        entries.push(...scanDir(path.join(dir, item.name), depth + 1));
      }
    }
  } catch {
    // permission errors etc — skip
  }
  return entries;
}

export function buildRepoCache(rootPaths: string[]): void {
  repoCache = rootPaths.flatMap(p => scanDir(p));
}

function normalizeGitUrl(url: string): string {
  return url
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/\.git$/, '')
    .toLowerCase()
    .trim();
}

export function findLocalRepo(projectHttpUrl: string): string | null {
  const target = normalizeGitUrl(projectHttpUrl);
  for (const entry of repoCache) {
    if (normalizeGitUrl(entry.remoteUrl) === target) {
      return entry.localPath;
    }
  }
  return null;
}
