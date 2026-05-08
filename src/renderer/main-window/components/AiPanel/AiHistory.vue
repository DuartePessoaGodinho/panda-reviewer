<template>
  <div class="ai-panel">
    <div class="ai-hist-header">
      <div class="ai-hist-title">✦ AI Reviews</div>
      <button v-if="!noRepo" class="ai-new-btn" @click="$emit('new')">+ New Review</button>
    </div>

    <div v-if="noRepo" class="ai-repo-warning">
      ⚠ Repository not found locally — clone it first to enable AI Review.
    </div>

    <div class="ai-hist-list">
      <div v-if="ai.history.length === 0" class="ai-hist-empty">
        <div style="font-size:28px;margin-bottom:8px">✦</div>
        <strong>No reviews yet</strong>
        <p>{{ providerLabel }} explores the branch using git commands<br>directly in your local repo — no checkout needed.</p>
        <button v-if="!noRepo" class="ai-run-btn" style="margin-top:12px" @click="$emit('new')">▶ Run First Review</button>
      </div>
      <div
        v-else
        v-for="entry in ai.history"
        :key="entry.id"
        class="ai-hist-item"
        @click="$emit('read', entry)"
      >
        <div class="ai-hist-item-top">
          <span class="ai-hist-date">{{ formatDate(entry.createdAt) }}</span>
          <span v-if="entry.notes?.trim()" class="ai-hist-notes-dot" title="Has notes">📝</span>
        </div>
        <span class="ai-hist-context" :class="{ 'no-context': !entry.context }">
          {{ entry.context
            ? `"${entry.context.slice(0, 60)}${entry.context.length > 60 ? '…' : ''}"`
            : 'No extra context' }}
        </span>
        <div v-if="reviewPreview(entry.output)" class="ai-hist-preview">{{ reviewPreview(entry.output) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ReviewEntry } from '../../../types';
import { useAiStore } from '../../stores/ai';

defineProps<{ noRepo: boolean; providerLabel: string }>();
defineEmits<{ new: []; read: [entry: ReviewEntry] }>();

const ai = useAiStore();

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function reviewPreview(output: string): string {
  if (!output) return '';
  const lines = output.split('\n').map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && !l.startsWith('```') && !l.startsWith('---'));
  const first = lines[0] ?? '';
  const clean = first.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`([^`]+)`/g, '$1');
  return clean.length > 90 ? clean.slice(0, 90) + '…' : clean;
}
</script>

<style scoped>
.ai-panel { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }

.ai-hist-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px 10px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.ai-hist-title { font-size: 13px; font-weight: 700; color: var(--text2); }
.ai-new-btn {
  padding: 4px 12px;
  background: linear-gradient(135deg, #4c1d95, #5b21b6);
  border: 1px solid #7c3aed; color: #e9d5ff;
  border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;
  transition: background 0.15s;
}
.ai-new-btn:hover { background: linear-gradient(135deg, #5b21b6, #6d28d9); }

.ai-repo-warning {
  margin: 12px 16px 0; padding: 10px 12px;
  background: rgba(210,153,34,0.08); border: 1px solid rgba(210,153,34,0.2);
  border-radius: 8px; font-size: 11px; color: var(--yellow); flex-shrink: 0;
}

.ai-hist-list { flex: 1; overflow-y: auto; min-height: 0; }
.ai-hist-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; gap: 6px; color: var(--text3); font-size: 12px; text-align: center; padding: 20px;
}
.ai-hist-empty strong { color: var(--text2); font-size: 13px; }

.ai-hist-item {
  padding: 11px 16px; border-bottom: 1px solid var(--border);
  cursor: pointer; transition: background 0.1s;
}
.ai-hist-item:hover { background: var(--surface2); }
.ai-hist-item-top { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
.ai-hist-date { font-size: 12px; font-weight: 600; color: var(--text2); }
.ai-hist-notes-dot { font-size: 11px; }
.ai-hist-context { font-size: 11px; color: var(--text3); font-style: italic; }
.ai-hist-context.no-context { color: var(--border2); }
.ai-hist-preview {
  font-size: 11px; color: var(--text3); margin-top: 3px;
  line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.ai-run-btn {
  height: 34px; padding: 0 16px;
  background: linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%);
  border: 1px solid #7c3aed; color: #e9d5ff;
  border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s; flex-shrink: 0;
}
.ai-run-btn:hover { background: linear-gradient(135deg, #5b21b6 0%, #6d28d9 100%); box-shadow: 0 2px 12px rgba(124,58,237,0.3); }
</style>
