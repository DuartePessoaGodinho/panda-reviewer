<template>
  <div class="diff-panel">
    <!-- No MR selected -->
    <div v-if="!mrs.activeMr" class="diff-placeholder">
      <div class="diff-placeholder-icon">
        <svg width="26" height="26" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
          <path d="M5 10.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"/>
        </svg>
      </div>
      <strong class="diff-placeholder-title">No MR selected</strong>
      <p>Click a merge request to view its diff,<br>or run an AI Review.</p>
    </div>

    <!-- Detail workspace -->
    <template v-else>
      <div v-if="isCompact" class="panel-tabs">
        <button
          class="panel-tab"
          :class="{ active: mrs.activePanelTab === 'diff' }"
          @click="showDiff"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
            <path d="M5 10.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"/>
          </svg>
          Diff
        </button>
        <button
          class="panel-tab ai-tab"
          :class="{ active: mrs.activePanelTab === 'ai' }"
          @click="toggleAiReview"
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0l1.5 5H16l-4.5 3.5L13 14 8 10l-5 4 1.5-5.5L0 5h6.5L8 0z"/>
          </svg>
          AI Review
        </button>
      </div>

      <AiPanel
        v-if="isCompact && mrs.activePanelTab === 'ai'"
        :mr="mrs.activeMr"
        :ai-enabled="props.aiEnabled"
        :provider-label="props.providerLabel"
      />

      <div v-else class="review-workspace">
        <div class="diff-content-wrap">
          <div v-if="loadingDiff" class="diff-placeholder">
            <div class="diff-placeholder-icon loading">
              <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
              </svg>
            </div>
            <strong class="diff-placeholder-title">Loading diff…</strong>
          </div>
          <div v-else-if="diffError" class="diff-placeholder">
            <div class="diff-placeholder-icon">⚠</div>
            <strong class="diff-placeholder-title">Failed to load diff</strong>
            <p>Check your connection and try again.</p>
          </div>
          <template v-else>
            <div class="diff-summary">
              <div class="diff-title" :title="mrs.activeMr.title">{{ mrs.activeMr.title }}</div>
              <button
                v-if="!isCompact"
                class="ai-review-toggle"
                :class="{ active: mrs.aiDrawerOpen }"
                :title="mrs.aiDrawerOpen ? 'Collapse AI Review' : 'Open AI Review beside the diff'"
                :aria-expanded="mrs.aiDrawerOpen"
                @click="toggleAiReview"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 0l1.5 5H16l-4.5 3.5L13 14 8 10l-5 4 1.5-5.5L0 5h6.5L8 0z"/>
                </svg>
                AI Review
              </button>
              <div class="diff-meta">
                <span class="diff-stat files">
                  <span class="diff-stat-value">{{ diffStats.files }}</span>
                  <span class="diff-stat-label">files</span>
                </span>
                <span class="diff-stat total">
                  <span class="diff-stat-value">{{ changedLines }}</span>
                  <span class="diff-stat-label">changed</span>
                </span>
                <span class="diff-stat add">
                  <span class="diff-stat-value">+{{ diffStats.added }}</span>
                  <span class="diff-stat-label">added</span>
                </span>
                <span class="diff-stat del">
                  <span class="diff-stat-value">-{{ diffStats.deleted }}</span>
                  <span class="diff-stat-label">deleted</span>
                </span>
              </div>
            </div>
            <div
              class="review-checkpoint-bar"
              :class="{
                reviewed: isCurrentHeadReviewed,
                stale: hasNewChanges,
              }"
            >
              <div class="diff-mode-tabs" role="tablist" aria-label="Diff range">
                <button
                  class="diff-mode-tab"
                  :class="{ active: diffMode === 'full' }"
                  role="tab"
                  :aria-selected="diffMode === 'full'"
                  @click="diffMode = 'full'"
                >
                  Full diff
                </button>
                <button
                  class="diff-mode-tab"
                  :class="{ active: diffMode === 'new' }"
                  :disabled="!hasNewChanges"
                  role="tab"
                  :aria-selected="diffMode === 'new'"
                  :title="newChangesTitle"
                  @click="diffMode = 'new'"
                >
                  New changes
                </button>
              </div>
              <div class="checkpoint-status">
                <template v-if="checkpoint">
                  <span class="checkpoint-state-dot"></span>
                  <span v-if="isCurrentHeadReviewed" class="checkpoint-reviewed-label">Reviewed</span>
                  <span v-else class="checkpoint-stale-label">New changes since review</span>
                  <span class="checkpoint-detail">{{ checkpointAge }} at {{ shortSha(checkpoint.sourceSha) }}</span>
                  <span v-if="hasNewChanges" class="checkpoint-new">new head {{ shortSha(currentSha) }}</span>
                </template>
                <template v-else>
                  Not marked reviewed in Panda
                </template>
              </div>
              <button
                class="mark-reviewed-btn"
                :class="{ reviewed: isCurrentHeadReviewed, stale: hasNewChanges }"
                :disabled="!currentSha || markingReviewed || isCurrentHeadReviewed"
                :title="currentSha ? 'Use the current MR head as the reviewed checkpoint' : 'Current MR head is unavailable'"
                @click="markReviewed"
              >
                {{ markReviewedLabel }}
              </button>
            </div>
            <div
              class="diff-content"
              @click="handleDiffContentClick"
              @keydown="handleDiffContentKeydown"
              v-html="diffHtml"
            ></div>
          </template>
        </div>

        <aside
          v-if="!isCompact"
          class="ai-drawer"
          :class="{ collapsed: !mrs.aiDrawerOpen }"
          :aria-hidden="!mrs.aiDrawerOpen"
        >
          <div class="ai-drawer-rail">
            <button
              class="ai-drawer-toggle"
              :title="mrs.aiDrawerOpen ? 'Collapse AI Review' : 'Expand AI Review'"
              :aria-label="mrs.aiDrawerOpen ? 'Collapse AI Review' : 'Expand AI Review'"
              :aria-expanded="mrs.aiDrawerOpen"
              @click="mrs.setAiDrawerOpen(!mrs.aiDrawerOpen)"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0l1.5 5H16l-4.5 3.5L13 14 8 10l-5 4 1.5-5.5L0 5h6.5L8 0z"/>
              </svg>
            </button>
          </div>
          <div class="ai-drawer-body" :inert="!mrs.aiDrawerOpen">
            <AiPanel
              :mr="mrs.activeMr"
              :ai-enabled="props.aiEnabled"
              :provider-label="props.providerLabel"
            />
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useMrsStore } from '../stores/mrs';
import type { ReviewCheckpoint } from '../../types';
import * as Diff2Html from 'diff2html';
import AiPanel from './AiPanel/index.vue';

const props = defineProps<{ aiEnabled: boolean; providerLabel: string }>();

type DiffMode = 'full' | 'new';

const mrs = useMrsStore();
const loadingDiff = ref(false);
const diffError   = ref(false);
const diffHtml    = ref('');
const diffStats   = ref({ files: 0, added: 0, deleted: 0 });
const diffMode    = ref<DiffMode>('full');
const checkpoint  = ref<ReviewCheckpoint | null>(null);
const markingReviewed = ref(false);
const isCompact = ref(false);
let compactQuery: MediaQueryList | null = null;
const changedLines = computed(() => diffStats.value.added + diffStats.value.deleted);
const currentSha = computed(() => mrs.activeMr?.sha ?? '');
const shouldShowDiff = computed(() =>
  Boolean(mrs.activeMr && (!isCompact.value || mrs.activePanelTab === 'diff'))
);
const hasNewChanges = computed(() =>
  Boolean(checkpoint.value?.sourceSha && currentSha.value && checkpoint.value.sourceSha !== currentSha.value)
);
const isCurrentHeadReviewed = computed(() =>
  Boolean(checkpoint.value?.sourceSha && currentSha.value && checkpoint.value.sourceSha === currentSha.value)
);
const markReviewedLabel = computed(() => {
  if (markingReviewed.value) return 'Saving...';
  if (isCurrentHeadReviewed.value) return 'Reviewed';
  if (hasNewChanges.value) return 'Mark new changes reviewed';
  return 'Mark reviewed';
});
const checkpointAge = computed(() => {
  if (!checkpoint.value) return '';
  return new Date(checkpoint.value.reviewedAt).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});
const newChangesTitle = computed(() => {
  if (!checkpoint.value) return 'Mark this MR reviewed before tracking new changes';
  if (!currentSha.value) return 'Current MR head is unavailable';
  if (!hasNewChanges.value) return 'No new commits since your last Panda review';
  return `Show changes from ${shortSha(checkpoint.value.sourceSha)} to ${shortSha(currentSha.value)}`;
});

function shortSha(sha: string) {
  return sha ? sha.slice(0, 8) : '';
}

function showDiff() {
  mrs.setActivePanelTab('diff');
  if (!isCompact.value) mrs.setAiDrawerOpen(false);
}

function toggleAiReview() {
  if (!isCompact.value) {
    const nextOpen = !mrs.aiDrawerOpen;
    mrs.setAiDrawerOpen(nextOpen);
    mrs.setActivePanelTab(nextOpen ? 'ai' : 'diff');
    return;
  }
  mrs.setActivePanelTab('ai');
}

function updateCompactState(event: MediaQueryListEvent | MediaQueryList) {
  isCompact.value = event.matches;
}

function makeDiffFilesCollapsible(html: string) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');

  doc.querySelectorAll('.d2h-file-wrapper').forEach((file) => {
    const header = file.querySelector('.d2h-file-header');
    if (!header) return;

    header.querySelector('.d2h-file-collapse')?.remove();

    const filePath = header.querySelector('.d2h-file-name-wrapper');
    filePath?.classList.add('d2h-file-path-toggle');
    filePath?.setAttribute('role', 'button');
    filePath?.setAttribute('tabindex', '0');
    filePath?.setAttribute('title', 'Collapse file diff');

    const toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'd2h-file-toggle';
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Collapse file diff');
    toggle.setAttribute('title', 'Collapse file diff');

    header.appendChild(toggle);
  });

  return doc.body.firstElementChild?.innerHTML ?? html;
}

function toggleFileDiff(file: Element) {
  const fileDiff = file?.querySelector('.d2h-file-diff');
  const toggle = file.querySelector<HTMLButtonElement>('.d2h-file-toggle');
  const filePath = file.querySelector<HTMLElement>('.d2h-file-path-toggle');
  if (!fileDiff || !toggle) return;

  const isCollapsed = file.classList.toggle('d2h-file-collapsed');
  fileDiff.classList.toggle('d2h-d-none', isCollapsed);
  toggle.setAttribute('aria-expanded', String(!isCollapsed));
  toggle.setAttribute('aria-label', isCollapsed ? 'Expand file diff' : 'Collapse file diff');
  toggle.setAttribute('title', isCollapsed ? 'Expand file diff' : 'Collapse file diff');
  filePath?.setAttribute('title', isCollapsed ? 'Expand file diff' : 'Collapse file diff');
}

function findToggleFile(target: HTMLElement | null) {
  const control = target?.closest('.d2h-file-toggle, .d2h-file-path-toggle');
  return control?.closest('.d2h-file-wrapper') ?? null;
}

function parseDiffStats(diff: string) {
  const files = (diff.match(/^diff --git /gm) ?? []).length;
  return {
    files,
    added: (diff.match(/^\+(?!\+\+)/gm) ?? []).length,
    deleted: (diff.match(/^-(?!--)/gm) ?? []).length,
  };
}

function renderDiff(diff: string) {
  diffStats.value = parseDiffStats(diff);
  diffHtml.value = makeDiffFilesCollapsible(Diff2Html.html(diff, {
    drawFileList: true,
    outputFormat: 'line-by-line',
    renderNothingWhenEmpty: false,
  }));
}

function fullDiffFromChanges(changes: any[]) {
  return changes
    .map((c: any) => `diff --git a/${c.old_path} b/${c.new_path}\n--- a/${c.old_path}\n+++ b/${c.new_path}\n${c.diff}`)
    .join('\n');
}

async function loadDiff() {
  const mr = mrs.activeMr;
  if (!mr || !shouldShowDiff.value) return;

  loadingDiff.value = true;
  diffError.value   = false;
  diffHtml.value    = '';
  diffStats.value   = { files: 0, added: 0, deleted: 0 };

  try {
    if (diffMode.value === 'new') {
      if (!checkpoint.value || !hasNewChanges.value) {
        diffMode.value = 'full';
      } else {
        const { changes } = await window.api.getNewChangesDiff(mr.project_id, checkpoint.value.sourceSha, currentSha.value);
        renderDiff(fullDiffFromChanges(changes));
        return;
      }
    }

    const { changes } = await window.api.getMrDiff(mr.project_id, mr.iid);
    renderDiff(fullDiffFromChanges(changes));
  } catch {
    diffError.value = true;
  } finally {
    loadingDiff.value = false;
  }
}

async function loadCheckpoint(mrId: number) {
  checkpoint.value = await window.api.getReviewCheckpoint(mrId);
  if (!hasNewChanges.value) diffMode.value = 'full';
}

async function markReviewed() {
  const mr = mrs.activeMr;
  if (!mr?.sha || markingReviewed.value) return;

  markingReviewed.value = true;
  try {
    checkpoint.value = await window.api.saveReviewCheckpoint({
      mrId: mr.id,
      projectId: mr.project_id,
      mrIid: mr.iid,
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      sourceSha: mr.sha,
      reviewedAt: new Date().toISOString(),
      kind: 'manual',
    });
    diffMode.value = 'full';
  } finally {
    markingReviewed.value = false;
  }
}

function handleDiffContentClick(event: MouseEvent) {
  const file = findToggleFile(event.target as HTMLElement | null);
  if (!file) return;

  event.preventDefault();
  toggleFileDiff(file);
}

function handleDiffContentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return;

  const file = findToggleFile(event.target as HTMLElement | null);
  if (!file) return;

  event.preventDefault();
  toggleFileDiff(file);
}

watch(
  () => [mrs.activeMr?.id, mrs.activeMr?.sha, shouldShowDiff.value] as const,
  async ([mrId, _sha, canShowDiff]) => {
    if (!mrId || !canShowDiff) return;
    await loadCheckpoint(mrId);
    await loadDiff();
  },
  { immediate: true }
);

watch(
  () => diffMode.value,
  async () => {
    await loadDiff();
  }
);

watch(
  () => hasNewChanges.value,
  (available) => {
    if (!available && diffMode.value === 'new') diffMode.value = 'full';
  }
);

onMounted(() => {
  compactQuery = window.matchMedia('(max-width: 1180px)');
  updateCompactState(compactQuery);
  compactQuery.addEventListener('change', updateCompactState);
});

onBeforeUnmount(() => {
  compactQuery?.removeEventListener('change', updateCompactState);
});
</script>

<style scoped>
.diff-panel { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

/* Empty / loading placeholder */
.diff-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text3);
  font-size: 13px;
  flex-direction: column;
  gap: 10px;
}
.diff-placeholder-icon {
  width: 52px; height: 52px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text3);
  margin-bottom: 4px;
}
.diff-placeholder-icon.loading svg { animation: spin 0.9s linear infinite; }
.diff-placeholder-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text2);
  letter-spacing: -0.015em;
}
.diff-placeholder p {
  font-size: 13px;
  color: var(--text3);
  text-align: center;
  line-height: 1.6;
}

/* Tab bar */
.panel-tabs {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.025), transparent 64%),
    var(--surface);
  padding: 10px 14px 9px;
  flex-shrink: 0;
  min-height: 52px;
  gap: 4px;
}

.panel-tab {
  position: relative;
  padding: 0 16px;
  height: 32px;
  min-width: 104px;
  border: 1px solid transparent;
  background: rgba(255,255,255,0.018);
  color: var(--text3);
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 7px;
  transition: background 0.14s, border-color 0.14s, color 0.14s, box-shadow 0.14s;
  letter-spacing: -0.01em;
}
.panel-tab:first-child { border-radius: 7px 4px 4px 7px; }
.panel-tab:last-child  { border-radius: 4px 7px 7px 4px; }
.panel-tab:hover {
  background: var(--surface2);
  border-color: var(--border);
  color: var(--text2);
}
.panel-tab:focus-visible {
  outline: none;
  border-color: var(--accent-border);
  box-shadow: 0 0 0 3px var(--accent-bg);
}
.panel-tab svg {
  width: 13px;
  height: 13px;
  opacity: 0.78;
}
.panel-tab.active {
  background: linear-gradient(180deg, var(--surface3), var(--surface2));
  border-color: var(--border2);
  color: var(--text);
  font-weight: 600;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 6px 18px rgba(0,0,0,0.18);
}
.panel-tab.active::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: -10px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent-glow);
}
.panel-tab.active svg {
  opacity: 1;
  color: var(--accent);
}
.panel-tab.ai-tab.active {
  background: linear-gradient(180deg, rgba(23,207,139,0.13), rgba(23,207,139,0.07));
  border-color: var(--accent-border);
  color: var(--text);
}

/* Diff content area */
.review-workspace {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  background: var(--bg);
}

.diff-content-wrap {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ai-drawer {
  position: relative;
  flex: 0 0 clamp(380px, 34vw, 460px);
  min-width: 0;
  display: flex;
  overflow: hidden;
  border-left: 1px solid var(--border);
  background: var(--surface);
  transition: flex-basis 0.18s ease;
}

.ai-drawer.collapsed {
  flex-basis: 42px;
}

.ai-drawer-rail {
  width: 42px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.025), transparent 64%),
    var(--surface);
  display: flex;
  justify-content: center;
  padding-top: 10px;
}

.ai-drawer-toggle {
  width: 28px;
  height: 28px;
  border: 1px solid var(--accent-border);
  border-radius: 7px;
  background: var(--accent-dim);
  color: var(--accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.14s, border-color 0.14s, color 0.14s, transform 0.14s;
}

.ai-drawer-toggle:hover {
  background: rgba(23,207,139,0.16);
  border-color: var(--accent);
}

.ai-drawer-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.ai-drawer-toggle svg {
  width: 13px;
  height: 13px;
}

.ai-drawer-body {
  width: calc(clamp(380px, 34vw, 460px) - 42px);
  min-width: 0;
  display: flex;
  opacity: 1;
  transition: opacity 0.12s ease;
}

.ai-drawer.collapsed .ai-drawer-body {
  opacity: 0;
  pointer-events: none;
}

.diff-summary {
  min-height: 44px;
  flex-shrink: 0;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  gap: 14px;
}

.diff-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.ai-review-toggle {
  height: 30px;
  padding: 0 11px;
  border: 1px solid var(--accent-border);
  border-radius: 6px;
  background: var(--accent-dim);
  color: var(--accent);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  letter-spacing: 0;
  transition: background 0.12s, border-color 0.12s, box-shadow 0.12s;
}

.ai-review-toggle:hover,
.ai-review-toggle.active {
  background: rgba(23,207,139,0.16);
  border-color: var(--accent);
  box-shadow: 0 0 14px var(--accent-glow);
}

.ai-review-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.ai-review-toggle svg {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.diff-meta {
  display: flex;
  align-items: stretch;
  gap: 1px;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid var(--border2);
  border-radius: 6px;
  background: var(--border);
}

.diff-stat {
  min-width: 66px;
  min-height: 30px;
  padding: 5px 8px 4px;
  background: linear-gradient(180deg, var(--surface2), var(--surface));
  color: var(--text2);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
}

.diff-stat-value {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0;
}

.diff-stat-label {
  font-size: 10px;
  line-height: 1;
  font-weight: 600;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.diff-stat.files {
  min-width: 54px;
}

.diff-stat.total {
  min-width: 74px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.025), transparent),
    var(--surface2);
}

.diff-stat.add {
  background:
    linear-gradient(180deg, rgba(23,207,139,0.14), rgba(23,207,139,0.045)),
    var(--surface);
}

.diff-stat.add .diff-stat-value {
  color: var(--green);
}

.diff-stat.del {
  background:
    linear-gradient(180deg, rgba(229,83,75,0.14), rgba(229,83,75,0.045)),
    var(--surface);
}

.diff-stat.del .diff-stat-value {
  color: var(--red);
}

.review-checkpoint-bar {
  min-height: 42px;
  flex-shrink: 0;
  padding: 7px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  gap: 10px;
}

.review-checkpoint-bar.reviewed {
  background:
    linear-gradient(90deg, rgba(23,207,139,0.08), transparent 42%),
    var(--surface);
}

.review-checkpoint-bar.stale {
  background:
    linear-gradient(90deg, rgba(201,154,13,0.1), transparent 45%),
    var(--surface);
}

.diff-mode-tabs {
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--bg);
  flex-shrink: 0;
}

.diff-mode-tab {
  height: 26px;
  min-width: 86px;
  padding: 0 10px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--text3);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  transition: background 0.12s, color 0.12s;
}

.diff-mode-tab:hover:not(:disabled) {
  color: var(--text2);
  background: var(--surface2);
}

.diff-mode-tab.active {
  color: var(--text);
  background: var(--surface2);
}

.diff-mode-tab:disabled {
  opacity: 0.36;
  cursor: not-allowed;
}

.checkpoint-status {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text3);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 7px;
}

.checkpoint-state-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text3);
  flex-shrink: 0;
}

.review-checkpoint-bar.reviewed .checkpoint-state-dot {
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent-glow);
}

.review-checkpoint-bar.stale .checkpoint-state-dot {
  background: var(--yellow);
  box-shadow: 0 0 10px rgba(201,154,13,0.18);
}

.checkpoint-reviewed-label,
.checkpoint-stale-label {
  color: var(--text);
  font-weight: 700;
  letter-spacing: 0;
  flex-shrink: 0;
}

.checkpoint-reviewed-label {
  color: var(--accent);
}

.checkpoint-stale-label {
  color: var(--yellow);
}

.checkpoint-detail {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.checkpoint-new {
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 11px;
  flex-shrink: 0;
}

.mark-reviewed-btn {
  height: 28px;
  padding: 0 11px;
  border: 1px solid var(--accent-border);
  border-radius: 6px;
  background: var(--accent-dim);
  color: var(--accent);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  flex-shrink: 0;
  transition: background 0.12s, border-color 0.12s;
}

.mark-reviewed-btn.reviewed {
  background: rgba(23,207,139,0.12);
  border-color: var(--accent-border);
  color: var(--accent);
}

.mark-reviewed-btn.reviewed::before {
  content: "";
  width: 7px;
  height: 4px;
  border: solid currentColor;
  border-width: 0 0 2px 2px;
  display: inline-block;
  transform: translateY(-1px) rotate(-45deg);
  margin-right: 7px;
}

.mark-reviewed-btn.stale {
  background: rgba(201,154,13,0.1);
  border-color: rgba(201,154,13,0.28);
  color: var(--yellow);
}

.mark-reviewed-btn:hover:not(:disabled) {
  background: rgba(23,207,139,0.16);
  border-color: var(--accent);
}

.mark-reviewed-btn.stale:hover:not(:disabled) {
  background: rgba(201,154,13,0.16);
  border-color: rgba(201,154,13,0.45);
}

.mark-reviewed-btn:disabled {
  opacity: 0.82;
  cursor: not-allowed;
}

.diff-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px;
  background: var(--bg);
  user-select: text;
}

/* ── diff2html theming ── */
.diff-content :deep(.d2h-wrapper) {
  background: transparent !important;
  color: var(--text2) !important;
}
.diff-content :deep(.d2h-file-list-wrapper) {
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: 9px;
  margin: 0 0 12px !important;
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
  color: var(--accent) !important;
  text-decoration: none;
}
.diff-content :deep(.d2h-file-list a:hover) {
  text-decoration: underline;
}
.diff-content :deep(.d2h-file-list-line .d2h-file-name-wrapper) {
  gap: 8px;
}
.diff-content :deep(.d2h-file-list-line .d2h-file-name) {
  flex: 1;
  min-width: 0;
}
.diff-content :deep(.d2h-file-list-line .d2h-file-stats) {
  align-items: center;
  gap: 4px;
  margin-left: 12px;
}
.diff-content :deep(.d2h-file-list-line .d2h-lines-added),
.diff-content :deep(.d2h-file-list-line .d2h-lines-deleted) {
  min-width: 28px;
  padding: 3px 7px !important;
  border-radius: 5px !important;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}
.diff-content :deep(.d2h-file-list-line .d2h-lines-added) {
  background: rgba(23,207,139,0.1);
  border-color: rgba(23,207,139,0.3) !important;
  color: var(--green) !important;
}
.diff-content :deep(.d2h-file-list-line .d2h-lines-deleted) {
  background: rgba(229,83,75,0.1);
  border-color: rgba(229,83,75,0.3) !important;
  color: var(--red) !important;
  margin-left: 0 !important;
}
.diff-content :deep(.d2h-file-wrapper) {
  background: var(--bg) !important;
  border: 1px solid var(--border) !important;
  border-radius: 9px;
  overflow: auto;
  margin: 0 0 12px !important;
  max-width: 100%;
}
.diff-content :deep(.d2h-file-header) {
  height: 32px !important;
  padding: 6px 12px !important;
  background: var(--surface) !important;
  border-color: var(--border) !important;
  color: var(--text2) !important;
  font-size: 12.5px !important;
  font-family: var(--font-mono) !important;
}
.diff-content :deep(.d2h-file-name),
.diff-content :deep(.d2h-file-name-wrapper),
.diff-content :deep(.d2h-file-collapse),
.diff-content :deep(.d2h-file-stats) {
  color: var(--text2) !important;
}
.diff-content :deep(.d2h-file-header .d2h-file-name-wrapper) {
  flex: 1;
  min-width: 0;
  width: auto;
}
.diff-content :deep(.d2h-file-path-toggle) {
  cursor: pointer;
  border-radius: 4px;
}
.diff-content :deep(.d2h-file-path-toggle:hover .d2h-file-name),
.diff-content :deep(.d2h-file-path-toggle:focus-visible .d2h-file-name) {
  color: var(--accent) !important;
}
.diff-content :deep(.d2h-file-path-toggle:focus-visible) {
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-bg);
}
.diff-content :deep(.d2h-file-toggle) {
  margin-left: auto;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--border2);
  border-radius: 5px;
  background: var(--surface2);
  color: var(--text3);
  cursor: pointer;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.14s, border-color 0.14s, color 0.14s, transform 0.14s;
}
.diff-content :deep(.d2h-file-toggle::before) {
  content: "";
  display: inline-block;
  width: 6px;
  height: 6px;
  border: solid currentColor;
  border-width: 0 2px 2px 0;
  transform: translateY(-1px) rotate(45deg);
  transition: transform 0.16s ease;
}
.diff-content :deep(.d2h-file-toggle:hover) {
  background: var(--surface3);
  border-color: var(--accent-border);
  color: var(--text2);
}
.diff-content :deep(.d2h-file-toggle:focus-visible) {
  outline: none;
  border-color: var(--accent-border);
  box-shadow: 0 0 0 3px var(--accent-bg);
}
.diff-content :deep(.d2h-file-collapsed .d2h-file-header) {
  border-bottom: 0 !important;
}
.diff-content :deep(.d2h-file-collapsed .d2h-file-toggle::before) {
  transform: translateX(-1px) rotate(-45deg);
}
.diff-content :deep(.d2h-diff-table) {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg) !important;
  color: var(--text2) !important;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.4;
}
.diff-content :deep(.d2h-diff-tbody) { background: var(--bg) !important; }
.diff-content :deep(.d2h-diff-tbody tr) { background: var(--bg) !important; }

.diff-content :deep(.d2h-code-side-linenumber),
.diff-content :deep(.d2h-code-linenumber) {
  position: static !important;
  width: 7em !important;
  min-width: 7em !important;
  max-width: 7em !important;
  padding: 0 10px !important;
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
  padding: 0 12px !important;
  color: var(--text2) !important;
  background: transparent !important;
}
.diff-content :deep(.d2h-code-line-ctn) {
  display: inline !important;
  width: auto !important;
  color: inherit !important;
  background: transparent !important;
}
.diff-content :deep(.d2h-code-line-prefix) { color: var(--text3) !important; }

.diff-content :deep(.d2h-cntx),
.diff-content :deep(.d2h-cntx .d2h-code-line),
.diff-content :deep(.d2h-cntx .d2h-code-line-ctn) {
  background: var(--bg) !important;
  color: var(--text2) !important;
}
.diff-content :deep(.d2h-ins) { background: rgba(23,207,139,0.07) !important; }
.diff-content :deep(.d2h-ins .d2h-code-line),
.diff-content :deep(.d2h-ins .d2h-code-line-ctn) {
  background: transparent !important;
  color: #a8f0d8 !important;
}
.diff-content :deep(.d2h-del) { background: rgba(229,83,75,0.07) !important; }
.diff-content :deep(.d2h-del .d2h-code-line),
.diff-content :deep(.d2h-del .d2h-code-line-ctn) {
  background: transparent !important;
  color: #f5b8b4 !important;
}
.diff-content :deep(.d2h-info) {
  background: rgba(23,207,139,0.05) !important;
  color: var(--text2) !important;
}
.diff-content :deep(.d2h-info .d2h-code-line),
.diff-content :deep(.d2h-info .d2h-code-line-ctn),
.diff-content :deep(.d2h-info .d2h-code-linenumber) {
  background: transparent !important;
  color: var(--text3) !important;
}
.diff-content :deep(.d2h-code-line ins) {
  background-color: rgba(23,207,139,0.28) !important;
  color: inherit !important;
  border-radius: 2px;
  text-decoration: none;
}
.diff-content :deep(.d2h-code-line del) {
  background-color: rgba(229,83,75,0.28) !important;
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
.diff-content :deep(.d2h-file-added-icon)   { color: var(--green)  !important; }
.diff-content :deep(.d2h-file-deleted-icon) { color: var(--red)    !important; }
.diff-content :deep(.d2h-file-renamed-icon) { color: var(--yellow) !important; }
</style>
