<template>
  <div v-if="filters.sourceMrs.length > 0" class="filter-bar">
    <div class="fb-row">
      <div class="fb-group">
        <button
          v-for="opt in approvalOptions"
          :key="opt.value"
          class="fb-chip"
          :class="{ active: filters.approval === opt.value }"
          v-motion
          :tapped="{ scale: 0.94, transition: { duration: 80 } }"
          @click="filters.approval = opt.value"
        >{{ opt.label }}</button>
      </div>

      <div class="fb-select-wrap">
        <svg class="fb-select-icon" width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H1s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C9.516 10.68 8.289 10 6 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
        </svg>
        <select
          class="fb-select"
          :value="filters.author"
          @change="filters.author = ($event.target as HTMLSelectElement).value"
        >
          <option value="all">All authors</option>
          <option v-for="a in filters.uniqueAuthors" :key="a.username" :value="a.username">
            {{ a.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="fb-row">
      <button
        class="fb-chip toggle"
        :class="{ active: filters.noComments }"
        v-motion
        :tapped="{ scale: 0.94, transition: { duration: 80 } }"
        @click="filters.noComments = !filters.noComments"
      >No comments</button>

      <button
        class="fb-chip toggle"
        :class="{ active: filters.hideDrafts }"
        v-motion
        :tapped="{ scale: 0.94, transition: { duration: 80 } }"
        @click="filters.hideDrafts = !filters.hideDrafts"
      >Hide drafts</button>

      <Transition name="fade">
        <button v-if="filters.isAnyActive" class="fb-clear" @click="filters.reset()">
          Clear all
        </button>
      </Transition>
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
  padding: 8px 10px 7px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.012) 0%, transparent 100%), var(--surface);
}

.fb-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.fb-group {
  display: flex;
  gap: 2px;
}

/* Filter chips */
.fb-chip {
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text3);
  cursor: pointer;
  line-height: 1.5;
  white-space: nowrap;
  transition: background var(--dur-fast), color var(--dur-fast), border-color var(--dur-fast), box-shadow var(--dur-fast);
  letter-spacing: -0.01em;
  will-change: transform;
}
.fb-chip:hover { background: var(--surface2); color: var(--text2); border-color: var(--border2); }

/* Active state — approval filters use jade accent */
.fb-chip.active {
  background: var(--accent-dim);
  border-color: var(--accent-border);
  color: var(--accent);
  font-weight: 600;
  box-shadow: 0 0 10px var(--accent-glow2);
}

/* Toggle chips (no-comments, hide-drafts) */
.fb-chip.toggle.active {
  background: var(--surface3);
  border-color: var(--border2);
  color: var(--text2);
  font-weight: 600;
}

/* Author select */
.fb-select-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  max-width: 135px;
}

.fb-select-icon {
  position: absolute;
  left: 7px;
  color: var(--text3);
  pointer-events: none;
  flex-shrink: 0;
}

.fb-select {
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 500;
  padding: 3px 7px 3px 22px;
  border-radius: 5px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text2);
  cursor: pointer;
  outline: none;
  width: 100%;
  appearance: none;
  letter-spacing: -0.01em;
  transition: border-color 0.12s;
}
.fb-select:hover  { border-color: var(--border2); }
.fb-select:focus  { border-color: var(--accent-border); }
.fb-select option { background: var(--surface2); color: var(--text); }

/* Clear button */
.fb-clear {
  margin-left: auto;
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text3);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--dur-fast), color var(--dur-fast), border-color var(--dur-fast);
  letter-spacing: -0.01em;
}
.fb-clear:hover {
  background: var(--surface2);
  color: var(--text2);
  border-color: var(--border);
}

/* fade transition for Clear button */
.fade-enter-active { transition: opacity 0.15s; }
.fade-leave-active { transition: opacity 0.1s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
