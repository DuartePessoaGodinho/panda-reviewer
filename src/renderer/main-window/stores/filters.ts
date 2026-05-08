import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MR } from '../../types';
import { useMrsStore } from './mrs';

export type ApprovalFilter = 'all' | 'pending' | 'approved';

export const useFiltersStore = defineStore('filters', () => {
  const activeTab = ref<'review' | 'mine'>('review');
  const approval = ref<ApprovalFilter>('all');
  const noComments = ref(false);
  const hideDrafts = ref(false);
  const author = ref('all');

  const mrs = useMrsStore();

  function isDraft(mr: MR): boolean {
    return mr.title?.startsWith('Draft:') || mr.title?.startsWith('WIP:') || mr.work_in_progress;
  }

  const sourceMrs = computed(() =>
    activeTab.value === 'review' ? mrs.toReviewMrs : mrs.myMrs
  );

  const uniqueAuthors = computed(() => {
    const seen = new Map<string, MR['author']>();
    sourceMrs.value.forEach(mr => seen.set(mr.author.username, mr.author));
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  const filteredMrs = computed(() =>
    sourceMrs.value.filter(mr => {
      if (approval.value === 'pending' && mrs.approvedByMe(mr)) return false;
      if (approval.value === 'approved' && !mrs.approvedByMe(mr)) return false;
      if (noComments.value && mr.user_notes_count > 0) return false;
      if (hideDrafts.value && isDraft(mr)) return false;
      if (author.value !== 'all' && mr.author.username !== author.value) return false;
      return true;
    })
  );

  const isAnyActive = computed(() =>
    approval.value !== 'all' || noComments.value || hideDrafts.value || author.value !== 'all'
  );

  function reset() {
    approval.value = 'all';
    noComments.value = false;
    hideDrafts.value = false;
    author.value = 'all';
  }

  function switchTab(tab: 'review' | 'mine') {
    activeTab.value = tab;
    reset();
  }

  return {
    activeTab,
    approval,
    noComments,
    hideDrafts,
    author,
    sourceMrs,
    uniqueAuthors,
    filteredMrs,
    isAnyActive,
    reset,
    switchTab,
  };
});
