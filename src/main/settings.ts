import Store from 'electron-store';
import { AiReviewProvider } from './aiReview';

export interface ReviewContext {
  text: string;
  savedAt: string;
}

export interface ReviewEntry {
  id: string;
  createdAt: string;
  context: string;
  output: string;
  notes: string;
}

export interface AppSettings {
  gitlabToken: string;
  gitlabUrl: string;
  repoPaths: string[];
  ide: 'vscode' | 'intellij';
  intellijPath: string;
  pollingIntervalMs: number;
  aiReviewEnabled: boolean;
  aiReviewProvider: AiReviewProvider;
  reviewContexts: Record<string, ReviewContext>;
}

const CONTEXT_TTL_DAYS = 60;
const REVIEW_HISTORY_TTL_DAYS = 90;

const defaults: AppSettings = {
  gitlabToken: '',
  gitlabUrl: 'https://gitlab.com',
  repoPaths: [],
  ide: 'vscode',
  intellijPath: '',
  pollingIntervalMs: 5 * 60 * 1000,
  aiReviewEnabled: true,
  aiReviewProvider: 'claude',
  reviewContexts: {},
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Store<any>({ defaults });

export function getSettings(): AppSettings {
  return {
    gitlabToken: store.get('gitlabToken'),
    gitlabUrl: store.get('gitlabUrl'),
    repoPaths: store.get('repoPaths'),
    ide: store.get('ide'),
    intellijPath: store.get('intellijPath'),
    pollingIntervalMs: store.get('pollingIntervalMs'),
    aiReviewEnabled: store.get('aiReviewEnabled'),
    aiReviewProvider: store.get('aiReviewProvider'),
    reviewContexts: store.get('reviewContexts'),
  };
}

export function saveSettings(settings: Partial<AppSettings>): void {
  for (const [key, value] of Object.entries(settings)) {
    store.set(key, value);
  }
}

export function isConfigured(): boolean {
  return !!store.get('gitlabToken');
}

export function getReviewContext(mrId: number): string {
  const contexts = store.get('reviewContexts');
  return contexts[String(mrId)]?.text ?? '';
}

export function saveReviewContext(mrId: number, text: string): void {
  const contexts = store.get('reviewContexts');
  contexts[String(mrId)] = { text, savedAt: new Date().toISOString() };
  store.set('reviewContexts', contexts);
}

export function getReviewHistory(mrId: number): ReviewEntry[] {
  const history = store.get('reviewHistory') ?? {};
  return history[String(mrId)] ?? [];
}

export function saveReviewEntry(mrId: number, entry: ReviewEntry): void {
  const history = store.get('reviewHistory') ?? {};
  const key = String(mrId);
  if (!history[key]) history[key] = [];
  history[key].unshift(entry); // newest first
  store.set('reviewHistory', history);
}

export function updateReviewNotes(mrId: number, entryId: string, notes: string): void {
  const history = store.get('reviewHistory') ?? {};
  const entries: ReviewEntry[] = history[String(mrId)] ?? [];
  const entry = entries.find(e => e.id === entryId);
  if (entry) {
    entry.notes = notes;
    store.set('reviewHistory', history);
  }
}

export function pruneOldReviewHistory(): void {
  const history = store.get('reviewHistory') ?? {};
  const cutoff = Date.now() - REVIEW_HISTORY_TTL_DAYS * 24 * 60 * 60 * 1000;
  let changed = false;
  for (const [key, entries] of Object.entries(history) as [string, ReviewEntry[]][]) {
    const filtered = entries.filter(e => new Date(e.createdAt).getTime() > cutoff);
    if (filtered.length !== entries.length) {
      if (filtered.length === 0) delete history[key];
      else history[key] = filtered;
      changed = true;
    }
  }
  if (changed) store.set('reviewHistory', history);
}

export function pruneOldReviewContexts(): void {
  const contexts = store.get('reviewContexts');
  const cutoff = Date.now() - CONTEXT_TTL_DAYS * 24 * 60 * 60 * 1000;
  let changed = false;
  for (const [key, val] of Object.entries(contexts) as [string, ReviewContext][]) {
    if (new Date(val.savedAt).getTime() < cutoff) {
      delete contexts[key];
      changed = true;
    }
  }
  if (changed) store.set('reviewContexts', contexts);
}
