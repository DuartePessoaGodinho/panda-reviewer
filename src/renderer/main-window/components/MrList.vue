<template>
  <div class="mr-panel">
    <div class="mr-tabs" role="tablist" aria-label="Merge request source">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="mr-tab"
        :class="{ active: filters.activeTab === tab.key }"
        :title="tab.label"
        role="tab"
        :aria-selected="filters.activeTab === tab.key"
        @click="switchTab(tab.key)"
      >
        <span class="mr-tab-label">{{ tab.label }}</span>
        <span class="mr-tab-count" :class="{ zero: tab.count === 0 }">{{ tab.count }}</span>
      </button>
    </div>
    <FilterBar />
    <div class="mr-list">
      <Transition name="tab-content" mode="out-in">
        <div :key="filters.activeTab" class="mr-list-inner">
          <!-- Loading skeletons -->
          <template v-if="loading">
            <div class="skeleton-card" v-for="n in 3" :key="n">
              <div class="skeleton sk-line" :style="{ width: n === 1 ? '40%' : n === 2 ? '35%' : '28%' }"></div>
              <div class="skeleton sk-title" :style="{ width: n === 1 ? '85%' : n === 2 ? '75%' : '68%' }"></div>
              <div class="skeleton sk-sub"  :style="{ width: n === 1 ? '55%' : n === 2 ? '45%' : '38%' }"></div>
            </div>
          </template>

          <!-- Empty state -->
          <div v-else-if="filters.filteredMrs.length === 0" class="empty-state">
            <div class="empty-icon">{{ emptyIcon }}</div>
            <div class="empty-title">{{ emptyTitle }}</div>
            <div class="empty-sub" v-html="emptySub"></div>
          </div>

          <!-- Cards -->
          <MrCard
            v-else
            v-for="(mr, i) in filters.filteredMrs"
            :key="mr.id"
            :mr="mr"
            :index="i"
            :is-active="mrs.activeMr?.id === mr.id"
            :approved="mrs.approvedByMe(mr)"
            :pinned="mrs.isPinned(mr)"
            :has-repo="mrs.repoCache[mr.project_id] != null"
            :ai-enabled="aiEnabled"
            @open="onOpen"
            @ai-review="onAiReview"
            @open-in-ide="onOpenInIde"
            @approve="onApprove"
            @toggle-pin="onTogglePin"
            @open-external="onOpenExternal"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { MR } from '../../types';
import { useMrsStore } from '../stores/mrs';
import { useFiltersStore } from '../stores/filters';
import type { TabKey } from '../stores/filters';
import { projectUrl } from '../utils';
import FilterBar from './FilterBar.vue';
import MrCard from './MrCard.vue';

const props = defineProps<{ aiEnabled: boolean }>();
const emit = defineEmits<{
  open: [mr: MR];
  'ai-review': [mr: MR];
  'clone-needed': [url: string];
}>();

const mrs = useMrsStore();
const filters = useFiltersStore();
const loading = ref(true);
const firstLoad = ref(true);

const tabs = computed(() => [
  { key: 'review' as const, label: 'To Review', count: mrs.toReviewMrs.length },
  { key: 'mine'   as const, label: 'My MRs',    count: mrs.myMrs.length },
  { key: 'pinned' as const, label: 'Pinned',    count: mrs.pinnedMrs.length },
]);

onMounted(() => {
  // loading flag cleared by parent after init
  setTimeout(() => { loading.value = false; firstLoad.value = false; }, 100);
});

const isFiltered = computed(() =>
  filters.isAnyActive && filters.sourceMrs.length > 0 && filters.filteredMrs.length === 0
);

const emptyIcon  = computed(() => {
  if (isFiltered.value) return '🔍';
  if (filters.activeTab === 'review') return '✅';
  if (filters.activeTab === 'pinned') return '📌';
  return '📭';
});
const emptyTitle = computed(() => {
  if (isFiltered.value) return 'No matches';
  if (filters.activeTab === 'review') return 'Nothing to review';
  if (filters.activeTab === 'pinned') return 'No pinned MRs';
  return 'No open MRs';
});
const emptySub   = computed(() => isFiltered.value
  ? 'No MRs match your current filters.<br>Try relaxing or clearing them.'
  : (filters.activeTab === 'review'
    ? "You're all caught up.<br>No MRs are waiting for your review."
    : filters.activeTab === 'pinned'
      ? 'Pin merge requests from To Review or My MRs<br>to keep them together here.'
    : 'You have no open merge requests right now.')
);

function switchTab(tab: TabKey) {
  filters.switchTab(tab);
  mrs.setActiveMr(null);
}

function onOpen(mr: MR) {
  mrs.setActiveMr(mr);
  mrs.setActivePanelTab('diff');
  emit('open', mr);
}

function onAiReview(mr: MR) {
  mrs.setActiveMr(mr);
  mrs.setActivePanelTab('ai');
  emit('ai-review', mr);
}

async function onOpenInIde(mr: MR) {
  const result = await window.api.openInIde(projectUrl(mr));
  if (!result.found) emit('clone-needed', result.cloneUrl ?? projectUrl(mr));
}

async function onApprove(mr: MR) {
  try {
    await window.api.approveMr(mr.project_id, mr.iid);
    mrs.markApproved(mr.id);
    await mrs.markCurrentHeadReviewed(mr, 'approve');
  } catch {
    // toast handled by parent
  }
}

function onTogglePin(mr: MR) {
  mrs.togglePinned(mr);
}

function onOpenExternal(url: string) {
  window.api.openExternal(url);
}

// Exposed so App.vue can clear skeleton after data loads
defineExpose({ clearLoading: () => { loading.value = false; } });
</script>

<style scoped>
.mr-panel {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  overflow: hidden;
}

.mr-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 3px;
  padding: 8px 10px 7px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, var(--surface2) 0%, var(--surface) 100%);
  flex-shrink: 0;
}

.mr-tab {
  min-width: 0;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 7px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text3);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  transition: background var(--dur-fast), border-color var(--dur-fast), color var(--dur-fast), transform var(--dur-fast) var(--ease-spring);
}

.mr-tab:hover {
  background: var(--surface2);
  color: var(--text2);
  transform: translateY(-1px);
}
.mr-tab:active { transform: scale(0.97); }

.mr-tab.active {
  background: var(--surface3);
  border-color: var(--border2);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}

.mr-tab-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mr-tab-count {
  min-width: 18px;
  padding: 1px 5px;
  border-radius: var(--radius-xs);
  background: var(--surface3);
  color: var(--text2);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
  flex-shrink: 0;
  transition: background var(--dur-fast), color var(--dur-fast);
}

.mr-tab.active .mr-tab-count {
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid var(--accent-border);
}

.mr-tab-count.zero {
  background: transparent;
  color: var(--text3);
}

.mr-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding: 10px;
  position: relative;
}

.mr-list-inner {
  display: flex;
  flex-direction: column;
}

/* Tab content transition */
.tab-content-enter-active {
  transition: opacity 0.16s var(--ease-out), transform 0.18s var(--ease-out);
}
.tab-content-leave-active {
  transition: opacity 0.1s var(--ease-in);
}
.tab-content-enter-from { opacity: 0; transform: translateY(6px); }
.tab-content-leave-to   { opacity: 0; }
</style>
