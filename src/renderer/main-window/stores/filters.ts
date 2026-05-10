import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue';
import type { MR } from '../../types';
import { useMrsStore } from './mrs';

export type ApprovalFilter = 'all' | 'pending' | 'approved';
export type TabKey = 'review' | 'mine' | 'pinned';
interface FilterState {
  approval: ApprovalFilter;
  noComments: boolean;
  hideDrafts: boolean;
  author: string;
}

function defaultFilters(): FilterState {
  return {
    approval: 'all',
    noComments: false,
    hideDrafts: false,
    author: 'all',
  };
}

export const useFiltersStore = defineStore('filters', () => {
  const activeTab = ref<TabKey>('review');
  const filtersByTab = reactive<Record<TabKey, FilterState>>({
    review: defaultFilters(),
    mine: defaultFilters(),
    pinned: defaultFilters(),
  });

  const mrs = useMrsStore();

  const activeFilters = computed(() => filtersByTab[activeTab.value]);
  const approval = computed({
    get: () => activeFilters.value.approval,
    set: value => { activeFilters.value.approval = value; },
  });
  const noComments = computed({
    get: () => activeFilters.value.noComments,
    set: value => { activeFilters.value.noComments = value; },
  });
  const hideDrafts = computed({
    get: () => activeFilters.value.hideDrafts,
    set: value => { activeFilters.value.hideDrafts = value; },
  });
  const author = computed({
    get: () => activeFilters.value.author,
    set: value => { activeFilters.value.author = value; },
  });

  function isDraft(mr: MR): boolean {
    return mr.title?.startsWith('Draft:') || mr.title?.startsWith('WIP:') || mr.work_in_progress;
  }

  const sourceMrs = computed(() =>
    activeTab.value === 'review'
      ? mrs.toReviewMrs
      : activeTab.value === 'mine'
        ? mrs.myMrs
        : mrs.pinnedMrs
  );

  const uniqueAuthors = computed(() => {
    const seen = new Map<string, MR['author']>();
    sourceMrs.value.forEach(mr => seen.set(mr.author.username, mr.author));
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  const filteredMrs = computed(() =>
    sourceMrs.value.filter(mr => {
      const current = activeFilters.value;
      if (current.approval === 'pending' && mrs.approvedByMe(mr)) return false;
      if (current.approval === 'approved' && !mrs.approvedByMe(mr)) return false;
      if (current.noComments && mr.user_notes_count > 0) return false;
      if (current.hideDrafts && isDraft(mr)) return false;
      if (current.author !== 'all' && mr.author.username !== current.author) return false;
      return true;
    })
  );

  const isAnyActive = computed(() => {
    const current = activeFilters.value;
    return current.approval !== 'all' || current.noComments || current.hideDrafts || current.author !== 'all';
  });

  function reset() {
    Object.assign(activeFilters.value, defaultFilters());
  }

  function switchTab(tab: TabKey) {
    activeTab.value = tab;
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
