import { Notification } from 'electron';
import { GitLabService, MergeRequest } from './gitlab';
import { getSettings } from './settings';
import { buildRepoCache } from './localRepo';

interface MrSnapshot {
  activityKey: string;
  approvalSig: string;
}
type SnapshotMap = Map<number, MrSnapshot>; // mr.id -> { activityKey, approvalSig }
export type MrActivityKind =
  | 'new_mr'
  | 'new_commit'
  | 'author_comment'
  | 'updated'
  | 'approved'
  | 'fully_approved'
  | 'approval_removed';

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

type NotificationKind = 'New MR' | 'MR Updated' | 'MR Approved' | 'MR Ready to Merge' | 'Approval Removed';

function notifyMrChange(kind: NotificationKind, label: string, mr: MergeRequest, detail?: string): void {
  const mrTitle = truncateNotificationText(mr.title);
  const reference = mr.references?.full ?? `!${mr.iid}`;
  const author = mr.author?.name ? ` by ${mr.author.name}` : '';
  const tail = detail ? ` — ${detail}` : '';

  notify(`${kind}: ${mrTitle}`, `${label} - ${reference}${author}${tail}`);
}

function reviewActivityKey(mr: MergeRequest): string {
  return mr.review_activity_key ?? (mr.sha ? `commit:${mr.sha}` : `created:${mr.id}:${mr.created_at}`);
}

function approverIds(mr: MergeRequest): number[] {
  return (mr.approved_by ?? [])
    .map(a => a.user?.id)
    .filter((id): id is number => typeof id === 'number')
    .sort((a, b) => a - b);
}

function approvalSig(mr: MergeRequest): string {
  const left = typeof mr.approvals_left === 'number' ? mr.approvals_left : -1;
  const required = typeof mr.approvals_required === 'number' ? mr.approvals_required : -1;
  return `${required}:${left}:${approverIds(mr).join(',')}`;
}

function snapshotOf(mr: MergeRequest): MrSnapshot {
  return { activityKey: reviewActivityKey(mr), approvalSig: approvalSig(mr) };
}

function classifyActivity(mr: MergeRequest, isNew: boolean): MrActivityKind {
  if (isNew) return 'new_mr';
  if (mr.review_activity_kind === 'commit') return 'new_commit';
  if (mr.review_activity_kind === 'author_comment') return 'author_comment';
  return 'updated';
}

interface ApprovalDelta {
  added: number[];   // approver IDs newly added
  removed: number[]; // approver IDs newly removed
  prevLeft: number | null;
  nextLeft: number | null;
}

function diffApprovals(prevSig: string | undefined, mr: MergeRequest): ApprovalDelta | null {
  if (prevSig === undefined) return null;
  const [, prevLeftRaw, prevIdsRaw] = prevSig.split(':');
  const prevIds = prevIdsRaw ? prevIdsRaw.split(',').map(Number).filter(Number.isFinite) : [];
  const nextIds = approverIds(mr);
  const prevSet = new Set(prevIds);
  const nextSet = new Set(nextIds);
  const added = nextIds.filter(id => !prevSet.has(id));
  const removed = prevIds.filter(id => !nextSet.has(id));
  const prevLeft = prevLeftRaw === '-1' ? null : Number(prevLeftRaw);
  const nextLeft = typeof mr.approvals_left === 'number' ? mr.approvals_left : null;
  return { added, removed, prevLeft, nextLeft };
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

function approverDisplayName(mr: MergeRequest, userId: number): string {
  const u = (mr.approved_by ?? []).find(a => a.user?.id === userId)?.user;
  return u?.name || u?.username || `user ${userId}`;
}

function buildApprovalEvent(
  mr: MergeRequest,
  label: 'To Review' | 'My MRs',
  prevActivityKey: string,
  nextActivityKey: string,
  kind: 'approved' | 'fully_approved' | 'approval_removed'
): MrActivityEvent {
  const base = buildActivityEvent(mr, label, prevActivityKey, nextActivityKey, false);
  return { ...base, kind };
}

function detectChanges(
  prev: SnapshotMap,
  next: MergeRequest[],
  label: 'To Review' | 'My MRs'
): MrActivityEvent[] {
  const events: MrActivityEvent[] = [];
  for (const mr of next) {
    const prevSnap = prev.get(mr.id);
    const nextActivity = reviewActivityKey(mr);

    if (!prevSnap) {
      notifyMrChange('New MR', label, mr);
      events.push(buildActivityEvent(mr, label, undefined, nextActivity, true));
      continue;
    }

    if (prevSnap.activityKey !== nextActivity) {
      // Commit/comment activity dominates — approval signature often resets on new commits
      // and a separate "approval removed" notification would just be noise.
      notifyMrChange('MR Updated', label, mr);
      events.push(buildActivityEvent(mr, label, prevSnap.activityKey, nextActivity, false));
      continue;
    }

    const nextApprovalSig = approvalSig(mr);
    if (prevSnap.approvalSig === nextApprovalSig) continue;

    const delta = diffApprovals(prevSnap.approvalSig, mr);
    if (!delta) continue;

    // Suppress self-approval echo: if the only newly-added approver is the current user,
    // they just clicked Approve in-app — no need to notify them about their own action.
    const newApproversExcludingSelf = delta.added.filter(id => id !== currentUserId);
    const removedExcludingSelf = delta.removed.filter(id => id !== currentUserId);

    if (delta.added.length > 0 && newApproversExcludingSelf.length === 0 && removedExcludingSelf.length === 0) {
      // Self-approve only. Still emit an in-app activity event so the badge reflects state,
      // but skip the desktop notification.
      events.push(buildApprovalEvent(mr, label, prevSnap.activityKey, nextActivity,
        delta.nextLeft === 0 ? 'fully_approved' : 'approved'));
      continue;
    }

    if (delta.added.length > 0) {
      const becameFullyApproved = delta.prevLeft !== 0 && delta.nextLeft === 0;
      const namesLabel = newApproversExcludingSelf.length > 0
        ? newApproversExcludingSelf.map(id => approverDisplayName(mr, id)).join(', ')
        : delta.added.map(id => approverDisplayName(mr, id)).join(', ');

      if (becameFullyApproved) {
        notifyMrChange('MR Ready to Merge', label, mr, `Approved by ${namesLabel}`);
        events.push(buildApprovalEvent(mr, label, prevSnap.activityKey, nextActivity, 'fully_approved'));
      } else {
        notifyMrChange('MR Approved', label, mr, `Approved by ${namesLabel}`);
        events.push(buildApprovalEvent(mr, label, prevSnap.activityKey, nextActivity, 'approved'));
      }
    } else if (delta.removed.length > 0) {
      const namesLabel = delta.removed.map(id => approverDisplayName(mr, id)).join(', ');
      notifyMrChange('Approval Removed', label, mr, `By ${namesLabel}`);
      events.push(buildApprovalEvent(mr, label, prevSnap.activityKey, nextActivity, 'approval_removed'));
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

    reviewSnapshot = new Map(toReview.map(mr => [mr.id, snapshotOf(mr)]));
    myMrsSnapshot = new Map(myMrs.map(mr => [mr.id, snapshotOf(mr)]));

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
