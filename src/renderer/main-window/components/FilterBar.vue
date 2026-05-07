<template>
  <div v-if="filters.sourceMrs.length > 0" class="filter-bar">
    <div class="fb-row">
      <div class="fb-group">
        <button
          v-for="opt in approvalOptions"
          :key="opt.value"
          class="fb-pill"
          :class="{ active: filters.approval === opt.value }"
          @click="filters.approval = opt.value"
        >{{ opt.label }}</button>
      </div>
      <select class="fb-select" :value="filters.author" @change="filters.author = ($event.target as HTMLSelectElement).value">
        <option value="all">All authors</option>
        <option v-for="a in filters.uniqueAuthors" :key="a.username" :value="a.username">
          {{ a.name }}
        </option>
      </select>
    </div>
    <div class="fb-row">
      <button class="fb-pill toggle" :class="{ active: filters.noComments }" @click="filters.noComments = !filters.noComments">
        No comments
      </button>
      <button class="fb-pill toggle-draft" :class="{ active: filters.hideDrafts }" @click="filters.hideDrafts = !filters.hideDrafts">
        Hide drafts
      </button>
      <button v-if="filters.isAnyActive" class="fb-clear" @click="filters.reset()">Clear</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFiltersStore } from '../stores/filters';
import type { ApprovalFilter } from '../stores/filters';

const filters = useFiltersStore();

const approvalOptions: { value: ApprovalFilter; label: string }[] = [
  { value: 'all',      label: 'All' },
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
];
</script>

<style scoped>
.filter-bar {
  padding: 7px 10px 6px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex-shrink: 0;
  background: var(--surface);
}
.fb-row  { display: flex; align-items: center; gap: 4px; }
.fb-group{ display: flex; gap: 2px; }

.fb-pill {
  font-size: 10px; font-weight: 600;
  padding: 3px 8px; border-radius: 5px;
  border: 1px solid var(--border2);
  background: transparent; color: var(--text3);
  cursor: pointer; line-height: 1.4; white-space: nowrap;
  transition: background 0.1s, color 0.1s, border-color 0.1s;
}
.fb-pill:hover        { background: var(--surface2); color: var(--text2); }
.fb-pill.active       { background: var(--accent-bg); border-color: var(--accent-border); color: #58a6ff; }
.fb-pill.toggle.active      { background: rgba(252,109,38,0.1); border-color: rgba(252,109,38,0.35); color: var(--orange); }
.fb-pill.toggle-draft.active{ background: rgba(139,148,158,0.12); border-color: rgba(139,148,158,0.3); color: var(--text2); }

.fb-select {
  font-size: 10px; padding: 3px 6px; border-radius: 5px;
  border: 1px solid var(--border2);
  background: var(--surface2); color: var(--text2);
  cursor: pointer; outline: none;
  flex: 1; min-width: 0; max-width: 130px;
}
.fb-select:focus { border-color: var(--accent-border); }
.fb-select option { background: var(--surface2); }

.fb-clear {
  margin-left: auto; font-size: 10px;
  padding: 2px 7px; border-radius: 5px;
  border: 1px solid transparent;
  background: transparent; color: var(--accent);
  cursor: pointer; white-space: nowrap;
  transition: background 0.1s;
}
.fb-clear:hover { background: var(--accent-bg); }
</style>
