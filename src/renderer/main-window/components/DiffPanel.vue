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
        <template v-else>
          <div class="diff-summary">
            <div class="diff-title" :title="mrs.activeMr.title">{{ mrs.activeMr.title }}</div>
            <div class="diff-meta">
              <span class="diff-badge files">{{ diffStats.files }} files</span>
              <span class="diff-badge add">+{{ diffStats.added }}</span>
              <span class="diff-badge del">-{{ diffStats.deleted }}</span>
            </div>
          </div>
          <div class="diff-content" v-html="diffHtml"></div>
        </template>
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
import { ref, watch } from 'vue';
import { useMrsStore } from '../stores/mrs';
import * as Diff2Html from 'diff2html';
import AiPanel from './AiPanel/index.vue';

const props = defineProps<{ aiEnabled: boolean; providerLabel: string }>();

const mrs = useMrsStore();
const loadingDiff = ref(false);
const diffError   = ref(false);
const diffHtml    = ref('');
const diffStats   = ref({ files: 0, added: 0, deleted: 0 });

watch(
  () => [mrs.activeMr, mrs.activePanelTab] as const,
  async ([mr, tab]) => {
    if (!mr || tab !== 'diff') return;
    loadingDiff.value = true;
    diffError.value   = false;
    diffHtml.value    = '';
    diffStats.value   = { files: 0, added: 0, deleted: 0 };
    try {
      const { changes } = await window.api.getMrDiff(mr.project_id, mr.iid);
      diffStats.value = {
        files: changes.length,
        added: changes.reduce((n: number, c: any) => n + (c.diff.match(/^\+(?!\+\+)/gm) ?? []).length, 0),
        deleted: changes.reduce((n: number, c: any) => n + (c.diff.match(/^-(?!--)/gm) ?? []).length, 0),
      };
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
.diff-summary {
  min-height: 42px; flex-shrink: 0; padding: 9px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  display: flex; align-items: center; gap: 12px;
}
.diff-title {
  flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--text); font-size: 13px; font-weight: 600;
}
.diff-meta { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.diff-badge {
  font-size: 10px; line-height: 1; padding: 4px 7px;
  border-radius: 999px; font-weight: 700;
}
.diff-badge.files { background: var(--surface2); color: var(--text2); border: 1px solid var(--border2); }
.diff-badge.add { background: rgba(63,185,80,0.13); color: var(--green); }
.diff-badge.del { background: rgba(248,81,73,0.13); color: var(--red); }

.diff-content {
  flex: 1; min-height: 0; overflow: auto; padding: 12px;
  background: var(--bg); user-select: text;
}

.diff-content :deep(.d2h-wrapper) {
  background: transparent !important;
  color: var(--text2) !important;
}
.diff-content :deep(.d2h-file-list-wrapper) {
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: 8px;
  margin: 0 0 10px !important;
  overflow: hidden;
}
.diff-content :deep(.d2h-file-list-header) {
  background: var(--surface2) !important;
  border-bottom: 1px solid var(--border) !important;
  color: var(--text) !important;
}
.diff-content :deep(.d2h-file-list-title),
.diff-content :deep(.d2h-file-list-line) {
  color: var(--text2) !important;
}
.diff-content :deep(.d2h-file-list) {
  background: var(--surface) !important;
  margin: 0 !important;
}
.diff-content :deep(.d2h-file-list > li) {
  border-color: var(--border) !important;
}
.diff-content :deep(.d2h-file-list a) {
  color: #58a6ff !important;
  text-decoration: none;
}
.diff-content :deep(.d2h-file-list a:hover) {
  color: #79c0ff !important;
  text-decoration: underline;
}
.diff-content :deep(.d2h-file-wrapper) {
  background: var(--bg) !important;
  border: 1px solid var(--border) !important;
  border-radius: 8px;
  overflow: auto;
  margin: 0 0 12px !important;
  max-width: 100%;
}
.diff-content :deep(.d2h-file-header) {
  height: 30px !important;
  padding: 5px 10px !important;
  background: var(--surface) !important;
  border-color: var(--border) !important;
  color: var(--text2) !important;
  font-size: 12px !important;
}
.diff-content :deep(.d2h-file-name),
.diff-content :deep(.d2h-file-name-wrapper),
.diff-content :deep(.d2h-file-collapse),
.diff-content :deep(.d2h-file-stats) {
  color: var(--text2) !important;
}
.diff-content :deep(.d2h-diff-table) {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg) !important;
  color: var(--text2) !important;
  font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
  font-size: 12px;
  line-height: 1.35;
}
.diff-content :deep(.d2h-diff-tbody) {
  background: var(--bg) !important;
}
.diff-content :deep(.d2h-diff-tbody tr) {
  background: var(--bg) !important;
}
.diff-content :deep(.d2h-code-side-linenumber),
.diff-content :deep(.d2h-code-linenumber) {
  position: static !important;
  width: 7em !important;
  min-width: 7em !important;
  max-width: 7em !important;
  padding: 0 8px !important;
  background: var(--surface) !important;
  border-color: var(--border) !important;
  color: var(--text3) !important;
  text-align: right !important;
  vertical-align: top !important;
  user-select: none;
}
.diff-content :deep(.d2h-code-line) {
  display: block !important;
  width: auto !important;
  padding: 0 10px !important;
  color: var(--text2) !important;
  background: transparent !important;
}
.diff-content :deep(.d2h-code-line-ctn) {
  display: inline !important;
  width: auto !important;
  color: inherit !important;
  background: transparent !important;
}
.diff-content :deep(.d2h-code-line-prefix) {
  color: var(--text3) !important;
}
.diff-content :deep(.d2h-cntx),
.diff-content :deep(.d2h-cntx .d2h-code-line),
.diff-content :deep(.d2h-cntx .d2h-code-line-ctn) {
  background: var(--bg) !important;
  color: var(--text2) !important;
}
.diff-content :deep(.d2h-ins) {
  background: rgba(63,185,80,0.09) !important;
}
.diff-content :deep(.d2h-ins .d2h-code-line),
.diff-content :deep(.d2h-ins .d2h-code-line-ctn) {
  background: transparent !important;
  color: #c9f0d0 !important;
}
.diff-content :deep(.d2h-del) {
  background: rgba(248,81,73,0.10) !important;
}
.diff-content :deep(.d2h-del .d2h-code-line),
.diff-content :deep(.d2h-del .d2h-code-line-ctn) {
  background: transparent !important;
  color: #ffd1cf !important;
}
.diff-content :deep(.d2h-info) {
  background: rgba(88,166,255,0.10) !important;
  color: var(--text2) !important;
}
.diff-content :deep(.d2h-info .d2h-code-line),
.diff-content :deep(.d2h-info .d2h-code-line-ctn),
.diff-content :deep(.d2h-info .d2h-code-linenumber) {
  background: transparent !important;
  color: var(--text2) !important;
}
.diff-content :deep(.d2h-code-line ins) {
  background-color: rgba(63,185,80,0.34) !important;
  color: inherit !important;
  border-radius: 2px;
  text-decoration: none;
}
.diff-content :deep(.d2h-code-line del) {
  background-color: rgba(248,81,73,0.34) !important;
  color: inherit !important;
  border-radius: 2px;
  text-decoration: none;
}
.diff-content :deep(.d2h-emptyplaceholder) {
  background: var(--surface) !important;
  border-color: var(--border) !important;
}
.diff-content :deep(.d2h-tag) {
  display: none;
  background: transparent !important;
}
.diff-content :deep(.d2h-file-added-icon) { color: var(--green) !important; }
.diff-content :deep(.d2h-file-deleted-icon) { color: var(--red) !important; }
.diff-content :deep(.d2h-file-renamed-icon) { color: var(--yellow) !important; }

@media (max-width: 760px) {
  .diff-summary { align-items: flex-start; flex-direction: column; gap: 7px; }
  .diff-meta { width: 100%; }
}
</style>
