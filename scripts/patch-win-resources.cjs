const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function requireFile(file, label) {
  if (!fs.existsSync(file)) {
    throw new Error(`${label} not found: ${file}`);
  }
  return file;
}

exports.default = async function patchWinResources(context) {
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const projectDir = context.packager.projectDir;
  const appInfo = context.packager.appInfo;
  const exePath = requireFile(
    path.join(context.appOutDir, `${appInfo.productFilename}.exe`),
    'Packaged Windows executable'
  );
  const iconPath = requireFile(path.join(projectDir, 'assets', 'icon.ico'), 'Windows icon');
  const rceditPath = requireFile(
    path.join(projectDir, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe'),
    'rcedit'
  );

  const productName = appInfo.productName;
  const companyName = appInfo.companyName || productName;
  const copyright = appInfo.copyright || `Copyright (C) ${new Date().getFullYear()} ${companyName}`;
  const version = appInfo.version;

  execFileSync(
    rceditPath,
    [
      exePath,
      '--set-icon',
      iconPath,
      '--set-version-string',
      'FileDescription',
      productName,
      '--set-version-string',
      'ProductName',
      productName,
      '--set-version-string',
      'CompanyName',
      companyName,
      '--set-version-string',
      'LegalCopyright',
      copyright,
      '--set-version-string',
      'InternalName',
      appInfo.productFilename,
      '--set-version-string',
      'OriginalFilename',
      `${appInfo.productFilename}.exe`,
      '--set-file-version',
      version,
      '--set-product-version',
      version,
    ],
    { stdio: 'inherit' }
  );
};
