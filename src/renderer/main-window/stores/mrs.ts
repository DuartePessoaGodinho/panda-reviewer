import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MR, MrActivityEvent, MrsUpdatePayload, ReviewCheckpoint } from '../../types';

const PINNED_MRS_STORAGE_KEY = 'pinnedMrIds';
const UNREAD_ACTIVITY_STORAGE_KEY = 'unreadMrActivity';

function loadPinnedIds(): Set<number> {
  try {
    const raw = localStorage.getItem(PINNED_MRS_STORAGE_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return new Set();
    return new Set(ids.filter((id): id is number => Number.isInteger(id)));
  } catch {
    return new Set();
  }
}

function savePinnedIds(ids: Set<number>) {
  localStorage.setItem(PINNED_MRS_STORAGE_KEY, JSON.stringify([...ids]));
}

function loadUnreadActivity(): Record<number, MrActivityEvent> {
  try {
    const raw = localStorage.getItem(UNREAD_ACTIVITY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([id, value]) => Number.isInteger(Number(id)) && value && typeof value === 'object')
    ) as Record<number, MrActivityEvent>;
  } catch {
    return {};
  }
}

function saveUnreadActivity(activity: Record<number, MrActivityEvent>) {
  localStorage.setItem(UNREAD_ACTIVITY_STORAGE_KEY, JSON.stringify(activity));
}

function sameMr(a: MR, b: MR): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function reconcileMrsList(current: MR[], incoming: MR[]): MR[] {
  const currentById = new Map(current.map(mr => [mr.id, mr]));
  const next = incoming.map(mr => {
    const existing = currentById.get(mr.id);
    return existing && sameMr(existing, mr) ? existing : mr;
  });

  if (next.length === current.length && next.every((mr, index) => mr === current[index])) {
    return current;
  }

  return next;
}

export const useMrsStore = defineStore('mrs', () => {
  const toReviewMrs = ref<MR[]>([]);
  const myMrs = ref<MR[]>([]);
  const activeMr = ref<MR | null>(null);
  const activePanelTab = ref<'diff' | 'comments' | 'ai'>('diff');
  const aiDrawerOpen = ref(false);
  const currentUserId = ref<number | null>(null);
  const locallyApproved = ref(new Set<number>());
  const locallyUnapproved = ref(new Set<number>());
  const repoCache = ref<Record<number, string | null>>({});
  const pinnedMrIds = ref(loadPinnedIds());
  const reviewCheckpoints = ref<Record<number, ReviewCheckpoint>>({});
  const unreadActivityByMrId = ref<Record<number, MrActivityEvent>>(loadUnreadActivity());

  const allMrs = computed(() => [...toReviewMrs.value, ...myMrs.value]);
  const uniqueOpenMrs = computed(() => [...new Map(allMrs.value.map(mr => [mr.id, mr])).values()]);
  const pinnedMrs = computed(() => uniqueOpenMrs.value.filter(mr => pinnedMrIds.value.has(mr.id)));
  const activeActivity = computed(() =>
    activeMr.value ? unreadActivityByMrId.value[activeMr.value.id] ?? null : null
  );
  const unreadReviewCount = computed(() => toReviewMrs.value.filter(mr => unreadActivityByMrId.value[mr.id]).length);
  const unreadMyMrsCount = computed(() => myMrs.value.filter(mr => unreadActivityByMrId.value[mr.id]).length);
  const unreadPinnedCount = computed(() => pinnedMrs.value.filter(mr => unreadActivityByMrId.value[mr.id]).length);

  function serverApprovedByMe(mr: MR): boolean {
    if (!currentUserId.value || !Array.isArray(mr.approved_by)) return false;
    return mr.approved_by.some(a => a.user?.id === currentUserId.value);
  }

  function approvedByMe(mr: MR): boolean {
    if (locallyUnapproved.value.has(mr.id)) return false;
    if (locallyApproved.value.has(mr.id)) return true;
    return serverApprovedByMe(mr);
  }

  function findById(id: number): MR | null {
    return allMrs.value.find(m => m.id === id) ?? null;
  }

  function markApproved(mrId: number) {
    locallyUnapproved.value.delete(mrId);
    locallyApproved.value.add(mrId);
  }

  function markUnapproved(mrId: number) {
    locallyApproved.value.delete(mrId);
    locallyUnapproved.value.add(mrId);
  }

  async function loadReviewCheckpoint(mrId: number): Promise<ReviewCheckpoint | null> {
    const checkpoint = await window.api.getReviewCheckpoint(mrId);
    if (checkpoint) reviewCheckpoints.value[mrId] = checkpoint;
    else delete reviewCheckpoints.value[mrId];
    return checkpoint;
  }

  async function markCurrentHeadReviewed(mr: MR, kind: ReviewCheckpoint['kind'] = 'manual'): Promise<ReviewCheckpoint | null> {
    const sourceSha = mr.sha ?? reviewCheckpoints.value[mr.id]?.sourceSha;
    if (!sourceSha) return null;

    const checkpoint = await window.api.saveReviewCheckpoint({
      mrId: mr.id,
      projectId: mr.project_id,
      mrIid: mr.iid,
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      sourceSha,
      reviewedAt: new Date().toISOString(),
      kind,
    });
    reviewCheckpoints.value[mr.id] = checkpoint;
    clearUnreadActivity(mr.id);
    return checkpoint;
  }

  function isPinned(mr: MR): boolean {
    return pinnedMrIds.value.has(mr.id);
  }

  function togglePinned(mr: MR) {
    if (pinnedMrIds.value.has(mr.id)) {
      pinnedMrIds.value.delete(mr.id);
    } else {
      pinnedMrIds.value.add(mr.id);
    }
    savePinnedIds(pinnedMrIds.value);
  }

  function setActiveMr(mr: MR | null) {
    activeMr.value = mr;
  }

  function setActivePanelTab(tab: 'diff' | 'comments' | 'ai') {
    activePanelTab.value = tab;
  }

  function setAiDrawerOpen(open: boolean) {
    aiDrawerOpen.value = open;
  }

  function mergeUnreadActivity(events: MrActivityEvent[] | undefined, openMrIds: Set<number>) {
    const next = { ...unreadActivityByMrId.value };
    for (const id of Object.keys(next)) {
      if (!openMrIds.has(Number(id))) delete next[Number(id)];
    }
    for (const event of events ?? []) {
      next[event.mrId] = event;
    }
    unreadActivityByMrId.value = next;
    saveUnreadActivity(next);
  }

  function clearUnreadActivity(mrId: number) {
    if (!unreadActivityByMrId.value[mrId]) return;
    const next = { ...unreadActivityByMrId.value };
    delete next[mrId];
    unreadActivityByMrId.value = next;
    saveUnreadActivity(next);
  }

  function reconcileLocalApprovalOverrides() {
    const openMrIds = new Set(allMrs.value.map(mr => mr.id));
    for (const mrId of [...locallyApproved.value]) {
      const mr = findById(mrId);
      if (!mr || serverApprovedByMe(mr)) locallyApproved.value.delete(mrId);
    }
    for (const mrId of [...locallyUnapproved.value]) {
      const mr = findById(mrId);
      if (!mr || !serverApprovedByMe(mr)) locallyUnapproved.value.delete(mrId);
    }
    for (const mrId of [...locallyApproved.value, ...locallyUnapproved.value]) {
      if (!openMrIds.has(mrId)) {
        locallyApproved.value.delete(mrId);
        locallyUnapproved.value.delete(mrId);
      }
    }
  }

  function update(data: MrsUpdatePayload) {
    const nextToReview = reconcileMrsList(toReviewMrs.value, data.toReview);
    const nextMyMrs = reconcileMrsList(myMrs.value, data.myMrs);
    if (nextToReview !== toReviewMrs.value) toReviewMrs.value = nextToReview;
    if (nextMyMrs !== myMrs.value) myMrs.value = nextMyMrs;
    if (data.currentUserId) currentUserId.value = data.currentUserId;
    reconcileLocalApprovalOverrides();
    const openMrIds = new Set([...data.toReview, ...data.myMrs].map(mr => mr.id));
    mergeUnreadActivity(data.activityEvents, openMrIds);
    if (activeMr.value) {
      activeMr.value = findById(activeMr.value.id);
    }
  }

  function setRepoCache(projectId: number, path: string | null) {
    repoCache.value[projectId] = path;
  }

  function clearRepoCache() {
    repoCache.value = {};
  }

  return {
    toReviewMrs,
    myMrs,
    activeMr,
    activePanelTab,
    aiDrawerOpen,
    currentUserId,
    locallyApproved,
    locallyUnapproved,
    repoCache,
    pinnedMrIds,
    reviewCheckpoints,
    unreadActivityByMrId,
    allMrs,
    uniqueOpenMrs,
    pinnedMrs,
    activeActivity,
    unreadReviewCount,
    unreadMyMrsCount,
    unreadPinnedCount,
    approvedByMe,
    findById,
    markApproved,
    markUnapproved,
    loadReviewCheckpoint,
    markCurrentHeadReviewed,
    isPinned,
    togglePinned,
    setActiveMr,
    setActivePanelTab,
    setAiDrawerOpen,
    clearUnreadActivity,
    update,
    setRepoCache,
    clearRepoCache,
  };
});
