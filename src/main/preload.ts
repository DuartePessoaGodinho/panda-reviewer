import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s: unknown) => ipcRenderer.invoke('save-settings', s),
  getMrs: () => ipcRenderer.invoke('get-mrs'),
  getMrDiff: (projectId: number, mrIid: number) =>
    ipcRenderer.invoke('get-mr-diff', projectId, mrIid),
  openInIde: (projectHttpUrl: string) => ipcRenderer.invoke('open-in-ide', projectHttpUrl),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  pickFile: (filters?: { name: string; extensions: string[] }[]) => ipcRenderer.invoke('pick-file', filters),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  forcePoll: () => ipcRenderer.invoke('force-poll'),
  checkClaudeCli: () => ipcRenderer.invoke('check-claude-cli'),
  checkAiReviewCli: (provider: string) => ipcRenderer.invoke('check-ai-review-cli', provider),
  findLocalRepoForMr: (url: string) => ipcRenderer.invoke('find-local-repo-for-mr', url),
  startClaudeReview: (payload: unknown) => ipcRenderer.invoke('start-claude-review', payload),
  startAiReview: (payload: unknown) => ipcRenderer.invoke('start-ai-review', payload),
  cancelClaudeReview: () => ipcRenderer.invoke('cancel-claude-review'),
  cancelAiReview: () => ipcRenderer.invoke('cancel-ai-review'),
  approveMr: (projectId: number, mrIid: number) => ipcRenderer.invoke('approve-mr', projectId, mrIid),
  getReviewContext: (mrId: number) => ipcRenderer.invoke('get-review-context', mrId),
  saveReviewContext: (mrId: number, text: string) => ipcRenderer.invoke('save-review-context', mrId, text),
  getReviewHistory: (mrId: number) => ipcRenderer.invoke('get-review-history', mrId),
  saveReviewEntry: (mrId: number, entry: unknown) => ipcRenderer.invoke('save-review-entry', mrId, entry),
  updateReviewNotes: (mrId: number, entryId: string, notes: string) => ipcRenderer.invoke('update-review-notes', mrId, entryId, notes),
  onClaudeChunk: (cb: (text: string) => void) => ipcRenderer.on('claude-chunk', (_e, t) => cb(t)),
  onClaudeDone:  (cb: () => void)             => ipcRenderer.on('claude-done',  () => cb()),
  onClaudeError: (cb: (msg: string) => void)  => ipcRenderer.on('claude-error', (_e, m) => cb(m)),
  onMrsUpdated: (cb: (data: unknown) => void) => {
    ipcRenderer.on('mrs-updated', (_e, data) => cb(data));
  },
  onSettingsUpdated: (cb: (data: unknown) => void) => {
    ipcRenderer.on('settings-updated', (_e, data) => cb(data));
  },
});
