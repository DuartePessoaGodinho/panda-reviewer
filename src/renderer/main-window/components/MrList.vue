<template>
  <div class="mr-panel">
    <FilterBar />
    <div class="mr-list" :class="{ 'animate-cards': firstLoad }">
      <!-- Loading skeletons -->
      <template v-if="loading">
        <div class="skeleton-card" v-for="n in 2" :key="n">
          <div class="skeleton sk-line" :style="{ width: n === 1 ? '40%' : '35%' }"></div>
          <div class="skeleton sk-title" :style="{ width: n === 1 ? '85%' : '75%' }"></div>
          <div class="skeleton sk-sub"  :style="{ width: n === 1 ? '55%' : '45%' }"></div>
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
        :has-repo="mrs.repoCache[mr.project_id] != null"
        :ai-enabled="aiEnabled"
        @open="onOpen"
        @ai-review="onAiReview"
        @open-in-ide="onOpenInIde"
        @approve="onApprove"
        @open-external="onOpenExternal"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { MR } from '../../types';
import { useMrsStore } from '../stores/mrs';
import { useFiltersStore } from '../stores/filters';
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

onMounted(() => {
  // loading flag cleared by parent after init
  setTimeout(() => { loading.value = false; firstLoad.value = false; }, 100);
});

const isFiltered = computed(() =>
  filters.isAnyActive && filters.sourceMrs.length > 0 && filters.filteredMrs.length === 0
);

const emptyIcon  = computed(() => isFiltered.value ? '🔍' : (filters.activeTab === 'review' ? '✅' : '📭'));
const emptyTitle = computed(() => isFiltered.value ? 'No matches' : (filters.activeTab === 'review' ? 'Nothing to review' : 'No open MRs'));
const emptySub   = computed(() => isFiltered.value
  ? 'No MRs match your current filters.<br>Try relaxing or clearing them.'
  : (filters.activeTab === 'review'
    ? "You're all caught up.<br>No MRs are waiting for your review."
    : 'You have no open merge requests right now.')
);

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
  } catch {
    // toast handled by parent
  }
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
.mr-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding: 10px;
}
.mr-list.animate-cards :deep(.mr-card) {
  animation: fadeSlideIn 0.18s ease both;
}
</style>
