<template>
  <div class="diff-panel">
    <!-- No MR selected -->
    <div v-if="!mrs.activeMr" class="diff-placeholder">
      <div class="diff-placeholder-icon placeholder-icon-anim">
        <svg width="26" height="26" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
          <path d="M5 10.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"/>
        </svg>
      </div>
      <strong class="diff-placeholder-title placeholder-text-anim">No MR selected</strong>
      <p class="placeholder-sub-anim">Click a merge request to view its diff,<br>or run an AI Review.</p>
    </div>

    <!-- Detail workspace -->
    <template v-else>
      <div class="panel-tabs">
        <div class="primary-tabs" role="tablist" aria-label="Merge request details">
          <button
            class="panel-tab"
            :class="{ active: mrs.activePanelTab === 'diff' }"
            role="tab"
            :aria-selected="mrs.activePanelTab === 'diff'"
            @click="showDiff"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
              <path d="M5 10.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"/>
            </svg>
            Diff
          </button>
          <button
            class="panel-tab"
            :class="{ active: mrs.activePanelTab === 'comments' }"
            role="tab"
            :aria-selected="mrs.activePanelTab === 'comments'"
            @click="showComments"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M2 3.5A2.5 2.5 0 0 1 4.5 1h7A2.5 2.5 0 0 1 14 3.5v4A2.5 2.5 0 0 1 11.5 10H7.9l-3.2 2.4A.45.45 0 0 1 4 12.04V10A2 2 0 0 1 2 8V3.5Z"/>
            </svg>
            Comments
            <span v-if="commentTabCount > 0" class="panel-tab-count">{{ commentTabCount }}</span>
          </button>
        </div>
        <button
          class="ai-drawer-trigger"
          :class="{ open: aiReviewOpen, 'has-history': shouldShowAiHistoryNotice }"
          :aria-pressed="aiReviewOpen"
          :aria-expanded="aiReviewOpen"
          :title="aiReviewTitle"
          @click="toggleAiReview"
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0l1.5 5H16l-4.5 3.5L13 14 8 10l-5 4 1.5-5.5L0 5h6.5L8 0z"/>
          </svg>
          <span>{{ aiReviewOpen ? 'Hide AI Review' : 'AI Review' }}</span>
          <span
            v-if="shouldShowAiHistoryNotice"
            class="ai-history-notice"
            :aria-label="`${aiHistoryCount} saved AI review${aiHistoryCount === 1 ? '' : 's'} available`"
          >{{ aiHistoryCount }}</span>
        </button>
      </div>

      <AiPanel
        v-if="isCompact && mrs.activePanelTab === 'ai'"
        :mr="mrs.activeMr!"
        :ai-enabled="props.aiEnabled"
        :provider-label="props.providerLabel"
        class="panel-content-fade"
      />
      <CommentsPanel
        v-else-if="mrs.activePanelTab === 'comments'"
        :mr="mrs.activeMr!"
        class="panel-content-fade"
      />
      <div v-else class="review-workspace panel-content-fade">
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
              <div class="diff-title" :title="mrs.activeMr?.title">{{ mrs.activeMr?.title }}</div>
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
              <div class="file-view-tabs" role="group" aria-label="Changed files view">
                <button
                  class="file-view-tab"
                  :class="{ active: fileListView === 'list' }"
                  :aria-pressed="fileListView === 'list'"
                  title="Show changed files as a flat list"
                  @click="fileListView = 'list'"
                >
                  List
                </button>
                <button
                  class="file-view-tab"
                  :class="{ active: fileListView === 'tree' }"
                  :aria-pressed="fileListView === 'tree'"
                  title="Show changed files grouped by folder"
                  @click="fileListView = 'tree'"
                >
                  Tree
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
              :class="{ 'tree-split': fileListView === 'tree' }"
              ref="diffContentRef"
            >
              <template v-if="fileListView === 'tree'">
                <nav
                  class="diff-tree-pane"
                  :style="diffTreePaneStyle"
                  aria-label="Changed files"
                  @click="handleFileTreeClick"
                  v-html="diffTreeHtml"
                ></nav>
                <div
                  class="diff-tree-resize-handle"
                  title="Resize file tree"
                  role="separator"
                  aria-orientation="vertical"
                  @pointerdown="startDiffTreeResize"
                ></div>
                <div
                  class="diff-body-pane"
                  @click="handleDiffContentClick"
                  @keydown="handleDiffContentKeydown"
                  v-html="diffBodyHtml"
                ></div>
              </template>
              <div
                v-else
                class="diff-html-pane"
                @click="handleDiffContentClick"
                @keydown="handleDiffContentKeydown"
                v-html="diffHtml"
              ></div>
            </div>
            <div
              v-if="inlineDraft"
              class="inline-comment-popover"
              :style="{ top: `${inlineDraft.top}px`, left: `${inlineDraft.left}px` }"
            >
              <div class="inline-comment-title">
                <span class="inline-comment-title-label">{{ inlineDraft.label }}</span>
                <button type="button" @click="cancelInlineDraft">×</button>
              </div>
              <textarea
                v-model="inlineBody"
                class="inline-comment-textarea"
                placeholder="Add an inline comment..."
                :disabled="commentState.posting"
              ></textarea>
              <div class="inline-comment-actions">
                <span class="comment-error">{{ inlineError || commentState.error }}</span>
                <button class="inline-comment-submit" :disabled="commentState.posting || !inlineBody.trim()" @click="submitInlineComment">
                  {{ commentState.posting ? 'Posting...' : 'Comment' }}
                </button>
              </div>
            </div>
          </template>
        </div>

        <aside
          v-if="!isCompact && (mrs.aiDrawerOpen || aiDrawerFullscreen)"
          class="ai-drawer"
          :class="{
            fullscreen: aiDrawerFullscreen,
            resizing: isResizingAiDrawer,
          }"
          :style="aiDrawerStyle"
          :aria-hidden="!mrs.aiDrawerOpen && !aiDrawerFullscreen"
        >
          <div
            v-if="mrs.aiDrawerOpen && !aiDrawerFullscreen"
            class="ai-drawer-resize-handle"
            title="Resize AI Review"
            role="separator"
            aria-orientation="vertical"
            @pointerdown="startAiDrawerResize"
          ></div>
          <div class="ai-drawer-rail">
            <button
              class="ai-drawer-toggle close"
              title="Close AI Review"
              aria-label="Close AI Review"
              @click="closeAiDrawer"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
            <button
              class="ai-drawer-toggle secondary"
              :title="aiDrawerFullscreen ? 'Restore side panel' : 'Fullscreen AI Review'"
              :aria-label="aiDrawerFullscreen ? 'Restore side panel' : 'Fullscreen AI Review'"
              :aria-pressed="aiDrawerFullscreen"
              @click="toggleAiDrawerFullscreen"
            >
              <svg v-if="!aiDrawerFullscreen" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M2 2h5v1.4H4.4V6H3V3H2V2zm7 0h5v4h-1.4V3.4H10V2zM3 10h1.4v2.6H7V14H2v-4h1zm9.6 0H14v4H9v-1.4h3.6V10z"/>
              </svg>
              <svg v-else viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M6 2v5H1V5.6h2.6V3H6zm4 0h3v3.6H15V7h-5V2zM1 9h5v5H3v-2.6H1V9zm9 0h5v2.4h-2V14h-3V9z"/>
              </svg>
            </button>
          </div>
          <div
            class="ai-drawer-body"
            :style="aiDrawerBodyStyle"
            :inert="!mrs.aiDrawerOpen && !aiDrawerFullscreen"
          >
            <AiPanel
              :mr="mrs.activeMr!"
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
import type { CSSProperties } from 'vue';
import { useMrsStore } from '../stores/mrs';
import { useCommentsStore } from '../stores/comments';
import type { DiffPosition, GitLabDiscussion, GitLabDiscussionNote } from '../../types';
import * as Diff2Html from 'diff2html';
import AiPanel from './AiPanel/index.vue';
import CommentsPanel from './CommentsPanel.vue';
import { renderMarkdown } from '../utils';

const props = defineProps<{ aiEnabled: boolean; providerLabel: string }>();

type DiffMode = 'full' | 'new';
type FileListView = 'list' | 'tree';
const AI_DRAWER_WIDTH_STORAGE_KEY = 'aiDrawerWidth';
const FILE_LIST_VIEW_STORAGE_KEY = 'diffFileListView';
const DIFF_TREE_WIDTH_STORAGE_KEY = 'diffTreeWidth';
const AI_DRAWER_RAIL_WIDTH = 42;
const AI_DRAWER_MIN_WIDTH = 380;
const AI_DRAWER_DEFAULT_WIDTH = 440;
const DIFF_TREE_MIN_WIDTH = 260;
const DIFF_TREE_MAX_WIDTH = 640;
const DIFF_TREE_DEFAULT_WIDTH = 420;

const mrs = useMrsStore();
const loadingDiff = ref(false);
const diffError   = ref(false);
const diffHtml    = ref('');
const diffTreeHtml = ref('');
const diffBodyHtml = ref('');
const diffStats   = ref({ files: 0, added: 0, deleted: 0 });
const diffMode    = ref<DiffMode>('full');
const fileListView = ref<FileListView>(loadFileListView());
const checkpoint = computed(() => mrs.activeMr ? mrs.reviewCheckpoints[mrs.activeMr.id] ?? null : null);
const markingReviewed = ref(false);
const isCompact = ref(false);
const aiDrawerWidth = ref(loadAiDrawerWidth());
const diffTreeWidth = ref(loadDiffTreeWidth());
const aiDrawerFullscreen = ref(false);
const isResizingAiDrawer = ref(false);
const isResizingDiffTree = ref(false);
const comments = useCommentsStore();
const currentChanges = ref<any[]>([]);
const currentCombinedDiff = ref('');
const currentPositionLookup = ref<Map<string, DiffLinePosition>>(new Map());
const diffContentRef = ref<HTMLElement | null>(null);
const aiHistoryCount = ref(0);
const inlineBody = ref('');
const inlineError = ref('');
const inlineDraft = ref<{
  top: number;
  left: number;
  label: string;
  old_path: string;
  new_path: string;
  old_line?: number;
  new_line?: number;
} | null>(null);
let compactQuery: MediaQueryList | null = null;
let stopDiffTreeResize: (() => void) | null = null;
let aiHistorySeq = 0;
type DiffLinePosition = {
  old_path: string;
  new_path: string;
  old_line?: number;
  new_line?: number;
  kind: 'old' | 'new' | 'context';
  content: string;
};
const changedLines = computed(() => diffStats.value.added + diffStats.value.deleted);
const currentSha = computed(() => mrs.activeMr?.sha ?? '');
const commentState = computed(() => comments.getState(mrs.activeMr));
const commentTabCount = computed(() =>
  commentState.value.discussions.filter(discussion => discussion.notes.some(note => !note.system)).length
);
const aiReviewOpen = computed(() =>
  isCompact.value ? mrs.activePanelTab === 'ai' : mrs.aiDrawerOpen || aiDrawerFullscreen.value
);
const shouldShowAiHistoryNotice = computed(() => aiHistoryCount.value > 0 && !aiReviewOpen.value);
const aiReviewTitle = computed(() => {
  if (aiReviewOpen.value) return 'Hide AI Review';
  if (aiHistoryCount.value === 1) return 'Show AI Review - 1 saved review available';
  if (aiHistoryCount.value > 1) return `Show AI Review - ${aiHistoryCount.value} saved reviews available`;
  return 'Show AI Review';
});
const shouldShowDiff = computed(() =>
  Boolean(mrs.activeMr && mrs.activePanelTab !== 'comments' && (!isCompact.value || mrs.activePanelTab === 'diff'))
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
const aiDrawerStyle = computed<CSSProperties>(() => {
  if (aiDrawerFullscreen.value) return {};
  return { flexBasis: `${aiDrawerWidth.value}px` };
});
const aiDrawerBodyStyle = computed<CSSProperties>(() => {
  if (aiDrawerFullscreen.value) return {};
  return { width: `${Math.max(0, aiDrawerWidth.value - AI_DRAWER_RAIL_WIDTH)}px` };
});
const diffTreePaneStyle = computed<CSSProperties>(() => ({
  flexBasis: `${diffTreeWidth.value}px`,
}));

function loadAiDrawerWidth() {
  const saved = Number(localStorage.getItem(AI_DRAWER_WIDTH_STORAGE_KEY));
  return Number.isFinite(saved) ? saved : AI_DRAWER_DEFAULT_WIDTH;
}

function maxAiDrawerWidth() {
  return Math.max(AI_DRAWER_MIN_WIDTH, Math.floor(window.innerWidth * 0.82));
}

function clampAiDrawerWidth(width: number) {
  return Math.min(maxAiDrawerWidth(), Math.max(AI_DRAWER_MIN_WIDTH, Math.round(width)));
}

function saveAiDrawerWidth(width: number) {
  localStorage.setItem(AI_DRAWER_WIDTH_STORAGE_KEY, String(width));
}

function loadDiffTreeWidth() {
  const saved = Number(localStorage.getItem(DIFF_TREE_WIDTH_STORAGE_KEY));
  return Number.isFinite(saved) ? saved : DIFF_TREE_DEFAULT_WIDTH;
}

function maxDiffTreeWidth() {
  const containerWidth = diffContentRef.value?.clientWidth ?? window.innerWidth;
  return Math.min(DIFF_TREE_MAX_WIDTH, Math.max(DIFF_TREE_MIN_WIDTH, Math.floor(containerWidth * 0.48)));
}

function clampDiffTreeWidth(width: number) {
  return Math.min(maxDiffTreeWidth(), Math.max(DIFF_TREE_MIN_WIDTH, Math.round(width)));
}

function saveDiffTreeWidth(width: number) {
  localStorage.setItem(DIFF_TREE_WIDTH_STORAGE_KEY, String(width));
}

function loadFileListView(): FileListView {
  return localStorage.getItem(FILE_LIST_VIEW_STORAGE_KEY) === 'tree' ? 'tree' : 'list';
}

function shortSha(sha: string) {
  return sha ? sha.slice(0, 8) : '';
}

function showDiff() {
  mrs.setActivePanelTab('diff');
}

function showComments() {
  mrs.setActivePanelTab('comments');
  mrs.setAiDrawerOpen(false);
  if (mrs.activeMr) void comments.load(mrs.activeMr);
}

function toggleAiReview() {
  if (!isCompact.value) {
    const nextOpen = !aiReviewOpen.value;
    if (!nextOpen) aiDrawerFullscreen.value = false;
    mrs.setAiDrawerOpen(nextOpen);
    if (nextOpen) mrs.setActivePanelTab('diff');
    return;
  }
  mrs.setActivePanelTab(mrs.activePanelTab === 'ai' ? 'diff' : 'ai');
}

function updateCompactState(event: MediaQueryListEvent | MediaQueryList) {
  isCompact.value = event.matches;
  if (event.matches) aiDrawerFullscreen.value = false;
  if (!event.matches && mrs.activePanelTab === 'ai') mrs.setActivePanelTab('diff');
  if (event.matches && mrs.aiDrawerOpen) mrs.setActivePanelTab('ai');
  diffTreeWidth.value = clampDiffTreeWidth(diffTreeWidth.value);
}

function closeAiDrawer() {
  aiDrawerFullscreen.value = false;
  mrs.setAiDrawerOpen(false);
  mrs.setActivePanelTab('diff');
}

function toggleAiDrawerFullscreen() {
  const nextFullscreen = !aiDrawerFullscreen.value;
  aiDrawerFullscreen.value = nextFullscreen;
  if (nextFullscreen) {
    mrs.setAiDrawerOpen(true);
    mrs.setActivePanelTab('diff');
  }
}

function startAiDrawerResize(event: PointerEvent) {
  if (!mrs.aiDrawerOpen) return;

  event.preventDefault();
  const startX = event.clientX;
  const startWidth = aiDrawerWidth.value;
  isResizingAiDrawer.value = true;
  document.body.classList.add('ai-drawer-resizing');

  const onPointerMove = (moveEvent: PointerEvent) => {
    aiDrawerWidth.value = clampAiDrawerWidth(startWidth + startX - moveEvent.clientX);
  };

  const onPointerUp = () => {
    isResizingAiDrawer.value = false;
    document.body.classList.remove('ai-drawer-resizing');
    aiDrawerWidth.value = clampAiDrawerWidth(aiDrawerWidth.value);
    saveAiDrawerWidth(aiDrawerWidth.value);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}

function startDiffTreeResize(event: PointerEvent) {
  if (fileListView.value !== 'tree') return;

  event.preventDefault();
  stopDiffTreeResize?.();
  const startX = event.clientX;
  const startWidth = diffTreeWidth.value;
  const handle = event.currentTarget as HTMLElement | null;
  isResizingDiffTree.value = true;
  document.body.classList.add('diff-tree-resizing');
  handle?.setPointerCapture?.(event.pointerId);

  const onPointerMove = (moveEvent: PointerEvent) => {
    diffTreeWidth.value = clampDiffTreeWidth(startWidth + moveEvent.clientX - startX);
  };

  const onPointerUp = () => {
    handle?.releasePointerCapture?.(event.pointerId);
    isResizingDiffTree.value = false;
    document.body.classList.remove('diff-tree-resizing');
    diffTreeWidth.value = clampDiffTreeWidth(diffTreeWidth.value);
    saveDiffTreeWidth(diffTreeWidth.value);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    handle?.removeEventListener('lostpointercapture', onPointerUp);
    stopDiffTreeResize = null;
  };

  stopDiffTreeResize = onPointerUp;
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  handle?.addEventListener('lostpointercapture', onPointerUp, { once: true });
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isResizingDiffTree.value) {
    stopDiffTreeResize?.();
    return;
  }
  if (event.key === 'Escape' && aiDrawerFullscreen.value) {
    aiDrawerFullscreen.value = false;
  }
}

type LanguageTheme = {
  className: string;
  label: string;
};

const languageThemesByExtension: Record<string, LanguageTheme> = {
  ts: { className: 'lang-ts', label: 'TS' },
  tsx: { className: 'lang-ts', label: 'TSX' },
  js: { className: 'lang-js', label: 'JS' },
  jsx: { className: 'lang-js', label: 'JSX' },
  mjs: { className: 'lang-js', label: 'JS' },
  cjs: { className: 'lang-js', label: 'JS' },
  vue: { className: 'lang-vue', label: 'Vue' },
  css: { className: 'lang-css', label: 'CSS' },
  scss: { className: 'lang-css', label: 'SCSS' },
  sass: { className: 'lang-css', label: 'Sass' },
  less: { className: 'lang-css', label: 'Less' },
  html: { className: 'lang-html', label: 'HTML' },
  htm: { className: 'lang-html', label: 'HTML' },
  json: { className: 'lang-json', label: 'JSON' },
  jsonc: { className: 'lang-json', label: 'JSONC' },
  yaml: { className: 'lang-yaml', label: 'YAML' },
  yml: { className: 'lang-yaml', label: 'YAML' },
  toml: { className: 'lang-config', label: 'TOML' },
  env: { className: 'lang-config', label: 'ENV' },
  md: { className: 'lang-md', label: 'MD' },
  mdx: { className: 'lang-md', label: 'MDX' },
  py: { className: 'lang-py', label: 'Python' },
  java: { className: 'lang-java', label: 'Java' },
  kt: { className: 'lang-java', label: 'Kotlin' },
  kts: { className: 'lang-java', label: 'Kotlin' },
  go: { className: 'lang-go', label: 'Go' },
  rs: { className: 'lang-rs', label: 'Rust' },
  sh: { className: 'lang-shell', label: 'Shell' },
  bash: { className: 'lang-shell', label: 'Bash' },
  zsh: { className: 'lang-shell', label: 'Zsh' },
  xml: { className: 'lang-xml', label: 'XML' },
  svg: { className: 'lang-xml', label: 'SVG' },
  sql: { className: 'lang-sql', label: 'SQL' },
};

function getLanguageTheme(fileName: string): LanguageTheme | null {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return languageThemesByExtension[ext] ?? null;
}

function applyLanguageTheme(element: Element, theme: LanguageTheme | null) {
  if (!theme) return;
  element.classList.add(theme.className, 'has-language-theme');
}

type FileTreeNode = {
  name: string;
  path: string;
  children: Map<string, FileTreeNode>;
  files: Array<{
    path: string;
    name: string;
    href: string;
    added: number;
    deleted: number;
    theme: LanguageTheme | null;
  }>;
  added: number;
  deleted: number;
  fileCount: number;
};

function createFileTreeNode(name: string, path: string): FileTreeNode {
  return {
    name,
    path,
    children: new Map(),
    files: [],
    added: 0,
    deleted: 0,
    fileCount: 0,
  };
}

function parseFileListStat(li: Element, selector: string) {
  const text = li.querySelector(selector)?.textContent ?? '';
  return Number(text.replace(/[^\d]/g, '')) || 0;
}

function appendTreeStats(doc: Document, parent: Element, added: number, deleted: number) {
  const stats = doc.createElement('span');
  stats.className = 'd2h-file-tree-stats';

  const addedBadge = doc.createElement('span');
  addedBadge.className = 'd2h-lines-added';
  addedBadge.textContent = `+${added}`;

  const deletedBadge = doc.createElement('span');
  deletedBadge.className = 'd2h-lines-deleted';
  deletedBadge.textContent = `-${deleted}`;

  stats.append(addedBadge, deletedBadge);
  parent.appendChild(stats);
}

function appendFileTreeNode(doc: Document, parent: Element, node: FileTreeNode, depth: number) {
  const compactedNames = [node.name];
  let current = node;

  while (current.files.length === 0 && current.children.size === 1) {
    const onlyChild = Array.from(current.children.values())[0];
    compactedNames.push(onlyChild.name);
    current = onlyChild;
  }

  const details = doc.createElement('details');
  details.className = 'd2h-file-tree-dir';
  details.open = true;
  details.style.setProperty('--tree-depth', String(depth));

  const summary = doc.createElement('summary');
  summary.className = 'd2h-file-tree-dir-row';

  const name = doc.createElement('span');
  name.className = 'd2h-file-tree-dir-name';
  name.textContent = compactedNames.join('/');
  name.setAttribute('title', current.path);

  const count = doc.createElement('span');
  count.className = 'd2h-file-tree-count';
  count.textContent = `${current.fileCount} ${current.fileCount === 1 ? 'file' : 'files'}`;

  summary.append(name, count);
  appendTreeStats(doc, summary, current.added, current.deleted);
  details.appendChild(summary);

  const children = doc.createElement('div');
  children.className = 'd2h-file-tree-children';

  Array.from(current.children.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(child => appendFileTreeNode(doc, children, child, depth + 1));

  current.files
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(file => {
      const row = doc.createElement('a');
      row.className = 'd2h-file-tree-file';
      row.href = file.href;
      row.style.setProperty('--tree-depth', String(depth + 1));
      row.setAttribute('title', file.path);
      applyLanguageTheme(row, file.theme);

      const label = doc.createElement('span');
      label.className = 'd2h-file-tree-file-name';
      label.textContent = file.name;

      row.appendChild(label);
      appendTreeStats(doc, row, file.added, file.deleted);
      children.appendChild(row);
    });

  details.appendChild(children);
  parent.appendChild(details);
}

function makeDiffFileListTree(doc: Document) {
  const wrapper = doc.querySelector('.d2h-file-list-wrapper');
  const list = wrapper?.querySelector('.d2h-file-list');
  if (!wrapper || !list) return;

  const root = createFileTreeNode('', '');
  list.querySelectorAll(':scope > li').forEach((li) => {
    const path = li.querySelector('.d2h-file-name')?.textContent?.trim() ?? '';
    if (!path) return;

    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop() ?? path;
    const added = parseFileListStat(li, '.d2h-lines-added');
    const deleted = parseFileListStat(li, '.d2h-lines-deleted');
    let node = root;

    node.fileCount += 1;
    node.added += added;
    node.deleted += deleted;

    for (const part of parts) {
      const childPath = node.path ? `${node.path}/${part}` : part;
      let child = node.children.get(part);
      if (!child) {
        child = createFileTreeNode(part, childPath);
        node.children.set(part, child);
      }
      child.fileCount += 1;
      child.added += added;
      child.deleted += deleted;
      node = child;
    }

    node.files.push({
      path,
      name: fileName,
      href: li.querySelector('a')?.getAttribute('href') ?? '#',
      added,
      deleted,
      theme: getLanguageTheme(path),
    });
  });

  const tree = doc.createElement('div');
  tree.className = 'd2h-file-tree';

  Array.from(root.children.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(child => appendFileTreeNode(doc, tree, child, 0));

  root.files
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(file => {
      const row = doc.createElement('a');
      row.className = 'd2h-file-tree-file';
      row.href = file.href;
      row.style.setProperty('--tree-depth', '0');
      row.setAttribute('title', file.path);
      applyLanguageTheme(row, file.theme);

      const label = doc.createElement('span');
      label.className = 'd2h-file-tree-file-name';
      label.textContent = file.name;

      row.appendChild(label);
      appendTreeStats(doc, row, file.added, file.deleted);
      tree.appendChild(row);
    });

  wrapper.classList.add('tree-view');
  list.replaceWith(tree);

}

function makeDiffFilesCollapsible(html: string, view: FileListView) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');

  doc.querySelectorAll('.d2h-file-wrapper').forEach((file) => {
    const header = file.querySelector('.d2h-file-header');
    if (!header) return;

    const fileName = header.querySelector('.d2h-file-name')?.textContent?.trim() ?? '';
    const theme = getLanguageTheme(fileName);
    applyLanguageTheme(file, theme);

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

  doc.querySelectorAll('.d2h-file-list > li').forEach((li) => {
    const fileName = li.querySelector('.d2h-file-name')?.textContent?.trim() ?? '';
    applyLanguageTheme(li, getLanguageTheme(fileName));
  });

  if (view === 'tree') makeDiffFileListTree(doc);

  return doc.body.firstElementChild?.innerHTML ?? html;
}

function commentKey(position: Pick<DiffPosition, 'old_path' | 'new_path' | 'old_line' | 'new_line'>) {
  return [
    position.old_path,
    position.new_path,
    position.old_line ?? '',
    position.new_line ?? '',
  ].join(':');
}

function discussionPosition(discussion: GitLabDiscussion): DiffPosition | null {
  return discussion.notes.find(note => note.position)?.position ?? null;
}

function isCurrentDiscussionPosition(position: DiffPosition | null): boolean {
  if (!position) return false;
  return !currentSha.value || position.head_sha === currentSha.value;
}

function isDiscussionResolved(discussion: GitLabDiscussion): boolean {
  const resolvable = discussion.notes.filter(n => n.resolvable);
  return resolvable.length > 0 && resolvable.every(n => n.resolved);
}

function discussionsByPosition(discussions: GitLabDiscussion[]) {
  const map = new Map<string, GitLabDiscussion[]>();
  for (const discussion of discussions) {
    if (isDiscussionResolved(discussion)) continue;
    const position = discussionPosition(discussion);
    if (!isCurrentDiscussionPosition(position)) continue;
    if (!position) continue;
    const key = commentKey(position);
    const grouped = map.get(key) ?? [];
    grouped.push(discussion);
    map.set(key, grouped);
  }
  return map;
}

function firstVisibleNote(discussion: GitLabDiscussion): GitLabDiscussionNote | null {
  return discussion.notes.find(note => !note.system) ?? discussion.notes[0] ?? null;
}

function formatInlineDiscussion(doc: Document, discussion: GitLabDiscussion) {
  const note = firstVisibleNote(discussion);
  const wrapper = doc.createElement('div');
  wrapper.className = `inline-discussion${note?.resolved ? ' resolved' : ''}`;

  const meta = doc.createElement('div');
  meta.className = 'inline-discussion-meta';
  meta.textContent = note
    ? `${note.author.name} · ${new Date(note.created_at).toLocaleString()}`
    : 'Discussion';

  const body = doc.createElement('div');
  body.className = 'inline-discussion-body';
  body.innerHTML = renderMarkdown(note?.body ?? '');

  wrapper.append(meta, body);
  return wrapper;
}

function positionLookupKey(side: 'old' | 'new', path: string, line?: number) {
  return line ? `${side}:${path}:${line}` : '';
}

function extractDiffLinePositions(html: string, changes: any[]) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const map = new Map<string, DiffLinePosition>();

  doc.querySelectorAll('.d2h-file-wrapper').forEach((file, fileIndex) => {
    const change = changes[fileIndex];
    if (!change) return;

    file.querySelectorAll('tbody tr').forEach((row) => {
      const oldLine = row.querySelector('.line-num1')?.textContent?.trim();
      const newLine = row.querySelector('.line-num2')?.textContent?.trim();
      const codeCell = row.querySelector('td:nth-child(2)');
      if (!codeCell || (!oldLine && !newLine) || codeCell.classList.contains('d2h-info')) return;

      const oldLineNum = oldLine ? Number(oldLine) : undefined;
      const newLineNum = newLine ? Number(newLine) : undefined;
      const position: DiffLinePosition = {
        old_path: change.old_path,
        new_path: change.new_path,
        old_line: oldLineNum,
        new_line: newLineNum,
        content: row.querySelector('.d2h-code-line-ctn')?.textContent ?? '',
        kind: codeCell.classList.contains('d2h-ins')
          ? 'new'
          : codeCell.classList.contains('d2h-del')
            ? 'old'
            : 'context',
      };

      const newKey = positionLookupKey('new', change.new_path, newLineNum);
      const oldKey = positionLookupKey('old', change.old_path, oldLineNum);
      if (newKey) map.set(newKey, position);
      if (oldKey) map.set(oldKey, position);
    });
  });

  return map;
}

function leadingIndentLength(value: string) {
  const match = value.match(/^[\t \u00a0]+/);
  return match?.[0].length ?? 0;
}

function removeLeadingIndent(node: Node, amount: number) {
  let remaining = amount;

  function visit(current: Node): boolean {
    if (remaining <= 0) return true;

    if (current.nodeType === Node.TEXT_NODE) {
      const text = current.textContent ?? '';
      const indent = text.match(/^[\t \u00a0]+/)?.[0] ?? '';
      const removeCount = Math.min(remaining, indent.length);
      if (removeCount > 0) {
        current.textContent = text.slice(removeCount);
        remaining -= removeCount;
      }
      return remaining <= 0 || removeCount < text.length;
    }

    for (const child of Array.from(current.childNodes)) {
      if (visit(child)) return true;
    }

    return false;
  }

  visit(node);
}

function normalizeVisibleIndentation(doc: Document) {
  doc.querySelectorAll('.d2h-file-wrapper').forEach((file) => {
    let currentGroup: Element[] = [];
    const flushGroup = () => {
      if (currentGroup.length === 0) return;

      const codeContainers = currentGroup
        .map(row => row.querySelector('.d2h-code-line-ctn'))
        .filter((container): container is Element => Boolean(container));
      const indents = codeContainers
        .map(container => container.textContent ?? '')
        .filter(text => text.trim().length > 0)
        .map(leadingIndentLength);
      const commonIndent = indents.length ? Math.min(...indents) : 0;

      if (commonIndent > 0) {
        codeContainers.forEach(container => removeLeadingIndent(container, commonIndent));
      }

      currentGroup = [];
    };

    file.querySelectorAll('tbody tr').forEach((row) => {
      const codeCell = row.querySelector('td:nth-child(2)');
      if (!codeCell || codeCell.classList.contains('d2h-info')) {
        flushGroup();
        return;
      }
      if (codeCell.querySelector('.d2h-code-line-ctn')) currentGroup.push(row);
    });

    flushGroup();
  });
}

type SyntaxToken = {
  text: string;
  className?: string;
};

const javaKeywords = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
  'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
  'for', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new',
  'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super',
  'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile',
  'while', 'var',
]);

const javaLiterals = new Set(['true', 'false', 'null']);

function syntaxClassForWord(word: string, langClass: string): string | undefined {
  if (langClass === 'lang-java') {
    if (javaKeywords.has(word)) return 'syn-keyword';
    if (javaLiterals.has(word)) return 'syn-literal';
    if (/^[A-Z][A-Za-z0-9_]*$/.test(word)) return 'syn-type';
  }
  return undefined;
}

function tokenizeJava(text: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  const pattern = /(@[A-Za-z_][\w.]*)|("(?:\\.|[^"\\])*")|('(?:\\.|[^'\\])*')|(\/\/.*$)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) tokens.push({ text: text.slice(lastIndex, match.index) });
    const value = match[0];
    const className = match[1]
      ? 'syn-annotation'
      : match[2] || match[3]
        ? 'syn-string'
        : match[4]
          ? 'syn-comment'
          : match[5]
            ? 'syn-number'
            : syntaxClassForWord(value, 'lang-java');
    tokens.push({ text: value, className });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) tokens.push({ text: text.slice(lastIndex) });
  return tokens;
}

function tokenizeYaml(text: string): SyntaxToken[] {
  const commentIndex = text.indexOf('#');
  const content = commentIndex >= 0 ? text.slice(0, commentIndex) : text;
  const comment = commentIndex >= 0 ? text.slice(commentIndex) : '';
  const tokens: SyntaxToken[] = [];
  const keyMatch = content.match(/^(\s*-?\s*)([A-Za-z0-9_.-]+)(\s*:)/);

  if (keyMatch) {
    tokens.push({ text: keyMatch[1] });
    tokens.push({ text: keyMatch[2], className: 'syn-property' });
    tokens.push({ text: keyMatch[3], className: 'syn-punctuation' });
    tokenizeYamlScalars(content.slice(keyMatch[0].length), tokens);
  } else {
    tokenizeYamlScalars(content, tokens);
  }

  if (comment) tokens.push({ text: comment, className: 'syn-comment' });
  return tokens;
}

function tokenizeYamlScalars(text: string, tokens: SyntaxToken[]) {
  const pattern = /("(?:\\.|[^"\\])*")|('(?:\\.|[^'\\])*')|(\b(?:true|false|null|yes|no|on|off)\b)|(\b\d+(?:\.\d+)?\b)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) tokens.push({ text: text.slice(lastIndex, match.index) });
    tokens.push({
      text: match[0],
      className: match[1] || match[2] ? 'syn-string' : match[3] ? 'syn-literal' : 'syn-number',
    });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) tokens.push({ text: text.slice(lastIndex) });
}

function tokenizeSyntax(text: string, langClass: string): SyntaxToken[] {
  if (langClass === 'lang-java') return tokenizeJava(text);
  if (langClass === 'lang-yaml') return tokenizeYaml(text);
  return [{ text }];
}

function highlightTextNode(doc: Document, textNode: Text, langClass: string) {
  const tokens = tokenizeSyntax(textNode.textContent ?? '', langClass);
  if (!tokens.some(token => token.className)) return;

  const fragment = doc.createDocumentFragment();
  tokens.forEach((token) => {
    if (!token.className) {
      fragment.appendChild(doc.createTextNode(token.text));
      return;
    }
    const span = doc.createElement('span');
    span.className = token.className;
    span.textContent = token.text;
    fragment.appendChild(span);
  });
  textNode.replaceWith(fragment);
}

function highlightSyntax(doc: Document) {
  doc.querySelectorAll('.d2h-file-wrapper').forEach((file) => {
    const langClass = Array.from(file.classList).find(className => className.startsWith('lang-'));
    if (!langClass) return;

    file.querySelectorAll('.d2h-code-line-ctn').forEach((container) => {
      const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let node = walker.nextNode();
      while (node) {
        textNodes.push(node as Text);
        node = walker.nextNode();
      }
      textNodes.forEach(textNode => highlightTextNode(doc, textNode, langClass));
    });
  });
}

function decorateDiffHtml(html: string, changes: any[], discussions: GitLabDiscussion[]) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const byPosition = discussionsByPosition(discussions);

  doc.querySelectorAll('.d2h-file-wrapper').forEach((file, fileIndex) => {
    const change = changes[fileIndex];
    if (!change) return;

    file.querySelectorAll('tbody tr').forEach((row) => {
      const oldLine = row.querySelector('.line-num1')?.textContent?.trim();
      const newLine = row.querySelector('.line-num2')?.textContent?.trim();
      const codeCell = row.querySelector('td:nth-child(2)');
      if (!codeCell || (!oldLine && !newLine) || codeCell.classList.contains('d2h-info')) return;

      const oldLineNum = oldLine ? Number(oldLine) : undefined;
      const newLineNum = newLine ? Number(newLine) : undefined;
      const lineContent = row.querySelector('.d2h-code-line-ctn')?.textContent ?? '';
      const kind = codeCell.classList.contains('d2h-ins')
        ? 'new'
        : codeCell.classList.contains('d2h-del')
          ? 'old'
          : 'context';
      const mappedPosition = diffMode.value === 'new'
        ? currentPositionLookup.value.get(positionLookupKey('new', change.new_path, newLineNum))
          ?? currentPositionLookup.value.get(positionLookupKey('old', change.old_path, oldLineNum))
        : null;
      const commentPosition: DiffLinePosition | null = diffMode.value === 'new'
        ? mappedPosition ?? null
        : {
          old_path: change.old_path,
          new_path: change.new_path,
          old_line: oldLineNum,
          new_line: newLineNum,
          content: lineContent,
          kind,
        };
      if (mappedPosition && mappedPosition.content !== lineContent) {
        row.setAttribute('title', 'This line is not commentable in the current MR diff');
        return;
      }

      if (commentPosition) {
        row.setAttribute('data-commentable-line', 'true');
        row.setAttribute('data-old-path', commentPosition.old_path);
        row.setAttribute('data-new-path', commentPosition.new_path);
        row.setAttribute('data-line-kind', commentPosition.kind);
        if (commentPosition.old_line) row.setAttribute('data-old-line', String(commentPosition.old_line));
        if (commentPosition.new_line) row.setAttribute('data-new-line', String(commentPosition.new_line));
        row.setAttribute('title', 'Click to comment on this line');
      } else if (diffMode.value === 'new') {
        row.setAttribute('title', 'This line is not commentable in the current MR diff');
      }

      const rowDiscussions = commentPosition
        ? byPosition.get(commentKey(commentPosition))
        : undefined;
      if (!rowDiscussions?.length) return;

      const discussionRow = doc.createElement('tr');
      discussionRow.className = 'inline-discussions-row';
      const emptyCell = doc.createElement('td');
      emptyCell.className = 'd2h-code-linenumber d2h-cntx';
      const discussionCell = doc.createElement('td');
      discussionCell.className = 'inline-discussions-cell';
      rowDiscussions.forEach(discussion => discussionCell.appendChild(formatInlineDiscussion(doc, discussion)));
      discussionRow.append(emptyCell, discussionCell);
      row.after(discussionRow);
    });
  });

  normalizeVisibleIndentation(doc);
  highlightSyntax(doc);

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

function scrollTreeFileIntoView(link: HTMLAnchorElement) {
  const href = link.getAttribute('href') ?? '';
  if (!href.startsWith('#')) return false;

  const id = decodeURIComponent(href.slice(1));
  const root = diffContentRef.value;
  const target = id ? document.getElementById(id) : null;
  if (!root || !target || !root.contains(target)) return false;

  const scrollPane = target.closest<HTMLElement>('.diff-body-pane') ?? root;
  const paneRect = scrollPane.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  scrollPane.scrollTo({
    top: scrollPane.scrollTop + targetRect.top - paneRect.top - 8,
    left: 0,
    behavior: 'smooth',
  });
  return true;
}

function handleFileTreeClick(event: MouseEvent) {
  const treeLink = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('.d2h-file-tree-file');
  if (!treeLink) return;

  event.preventDefault();
  scrollTreeFileIntoView(treeLink);
}

function parseDiffStats(diff: string) {
  const files = (diff.match(/^diff --git /gm) ?? []).length;
  return {
    files,
    added: (diff.match(/^\+(?!\+\+)/gm) ?? []).length,
    deleted: (diff.match(/^-(?!--)/gm) ?? []).length,
  };
}

function renderDiff(diff: string, changes = currentChanges.value) {
  diffStats.value = parseDiffStats(diff);
  const html = makeDiffFilesCollapsible(Diff2Html.html(diff, {
    drawFileList: true,
    outputFormat: 'line-by-line',
    renderNothingWhenEmpty: false,
  }), fileListView.value);
  const decoratedHtml = decorateDiffHtml(html, changes, commentState.value.discussions);
  diffHtml.value = decoratedHtml;

  if (fileListView.value === 'tree') {
    const doc = new DOMParser().parseFromString(`<div>${decoratedHtml}</div>`, 'text/html');
    diffTreeHtml.value = doc.querySelector('.d2h-file-list-wrapper')?.outerHTML ?? '';
    doc.querySelector('.d2h-file-list-wrapper')?.remove();
    diffBodyHtml.value = doc.body.firstElementChild?.innerHTML ?? '';
  } else {
    diffTreeHtml.value = '';
    diffBodyHtml.value = '';
  }
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
  diffTreeHtml.value = '';
  diffBodyHtml.value = '';
  diffStats.value   = { files: 0, added: 0, deleted: 0 };

  try {
    await comments.load(mr);
    if (diffMode.value === 'new') {
      if (!checkpoint.value || !hasNewChanges.value) {
        diffMode.value = 'full';
      } else {
        const [newChangesDiff, fullMrDiff] = await Promise.all([
          window.api.getNewChangesDiff(mr.project_id, checkpoint.value.sourceSha, currentSha.value),
          window.api.getMrDiff(mr.project_id, mr.iid),
        ]);
        const changes = newChangesDiff.changes;
        const fullChanges = fullMrDiff.changes;
        const fullCombinedDiff = fullDiffFromChanges(fullChanges);
        const fullHtml = makeDiffFilesCollapsible(Diff2Html.html(fullCombinedDiff, {
          drawFileList: true,
          outputFormat: 'line-by-line',
          renderNothingWhenEmpty: false,
        }), 'list');
        currentPositionLookup.value = extractDiffLinePositions(fullHtml, fullChanges);
        currentChanges.value = changes;
        currentCombinedDiff.value = fullDiffFromChanges(changes);
        renderDiff(currentCombinedDiff.value, changes);
        return;
      }
    }

    const { changes } = await window.api.getMrDiff(mr.project_id, mr.iid);
    currentPositionLookup.value = new Map();
    currentChanges.value = changes;
    currentCombinedDiff.value = fullDiffFromChanges(changes);
    renderDiff(currentCombinedDiff.value, changes);
  } catch {
    diffError.value = true;
  } finally {
    loadingDiff.value = false;
  }
}

async function loadCheckpoint(mrId: number) {
  await mrs.loadReviewCheckpoint(mrId);
  if (!hasNewChanges.value) diffMode.value = 'full';
}

async function markReviewed() {
  const mr = mrs.activeMr;
  if (!mr?.sha || markingReviewed.value) return;

  markingReviewed.value = true;
  try {
    await mrs.markCurrentHeadReviewed(mr, 'manual');
    diffMode.value = 'full';
  } finally {
    markingReviewed.value = false;
  }
}

function handleDiffContentClick(event: MouseEvent) {
  const file = findToggleFile(event.target as HTMLElement | null);
  if (file) {
    event.preventDefault();
    toggleFileDiff(file);
    return;
  }

  const line = (event.target as HTMLElement | null)?.closest<HTMLElement>('tr[data-commentable-line="true"]');
  if (!line) return;
  event.preventDefault();
  openInlineDraft(line);
}

function handleDiffContentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return;

  const file = findToggleFile(event.target as HTMLElement | null);
  if (!file) return;

  event.preventDefault();
  toggleFileDiff(file);
}

function openInlineDraft(row: HTMLElement) {
  inlineError.value = '';

  const wrapRect = row.closest('.diff-content-wrap')?.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  const oldLine = row.dataset.oldLine ? Number(row.dataset.oldLine) : undefined;
  const newLine = row.dataset.newLine ? Number(row.dataset.newLine) : undefined;
  const path = row.dataset.newPath || row.dataset.oldPath || '';
  const lineLabel = newLine ?? oldLine;

  inlineDraft.value = {
    top: Math.min(
      Math.max(58, rowRect.bottom - (wrapRect?.top ?? 0) + 6),
      Math.max(72, (wrapRect?.height ?? 520) - 210)
    ),
    left: Math.min(92, Math.max(14, rowRect.left - (wrapRect?.left ?? 0) + 68)),
    label: `${path}${lineLabel ? `:${lineLabel}` : ''}`,
    old_path: row.dataset.oldPath ?? path,
    new_path: row.dataset.newPath ?? path,
    old_line: oldLine,
    new_line: newLine,
  };
}

function cancelInlineDraft() {
  inlineDraft.value = null;
  inlineBody.value = '';
  inlineError.value = '';
}

async function submitInlineComment() {
  const mr = mrs.activeMr;
  const draft = inlineDraft.value;
  const body = inlineBody.value.trim();
  if (!mr || !draft || !body) return;

  inlineError.value = '';
  try {
    await comments.createDiffComment(mr, {
      old_path: draft.old_path,
      new_path: draft.new_path,
      old_line: draft.old_line,
      new_line: draft.new_line,
    }, body);
    cancelInlineDraft();
    renderDiff(currentCombinedDiff.value);
  } catch {
    inlineError.value = 'Could not post inline comment. Refresh the diff and try again.';
  }
}

async function loadAiHistoryNotice(mrId: number) {
  const seq = ++aiHistorySeq;
  aiHistoryCount.value = 0;

  const history = await window.api.getReviewHistory(mrId);
  if (seq !== aiHistorySeq || mrs.activeMr?.id !== mrId) return;

  aiHistoryCount.value = history.length;
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
  () => fileListView.value,
  (view) => {
    localStorage.setItem(FILE_LIST_VIEW_STORAGE_KEY, view);
    if (view === 'tree') diffTreeWidth.value = clampDiffTreeWidth(diffTreeWidth.value);
    if (currentCombinedDiff.value && shouldShowDiff.value) {
      renderDiff(currentCombinedDiff.value);
    }
  }
);

watch(
  () => hasNewChanges.value,
  (available) => {
    if (!available && diffMode.value === 'new') diffMode.value = 'full';
  }
);

watch(
  () => [mrs.aiDrawerOpen, isCompact.value] as const,
  ([drawerOpen, compact]) => {
    if (compact && drawerOpen) mrs.setActivePanelTab('ai');
    if (!compact && mrs.activePanelTab === 'ai') mrs.setActivePanelTab('diff');
  },
  { immediate: true }
);

watch(
  () => mrs.activeMr?.id,
  (mrId) => {
    if (!mrId) {
      aiHistorySeq++;
      aiHistoryCount.value = 0;
      return;
    }
    void loadAiHistoryNotice(mrId);
  },
  { immediate: true }
);

watch(
  () => commentState.value.discussions,
  () => {
    if (currentCombinedDiff.value && shouldShowDiff.value) {
      renderDiff(currentCombinedDiff.value);
    }
  },
  { deep: true }
);

onMounted(() => {
  aiDrawerWidth.value = clampAiDrawerWidth(aiDrawerWidth.value);
  compactQuery = window.matchMedia('(max-width: 1180px)');
  updateCompactState(compactQuery);
  compactQuery.addEventListener('change', updateCompactState);
  window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
  stopDiffTreeResize?.();
  compactQuery?.removeEventListener('change', updateCompactState);
  window.removeEventListener('keydown', handleGlobalKeydown);
  document.body.classList.remove('ai-drawer-resizing');
  document.body.classList.remove('diff-tree-resizing');
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
  width: 56px; height: 56px;
  background: linear-gradient(180deg, var(--surface3), var(--surface2));
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text3);
  margin-bottom: 6px;
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.04);
  will-change: transform;
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

/* Placeholder staggered entrance */
.placeholder-icon-anim {
  animation: placeholderScale 0.36s var(--ease-spring) 0.05s both;
}
.placeholder-text-anim {
  animation: placeholderFade 0.24s var(--ease-out) 0.18s both;
}
.placeholder-sub-anim {
  animation: placeholderFade 0.24s var(--ease-out) 0.28s both;
}
@keyframes placeholderScale {
  from { opacity: 0; transform: scale(0.78); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes placeholderFade {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Tab bar */
.panel-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, var(--surface2) 0%, var(--surface) 100%);
  padding: 10px 14px 9px;
  flex-shrink: 0;
  min-height: 52px;
  gap: 12px;
}

.primary-tabs {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 4px;
}

.panel-tab {
  position: relative;
  padding: 0 16px;
  height: 32px;
  min-width: 104px;
  border: 1px solid transparent;
  background: rgba(255,255,255,0.015);
  color: var(--text3);
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: var(--radius-sm);
  transition: background var(--dur-fast), border-color var(--dur-fast), color var(--dur-fast), box-shadow var(--dur-fast), transform var(--dur-fast) var(--ease-spring);
  letter-spacing: -0.01em;
}
.panel-tab:first-child { border-radius: var(--radius-sm) var(--radius-xs) var(--radius-xs) var(--radius-sm); }
.panel-tab:last-child  { border-radius: var(--radius-xs) var(--radius-sm) var(--radius-sm) var(--radius-xs); }
.panel-tab:hover {
  background: var(--surface2);
  border-color: var(--border);
  color: var(--text2);
  transform: translateY(-1px);
}
.panel-tab:active { transform: scale(0.97); }
.panel-tab:focus-visible {
  outline: none;
  border-color: var(--accent-border);
  box-shadow: 0 0 0 3px var(--accent-bg);
}
.panel-tab svg {
  width: 13px;
  height: 13px;
  opacity: 0.78;
  transition: opacity var(--dur-fast), color var(--dur-fast);
}
.panel-tab-count {
  min-width: 18px;
  height: 17px;
  padding: 1px 5px;
  border-radius: var(--radius-xs);
  background: var(--surface3);
  color: var(--text2);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.5;
  transition: background var(--dur-fast), color var(--dur-fast);
}
.panel-tab.active .panel-tab-count {
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid var(--accent-border);
}
.panel-tab.active {
  background: linear-gradient(180deg, var(--surface3), var(--surface2));
  border-color: var(--border2);
  color: var(--text);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
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
  box-shadow: 0 0 14px var(--accent-glow);
  transition: left var(--dur-base) var(--ease-out), right var(--dur-base) var(--ease-out);
}
.panel-tab.active svg {
  opacity: 1;
  color: var(--accent);
}
.ai-drawer-trigger {
  position: relative;
  flex-shrink: 0;
  height: 32px;
  min-width: 126px;
  padding: 0 13px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: rgba(30,214,154,0.08);
  color: var(--text2);
  font-family: var(--font-ui);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition: background var(--dur-fast), border-color var(--dur-fast), color var(--dur-fast), box-shadow var(--dur-fast), transform var(--dur-fast) var(--ease-spring);
}

.ai-drawer-trigger svg {
  width: 13px;
  height: 13px;
  color: var(--accent);
}

.ai-drawer-trigger:hover {
  background: rgba(30,214,154,0.14);
  border-color: var(--accent);
  color: var(--text);
  box-shadow: 0 0 16px var(--accent-glow);
  transform: translateY(-1px);
}

.ai-drawer-trigger:active {
  transform: scale(0.97);
}

.ai-drawer-trigger:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.ai-drawer-trigger.open {
  background: linear-gradient(180deg, rgba(30,214,154,0.18), rgba(30,214,154,0.08));
  border-color: var(--accent);
  color: var(--text);
  box-shadow: inset 0 -2px 0 var(--accent);
}

.ai-drawer-trigger.has-history {
  border-color: color-mix(in srgb, var(--accent) 82%, var(--border));
  background: rgba(30,214,154,0.12);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.ai-history-notice {
  position: absolute;
  top: -7px;
  right: -7px;
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  border: 2px solid var(--surface);
  border-radius: 999px;
  background: var(--accent);
  color: var(--bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 0 12px var(--accent-glow);
  pointer-events: none;
}

/* Panel tab content transition */
.panel-tab-enter-active {
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}
.panel-tab-leave-active {
  transition: opacity var(--dur-fast) var(--ease-in);
  position: absolute;
  inset: 0;
}
.panel-tab-enter-from { opacity: 0; transform: translateY(6px); }
.panel-tab-leave-to   { opacity: 0; }

/* CSS-only fade-in for panel content (used instead of Transition for complex templates) */
.panel-content-fade {
  animation: panelFadeIn var(--dur-base) var(--ease-out) both;
}
@keyframes panelFadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Diff content area */
.review-workspace {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  background: var(--bg);
}

.diff-content-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ai-drawer {
  position: relative;
  flex: 0 0 440px;
  min-width: 0;
  display: flex;
  overflow: hidden;
  border-left: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(30,214,154,0.02) 0%, transparent 20%), var(--surface);
  transition: flex-basis 0.22s var(--ease-out);
}

.ai-drawer.resizing {
  transition: none;
}

.ai-drawer.fullscreen {
  position: absolute;
  inset: 0;
  z-index: 90;
  flex-basis: auto;
  border-left: 0;
  box-shadow: var(--shadow-lg);
}

.ai-drawer-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -4px;
  z-index: 3;
  width: 8px;
  cursor: col-resize;
}

.ai-drawer-resize-handle::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 3px;
  width: 2px;
  background: transparent;
  transition: background var(--dur-fast), box-shadow var(--dur-fast);
}

.ai-drawer-resize-handle:hover::after,
.ai-drawer.resizing .ai-drawer-resize-handle::after {
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent-glow);
}

.ai-drawer-rail {
  width: 42px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: linear-gradient(180deg, var(--surface2), var(--surface));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding-top: 10px;
}

.ai-drawer-toggle {
  width: 28px;
  height: 28px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: var(--accent-dim);
  color: var(--accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--dur-fast), border-color var(--dur-fast), box-shadow var(--dur-fast), transform var(--dur-fast) var(--ease-spring);
  animation: glow-pulse 3s ease-in-out infinite;
}

.ai-drawer-toggle:hover {
  background: rgba(30,214,154,0.18);
  border-color: var(--accent);
  box-shadow: 0 0 16px var(--accent-glow);
  transform: scale(1.08);
  animation: none;
}
.ai-drawer-toggle:active { transform: scale(0.92); }

.ai-drawer-toggle.secondary {
  background: transparent;
  border-color: var(--border);
  color: var(--text3);
  animation: none;
}

.ai-drawer-toggle.close {
  background: transparent;
  border-color: var(--border);
  color: var(--text3);
  animation: none;
}

.ai-drawer-toggle.close svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.ai-drawer-toggle.secondary:hover {
  background: var(--surface3);
  border-color: var(--border2);
  color: var(--text2);
  box-shadow: none;
  animation: none;
}

.ai-drawer-toggle.close:hover {
  background: rgba(229,83,75,0.12);
  border-color: rgba(229,83,75,0.28);
  color: var(--red);
  box-shadow: none;
  animation: none;
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
  width: 398px;
  min-width: 0;
  display: flex;
  opacity: 1;
  transition: opacity var(--dur-base) var(--ease-out);
}

.ai-drawer.fullscreen .ai-drawer-body {
  width: calc(100% - 42px);
}

.diff-summary {
  min-height: 44px;
  flex-shrink: 0;
  padding: 9px 14px;
  border-bottom: 1px solid var(--diff-border);
  background: linear-gradient(180deg, var(--diff-panel2) 0%, var(--diff-panel) 100%);
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
  color: var(--diff-strong);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.diff-meta {
  display: flex;
  align-items: stretch;
  gap: 1px;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid var(--diff-border);
  border-radius: 6px;
  background: var(--diff-border);
}

.diff-stat {
  min-width: 66px;
  min-height: 30px;
  padding: 5px 8px 4px;
  background: linear-gradient(180deg, var(--diff-panel2), var(--diff-panel));
  color: var(--diff-line-muted);
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
  color: var(--diff-strong);
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
    var(--diff-panel2);
}

.diff-stat.add {
  background:
    linear-gradient(180deg, rgba(34,197,94,0.15), rgba(34,197,94,0.04)),
    var(--diff-panel);
}

.diff-stat.add .diff-stat-value {
  color: var(--diff-add);
}

.diff-stat.del {
  background:
    linear-gradient(180deg, rgba(241,93,82,0.16), rgba(241,93,82,0.045)),
    var(--diff-panel);
}

.diff-stat.del .diff-stat-value {
  color: var(--diff-del);
}

.review-checkpoint-bar {
  min-height: 42px;
  flex-shrink: 0;
  padding: 7px 14px;
  border-bottom: 1px solid var(--diff-border);
  background: var(--diff-panel);
  display: flex;
  align-items: center;
  gap: 10px;
}

.review-checkpoint-bar.reviewed {
  background:
    linear-gradient(90deg, rgba(34,197,94,0.09), transparent 42%),
    var(--diff-panel);
}

.review-checkpoint-bar.stale {
  background:
    linear-gradient(90deg, rgba(201,154,13,0.1), transparent 45%),
    var(--diff-panel);
}

.diff-mode-tabs {
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border: 1px solid var(--diff-border);
  border-radius: 7px;
  background: var(--diff-bg);
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
  color: var(--diff-line);
  background: var(--diff-toggle-hover);
}

.diff-mode-tab.active {
  color: var(--diff-strong);
  background: var(--diff-toggle-bg);
}

.diff-mode-tab:disabled {
  opacity: 0.36;
  cursor: not-allowed;
}

.file-view-tabs {
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border: 1px solid var(--diff-border);
  border-radius: 7px;
  background: var(--diff-bg);
  flex-shrink: 0;
}

.file-view-tab {
  height: 26px;
  min-width: 48px;
  padding: 0 9px;
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

.file-view-tab:hover {
  color: var(--diff-line);
  background: var(--diff-toggle-hover);
}

.file-view-tab.active {
  color: var(--diff-strong);
  background: var(--diff-toggle-bg);
}

.file-view-tab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-bg);
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
  border-radius: var(--radius-sm);
  background: var(--accent-dim);
  color: var(--accent);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  flex-shrink: 0;
  transition: background var(--dur-fast), border-color var(--dur-fast), transform var(--dur-fast) var(--ease-spring), box-shadow var(--dur-fast);
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
  background: rgba(30,214,154,0.16);
  border-color: var(--accent);
  transform: translateY(-1px);
  box-shadow: 0 0 14px var(--accent-glow);
}
.mark-reviewed-btn:active:not(:disabled) { transform: scale(0.97); }

.mark-reviewed-btn.stale:hover:not(:disabled) {
  background: rgba(201,154,13,0.16);
  border-color: rgba(201,154,13,0.45);
  transform: translateY(-1px);
  box-shadow: 0 0 14px rgba(201,154,13,0.18);
}

.mark-reviewed-btn:disabled {
  opacity: 0.82;
  cursor: not-allowed;
}

.diff-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px;
  background: var(--diff-bg);
  user-select: text;
}

.diff-content.tree-split {
  overflow: hidden;
  display: flex;
  align-items: stretch;
  gap: 0;
}

.diff-tree-pane {
  flex: 0 0 320px;
  min-width: 0;
  min-height: 0;
  align-self: stretch;
  overflow: auto;
}

.diff-tree-resize-handle {
  position: relative;
  flex: 0 0 12px;
  align-self: stretch;
  cursor: col-resize;
}

.diff-tree-resize-handle::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 5px;
  width: 1px;
  background: var(--diff-border);
  transition: background var(--dur-fast), box-shadow var(--dur-fast), width var(--dur-fast);
}

.diff-tree-resize-handle:hover::after,
:global(body.diff-tree-resizing) .diff-tree-resize-handle::after {
  width: 2px;
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent-glow);
}

:global(body.diff-tree-resizing),
:global(body.diff-tree-resizing *) {
  cursor: col-resize !important;
  user-select: none !important;
}

.diff-body-pane {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  align-self: stretch;
  overflow: auto;
}

.diff-html-pane {
  min-width: 0;
}

.inline-comment-popover {
  position: absolute;
  z-index: 20;
  width: min(460px, calc(100% - 112px));
  border: 1px solid var(--accent-border);
  border-radius: 10px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.035), transparent 42%),
    var(--surface);
  box-shadow: 0 18px 50px rgba(0,0,0,0.62), 0 0 0 1px rgba(23,207,139,0.04);
  padding: 10px;
  animation: commentPopoverIn 0.14s ease both;
}

.inline-comment-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--text2);
  font-family: var(--font-mono);
  font-size: 12px;
  margin-bottom: 7px;
}

.inline-comment-title-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inline-comment-title button {
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--surface2);
  color: var(--text3);
  cursor: pointer;
  transition: color 0.12s, border-color 0.12s, background 0.12s;
}
.inline-comment-title button:hover {
  color: var(--text2);
  border-color: var(--border2);
  background: var(--surface3);
}

.inline-comment-textarea {
  width: 100%;
  min-height: 74px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 13px;
  line-height: 1.5;
  outline: none;
  resize: vertical;
  padding: 8px 9px;
  user-select: text;
  transition: border-color 0.14s, box-shadow 0.14s;
}

.inline-comment-textarea:focus {
  border-color: var(--accent-border);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.inline-comment-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 8px;
}

.comment-error {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--red);
  font-size: 12px;
}

.inline-comment-submit {
  border: 1px solid var(--accent-border);
  border-radius: 6px;
  background: var(--accent-dim);
  color: var(--accent);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 11px;
  transition: background 0.12s, border-color 0.12s, transform 0.12s;
}
.inline-comment-submit:hover:not(:disabled) {
  background: rgba(23,207,139,0.16);
  border-color: var(--accent);
  transform: translateY(-1px);
}

.inline-comment-submit:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

/* ── diff2html theming ── */
.diff-content :deep(.d2h-wrapper) {
  background: transparent !important;
  color: var(--diff-line) !important;
  min-width: 0;
  width: 100%;
}
.diff-content :deep(.d2h-file-list-wrapper) {
  background: var(--diff-panel) !important;
  border: 1px solid var(--diff-border) !important;
  border-radius: 7px;
  margin: 0 0 12px !important;
  overflow: hidden;
}
.diff-content :deep(.d2h-file-list-header) {
  background: var(--diff-panel2) !important;
  border-bottom: 1px solid var(--diff-border) !important;
  color: var(--diff-strong) !important;
}
.diff-content :deep(.d2h-file-list-title),
.diff-content :deep(.d2h-file-list-line) {
  color: var(--diff-line-muted) !important;
}
.diff-content :deep(.d2h-file-list) {
  background: var(--diff-panel) !important;
  margin: 0 !important;
}
.diff-content :deep(.d2h-file-list > li) {
  border-color: var(--diff-border) !important;
}
.diff-content :deep(.d2h-file-list > li:hover) {
  background: var(--diff-line-hover) !important;
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
  background: var(--diff-add-bg);
  border-color: var(--accent-border) !important;
  color: var(--diff-add-text) !important;
}
.diff-content :deep(.d2h-file-list-line .d2h-lines-deleted) {
  background: var(--diff-del-bg);
  border-color: color-mix(in srgb, var(--diff-del) 34%, transparent) !important;
  color: var(--diff-del-text) !important;
  margin-left: 0 !important;
}
.diff-content :deep(.d2h-file-list-wrapper.tree-view) {
  overflow: hidden;
}
.diff-tree-pane :deep(.d2h-file-list-wrapper.tree-view) {
  min-height: 100%;
  height: auto;
  margin: 0 !important;
  overflow: visible;
}
.diff-body-pane :deep(.d2h-file-wrapper:first-child) {
  margin-top: 0 !important;
}
.diff-content :deep(.d2h-file-tree) {
  background: var(--diff-panel) !important;
  padding: 4px 0;
}
.diff-content :deep(.d2h-file-tree-dir) {
  display: block;
}
.diff-content :deep(.d2h-file-tree-dir-row),
.diff-content :deep(.d2h-file-tree-file) {
  min-height: 30px;
  padding: 4px 12px 4px calc(14px + (var(--tree-depth, 0) * 18px));
  border-top: 1px solid var(--diff-border);
  color: var(--diff-line-muted) !important;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.35;
}
.diff-content :deep(.d2h-file-tree > .d2h-file-tree-dir:first-child > .d2h-file-tree-dir-row),
.diff-content :deep(.d2h-file-tree > .d2h-file-tree-file:first-child) {
  border-top: 0;
}
.diff-content :deep(.d2h-file-tree-dir-row) {
  list-style: none;
  cursor: pointer;
  user-select: none;
}
.diff-content :deep(.d2h-file-tree-dir-row::-webkit-details-marker) {
  display: none;
}
.diff-content :deep(.d2h-file-tree-dir-row::before) {
  content: "";
  width: 7px;
  height: 7px;
  border: solid currentColor;
  border-width: 0 2px 2px 0;
  transform: translateY(-1px) rotate(45deg);
  transition: transform 0.14s ease;
  flex: 0 0 auto;
}
.diff-content :deep(.d2h-file-tree-dir:not([open]) > .d2h-file-tree-dir-row::before) {
  transform: translateX(1px) rotate(-45deg);
}
.diff-content :deep(.d2h-file-tree-file::before) {
  content: "";
  width: 8px;
  height: 8px;
  border: 1px solid currentColor;
  border-radius: 2px;
  background: var(--diff-toggle-bg);
  color: var(--yellow);
  flex: 0 0 auto;
}
.diff-content :deep(.d2h-file-tree-dir-row:hover),
.diff-content :deep(.d2h-file-tree-file:hover) {
  background: var(--diff-line-hover);
  color: var(--diff-line) !important;
}
.diff-content :deep(.d2h-file-tree-file) {
  text-decoration: none;
}
.diff-content :deep(.d2h-file-tree-file:focus-visible),
.diff-content :deep(.d2h-file-tree-dir-row:focus-visible) {
  outline: none;
  box-shadow: inset 3px 0 0 var(--accent), 0 0 0 3px var(--accent-bg);
}
.diff-content :deep(.d2h-file-tree-dir-name),
.diff-content :deep(.d2h-file-tree-file-name) {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.diff-content :deep(.d2h-file-tree-dir-name) {
  color: var(--diff-strong);
  font-weight: 700;
}
.diff-content :deep(.d2h-file-tree-count) {
  color: var(--text3);
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.diff-content :deep(.d2h-file-tree-stats) {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.diff-content :deep(.d2h-file-tree-stats .d2h-lines-added),
.diff-content :deep(.d2h-file-tree-stats .d2h-lines-deleted) {
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
.diff-content :deep(.d2h-file-tree-stats .d2h-lines-added) {
  background: var(--diff-add-bg);
  border-color: var(--accent-border) !important;
  color: var(--diff-add-text) !important;
}
.diff-content :deep(.d2h-file-tree-stats .d2h-lines-deleted) {
  background: var(--diff-del-bg);
  border-color: color-mix(in srgb, var(--diff-del) 34%, transparent) !important;
  color: var(--diff-del-text) !important;
  margin-left: 0 !important;
}
@media (max-width: 980px) {
  .diff-content.tree-split {
    display: block;
    overflow: auto;
  }

  .diff-tree-pane,
  .diff-body-pane {
    flex-basis: auto !important;
    height: auto;
    overflow: visible;
  }

  .diff-tree-resize-handle {
    display: none;
  }

  .diff-tree-pane {
    margin-bottom: 12px;
  }
}
.diff-content :deep(.d2h-file-wrapper) {
  background: var(--diff-bg) !important;
  border: 1px solid var(--diff-border) !important;
  border-radius: 7px;
  overflow: auto;
  margin: 0 0 12px !important;
  min-width: 0;
  width: 100%;
  max-width: 100%;
}
.diff-content :deep(.d2h-file-header) {
  height: 34px !important;
  padding: 6px 10px 6px 12px !important;
  background: var(--diff-panel) !important;
  border-color: var(--diff-border) !important;
  color: var(--diff-line) !important;
  font-size: 12.5px !important;
  font-family: var(--font-mono) !important;
}
.diff-content :deep(.d2h-file-name),
.diff-content :deep(.d2h-file-name-wrapper),
.diff-content :deep(.d2h-file-collapse),
.diff-content :deep(.d2h-file-stats) {
  color: var(--diff-line) !important;
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
  border: 1px solid var(--diff-border);
  border-radius: 5px;
  background: var(--diff-toggle-bg);
  color: var(--diff-line-muted);
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
  background: var(--diff-toggle-hover);
  border-color: var(--accent-border);
  color: var(--diff-line);
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
  background: var(--diff-bg) !important;
  color: var(--diff-line) !important;
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 18px;
}
.diff-content :deep(.d2h-diff-tbody) { background: var(--diff-bg) !important; }
.diff-content :deep(.d2h-diff-tbody tr) {
  background: var(--diff-bg) !important;
  height: 18px !important;
}

.diff-content :deep(.d2h-diff-tbody td) {
  height: 18px !important;
  line-height: 18px !important;
  min-width: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  vertical-align: top !important;
}
.diff-content :deep(.d2h-diff-tbody td.d2h-cntx),
.diff-content :deep(.d2h-diff-tbody td.d2h-ins),
.diff-content :deep(.d2h-diff-tbody td.d2h-del),
.diff-content :deep(.d2h-diff-tbody td.d2h-info) {
  font-size: 0 !important;
}

.diff-content :deep(.d2h-code-side-linenumber),
.diff-content :deep(.d2h-code-linenumber) {
  display: table-cell !important;
  position: relative !important;
  width: 88px !important;
  min-width: 88px !important;
  max-width: 88px !important;
  padding: 0 20px 0 6px !important;
  background: var(--diff-line-bg) !important;
  border-color: var(--diff-border) !important;
  color: var(--diff-line-number) !important;
  font-size: 0 !important;
  line-height: 18px !important;
  text-align: right !important;
  vertical-align: top !important;
  white-space: nowrap !important;
  user-select: none;
}
.diff-content :deep(.line-num1),
.diff-content :deep(.line-num2) {
  float: none !important;
  display: inline-block !important;
  width: 28px !important;
  padding: 0 !important;
  overflow: hidden;
  font-size: 12.5px !important;
  line-height: 18px !important;
  text-align: right !important;
  text-overflow: clip !important;
  vertical-align: top !important;
}
.diff-content :deep(.line-num1 + .line-num2) {
  margin-left: 4px;
}
.diff-content :deep(.d2h-code-line) {
  display: inline-block !important;
  width: auto !important;
  padding: 0 6px !important;
  color: var(--diff-line) !important;
  background: transparent !important;
  font-size: 12.5px !important;
  line-height: 18px !important;
  vertical-align: top !important;
  white-space: nowrap !important;
}
.diff-content :deep(.d2h-code-line-ctn) {
  display: inline !important;
  width: auto !important;
  color: inherit !important;
  background: transparent !important;
  line-height: 18px !important;
  white-space: pre !important;
}
.diff-content :deep(.d2h-code-line-prefix) { color: var(--diff-code-prefix) !important; }

.diff-content :deep(.d2h-cntx),
.diff-content :deep(.d2h-cntx .d2h-code-line),
.diff-content :deep(.d2h-cntx .d2h-code-line-ctn) {
  background: var(--diff-bg) !important;
  color: var(--diff-line) !important;
}
.diff-content :deep(.d2h-cntx:hover) {
  background: var(--diff-line-hover) !important;
}
.diff-content :deep(.d2h-ins) { background: var(--diff-add-bg) !important; }
.diff-content :deep(.d2h-ins .d2h-code-line),
.diff-content :deep(.d2h-ins .d2h-code-line-ctn) {
  background: transparent !important;
  color: var(--diff-add-line) !important;
}
.diff-content :deep(.d2h-ins .d2h-code-linenumber) {
  background: var(--diff-add-bg2) !important;
  color: var(--diff-add-text) !important;
  box-shadow: inset 3px 0 0 var(--diff-add);
}
.diff-content :deep(.d2h-del) { background: var(--diff-del-bg) !important; }
.diff-content :deep(.d2h-del .d2h-code-line),
.diff-content :deep(.d2h-del .d2h-code-line-ctn) {
  background: transparent !important;
  color: var(--diff-del-line) !important;
}
.diff-content :deep(.d2h-del .d2h-code-linenumber) {
  background: var(--diff-del-bg2) !important;
  color: var(--diff-del-text) !important;
  box-shadow: inset 3px 0 0 var(--diff-del);
}
.diff-content :deep(.d2h-info) {
  background: var(--diff-muted) !important;
  color: var(--diff-line-muted) !important;
}
.diff-content :deep(.d2h-info .d2h-code-line),
.diff-content :deep(.d2h-info .d2h-code-line-ctn),
.diff-content :deep(.d2h-info .d2h-code-linenumber) {
  background: transparent !important;
  color: var(--diff-line-muted) !important;
}
.diff-content :deep(.d2h-code-line ins) {
  background-color: var(--diff-add-bg2) !important;
  color: inherit !important;
  border-radius: 2px;
  text-decoration: none;
}
.diff-content :deep(.d2h-code-line del) {
  background-color: var(--diff-del-bg2) !important;
  color: inherit !important;
  border-radius: 2px;
  text-decoration: none;
}
.diff-content :deep(.d2h-emptyplaceholder) {
  background: var(--diff-panel) !important;
  border-color: var(--diff-border) !important;
}
.diff-content :deep(.d2h-tag) {
  display: none;
  background: transparent !important;
}
.diff-content :deep(tr[data-commentable-line="true"]) {
  cursor: cell;
}
.diff-content :deep(tr[data-commentable-line="true"]:hover td) {
  box-shadow: inset 3px 0 0 var(--accent-border);
}
.diff-content :deep(tr[data-commentable-line="true"] .d2h-code-linenumber::after) {
  content: "+";
  position: absolute;
  top: 50%;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1px solid rgba(30,214,154,0.22);
  border-radius: 4px;
  background: rgba(30,214,154,0.08);
  color: var(--accent);
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%) scale(0.86);
  transition: opacity 0.12s ease, transform 0.12s ease, background 0.12s ease, border-color 0.12s ease;
}
.diff-content :deep(tr[data-commentable-line="true"]:hover .d2h-code-linenumber::after) {
  background: var(--accent-dim);
  border-color: var(--accent-border);
  opacity: 1;
  transform: translateY(-50%) scale(1);
}
.diff-content :deep(.inline-discussions-cell) {
  background: var(--surface2) !important;
  border-top: 1px solid var(--border) !important;
  padding: 8px 12px 9px !important;
}
.diff-content :deep(.inline-discussion) {
  border: 1px solid var(--accent-border);
  border-radius: 8px;
  background: var(--surface);
  padding: 8px 10px;
  margin: 4px 0;
  color: var(--text2);
  white-space: normal;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.025);
}
.diff-content :deep(.inline-discussion.resolved) {
  opacity: 0.7;
}
.diff-content :deep(.inline-discussion-meta) {
  color: var(--text3);
  font-family: var(--font-ui);
  font-size: 12px;
  margin-bottom: 5px;
}
.diff-content :deep(.inline-discussion-body) {
  color: var(--text2);
  font-family: var(--font-ui);
  font-size: 13px;
  line-height: 1.5;
}
.diff-content :deep(.inline-discussion-body p) {
  margin-bottom: 6px;
}
.diff-content :deep(.inline-discussion-body p:last-child) {
  margin-bottom: 0;
}
.diff-content :deep(.d2h-file-added-icon)   { color: var(--green)  !important; }
.diff-content :deep(.d2h-file-deleted-icon) { color: var(--red)    !important; }
.diff-content :deep(.d2h-file-renamed-icon) { color: var(--yellow) !important; }

@keyframes commentPopoverIn {
  from { opacity: 0; transform: translateY(-4px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Syntax highlighting ── */
.diff-content :deep(.syn-keyword)     { color: var(--syn-keyword); font-weight: 700; }
.diff-content :deep(.syn-type)        { color: var(--syn-type); }
.diff-content :deep(.syn-annotation)  { color: var(--syn-annotation); font-weight: 700; }
.diff-content :deep(.syn-string)      { color: var(--syn-string); }
.diff-content :deep(.syn-number)      { color: var(--syn-number); }
.diff-content :deep(.syn-literal)     { color: var(--syn-literal); font-weight: 700; }
.diff-content :deep(.syn-property)    { color: var(--syn-property); font-weight: 700; }
.diff-content :deep(.syn-punctuation) { color: var(--syn-punctuation); }
.diff-content :deep(.syn-comment)     { color: var(--syn-comment); font-style: italic; }
</style>
