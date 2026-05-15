import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s: unknown) => ipcRenderer.invoke('save-settings', s),
  getMrs: () => ipcRenderer.invoke('get-mrs'),
  getMrDiff: (projectId: number, mrIid: number) =>
    ipcRenderer.invoke('get-mr-diff', projectId, mrIid),
  getNewChangesDiff: (projectId: number, fromSha: string, toSha: string) =>
    ipcRenderer.invoke('get-new-changes-diff', projectId, fromSha, toSha),
  getMrDiscussions: (projectId: number, mrIid: number) =>
    ipcRenderer.invoke('get-mr-discussions', projectId, mrIid),
  createMrComment: (projectId: number, mrIid: number, body: string) =>
    ipcRenderer.invoke('create-mr-comment', projectId, mrIid, body),
  createDiffComment: (projectId: number, mrIid: number, position: unknown, body: string) =>
    ipcRenderer.invoke('create-diff-comment', projectId, mrIid, position, body),
  replyToDiscussion: (projectId: number, mrIid: number, discussionId: string, body: string) =>
    ipcRenderer.invoke('reply-to-discussion', projectId, mrIid, discussionId, body),
  setDiscussionResolved: (projectId: number, mrIid: number, discussionId: string, resolved: boolean) =>
    ipcRenderer.invoke('set-discussion-resolved', projectId, mrIid, discussionId, resolved),
  updateComment: (projectId: number, mrIid: number, discussionId: string, noteId: number, body: string) =>
    ipcRenderer.invoke('update-comment', projectId, mrIid, discussionId, noteId, body),
  deleteComment: (projectId: number, mrIid: number, discussionId: string, noteId: number) =>
    ipcRenderer.invoke('delete-comment', projectId, mrIid, discussionId, noteId),
  getLatestMrVersion: (projectId: number, mrIid: number) =>
    ipcRenderer.invoke('get-latest-mr-version', projectId, mrIid),
  openInIde: (projectHttpUrl: string) => ipcRenderer.invoke('open-in-ide', projectHttpUrl),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  pickFile: (filters?: { name: string; extensions: string[] }[]) => ipcRenderer.invoke('pick-file', filters),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  setThemeBackground: (theme: 'light' | 'dark') => ipcRenderer.invoke('set-theme-background', theme),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  forcePoll: () => ipcRenderer.invoke('force-poll'),
  checkAiReviewCli: (provider: string) => ipcRenderer.invoke('check-ai-review-cli', provider),
  findLocalRepoForMr: (url: string) => ipcRenderer.invoke('find-local-repo-for-mr', url),
  startAiReview: (payload: unknown) => ipcRenderer.invoke('start-ai-review', payload),
  cancelAiReview: () => ipcRenderer.invoke('cancel-ai-review'),
  approveMr: (projectId: number, mrIid: number) => ipcRenderer.invoke('approve-mr', projectId, mrIid),
  getReviewContext: (mrId: number) => ipcRenderer.invoke('get-review-context', mrId),
  saveReviewContext: (mrId: number, text: string) => ipcRenderer.invoke('save-review-context', mrId, text),
  getReviewHistory: (mrId: number) => ipcRenderer.invoke('get-review-history', mrId),
  saveReviewEntry: (mrId: number, entry: unknown) => ipcRenderer.invoke('save-review-entry', mrId, entry),
  updateReviewNotes: (mrId: number, entryId: string, notes: string) => ipcRenderer.invoke('update-review-notes', mrId, entryId, notes),
  getReviewCheckpoint: (mrId: number) => ipcRenderer.invoke('get-review-checkpoint', mrId),
  saveReviewCheckpoint: (checkpoint: unknown) => ipcRenderer.invoke('save-review-checkpoint', checkpoint),
  onClaudeChunk: (cb: (text: string) => void) => ipcRenderer.on('claude-chunk', (_e, t) => cb(t)),
  onClaudeDone:  (cb: () => void)             => ipcRenderer.on('claude-done',  () => cb()),
  onClaudeError: (cb: (msg: string) => void)  => ipcRenderer.on('claude-error', (_e, m) => cb(m)),
  onMrsUpdated: (cb: (data: unknown) => void) => {
    ipcRenderer.on('mrs-updated', (_e, data) => cb(data));
  },
  onSettingsUpdated: (cb: (data: unknown) => void) => {
    ipcRenderer.on('settings-updated', (_e, data) => cb(data));
  },
  onShowSettings: (cb: () => void) => {
    ipcRenderer.on('show-settings', () => cb());
  },
});
