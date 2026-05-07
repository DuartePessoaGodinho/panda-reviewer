<template>
  <div class="diff-panel">
    <!-- No MR selected -->
    <div v-if="!mrs.activeMr" class="diff-placeholder">
      <div class="diff-placeholder-icon">📋</div>
      <strong style="color:var(--text2);font-size:13px;">No MR selected</strong>
      <p>Click an MR card or "AI Review"<br>to get started.</p>
    </div>

    <!-- Panel tab bar -->
    <template v-else>
      <div class="panel-tabs">
        <button
          class="panel-tab"
          :class="{ active: mrs.activePanelTab === 'diff' }"
          @click="mrs.setActivePanelTab('diff')"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
            <path d="M5 10.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"/>
          </svg>
          Diff
        </button>
        <button
          class="panel-tab ai-tab"
          :class="{ active: mrs.activePanelTab === 'ai' }"
          @click="mrs.setActivePanelTab('ai')"
        >
          ✦ AI Review
        </button>
      </div>

      <!-- Diff view -->
      <div v-if="mrs.activePanelTab === 'diff'" class="diff-content-wrap">
        <div v-if="loadingDiff" class="diff-placeholder">
          <div class="diff-placeholder-icon">⏳</div>
          <strong style="color:var(--text2);font-size:13px;">Loading diff…</strong>
        </div>
        <div v-else-if="diffError" class="diff-placeholder">
          <div class="diff-placeholder-icon">⚠️</div>
          <strong style="color:var(--text2)">Failed to load diff</strong>
          <p>Check your connection and try again.</p>
        </div>
        <div v-else class="diff-content" v-html="diffHtml"></div>
      </div>

      <!-- AI panel -->
      <AiPanel
        v-else
        :mr="mrs.activeMr"
        :ai-enabled="props.aiEnabled"
        :provider-label="props.providerLabel"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useMrsStore } from '../stores/mrs';
import * as Diff2Html from 'diff2html';
import AiPanel from './AiPanel/index.vue';

const props = defineProps<{ aiEnabled: boolean; providerLabel: string }>();

const mrs = useMrsStore();
const loadingDiff = ref(false);
const diffError   = ref(false);
const diffHtml    = ref('');

watch(
  () => [mrs.activeMr, mrs.activePanelTab] as const,
  async ([mr, tab]) => {
    if (!mr || tab !== 'diff') return;
    loadingDiff.value = true;
    diffError.value   = false;
    diffHtml.value    = '';
    try {
      const { changes } = await window.api.getMrDiff(mr.project_id, mr.iid);
      const combined = changes
        .map((c: any) => `diff --git a/${c.old_path} b/${c.new_path}\n--- a/${c.old_path}\n+++ b/${c.new_path}\n${c.diff}`)
        .join('\n');
      diffHtml.value = Diff2Html.html(combined, {
        drawFileList: true,
        outputFormat: 'line-by-line',
        renderNothingWhenEmpty: false,
      });
    } catch {
      diffError.value = true;
    } finally {
      loadingDiff.value = false;
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.diff-panel { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

.diff-placeholder {
  display: flex; align-items: center; justify-content: center;
  height: 100%; color: var(--text3); font-size: 13px;
  flex-direction: column; gap: 10px;
}
.diff-placeholder-icon {
  width: 56px; height: 56px; background: var(--surface);
  border: 1px solid var(--border); border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; margin-bottom: 4px;
}
.diff-placeholder p { font-size: 12px; color: var(--text3); text-align: center; }

.panel-tabs {
  display: flex; align-items: center;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  padding: 0 12px; flex-shrink: 0; height: 40px; gap: 2px;
}
.panel-tab {
  padding: 0 12px; height: 100%; border: none; background: transparent;
  color: var(--text2); font-size: 12px; font-weight: 500; cursor: pointer;
  display: flex; align-items: center; gap: 6px;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: color 0.12s;
}
.panel-tab:hover { color: var(--text); }
.panel-tab.active { color: var(--text); border-bottom-color: var(--accent); font-weight: 600; }
.panel-tab.ai-tab.active { border-bottom-color: #7c3aed; color: #c084fc; }

.diff-content-wrap { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.diff-content { flex: 1; overflow: auto; padding: 12px; }
</style>
