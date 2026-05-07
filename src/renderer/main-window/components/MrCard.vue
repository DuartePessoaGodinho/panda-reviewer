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
    :style="{ animationDelay: `${index * 0.04}s` }"
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
          <span class="mr-ref">{{ mr.references?.full ?? '!' + mr.iid }}</span>
          <div class="mr-badges">
            <span v-if="draft" class="badge draft">Draft</span>
            <span v-if="pipelineStatus === 'success'" class="badge pipeline-ok">✓ CI</span>
            <span v-if="pipelineStatus === 'failed'"  class="badge pipeline-fail">✗ CI</span>
            <span v-if="pipelineStatus === 'running' || pipelineStatus === 'pending'" class="badge pipeline-run">⟳ CI</span>
            <span v-if="approved" class="badge approved">✓ Approved</span>
            <span v-if="mr.user_notes_count > 0" class="badge comments" :title="`${mr.user_notes_count} comment${mr.user_notes_count !== 1 ? 's' : ''}`">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M2 3.5A2.5 2.5 0 0 1 4.5 1h7A2.5 2.5 0 0 1 14 3.5v4A2.5 2.5 0 0 1 11.5 10H7.9l-3.2 2.4A.45.45 0 0 1 4 12.04V10A2 2 0 0 1 2 8V3.5Z"/>
              </svg>
              {{ mr.user_notes_count }}
            </span>
          </div>
        </div>
        <div class="mr-title">{{ title }}</div>
        <div class="mr-author">by <span>{{ mr.author.name }}</span> · {{ project }}</div>
      </div>
    </div>

    <div class="mr-card-bottom">
      <span class="branch-chip" :title="mr.source_branch">{{ mr.source_branch }}</span>
      <span class="arrow-icon">→</span>
      <span class="branch-chip" :title="mr.target_branch">{{ mr.target_branch }}</span>
      <span class="updated-time">{{ updatedAgo }}</span>
    </div>

    <div class="card-actions" @click.stop>
      <button
        class="btn-sm ai ai-btn"
        :disabled="!hasRepo || !aiEnabled"
        :title="aiDisabledTitle"
        @click="$emit('ai-review', mr)"
      >
        ✦ AI Review
      </button>
      <button class="btn-sm ide-btn" @click="$emit('open-in-ide', mr)">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
          <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
          <path d="M6.854 4.646a.5.5 0 0 1 0 .708L4.207 8l2.647 2.646a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0zm2.292 0a.5.5 0 0 0 0 .708L11.793 8l-2.647 2.646a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708 0z"/>
        </svg>
      </button>
      <button v-if="!approved" class="btn-sm approve-btn" title="Approve this MR" @click="$emit('approve', mr)">
        ✓ Approve
      </button>
      <button class="btn-sm link" :title="'Open in browser'" @click="$emit('open-external', mr.web_url)">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10.604 1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.75.75 0 0 1-1.06-1.06l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1zM3.75 2A1.75 1.75 0 0 0 2 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0 0 14 12.25v-3.5a.75.75 0 0 0-1.5 0v3.5a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25v-8.5a.25.25 0 0 1 .25-.25h3.5a.75.75 0 0 0 0-1.5h-3.5z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MR } from '../../types';
import { isDraft, displayTitle, projectName, timeAgo } from '../utils';

const props = defineProps<{
  mr: MR;
  index: number;
  isActive: boolean;
  approved: boolean;
  hasRepo: boolean;
  aiEnabled: boolean;
}>();

defineEmits<{
  open: [mr: MR];
  'ai-review': [mr: MR];
  'open-in-ide': [mr: MR];
  approve: [mr: MR];
  'open-external': [url: string];
}>();

const avatarFallback = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 26 26%22><rect width=%2226%22 height=%2226%22 fill=%22%2321262d%22/></svg>';

const draft         = computed(() => isDraft(props.mr));
const title         = computed(() => displayTitle(props.mr));
const project       = computed(() => projectName(props.mr));
const updatedAgo    = computed(() => timeAgo(props.mr.updated_at));
const pipelineStatus = computed(() => props.mr.head_pipeline?.status ?? null);

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
  border-left: 3px solid var(--orange);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}
.mr-card:hover        { border-color: var(--accent); border-left-color: var(--orange); background: var(--surface2); box-shadow: 0 2px 12px rgba(0,0,0,0.25); }
.mr-card:focus-visible{ outline: 2px solid var(--accent); outline-offset: 2px; }
.mr-card.active       { border-color: var(--accent); border-left-color: var(--orange); background: var(--accent-bg); }
.mr-card.card-pipeline-run  { border-left-color: var(--yellow); }
.mr-card.card-pipeline-fail { border-left-color: var(--red); }
.mr-card.card-approved      { border-left-color: var(--green); }
.mr-card.draft              { border-left-color: var(--text3); }

.mr-card-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
.avatar { width: 26px; height: 26px; border-radius: 50%; background: var(--border); flex-shrink: 0; object-fit: cover; }
.mr-meta { flex: 1; min-width: 0; }
.mr-header-row { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
.mr-ref {
  font-size: 10px; color: var(--text3); font-family: monospace;
  flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.mr-badges { display: flex; gap: 4px; margin-left: auto; flex-shrink: 0; }
.mr-title {
  font-size: 13px; font-weight: 600; color: var(--text); line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.mr-author { font-size: 11px; color: var(--text3); margin-top: 3px; }
.mr-author span { color: var(--text2); }

.mr-card-bottom { display: flex; align-items: center; gap: 5px; margin-top: 8px; }
.branch-chip {
  font-size: 10px; background: var(--bg); color: var(--text2);
  border: 1px solid var(--border); border-radius: 4px; padding: 2px 6px;
  font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px;
}
.arrow-icon  { color: var(--text3); font-size: 10px; flex-shrink: 0; }
.updated-time{ margin-left: auto; font-size: 10px; color: var(--text3); white-space: nowrap; }

.card-actions {
  display: flex; gap: 5px;
  margin-top: 10px; padding-top: 10px;
  border-top: 1px solid var(--border);
}
</style>
