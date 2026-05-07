import { exec, execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const VSCODE_CANDIDATES = [
  path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd'),
  'C:\\Program Files\\Microsoft VS Code\\bin\\code.cmd',
  'C:\\Program Files (x86)\\Microsoft VS Code\\bin\\code.cmd',
];

const INTELLIJ_FIXED_CANDIDATES = [
  'C:\\Program Files\\JetBrains\\IntelliJ IDEA Ultimate\\bin\\idea64.exe',
  'C:\\Program Files\\JetBrains\\IntelliJ IDEA Community Edition\\bin\\idea64.exe',
  'C:\\Program Files (x86)\\JetBrains\\IntelliJ IDEA Ultimate\\bin\\idea64.exe',
];

// JetBrains Toolbox installs to a versioned path — scan for it
function findToolboxIntelliJ(): string | null {
  const toolboxApps = path.join(os.homedir(), 'AppData', 'Local', 'JetBrains', 'Toolbox', 'apps');
  for (const appDir of ['IDEA-U', 'IDEA-C']) {
    const base = path.join(toolboxApps, appDir, 'ch-0');
    if (!fs.existsSync(base)) continue;
    try {
      const versions = fs.readdirSync(base).sort().reverse(); // newest first
      for (const ver of versions) {
        const exe = path.join(base, ver, 'bin', 'idea64.exe');
        if (fs.existsSync(exe)) return exe;
      }
    } catch { /* skip */ }
  }
  return null;
}

function findExe(candidates: string[]): string | null {
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

export function openInIde(ide: 'vscode' | 'intellij', projectPath: string, intellijPath?: string): void {
  if (ide === 'vscode') {
    const found = findExe(VSCODE_CANDIDATES);
    const cmd = found ? `"${found}" "${projectPath}"` : `code "${projectPath}"`;
    exec(cmd, (err) => {
      if (err) console.error('[ide] vscode error:', err.message);
    });
  } else {
    const found = (intellijPath && fs.existsSync(intellijPath) ? intellijPath : null)
      ?? findExe(INTELLIJ_FIXED_CANDIDATES)
      ?? findToolboxIntelliJ();
    if (found) {
      console.log('[ide] launching intellij:', found);
      execFile(found, [projectPath], (err: Error | null) => {
        if (err) console.error('[ide] intellij error:', err.message);
      });
    } else {
      console.error('[ide] IntelliJ not found — set the executable path in Settings');
    }
  }
}
