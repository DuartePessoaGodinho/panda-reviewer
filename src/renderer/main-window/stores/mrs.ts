import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MR, ReviewCheckpoint } from '../../types';

const PINNED_MRS_STORAGE_KEY = 'pinnedMrIds';

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

export const useMrsStore = defineStore('mrs', () => {
  const toReviewMrs = ref<MR[]>([]);
  const myMrs = ref<MR[]>([]);
  const activeMr = ref<MR | null>(null);
  const activePanelTab = ref<'diff' | 'comments' | 'ai'>('diff');
  const aiDrawerOpen = ref(false);
  const currentUserId = ref<number | null>(null);
  const locallyApproved = ref(new Set<number>());
  const repoCache = ref<Record<number, string | null>>({});
  const pinnedMrIds = ref(loadPinnedIds());
  const reviewCheckpoints = ref<Record<number, ReviewCheckpoint>>({});

  const allMrs = computed(() => [...toReviewMrs.value, ...myMrs.value]);
  const uniqueOpenMrs = computed(() => [...new Map(allMrs.value.map(mr => [mr.id, mr])).values()]);
  const pinnedMrs = computed(() => uniqueOpenMrs.value.filter(mr => pinnedMrIds.value.has(mr.id)));

  function approvedByMe(mr: MR): boolean {
    if (locallyApproved.value.has(mr.id)) return true;
    if (!currentUserId.value || !Array.isArray(mr.approved_by)) return false;
    return mr.approved_by.some(a => a.user?.id === currentUserId.value);
  }

  function findById(id: number): MR | null {
    return allMrs.value.find(m => m.id === id) ?? null;
  }

  function markApproved(mrId: number) {
    locallyApproved.value.add(mrId);
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

  function update(data: { toReview: MR[]; myMrs: MR[]; currentUserId: number | null }) {
    toReviewMrs.value = data.toReview;
    myMrs.value = data.myMrs;
    if (data.currentUserId) currentUserId.value = data.currentUserId;
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
    repoCache,
    pinnedMrIds,
    reviewCheckpoints,
    allMrs,
    uniqueOpenMrs,
    pinnedMrs,
    approvedByMe,
    findById,
    markApproved,
    loadReviewCheckpoint,
    markCurrentHeadReviewed,
    isPinned,
    togglePinned,
    setActiveMr,
    setActivePanelTab,
    setAiDrawerOpen,
    update,
    setRepoCache,
    clearRepoCache,
  };
});
