<template>
  <div class="ai-panel" style="overflow-y:auto">
    <div class="ai-new-header">
      <button class="ai-back-btn" @click="$emit('back')">← Back</button>
      <span class="ai-new-title">✦ New AI Review</span>
    </div>
    <div class="ai-new-body">
      <div>
        <div class="ai-new-label">Focus context</div>
        <div class="ai-new-hint">Optional — guide the review toward specific concerns or away from noise.</div>
      </div>
      <textarea
        v-model="context"
        class="ai-context-textarea"
        placeholder="e.g. focus on error handling, ignore test files, this touches auth logic…"
        style="min-height:120px;max-height:none;resize:vertical"
      />
      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:4px">
        <button class="ai-cancel-btn" @click="$emit('back')">Cancel</button>
        <button class="ai-run-btn" :disabled="!repoPath" @click="onRun">▶ Run Review</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ repoPath: string | null; lastContext: string }>();
const emit  = defineEmits<{ back: []; run: [context: string] }>();

const context = ref(props.lastContext);

function onRun() {
  if (!props.repoPath) return;
  emit('run', context.value);
}
</script>

<style scoped>
.ai-panel { flex: 1; display: flex; flex-direction: column; min-height: 0; }

.ai-new-header {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.ai-new-title { font-size: 15px; font-weight: 700; color: var(--text2); }
.ai-new-body  { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.ai-new-label { font-size: 12px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.ai-new-hint  { font-size: 12px; color: var(--text3); line-height: 1.5; }

.ai-back-btn {
  padding: 3px 10px; border: 1px solid var(--border2);
  background: transparent; color: var(--text2); border-radius: 5px;
  font-size: 12px; cursor: pointer; transition: background 0.1s; flex-shrink: 0;
}
.ai-back-btn:hover { background: var(--surface2); color: var(--text); }

.ai-cancel-btn {
  padding: 3px 10px; border: 1px solid var(--border2);
  background: transparent; color: var(--text2); border-radius: 5px;
  font-size: 12px; cursor: pointer; transition: background 0.1s;
}
.ai-cancel-btn:hover { background: var(--surface2); color: var(--text); }

.ai-context-textarea {
  width: 100%; background: var(--surface); border: 1px solid var(--border2);
  border-radius: 8px; color: var(--text); font-size: 13px;
  padding: 10px 12px; resize: vertical; min-height: 64px; max-height: 120px;
  outline: none; font-family: inherit; line-height: 1.5;
  transition: border-color 0.15s, box-shadow 0.15s; user-select: text;
}
.ai-context-textarea:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.12); }
.ai-context-textarea::placeholder { color: var(--text3); }

.ai-run-btn {
  height: 34px; padding: 0 16px;
  background: linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%);
  border: 1px solid #7c3aed; color: #e9d5ff;
  border-radius: 7px; font-size: 13px; font-weight: 700; cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s; flex-shrink: 0;
}
.ai-run-btn:hover { background: linear-gradient(135deg, #5b21b6 0%, #6d28d9 100%); box-shadow: 0 2px 12px rgba(124,58,237,0.3); }
.ai-run-btn:disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }
</style>
