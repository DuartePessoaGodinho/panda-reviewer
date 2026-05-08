<template>
  <div class="ai-panel">
    <div class="ai-reading-header">
      <button class="ai-back-btn" @click="$emit('back')">← Back</button>
      <span class="ai-reading-date">{{ formatDate(entry.createdAt) }}</span>
      <button class="ai-cancel-btn" style="margin-left:auto" @click="$emit('rerun')">↺ Re-run</button>
    </div>

    <div v-if="entry.context" class="ai-reading-context">"{{ entry.context }}"</div>

    <div v-if="toc.length >= 2" class="ai-toc">
      <a
        v-for="item in toc"
        :key="item.slug"
        class="ai-toc-item"
        @click="scrollToSlug(item.slug)"
      >{{ item.label }}</a>
    </div>

    <div class="ai-output-area" id="aiOutput" v-html="renderedOutput"></div>

    <div class="ai-notes-section">
      <button class="ai-notes-toggle" :class="{ open: notesOpen }" @click="toggleNotes">
        My Notes{{ hasNotes ? ' 📝' : '' }}
        <span class="ai-notes-saved">{{ savedMsg }}</span>
        <svg viewBox="0 0 16 16" fill="currentColor">
          <path d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/>
        </svg>
      </button>
      <div v-show="notesOpen" class="ai-notes-body">
        <textarea
          v-model="notes"
          class="ai-notes-textarea"
          placeholder="Track what you fixed, what's still pending, questions for the author…"
          @input="onNotesInput"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { ReviewEntry } from '../../../types';
import { renderMarkdown, slugify, extractCodexReview } from '../../utils';

const props = defineProps<{ entry: ReviewEntry; mrId: number }>();
defineEmits<{ back: []; rerun: [] }>();

const notes      = ref(props.entry.notes ?? '');
const notesOpen  = ref(!!props.entry.notes?.trim());
const savedMsg   = ref('');
const hasNotes   = computed(() => !!notes.value.trim());
let saveDebounce: ReturnType<typeof setTimeout> | null = null;

const renderedOutput = computed(() => renderMarkdown(extractCodexReview(props.entry.output)));

interface TocItem { label: string; slug: string }
const toc = computed((): TocItem[] => {
  const matches = [...extractCodexReview(props.entry.output).matchAll(/^## (.+)$/gm)];
  return matches.map(m => ({ label: m[1], slug: `h-${slugify(m[1])}` }));
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toggleNotes() {
  notesOpen.value = !notesOpen.value;
}

function scrollToSlug(slug: string) {
  const output = document.getElementById('aiOutput');
  const target = output?.querySelector<HTMLElement>(`#${slug}`);
  if (output && target) {
    output.scrollBy({ top: target.getBoundingClientRect().top - output.getBoundingClientRect().top - 8, behavior: 'smooth' });
  }
}

function onNotesInput() {
  if (saveDebounce) clearTimeout(saveDebounce);
  saveDebounce = setTimeout(async () => {
    props.entry.notes = notes.value;
    await window.api.updateReviewNotes(props.mrId, props.entry.id, notes.value);
    savedMsg.value = '✓ saved';
    setTimeout(() => { savedMsg.value = ''; }, 2000);
  }, 600);
}
</script>

<style scoped>
.ai-panel { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }

.ai-reading-header {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.ai-back-btn {
  padding: 3px 10px; border: 1px solid var(--border2);
  background: transparent; color: var(--text2); border-radius: 5px;
  font-size: 11px; cursor: pointer; transition: background 0.1s; flex-shrink: 0;
}
.ai-back-btn:hover { background: var(--surface2); color: var(--text); }
.ai-reading-date { font-size: 12px; color: var(--text3); }
.ai-cancel-btn {
  padding: 3px 10px; border: 1px solid var(--border2);
  background: transparent; color: var(--text2); border-radius: 5px;
  font-size: 11px; cursor: pointer; transition: background 0.1s;
}
.ai-cancel-btn:hover { background: var(--surface2); color: var(--text); }

.ai-reading-context {
  font-size: 11px; color: var(--text3); font-style: italic;
  padding: 6px 16px; border-bottom: 1px solid var(--border);
  background: var(--surface); flex-shrink: 0;
}

.ai-toc {
  flex-shrink: 0; padding: 7px 14px; border-bottom: 1px solid var(--border);
  display: flex; flex-wrap: wrap; gap: 4px; background: var(--surface);
}
.ai-toc-item {
  font-size: 11px; color: var(--text3); padding: 2px 9px;
  border-radius: 10px; background: var(--surface2); border: 1px solid var(--border);
  cursor: pointer; transition: color 0.1s, background 0.1s, border-color 0.1s;
  white-space: nowrap; text-decoration: none; display: inline-block;
}
.ai-toc-item:hover { color: var(--text); background: var(--border); border-color: var(--border2); }

.ai-output-area {
  flex: 1; overflow-y: auto; padding: 16px 20px; min-height: 0; user-select: text;
}
.ai-output-area :deep(h1), .ai-output-area :deep(h2), .ai-output-area :deep(h3) { color: var(--text); margin: 16px 0 8px; line-height: 1.3; }
.ai-output-area :deep(h1) { font-size: 16px; }
.ai-output-area :deep(h2) { font-size: 14px; }
.ai-output-area :deep(h3) { font-size: 13px; color: var(--text2); }
.ai-output-area :deep(p)  { font-size: 13px; line-height: 1.6; color: var(--text2); margin-bottom: 10px; }
.ai-output-area :deep(strong) { color: var(--text); }
.ai-output-area :deep(code) { font-family: 'Cascadia Code','Fira Code',monospace; font-size: 11px; background: var(--surface2); border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; color: #58a6ff; }
.ai-output-area :deep(pre) { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; overflow-x: auto; margin-bottom: 12px; }
.ai-output-area :deep(pre code) { background: none; border: none; padding: 0; font-size: 12px; color: var(--text); }
.ai-output-area :deep(ul), .ai-output-area :deep(ol) { padding-left: 20px; margin-bottom: 10px; }
.ai-output-area :deep(li)  { font-size: 13px; line-height: 1.6; color: var(--text2); margin-bottom: 3px; }
.ai-output-area :deep(hr)  { border: none; border-top: 1px solid var(--border); margin: 14px 0; }

.ai-notes-section { flex-shrink: 0; }
.ai-notes-toggle {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 9px 16px; border: none; background: transparent;
  cursor: pointer; border-top: 1px solid var(--border);
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--text3); transition: color 0.1s;
}
.ai-notes-toggle:hover { color: var(--text2); }
.ai-notes-toggle svg { width: 10px; height: 10px; margin-left: auto; transition: transform 0.15s; flex-shrink: 0; }
.ai-notes-toggle.open svg { transform: rotate(180deg); }
.ai-notes-saved { font-size: 10px; color: var(--green); font-weight: 400; text-transform: none; letter-spacing: 0; }

.ai-notes-body { padding: 0 16px 12px; flex-shrink: 0; }
.ai-notes-textarea {
  width: 100%; min-height: 70px; max-height: 130px;
  background: var(--surface); border: 1px solid var(--border2); border-radius: 7px;
  color: var(--text); font-size: 12px; padding: 8px 11px; resize: vertical;
  outline: none; font-family: inherit; line-height: 1.5;
  transition: border-color 0.15s; user-select: text;
}
.ai-notes-textarea:focus { border-color: var(--accent); }
.ai-notes-textarea::placeholder { color: var(--text3); }
</style>
