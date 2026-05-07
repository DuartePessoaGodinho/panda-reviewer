import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  dialog,
  nativeImage,
  shell,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import { getSettings, saveSettings, isConfigured, getReviewContext, saveReviewContext, pruneOldReviewContexts, getReviewHistory, saveReviewEntry, updateReviewNotes, pruneOldReviewHistory, ReviewEntry } from './settings';
import { GitLabService, MergeRequest } from './gitlab';
import { startPolling, stopPolling, resetPolling, setUpdateCallback, getDebugState, setWindowFocus, getCurrentUserId } from './polling';
import { findLocalRepo, buildRepoCache } from './localRepo';
import { openInIde } from './ide';
import { AiReviewProvider, startAiReview, cancelAiReview, checkAiReviewCli, isReviewRunning } from './aiReview';

app.setAppUserModelId('com.panda-reviewer.app');

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;

let cachedToReview: MergeRequest[] = [];
let cachedMyMrs: MergeRequest[] = [];

function getIconPath(): string {
  return path.join(__dirname, '../../assets/icon.png');
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 720,
    minHeight: 500,
    frame: false,
    icon: getIconPath(),
    titleBarStyle: 'hidden',
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegrationInSubFrames: true,
    },
    show: false,
  });

  win.loadFile(path.join(__dirname, '../renderer/main-window/index.html'));

  win.once('ready-to-show', () => win.show());
  win.on('focus', () => setWindowFocus(true));
  win.on('blur',  () => setWindowFocus(false));
  win.on('closed', () => { setWindowFocus(false); mainWindow = null; });

  return win;
}

function openSettings(): void {
  const win = mainWindow ?? (mainWindow = createMainWindow());
  const showSettings = () => win.webContents.send('show-settings');

  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', showSettings);
  } else {
    showSettings();
  }

  win.focus();
}

function openMain(): void {
  if (mainWindow) { mainWindow.focus(); return; }
  mainWindow = createMainWindow();
}

function setupTray(): void {
  const icon = nativeImage.createFromPath(getIconPath()).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Panda Reviewer');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open', click: openMain },
    { label: 'Settings', click: openSettings },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', openMain);
}

// IPC handlers
ipcMain.handle('get-settings', () => getSettings());

ipcMain.handle('save-settings', async (_e, settings) => {
  saveSettings(settings);
  if (settings.aiReviewEnabled === false && isReviewRunning()) {
    cancelAiReview();
  }
  resetPolling();
  mainWindow?.webContents.send('settings-updated', getSettings());
  openMain();
  return { ok: true };
});

ipcMain.handle('get-mrs', () => ({
  toReview: cachedToReview,
  myMrs: cachedMyMrs,
  currentUserId: getCurrentUserId(),
}));

ipcMain.handle('get-mr-diff', async (_e, projectId: number, mrIid: number) => {
  const { gitlabToken, gitlabUrl } = getSettings();
  const svc = new GitLabService(gitlabUrl, gitlabToken);
  return svc.getMrChanges(projectId, mrIid);
});

ipcMain.handle('open-in-ide', (_e, projectHttpUrl: string) => {
  const { ide, repoPaths, intellijPath } = getSettings();
  console.log('[ide] repoPaths:', repoPaths);
  console.log('[ide] looking for:', projectHttpUrl);
  buildRepoCache(repoPaths);
  const localPath = findLocalRepo(projectHttpUrl);
  console.log('[ide] found:', localPath);
  if (localPath) {
    openInIde(ide, localPath, intellijPath);
    return { found: true };
  }
  return { found: false, cloneUrl: projectHttpUrl };
});

ipcMain.handle('open-external', (_e, url: string) => shell.openExternal(url));

ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return result.filePaths[0] ?? null;
});

ipcMain.handle('pick-file', async (_e, filters?: { name: string; extensions: string[] }[]) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: filters ?? [{ name: 'All Files', extensions: ['*'] }],
  });
  return result.filePaths[0] ?? null;
});

ipcMain.handle('open-settings', () => openSettings());
ipcMain.handle('force-poll', () => resetPolling());
ipcMain.handle('debug-state', () => ({ poll: getDebugState(), cache: { toReview: cachedToReview.length, myMrs: cachedMyMrs.length } }));

// ── AI Review ─────────────────────────────────────────────────────────────

ipcMain.handle('check-claude-cli', async () => {
  return checkAiReviewCli('claude');
});

ipcMain.handle('check-ai-review-cli', (_e, provider: AiReviewProvider) => checkAiReviewCli(provider));

ipcMain.handle('find-local-repo-for-mr', (_e, projectHttpUrl: string) => {
  const { repoPaths } = getSettings();
  buildRepoCache(repoPaths);
  return findLocalRepo(projectHttpUrl);
});

ipcMain.handle('start-claude-review', (_e, payload: {
  repoPath: string;
  sourceBranch: string;
  targetBranch: string;
  mrTitle: string;
  userContext: string;
}) => {
  const { aiReviewEnabled, aiReviewProvider } = getSettings();
  if (!aiReviewEnabled) {
    mainWindow?.webContents.send('claude-error', 'AI Review is disabled in Settings.');
    return;
  }

  if (isReviewRunning()) cancelAiReview();

  startAiReview(
    aiReviewProvider,
    payload.repoPath,
    payload.sourceBranch,
    payload.targetBranch,
    payload.mrTitle,
    payload.userContext,
    {
      onChunk: (text) => mainWindow?.webContents.send('claude-chunk', text),
      onDone:  ()     => mainWindow?.webContents.send('claude-done'),
      onError: (msg)  => mainWindow?.webContents.send('claude-error', msg),
    }
  );
});

ipcMain.handle('start-ai-review', (_e, payload: {
  provider?: AiReviewProvider;
  repoPath: string;
  sourceBranch: string;
  targetBranch: string;
  mrTitle: string;
  userContext: string;
}) => {
  const { aiReviewEnabled, aiReviewProvider } = getSettings();
  if (!aiReviewEnabled) {
    mainWindow?.webContents.send('claude-error', 'AI Review is disabled in Settings.');
    return;
  }

  if (isReviewRunning()) cancelAiReview();

  startAiReview(
    payload.provider ?? aiReviewProvider,
    payload.repoPath,
    payload.sourceBranch,
    payload.targetBranch,
    payload.mrTitle,
    payload.userContext,
    {
      onChunk: (text) => mainWindow?.webContents.send('claude-chunk', text),
      onDone:  ()     => mainWindow?.webContents.send('claude-done'),
      onError: (msg)  => mainWindow?.webContents.send('claude-error', msg),
    }
  );
});

ipcMain.handle('cancel-claude-review', () => cancelAiReview());
ipcMain.handle('cancel-ai-review', () => cancelAiReview());

ipcMain.handle('approve-mr', async (_e, projectId: number, mrIid: number) => {
  const { gitlabToken, gitlabUrl } = getSettings();
  const svc = new GitLabService(gitlabUrl, gitlabToken);
  await svc.approveMr(projectId, mrIid);
});

ipcMain.handle('get-review-context',  (_e, mrId: number) => getReviewContext(mrId));
ipcMain.handle('save-review-context', (_e, mrId: number, text: string) => saveReviewContext(mrId, text));

ipcMain.handle('get-review-history',   (_e, mrId: number) => getReviewHistory(mrId));
ipcMain.handle('save-review-entry',    (_e, mrId: number, entry: ReviewEntry) => saveReviewEntry(mrId, entry));
ipcMain.handle('update-review-notes',  (_e, mrId: number, entryId: string, notes: string) => updateReviewNotes(mrId, entryId, notes));

// ─────────────────────────────────────────────────────────────────────────

ipcMain.handle('close-window', (e) => {
  BrowserWindow.fromWebContents(e.sender)?.close();
});

ipcMain.handle('minimize-window', (e) => {
  BrowserWindow.fromWebContents(e.sender)?.minimize();
});

app.whenReady().then(() => {
  pruneOldReviewContexts();
  pruneOldReviewHistory();
  setupTray();
  autoUpdater.checkForUpdatesAndNotify();

  if (!isConfigured()) {
    openSettings();
  } else {
    openMain();
  }

  setUpdateCallback((toReview, myMrs) => {
    cachedToReview = toReview;
    cachedMyMrs = myMrs;
    mainWindow?.webContents.send('mrs-updated', { toReview, myMrs, currentUserId: getCurrentUserId() });
  });

  startPolling();
});

app.on('window-all-closed', () => { /* keep alive in tray */ });
