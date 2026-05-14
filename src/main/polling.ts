import { Notification } from 'electron';
import { GitLabService, MergeRequest } from './gitlab';
import { getSettings } from './settings';
import { buildRepoCache } from './localRepo';

type SnapshotMap = Map<number, string>; // mr.id -> review activity key
export type MrActivityKind = 'new_mr' | 'new_commit' | 'author_comment' | 'updated';

export interface MrActivityEvent {
  mrId: number;
  projectId: number;
  mrIid: number;
  title: string;
  queue: 'To Review' | 'My MRs';
  kind: MrActivityKind;
  previousActivityKey?: string;
  activityKey: string;
  activityAt?: string;
  fromSha?: string;
  toSha?: string;
}

let reviewSnapshot: SnapshotMap = new Map();
let myMrsSnapshot: SnapshotMap = new Map();
let timer: NodeJS.Timeout | null = null;
let currentUserId: number | null = null;
let windowFocused = false;
let firstPoll = true; // skip notifications on first load — just build the baseline snapshot

const ACTIVE_INTERVAL_MS = 60 * 1000; // 1 min when window is open

export type MrUpdateCallback = (toReview: MergeRequest[], myMrs: MergeRequest[], activityEvents: MrActivityEvent[]) => void;

let onUpdate: MrUpdateCallback | null = null;

export function setUpdateCallback(cb: MrUpdateCallback): void {
  onUpdate = cb;
}

function notify(title: string, body: string): void {
  new Notification({ title, body }).show();
}

function truncateNotificationText(text: string, maxLength = 80): string {
  const trimmed = text.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
}

function notifyMrChange(kind: 'New MR' | 'MR Updated', label: string, mr: MergeRequest): void {
  const mrTitle = truncateNotificationText(mr.title);
  const reference = mr.references?.full ?? `!${mr.iid}`;
  const author = mr.author?.name ? ` by ${mr.author.name}` : '';

  notify(`${kind}: ${mrTitle}`, `${label} - ${reference}${author}`);
}

function reviewActivityKey(mr: MergeRequest): string {
  return mr.review_activity_key ?? (mr.sha ? `commit:${mr.sha}` : `created:${mr.id}:${mr.created_at}`);
}

function classifyActivity(mr: MergeRequest, isNew: boolean): MrActivityKind {
  if (isNew) return 'new_mr';
  if (mr.review_activity_kind === 'commit') return 'new_commit';
  if (mr.review_activity_kind === 'author_comment') return 'author_comment';
  return 'updated';
}

function commitShaFromActivityKey(key: string | undefined): string | undefined {
  return key?.startsWith('commit:') ? key.slice('commit:'.length) : undefined;
}

function buildActivityEvent(
  mr: MergeRequest,
  label: 'To Review' | 'My MRs',
  previousActivityKey: string | undefined,
  activityKey: string,
  isNew: boolean
): MrActivityEvent {
  return {
    mrId: mr.id,
    projectId: mr.project_id,
    mrIid: mr.iid,
    title: mr.title,
    queue: label,
    kind: classifyActivity(mr, isNew),
    previousActivityKey,
    activityKey,
    activityAt: mr.review_activity_at ?? mr.updated_at,
    fromSha: commitShaFromActivityKey(previousActivityKey),
    toSha: commitShaFromActivityKey(activityKey) ?? mr.sha,
  };
}

function detectChanges(
  prev: SnapshotMap,
  next: MergeRequest[],
  label: 'To Review' | 'My MRs'
): MrActivityEvent[] {
  const events: MrActivityEvent[] = [];
  for (const mr of next) {
    const prevActivity = prev.get(mr.id);
    const nextActivity = reviewActivityKey(mr);
    if (!prevActivity) {
      notifyMrChange('New MR', label, mr);
      events.push(buildActivityEvent(mr, label, prevActivity, nextActivity, true));
    } else if (prevActivity !== nextActivity) {
      notifyMrChange('MR Updated', label, mr);
      events.push(buildActivityEvent(mr, label, prevActivity, nextActivity, false));
    }
  }
  return events;
}

async function poll(): Promise<void> {
  const settings = getSettings();
  if (!settings.gitlabToken) return;

  try {
    const svc = new GitLabService(settings.gitlabUrl, settings.gitlabToken);

    if (!currentUserId) {
      const user = await svc.getCurrentUser();
      currentUserId = user.id;
      buildRepoCache(settings.repoPaths);
    }

    const [toReview, myMrs] = await Promise.all([
      svc.getMrsToReview(currentUserId),
      svc.getMyOpenMrs(currentUserId),
    ]);

    console.log(`[poll] userId=${currentUserId} toReview=${toReview.length} myMrs=${myMrs.length} focused=${windowFocused}`);

    const activityEvents = firstPoll
      ? []
      : [
          ...detectChanges(reviewSnapshot, toReview, 'To Review'),
          ...detectChanges(myMrsSnapshot, myMrs, 'My MRs'),
        ];
    firstPoll = false;

    reviewSnapshot = new Map(toReview.map(mr => [mr.id, reviewActivityKey(mr)]));
    myMrsSnapshot = new Map(myMrs.map(mr => [mr.id, reviewActivityKey(mr)]));

    onUpdate?.(toReview, myMrs, activityEvents);
  } catch (err) {
    console.error('Poll error:', err);
  }
}

function currentIntervalMs(): number {
  return windowFocused ? ACTIVE_INTERVAL_MS : getSettings().pollingIntervalMs;
}

function scheduleNext(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    await poll();
    scheduleNext();
  }, currentIntervalMs());
}

export function setWindowFocus(focused: boolean): void {
  if (windowFocused === focused) return;
  windowFocused = focused;
  // When gaining focus, poll immediately then resume at active rate
  if (focused) {
    if (timer) clearTimeout(timer);
    poll().then(() => scheduleNext());
  } else {
    scheduleNext(); // switch to background rate
  }
}

export function startPolling(): void {
  poll().then(() => scheduleNext());
}

export function stopPolling(): void {
  if (timer) clearTimeout(timer);
  timer = null;
}

export function resetPolling(): void {
  stopPolling();
  currentUserId = null;
  reviewSnapshot = new Map();
  myMrsSnapshot = new Map();
  firstPoll = true;
  startPolling();
}

export function getCurrentUserId(): number | null {
  return currentUserId;
}

export function getDebugState() {
  return {
    currentUserId,
    reviewCount: reviewSnapshot.size,
    myMrsCount: myMrsSnapshot.size,
    windowFocused,
    intervalMs: currentIntervalMs(),
  };
}
