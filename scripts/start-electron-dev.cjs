const { copyFileSync, existsSync, statSync } = require('fs');
const { execFileSync, spawn } = require('child_process');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const productName = 'Panda Reviewer';
const sourceExe = path.join(projectDir, 'node_modules', 'electron', 'dist', 'electron.exe');
const devExe = path.join(projectDir, 'node_modules', 'electron', 'dist', `${productName} Dev.exe`);
const iconPath = path.join(projectDir, 'assets', 'icon.ico');
const rceditPath = path.join(projectDir, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe');
const mainPath = path.join(projectDir, 'dist', 'main', 'main.js');

function requireFile(file, label) {
  if (!existsSync(file)) {
    throw new Error(`${label} not found: ${file}`);
  }
}

function needsRefresh() {
  if (!existsSync(devExe)) return true;
  const devTime = statSync(devExe).mtimeMs;
  return statSync(sourceExe).mtimeMs > devTime || statSync(iconPath).mtimeMs > devTime;
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
      productName,
      '--set-version-string',
      'ProductName',
      productName,
      '--set-version-string',
      'InternalName',
      productName,
      '--set-version-string',
      'OriginalFilename',
      `${productName} Dev.exe`,
    ],
    { stdio: 'inherit' }
  );
}

prepareDevExecutable();

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
