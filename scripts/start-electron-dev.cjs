const { copyFileSync, existsSync, statSync } = require('fs');
const { execFileSync, spawn } = require('child_process');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const productName = 'Panda Reviewer';
const devProductName = `${productName} Dev`;
const sourceExe = path.join(projectDir, 'node_modules', 'electron', 'dist', 'electron.exe');
const devExe = path.join(projectDir, 'node_modules', 'electron', 'dist', `${devProductName}.exe`);
const iconPath = path.join(projectDir, 'assets', 'icon.ico');
const rceditPath = path.join(projectDir, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe');
const mainPath = path.join(projectDir, 'dist', 'main', 'main.js');
const staleElectronShortcut = path.join(
  process.env.APPDATA ?? '',
  'Microsoft',
  'Windows',
  'Start Menu',
  'Programs',
  'Electron.lnk'
);

function requireFile(file, label) {
  if (!existsSync(file)) {
    throw new Error(`${label} not found: ${file}`);
  }
}

function needsRefresh() {
  if (!existsSync(devExe)) return true;
  const devTime = statSync(devExe).mtimeMs;
  return (
    statSync(sourceExe).mtimeMs > devTime ||
    statSync(iconPath).mtimeMs > devTime ||
    statSync(__filename).mtimeMs > devTime
  );
}

function prepareDevExecutable() {
  requireFile(sourceExe, 'Electron executable');
  requireFile(iconPath, 'Windows icon');
  requireFile(rceditPath, 'rcedit');
  requireFile(mainPath, 'Built Electron main bundle');

  if (!needsRefresh()) return;

  copyFileSync(sourceExe, devExe);
  execFileSync(
    rceditPath,
    [
      devExe,
      '--set-icon',
      iconPath,
      '--set-version-string',
      'FileDescription',
      devProductName,
      '--set-version-string',
      'ProductName',
      devProductName,
      '--set-version-string',
      'InternalName',
      devProductName,
      '--set-version-string',
      'OriginalFilename',
      `${devProductName}.exe`,
    ],
    { stdio: 'inherit' }
  );
}

function removeStaleElectronShortcut() {
  if (!process.env.APPDATA || !existsSync(staleElectronShortcut)) return;

  try {
    const script = [
      '$shortcut = $args[0]',
      '$expected = $args[1]',
      '$shell = New-Object -ComObject WScript.Shell',
      '$link = $shell.CreateShortcut($shortcut)',
      'if ([IO.Path]::GetFullPath($link.TargetPath) -eq [IO.Path]::GetFullPath($expected)) {',
      '  Remove-Item -LiteralPath $shortcut -Force',
      '}',
    ].join('; ');

    execFileSync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script, staleElectronShortcut, sourceExe],
      { stdio: 'ignore' }
    );
  } catch {
    // Best effort cleanup. Launching the app is more important than failing on a stale shortcut.
  }
}

prepareDevExecutable();
removeStaleElectronShortcut();

const child = spawn(devExe, [mainPath], {
  cwd: projectDir,
  env: {
    ...process.env,
    PANDA_REVIEWER_DEV: '1',
  },
  stdio: 'inherit',
  windowsHide: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!child.killed) child.kill(signal);
  });
}
