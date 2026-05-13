<template>
  <div class="comments-panel">
    <div class="comments-topbar">
      <div class="comments-header">
        <div class="comments-heading">
          <div class="comments-title">Comments</div>
          <div class="comments-sub">
            {{ discussionStats.active }} active
            <span v-if="discussionStats.resolved">· {{ discussionStats.resolved }} resolved</span>
            <span v-if="discussionStats.outdated">· {{ discussionStats.outdated }} outdated</span>
            <span v-if="discussionStats.inline">· {{ discussionStats.inline }} inline</span>
          </div>
        </div>

        <div class="comments-header-actions">
          <button class="icon-btn" :class="{ spinning: state.loading }" title="Refresh comments" @click="refresh">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
          </button>
          <label class="system-toggle">
            <input v-model="showSystem" type="checkbox" />
            System
          </label>
        </div>
      </div>

      <div class="comments-controls">
        <div class="comment-filter-tabs" role="tablist" aria-label="Comment filters">
          <button
            v-for="filter in filters"
            :key="filter.key"
            class="comment-filter-tab"
            :class="{ active: activeFilter === filter.key }"
            @click="activeFilter = filter.key"
          >
            {{ filter.label }}
            <span>{{ filter.count }}</span>
          </button>
        </div>
        <input
          v-model="query"
          class="comment-search"
          type="search"
          placeholder="Search comments..."
        />
      </div>
    </div>

    <div class="comments-scroll">
      <form class="comment-composer" :class="{ focused: composerFocused || rootBody }" @submit.prevent="submitRoot">
        <div class="composer-label">
          <span>MR comment</span>
          <span v-if="rootBody" class="composer-count">{{ rootBody.length }}</span>
        </div>
        <textarea
          v-model="rootBody"
          class="comment-textarea"
          placeholder="Ask a question, leave review context, or summarize a decision..."
          :disabled="state.posting"
          @focus="composerFocused = true"
          @blur="composerFocused = false"
        ></textarea>
        <div class="composer-actions">
          <span class="comment-error">{{ state.error }}</span>
          <button class="comment-submit" :disabled="state.posting || !rootBody.trim()">
            {{ state.posting ? 'Posting...' : 'Comment' }}
          </button>
        </div>
      </form>

      <div v-if="state.loading && state.discussions.length === 0" class="comments-empty">
        <div class="empty-pulse"></div>
        Loading comments...
      </div>
      <div v-else-if="visibleDiscussions.length === 0" class="comments-empty">
        <div class="empty-icon-small">
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M2 3.5A2.5 2.5 0 0 1 4.5 1h7A2.5 2.5 0 0 1 14 3.5v4A2.5 2.5 0 0 1 11.5 10H7.9l-3.2 2.4A.45.45 0 0 1 4 12.04V10A2 2 0 0 1 2 8V3.5Z"/>
          </svg>
        </div>
        {{ emptyMessage }}
      </div>
      <TransitionGroup v-else name="discussion" tag="div" class="discussion-list">
        <article
          v-for="discussion in visibleDiscussions"
          :key="discussion.id"
          class="discussion-card"
          :class="{ resolved: isResolved(discussion), inline: isInline(discussion), outdated: isOutdated(discussion), unresolved: canResolve(discussion) && !isResolved(discussion) && !isOutdated(discussion) }"
        >
          <div class="discussion-meta">
            <span class="discussion-type-icon" :class="{ inline: isInline(discussion) }">
              <svg v-if="isInline(discussion)" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M5.854 4.646a.5.5 0 0 1 0 .708L3.207 8l2.647 2.646a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0zm4.292 0a.5.5 0 0 0 0 .708L12.793 8l-2.647 2.646a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708 0z"/>
              </svg>
              <svg v-else viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M2 3.5A2.5 2.5 0 0 1 4.5 1h7A2.5 2.5 0 0 1 14 3.5v4A2.5 2.5 0 0 1 11.5 10H7.9l-3.2 2.4A.45.45 0 0 1 4 12.04V10A2 2 0 0 1 2 8V3.5Z"/>
              </svg>
            </span>
            <span class="discussion-kind" :title="discussionLabel(discussion)">{{ discussionLabel(discussion) }}</span>
            <span v-if="isResolved(discussion)" class="resolved-pill">Resolved</span>
            <span v-if="isOutdated(discussion)" class="outdated-pill">Outdated</span>
            <span v-else-if="canResolve(discussion)" class="unresolved-pill">Open</span>
            <button
              v-if="canResolve(discussion)"
              class="resolve-btn"
              :disabled="state.posting"
              @click="toggleResolved(discussion)"
            >
              {{ isResolved(discussion) ? 'Reopen' : 'Resolve' }}
            </button>
          </div>

          <div class="notes-stack">
            <div
              v-for="note in notesForDisplay(discussion)"
              :key="note.id"
              class="comment-note"
              :class="{ system: note.system }"
            >
              <img
                class="comment-avatar"
                :src="note.author.avatar_url"
                :alt="note.author.username"
                @error="(e) => ((e.target as HTMLImageElement).src = avatarFallback)"
              />
              <div class="comment-body-wrap">
                <div class="comment-note-meta">
                  <strong>{{ note.author.name }}</strong>
                  <span>@{{ note.author.username }}</span>
                  <time :title="formatDate(note.created_at)">{{ timeAgo(note.created_at) }}</time>
                  <span v-if="note.system" class="system-note-label">system</span>
                  <div v-if="canEditNote(note)" class="note-actions">
                    <button
                      class="note-action"
                      :disabled="state.posting"
                      title="Edit comment"
                      @click="startEdit(note)"
                    >
                      Edit
                    </button>
                    <button
                      class="note-action danger"
                      :disabled="state.posting"
                      title="Delete comment"
                      @click="deleteNote(discussion, note)"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <form
                  v-if="editingNoteId === note.id"
                  class="edit-composer"
                  @submit.prevent="submitEdit(discussion, note)"
                >
                  <textarea
                    v-model="editBodies[note.id]"
                    class="edit-textarea"
                    :disabled="state.posting"
                  ></textarea>
                  <div class="edit-actions">
                    <span class="comment-error">{{ state.error }}</span>
                    <button type="button" class="edit-cancel" :disabled="state.posting" @click="cancelEdit(note.id)">Cancel</button>
                    <button class="edit-save" :disabled="state.posting || !editBodies[note.id]?.trim()">
                      {{ state.posting ? 'Saving...' : 'Save' }}
                    </button>
                  </div>
                </form>
                <div v-else class="comment-body" v-html="renderMarkdown(note.body)"></div>
              </div>
            </div>

            <button
              v-if="hiddenReplyCount(discussion) > 0"
              class="show-replies-btn"
              @click="toggleExpanded(discussion.id)"
            >
              {{ expandedThreads[discussion.id] ? 'Collapse replies' : `Show ${hiddenReplyCount(discussion)} earlier repl${hiddenReplyCount(discussion) === 1 ? 'y' : 'ies'}` }}
            </button>
          </div>

          <form class="reply-composer" :class="{ active: replyBodies[discussion.id] }" @submit.prevent="submitReply(discussion.id)">
            <textarea
              v-model="replyBodies[discussion.id]"
              class="reply-textarea"
              placeholder="Reply to this thread..."
              :disabled="state.posting"
            ></textarea>
            <button class="reply-submit" :disabled="state.posting || !replyBodies[discussion.id]?.trim()">
              Reply
            </button>
          </form>
        </article>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { GitLabDiscussion, GitLabDiscussionNote, MR } from '../../types';
import { useCommentsStore } from '../stores/comments';
import { useMrsStore } from '../stores/mrs';
import { renderMarkdown, timeAgo } from '../utils';

const props = defineProps<{ mr: MR }>();
type CommentFilter = 'active' | 'all' | 'inline' | 'resolved' | 'outdated';

const comments = useCommentsStore();
const mrs = useMrsStore();
const rootBody = ref('');
const query = ref('');
const showSystem = ref(false);
const composerFocused = ref(false);
const replyBodies = reactive<Record<string, string>>({});
const editBodies = reactive<Record<number, string>>({});
const expandedThreads = reactive<Record<string, boolean>>({});
const editingNoteId = ref<number | null>(null);
const avatarFallback = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 26 26%22><rect width=%2226%22 height=%2226%22 fill=%22%23232320%22/></svg>';
const activeFilter = ref<CommentFilter>('active');

const state = computed(() => comments.getState(props.mr));
const baseDiscussions = computed(() =>
  state.value.discussions.filter(discussion => visibleNotes(discussion).length > 0)
);
const discussionStats = computed(() => {
  const discussions = baseDiscussions.value;
  return {
    total: discussions.length,
    active: discussions.filter(d => !isResolved(d) && !isOutdated(d)).length,
    resolved: discussions.filter(d => isResolved(d)).length,
    outdated: discussions.filter(d => isOutdated(d)).length,
    inline: discussions.filter(d => isInline(d)).length,
  };
});
const filters = computed(() => [
  { key: 'active' as const, label: 'Active', count: discussionStats.value.active },
  { key: 'all' as const, label: 'All', count: discussionStats.value.total },
  { key: 'inline' as const, label: 'Inline', count: discussionStats.value.inline },
  { key: 'resolved' as const, label: 'Resolved', count: discussionStats.value.resolved },
  { key: 'outdated' as const, label: 'Outdated', count: discussionStats.value.outdated },
]);
const visibleDiscussions = computed(() =>
  baseDiscussions.value.filter(discussion => {
    if (activeFilter.value === 'active' && (isResolved(discussion) || isOutdated(discussion))) return false;
    if (activeFilter.value === 'inline' && !isInline(discussion)) return false;
    if (activeFilter.value === 'resolved' && !isResolved(discussion)) return false;
    if (activeFilter.value === 'outdated' && !isOutdated(discussion)) return false;

    const needle = query.value.trim().toLowerCase();
    if (!needle) return true;

    const haystack = [
      discussionLabel(discussion),
      ...visibleNotes(discussion).flatMap(note => [note.body, note.author.name, note.author.username]),
    ].join('\n').toLowerCase();
    return haystack.includes(needle);
  })
);
const emptyMessage = computed(() => {
  if (query.value.trim()) return 'No comments match your search.';
  if (activeFilter.value === 'active') return 'No active comments.';
  if (activeFilter.value === 'inline') return 'No inline code discussions.';
  if (activeFilter.value === 'resolved') return 'No resolved discussions.';
  if (activeFilter.value === 'outdated') return 'No outdated code discussions.';
  return 'No comments yet.';
});

function visibleNotes(discussion: GitLabDiscussion): GitLabDiscussionNote[] {
  if (showSystem.value) return discussion.notes;
  return discussion.notes.filter(note => !note.system);
}

function firstNote(discussion: GitLabDiscussion): GitLabDiscussionNote | null {
  return discussion.notes[0] ?? null;
}

function isInline(discussion: GitLabDiscussion): boolean {
  return Boolean(firstNote(discussion)?.position);
}

function canResolve(discussion: GitLabDiscussion): boolean {
  return discussion.notes.some(note => note.resolvable);
}

function isResolved(discussion: GitLabDiscussion): boolean {
  const resolvable = discussion.notes.find(note => note.resolvable);
  return Boolean(resolvable?.resolved);
}

function isOutdated(discussion: GitLabDiscussion): boolean {
  const position = firstNote(discussion)?.position;
  return Boolean(position?.head_sha && props.mr.sha && position.head_sha !== props.mr.sha);
}

function inlineLabel(discussion: GitLabDiscussion): string {
  const position = firstNote(discussion)?.position;
  if (!position) return 'Diff discussion';
  const line = position.new_line ?? position.old_line;
  return `${position.new_path || position.old_path}${line ? `:${line}` : ''}`;
}

function discussionLabel(discussion: GitLabDiscussion): string {
  return isInline(discussion) ? inlineLabel(discussion) : 'MR discussion';
}

function notesForDisplay(discussion: GitLabDiscussion): GitLabDiscussionNote[] {
  const notes = visibleNotes(discussion);
  if (expandedThreads[discussion.id] || notes.length <= 3) return notes;
  return [notes[0], notes[notes.length - 1]].filter(Boolean);
}

function hiddenReplyCount(discussion: GitLabDiscussion): number {
  const notes = visibleNotes(discussion);
  if (expandedThreads[discussion.id] || notes.length <= 3) return 0;
  return notes.length - 2;
}

function toggleExpanded(discussionId: string) {
  expandedThreads[discussionId] = !expandedThreads[discussionId];
}

function canEditNote(note: GitLabDiscussionNote): boolean {
  return !note.system && Boolean(mrs.currentUserId && note.author.id === mrs.currentUserId);
}

function startEdit(note: GitLabDiscussionNote) {
  editingNoteId.value = note.id;
  editBodies[note.id] = note.body;
}

function cancelEdit(noteId: number) {
  editingNoteId.value = null;
  delete editBodies[noteId];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

async function submitRoot() {
  const body = rootBody.value.trim();
  if (!body) return;
  await comments.createMrComment(props.mr, body);
  rootBody.value = '';
}

async function submitReply(discussionId: string) {
  const body = replyBodies[discussionId]?.trim();
  if (!body) return;
  await comments.replyToDiscussion(props.mr, discussionId, body);
  replyBodies[discussionId] = '';
}

async function toggleResolved(discussion: GitLabDiscussion) {
  await comments.setResolved(props.mr, discussion.id, !isResolved(discussion));
}

async function refresh() {
  await comments.refresh(props.mr);
}

async function submitEdit(discussion: GitLabDiscussion, note: GitLabDiscussionNote) {
  const body = editBodies[note.id]?.trim();
  if (!body || body === note.body) {
    cancelEdit(note.id);
    return;
  }

  await comments.updateComment(props.mr, discussion.id, note.id, body);
  cancelEdit(note.id);
}

async function deleteNote(discussion: GitLabDiscussion, note: GitLabDiscussionNote) {
  if (!window.confirm('Delete this comment from GitLab?')) return;
  await comments.deleteComment(props.mr, discussion.id, note.id);
  if (editingNoteId.value === note.id) cancelEdit(note.id);
}

watch(
  () => props.mr.id,
  async () => {
    await comments.load(props.mr);
  },
  { immediate: true }
);

</script>

<style scoped>
.comments-panel {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  user-select: text;
}

.comments-topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.035), transparent 74%),
    var(--surface);
  padding: 12px 14px 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.18);
}

.comments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.comments-heading { min-width: 0; }

.comments-title {
  color: var(--text);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.comments-sub {
  color: var(--text3);
  font-size: 12px;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.comments-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface2);
  color: var(--text3);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.12s, border-color 0.12s, background 0.12s, transform 0.12s;
}
.icon-btn:hover { color: var(--text2); border-color: var(--border2); background: var(--surface3); transform: translateY(-1px); }
.icon-btn svg { width: 13px; height: 13px; }
.icon-btn.spinning svg { animation: spin 0.75s linear infinite; }

.system-toggle {
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text3);
  font-size: 12px;
  cursor: pointer;
  user-select: none;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface2);
  transition: color 0.12s, border-color 0.12s, background 0.12s;
}
.system-toggle:hover { color: var(--text2); border-color: var(--border2); background: var(--surface3); }
.system-toggle input { accent-color: var(--accent); }

.comments-controls {
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(160px, 260px);
  gap: 10px;
  align-items: center;
}

.comment-filter-tabs {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--bg);
  overflow-x: auto;
}

.comment-filter-tab {
  height: 27px;
  min-width: 68px;
  padding: 0 9px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--text3);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  transition: color 0.12s, background 0.12s, box-shadow 0.12s;
}
.comment-filter-tab span {
  color: var(--text3);
  font-family: var(--font-mono);
  font-size: 10px;
}
.comment-filter-tab:hover { color: var(--text2); background: var(--surface2); }
.comment-filter-tab.active {
  color: var(--text);
  background: linear-gradient(180deg, var(--surface3), var(--surface2));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}
.comment-filter-tab.active span { color: var(--accent); }

.comment-search {
  width: 100%;
  height: 31px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--bg);
  color: var(--text2);
  font-family: var(--font-ui);
  font-size: 13px;
  padding: 0 10px;
  outline: none;
  transition: border-color 0.14s, box-shadow 0.14s, background 0.14s;
}
.comment-search:focus { border-color: var(--accent-border); box-shadow: 0 0 0 3px var(--accent-bg); background: var(--input-focus-bg); }
.comment-search::placeholder { color: var(--text3); }

.comments-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 14px 18px;
}

.comment-composer,
.reply-composer {
  border: 1px solid var(--border);
  background: var(--surface);
}

.comment-composer {
  margin-bottom: 12px;
  border-radius: 9px;
  padding: 10px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.025);
  transition: border-color 0.14s, box-shadow 0.14s, transform 0.14s;
}
.comment-composer.focused {
  border-color: var(--accent-border);
  box-shadow: 0 0 0 3px var(--accent-bg), 0 10px 28px rgba(0,0,0,0.18);
  transform: translateY(-1px);
}

.composer-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text3);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 7px;
}
.composer-count { color: var(--text3); font-family: var(--font-mono); font-weight: 500; }

.comment-textarea,
.reply-textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 13px;
  line-height: 1.5;
  outline: none;
  resize: vertical;
  user-select: text;
  transition: border-color 0.14s, box-shadow 0.14s, background 0.14s;
}

.comment-textarea {
  min-height: 86px;
  max-height: 220px;
  padding: 9px 10px;
}

.reply-textarea {
  min-height: 36px;
  max-height: 120px;
  padding: 7px 9px;
}

.comment-textarea:focus,
.reply-textarea:focus { border-color: var(--accent-border); box-shadow: 0 0 0 3px var(--accent-bg); background: var(--input-focus-bg); }
.comment-textarea::placeholder,
.reply-textarea::placeholder { color: var(--text3); }

.composer-actions,
.inline-row-actions {
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

.comment-submit,
.reply-submit,
.resolve-btn,
.show-replies-btn,
.edit-save,
.edit-cancel {
  border: 1px solid var(--accent-border);
  border-radius: 6px;
  background: var(--accent-dim);
  color: var(--accent);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 700;
  padding: 6px 11px;
  white-space: nowrap;
  transition: background 0.12s, border-color 0.12s, transform 0.12s, color 0.12s;
}
.comment-submit:hover:not(:disabled),
.reply-submit:hover:not(:disabled),
.resolve-btn:hover:not(:disabled),
.show-replies-btn:hover,
.edit-save:hover:not(:disabled),
.edit-cancel:hover:not(:disabled) { background: rgba(23,207,139,0.16); border-color: var(--accent); transform: translateY(-1px); }
.comment-submit:disabled,
.reply-submit:disabled,
.resolve-btn:disabled,
.edit-save:disabled,
.edit-cancel:disabled { opacity: 0.42; cursor: not-allowed; }

.comments-empty {
  min-height: 240px;
  color: var(--text3);
  font-size: 13px;
  text-align: center;
  padding: 42px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.empty-pulse,
.empty-icon-small {
  width: 42px;
  height: 42px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
}
.empty-pulse { animation: pulse 1.2s ease-in-out infinite; }
.empty-icon-small { display: flex; align-items: center; justify-content: center; color: var(--text3); }
.empty-icon-small svg { width: 17px; height: 17px; }

.discussion-list {
  display: grid;
  gap: 10px;
}

.discussion-enter-active,
.discussion-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.discussion-enter-from,
.discussion-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
.discussion-move {
  transition: transform 0.18s ease;
}

.discussion-card {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.025);
  transition: border-color 0.14s, box-shadow 0.14s, transform 0.14s, opacity 0.14s;
}
.discussion-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 2px;
  background: var(--border2);
}
.discussion-card.inline::before { background: var(--accent-border); }
.discussion-card.unresolved::before { background: var(--yellow); }
.discussion-card.outdated::before { background: var(--text3); }
.discussion-card.resolved { opacity: 0.72; }
.discussion-card.outdated { opacity: 0.78; }
.discussion-card:hover {
  border-color: var(--border2);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.035), 0 8px 26px rgba(0,0,0,0.18);
  transform: translateY(-1px);
}

.discussion-meta {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px 8px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text3);
  font-family: var(--font-mono);
  font-size: 11px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.025), transparent),
    var(--surface);
}

.discussion-type-icon {
  width: 22px;
  height: 22px;
  border: 1px solid var(--border);
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text3);
  background: var(--bg);
  flex-shrink: 0;
  transition: border-color 0.14s, color 0.14s, background 0.14s;
}
.discussion-type-icon.inline { color: var(--accent); border-color: var(--accent-border); background: var(--accent-bg); }
.discussion-type-icon svg { width: 12px; height: 12px; }

.discussion-kind {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resolved-pill,
.unresolved-pill,
.outdated-pill,
.system-note-label {
  border-radius: 999px;
  padding: 1px 7px;
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}
.resolved-pill { border: 1px solid var(--accent-border); color: var(--accent); }
.unresolved-pill { border: 1px solid rgba(201,154,13,0.35); color: var(--yellow); }
.outdated-pill { border: 1px solid var(--border2); color: var(--text3); }
.system-note-label { border: 1px solid var(--border); color: var(--text3); }

.resolve-btn {
  margin-left: auto;
  padding: 4px 8px;
}

.notes-stack { position: relative; }
.notes-stack::before {
  content: '';
  position: absolute;
  left: 24px;
  top: 44px;
  bottom: 12px;
  width: 1px;
  background: var(--border);
}

.comment-note {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;
  padding: 12px;
}
.comment-note + .comment-note { border-top: 1px solid rgba(44,44,40,0.68); }
.comment-note.system { opacity: 0.7; }

.comment-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border2);
  background: var(--surface2);
  z-index: 1;
  box-shadow: 0 0 0 3px var(--surface);
}

.comment-body-wrap { min-width: 0; }

.comment-note-meta {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: var(--text3);
  font-size: 12px;
  margin-bottom: 5px;
  flex-wrap: wrap;
}
.comment-note-meta strong { color: var(--text); font-weight: 650; }

.note-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.12s;
}
.comment-note:hover .note-actions,
.comment-note:focus-within .note-actions {
  opacity: 1;
}
.note-action {
  height: 22px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--surface2);
  color: var(--text3);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 700;
  padding: 0 7px;
  transition: color 0.12s, border-color 0.12s, background 0.12s;
}
.note-action:hover:not(:disabled) {
  color: var(--text2);
  border-color: var(--border2);
  background: var(--surface3);
}
.note-action.danger:hover:not(:disabled) {
  color: var(--red);
  border-color: rgba(229,83,75,0.34);
  background: rgba(229,83,75,0.08);
}
.note-action:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.comment-body {
  color: var(--text2);
  font-size: 13.2px;
  line-height: 1.62;
  word-break: break-word;
}
.comment-body :deep(p) { margin-bottom: 8px; }
.comment-body :deep(p:last-child) { margin-bottom: 0; }
.comment-body :deep(a) { color: var(--accent); text-decoration: none; }
.comment-body :deep(a:hover) { text-decoration: underline; }
.comment-body :deep(code) {
  font-family: var(--font-mono);
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 4px;
  color: var(--text);
}
.comment-body :deep(pre) {
  overflow-x: auto;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 10px;
  margin: 8px 0;
}
.comment-body :deep(ul),
.comment-body :deep(ol) { padding-left: 18px; margin: 8px 0; }

.edit-composer {
  margin-top: 6px;
}

.edit-textarea {
  width: 100%;
  min-height: 92px;
  max-height: 260px;
  border: 1px solid var(--accent-border);
  border-radius: 7px;
  background: var(--input-focus-bg);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 13px;
  line-height: 1.55;
  padding: 8px 9px;
  resize: vertical;
  outline: none;
  user-select: text;
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.edit-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.edit-actions .comment-error {
  margin-right: auto;
}

.edit-cancel {
  border-color: var(--border);
  background: var(--surface2);
  color: var(--text3);
}

.show-replies-btn {
  margin: 0 12px 10px 50px;
  padding: 4px 9px;
  background: transparent;
  border-color: var(--border);
  color: var(--text3);
  background: var(--surface2);
}

.reply-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 8px;
  border-width: 1px 0 0;
  border-radius: 0;
  background: rgba(10,9,8,0.32);
  padding: 9px 10px 9px 50px;
  transition: background 0.14s;
}
.reply-composer.active { background: var(--surface); }
.reply-submit { height: 34px; }

@media (max-width: 760px) {
  .comments-controls { grid-template-columns: 1fr; }
  .comment-filter-tabs { width: 100%; }
  .comment-filter-tab { flex: 1; min-width: 0; }
  .reply-composer { grid-template-columns: 1fr; padding-left: 12px; }
  .reply-submit { justify-self: end; }
}
</style>
