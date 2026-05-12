<template>
  <div
    class="mr-card"
    :class="{
      active: isActive,
      draft: draft,
      'card-approved': approved,
      'card-pipeline-fail': pipelineStatus === 'failed',
      'card-pipeline-run': pipelineStatus === 'running' || pipelineStatus === 'pending',
    }"
    v-motion
    :initial="{ opacity: 0, y: 14 }"
    :enter="{ opacity: draft ? 0.75 : 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 28, delay: index * 48 } }"
    :hovered="{ y: -2, transition: { duration: 120 } }"
    :tapped="{ scale: 0.985, y: 0, transition: { duration: 80 } }"
    role="button"
    tabindex="0"
    :aria-label="`View diff for ${title}`"
    @click="$emit('open', mr)"
    @keydown.enter.prevent="$emit('open', mr)"
    @keydown.space.prevent="$emit('open', mr)"
  >
    <div class="mr-card-top">
      <img
        class="avatar"
        :src="mr.author.avatar_url"
        :alt="mr.author.username"
        @error="(e) => ((e.target as HTMLImageElement).src = avatarFallback)"
      />
      <div class="mr-meta">
        <div class="mr-header-row">
          <div class="mr-badges">
            <span v-if="draft" class="badge draft">Draft</span>
            <span v-if="pipelineStatus === 'success'" class="badge pipeline-ok">✓ CI</span>
            <span v-if="pipelineStatus === 'failed'"  class="badge pipeline-fail">✗ CI</span>
            <span v-if="pipelineStatus === 'running' || pipelineStatus === 'pending'" class="badge pipeline-run">⟳ CI</span>
            <span v-if="approved" class="badge approved">✓ Approved</span>
            <span v-if="pinned" class="badge pinned">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M9.8 1.1a.5.5 0 0 1 .35.15l4.6 4.6a.5.5 0 0 1-.35.85h-1.8l-2 2a1 1 0 0 0-.3.7v1.65a1 1 0 0 1-1.7.7L7 10.15l-3.65 3.7a.5.5 0 0 1-.7-.7L6.3 9.45 4.7 7.85a1 1 0 0 1 .7-1.7h1.65a1 1 0 0 0 .7-.3l2-2V1.6a.5.5 0 0 1 .05-.5Z"/>
              </svg>
              Pinned
            </span>
            <span v-if="hasNewChanges" class="badge updated" title="New commits since your last review">↑ New</span>
            <span v-if="mr.user_notes_count > 0" class="badge comments" :title="`${mr.user_notes_count} comment${mr.user_notes_count !== 1 ? 's' : ''}`">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M2 3.5A2.5 2.5 0 0 1 4.5 1h7A2.5 2.5 0 0 1 14 3.5v4A2.5 2.5 0 0 1 11.5 10H7.9l-3.2 2.4A.45.45 0 0 1 4 12.04V10A2 2 0 0 1 2 8V3.5Z"/>
              </svg>
              {{ mr.user_notes_count }}
            </span>
          </div>
        </div>
        <div class="mr-title">{{ title }}</div>
        <div class="mr-author">{{ mr.author.name }} <span class="mr-project">· {{ project }}</span></div>
      </div>
    </div>

    <div class="mr-card-bottom">
      <span class="branch-chip" :title="mr.source_branch">
        <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M11.75 2.5a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0zm.75 2.25a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5zM4.25 13.5a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0zm.75 2.25a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5zM4.25 2.5a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0zM5 4.75V8a1 1 0 0 0 1 1h4.25a2.25 2.25 0 1 1 0 1.5H6A2.5 2.5 0 0 1 3.5 8V4.75a2.25 2.25 0 1 1 1.5 0z"/>
        </svg>
        <span class="branch-name">{{ mr.source_branch }}</span>
      </span>
      <span class="branch-arrow">→</span>
      <span class="branch-chip target" :title="mr.target_branch">
        <span class="branch-name">{{ mr.target_branch }}</span>
      </span>
      <div class="mr-times">
        <span class="mr-time" :title="createdTitle">Created {{ createdAgo }}</span>
        <span class="mr-time" :title="updatedTitle">Updated {{ updatedAgo }}</span>
      </div>
    </div>

    <div class="card-actions" :class="{ 'has-approve': !approved }" @click.stop>
      <button
        class="btn-sm ai"
        :disabled="!hasRepo || !aiEnabled"
        :title="aiDisabledTitle"
        @click="$emit('ai-review', mr)"
      >
        <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 0l1.5 5H16l-4.5 3.5L13 14 8 10l-5 4 1.5-5.5L0 5h6.5L8 0z"/>
        </svg>
        AI Review
      </button>
      <button
        class="btn-sm pin-btn"
        :class="{ active: pinned }"
        :title="pinned ? 'Unpin MR' : 'Pin MR'"
        :aria-pressed="pinned"
        @click="$emit('toggle-pin', mr)"
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M9.8 1.1a.5.5 0 0 1 .35.15l4.6 4.6a.5.5 0 0 1-.35.85h-1.8l-2 2a1 1 0 0 0-.3.7v1.65a1 1 0 0 1-1.7.7L7 10.15l-3.65 3.7a.5.5 0 0 1-.7-.7L6.3 9.45 4.7 7.85a1 1 0 0 1 .7-1.7h1.65a1 1 0 0 0 .7-.3l2-2V1.6a.5.5 0 0 1 .05-.5Z"/>
        </svg>
      </button>
      <button class="btn-sm ide-btn" title="Open in IDE" @click="$emit('open-in-ide', mr)">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
          <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
          <path d="M6.854 4.646a.5.5 0 0 1 0 .708L4.207 8l2.647 2.646a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0zm2.292 0a.5.5 0 0 0 0 .708L11.793 8l-2.647 2.646a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708 0z"/>
        </svg>
      </button>
      <button v-if="!approved" class="btn-sm approve-btn" title="Approve this MR" @click="$emit('approve', mr)">
        ✓ Approve
      </button>
      <button class="btn-sm link" title="Open in browser" @click="$emit('open-external', mr.web_url)">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10.604 1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.75.75 0 0 1-1.06-1.06l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1zM3.75 2A1.75 1.75 0 0 0 2 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0 0 14 12.25v-3.5a.75.75 0 0 0-1.5 0v3.5a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25v-8.5a.25.25 0 0 1 .25-.25h3.5a.75.75 0 0 0 0-1.5h-3.5z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import type { MR } from '../../types';
import { useMrsStore } from '../stores/mrs';
import { isDraft, displayTitle, projectName, timeAgo } from '../utils';

const props = defineProps<{
  mr: MR;
  index: number;
  isActive: boolean;
  approved: boolean;
  pinned: boolean;
  hasRepo: boolean;
  aiEnabled: boolean;
}>();

defineEmits<{
  open: [mr: MR];
  'ai-review': [mr: MR];
  'open-in-ide': [mr: MR];
  approve: [mr: MR];
  'toggle-pin': [mr: MR];
  'open-external': [url: string];
}>();

const avatarFallback = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 26 26%22><rect width=%2226%22 height=%2226%22 fill=%22%23232320%22/></svg>';

const mrs = useMrsStore();
const checkpoint = computed(() => mrs.reviewCheckpoints[props.mr.id] ?? null);

onMounted(async () => {
  try {
    await mrs.loadReviewCheckpoint(props.mr.id);
  } catch { /* silent */ }
});

const hasNewChanges = computed(() => {
  const cp = checkpoint.value;
  if (!cp) return false;
  if (props.mr.sha && cp.sourceSha && props.mr.sha !== cp.sourceSha) return true;
  if (props.mr.review_activity_at && props.mr.review_activity_kind === 'commit') {
    return new Date(props.mr.review_activity_at) > new Date(cp.reviewedAt);
  }
  return false;
});

const draft          = computed(() => isDraft(props.mr));
const title          = computed(() => displayTitle(props.mr));
const project        = computed(() => projectName(props.mr));
const createdAgo     = computed(() => timeAgo(props.mr.created_at));
const updatedAt      = computed(() => props.mr.review_activity_at ?? props.mr.updated_at);
const updatedAgo     = computed(() => timeAgo(updatedAt.value));
const pipelineStatus = computed(() => props.mr.head_pipeline?.status ?? null);
const createdTitle   = computed(() => new Date(props.mr.created_at).toLocaleString());
const activityLabel  = computed(() => {
  if (props.mr.review_activity_kind === 'author_comment') return 'Latest author comment';
  if (props.mr.review_activity_kind === 'commit') return 'Latest commit';
  return 'Latest review activity';
});
const updatedTitle   = computed(() => `${activityLabel.value}: ${new Date(updatedAt.value).toLocaleString()}`);

const aiDisabledTitle = computed(() => {
  if (!props.aiEnabled) return 'Enable AI Review in Settings first';
  if (!props.hasRepo)   return 'Clone this repo first to enable AI Review';
  return '';
});
</script>

<style scoped>
.mr-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 2px solid var(--border);
  border-radius: var(--radius-md);
  padding: 13px 14px 11px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: border-color var(--dur-fast), background var(--dur-fast), box-shadow var(--dur-base);
  position: relative;
  min-width: 0;
  overflow: hidden;
  will-change: transform;
}
.mr-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.015) 0%, transparent 50%);
  pointer-events: none;
}
.mr-card:hover {
  background: var(--surface2);
  border-color: var(--border2);
  border-left-color: var(--border2);
  box-shadow: var(--shadow-md);
}
.mr-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--accent-bg);
}

/* State: active selection */
.mr-card.active {
  background: var(--surface3);
  border-color: var(--accent-border);
  border-left: 3px solid var(--accent);
  box-shadow: var(--shadow-md), 0 0 0 1px var(--accent-border);
}
.mr-card.active::before {
  background: linear-gradient(180deg, rgba(30,214,154,0.07) 0%, transparent 55%);
}

/* Pipeline status takes priority over active on left border */
.mr-card.card-pipeline-fail,
.mr-card.active.card-pipeline-fail { border-left-color: var(--red); }
.mr-card.card-pipeline-run,
.mr-card.active.card-pipeline-run  { border-left-color: var(--yellow); }

/* Top section */
.mr-card-top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  margin-bottom: 9px;
}

.avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--surface2);
  flex-shrink: 0;
  object-fit: cover;
  border: 1.5px solid var(--border2);
  transition: border-color var(--dur-fast), box-shadow var(--dur-fast);
}
.mr-card:hover .avatar {
  border-color: var(--border2);
  box-shadow: 0 0 0 2px var(--accent-bg);
}

.mr-meta { flex: 1; min-width: 0; }

.mr-header-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  margin-bottom: 4px;
}

.mr-badges {
  display: flex;
  gap: 4px;
  margin-left: 0;
  flex-shrink: 0;
}

.mr-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  letter-spacing: -0.015em;
}

.mr-author {
  font-size: 12.5px;
  color: var(--text2);
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mr-project { color: var(--text3); }

/* Bottom branch section */
.mr-card-bottom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 0.85fr) auto;
  align-items: center;
  gap: 5px;
  margin-top: 9px;
  min-width: 0;
}

.branch-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  background: var(--bg);
  color: var(--text3);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: var(--font-mono);
  white-space: nowrap;
  overflow: hidden;
  min-width: 0;
}
.branch-chip.target { color: var(--text2); }
.branch-chip svg { flex-shrink: 0; opacity: 0.6; }
.branch-name {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.branch-arrow { color: var(--text3); font-size: 11px; flex-shrink: 0; }

.mr-times {
  display: grid;
  gap: 2px;
  justify-items: end;
  min-width: 82px;
}

.mr-time {
  font-size: 11.5px;
  color: var(--text3);
  white-space: nowrap;
  font-family: var(--font-mono);
}

/* Action buttons */
.card-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 33px 33px 33px;
  gap: 5px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  opacity: 0;
  transform: translateY(3px);
  transition: opacity var(--dur-base), transform var(--dur-base) var(--ease-out);
}
.card-actions.has-approve {
  grid-template-columns: minmax(0, 1fr) 33px 33px minmax(92px, 0.8fr) 33px;
}
.mr-card:hover .card-actions,
.mr-card.active .card-actions {
  opacity: 1;
  transform: translateY(0);
}

.pin-btn {
  flex: 0;
  padding: 5px 7px;
}
.pin-btn.active {
  background: rgba(201,154,13,0.12);
  border-color: rgba(201,154,13,0.35);
  color: var(--yellow);
}
</style>
