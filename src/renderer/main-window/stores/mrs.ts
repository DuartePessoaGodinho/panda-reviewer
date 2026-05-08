import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MR } from '../../types';

export const useMrsStore = defineStore('mrs', () => {
  const toReviewMrs = ref<MR[]>([]);
  const myMrs = ref<MR[]>([]);
  const activeMr = ref<MR | null>(null);
  const activePanelTab = ref<'diff' | 'ai'>('diff');
  const currentUserId = ref<number | null>(null);
  const locallyApproved = ref(new Set<number>());
  const repoCache = ref<Record<number, string | null>>({});

  const allMrs = computed(() => [...toReviewMrs.value, ...myMrs.value]);

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

  function setActiveMr(mr: MR | null) {
    activeMr.value = mr;
  }

  function setActivePanelTab(tab: 'diff' | 'ai') {
    activePanelTab.value = tab;
  }

  function update(data: { toReview: MR[]; myMrs: MR[]; currentUserId: number | null }) {
    toReviewMrs.value = data.toReview;
    myMrs.value = data.myMrs;
    if (data.currentUserId) currentUserId.value = data.currentUserId;
  }

  function setRepoCache(projectId: number, path: string | null) {
    repoCache.value[projectId] = path;
  }

  return {
    toReviewMrs,
    myMrs,
    activeMr,
    activePanelTab,
    currentUserId,
    locallyApproved,
    repoCache,
    allMrs,
    approvedByMe,
    findById,
    markApproved,
    setActiveMr,
    setActivePanelTab,
    update,
    setRepoCache,
  };
});
