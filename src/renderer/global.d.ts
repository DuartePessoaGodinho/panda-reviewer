import type {
  AiReviewProvider,
  DiffPosition,
  GitLabDiscussion,
  GitLabDiscussionNote,
  MergeRequestVersion,
  ReviewCheckpoint,
  ReviewEntry,
} from './types';

interface ElectronAPI {
  getSettings: () => Promise<any>;
  saveSettings: (s: any) => Promise<any>;
  getMrs: () => Promise<{ toReview: any[]; myMrs: any[]; currentUserId: number | null }>;
  getMrDiff: (projectId: number, mrIid: number) => Promise<any>;
  getNewChangesDiff: (projectId: number, fromSha: string, toSha: string) => Promise<any>;
  getMrDiscussions: (projectId: number, mrIid: number) => Promise<GitLabDiscussion[]>;
  createMrComment: (projectId: number, mrIid: number, body: string) => Promise<GitLabDiscussion>;
  createDiffComment: (projectId: number, mrIid: number, position: DiffPosition, body: string) => Promise<GitLabDiscussion>;
  replyToDiscussion: (projectId: number, mrIid: number, discussionId: string, body: string) => Promise<GitLabDiscussionNote>;
  setDiscussionResolved: (projectId: number, mrIid: number, discussionId: string, resolved: boolean) => Promise<GitLabDiscussion>;
  updateComment: (projectId: number, mrIid: number, discussionId: string, noteId: number, body: string) => Promise<GitLabDiscussionNote>;
  deleteComment: (projectId: number, mrIid: number, discussionId: string, noteId: number) => Promise<void>;
  getLatestMrVersion: (projectId: number, mrIid: number) => Promise<MergeRequestVersion | null>;
  openInIde: (url: string) => Promise<{ found: boolean; cloneUrl?: string }>;
  openExternal: (url: string) => void;
  pickFolder: () => Promise<string | null>;
  pickFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
  closeWindow: () => void;
  minimizeWindow: () => void;
  setThemeBackground: (theme: 'light' | 'dark') => Promise<void>;
  openSettings: () => Promise<void>;
  forcePoll: () => Promise<void>;
  checkClaudeCli: () => Promise<{ available: boolean; version?: string }>;
  checkAiReviewCli: (provider: AiReviewProvider) => Promise<{ available: boolean; version?: string }>;
  findLocalRepoForMr: (url: string) => Promise<string | null>;
  startClaudeReview: (payload: { repoPath: string; sourceBranch: string; targetBranch: string; mrIid?: number; mrTitle: string; userContext: string }) => Promise<void>;
  startAiReview: (payload: { provider?: AiReviewProvider; repoPath: string; sourceBranch: string; targetBranch: string; mrIid?: number; mrTitle: string; userContext: string }) => Promise<void>;
  cancelClaudeReview: () => Promise<void>;
  cancelAiReview: () => Promise<void>;
  approveMr: (projectId: number, mrIid: number) => Promise<void>;
  getReviewContext: (mrId: number) => Promise<string>;
  saveReviewContext: (mrId: number, text: string) => Promise<void>;
  getReviewHistory: (mrId: number) => Promise<ReviewEntry[]>;
  saveReviewEntry: (mrId: number, entry: ReviewEntry) => Promise<void>;
  updateReviewNotes: (mrId: number, entryId: string, notes: string) => Promise<void>;
  getReviewCheckpoint: (mrId: number) => Promise<ReviewCheckpoint | null>;
  saveReviewCheckpoint: (checkpoint: ReviewCheckpoint) => Promise<ReviewCheckpoint>;
  onClaudeChunk: (cb: (text: string) => void) => void;
  onClaudeDone:  (cb: () => void) => void;
  onClaudeError: (cb: (msg: string) => void) => void;
  onMrsUpdated: (cb: (data: any) => void) => void;
  onSettingsUpdated: (cb: (data: any) => void) => void;
  onShowSettings: (cb: () => void) => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}

export {};
