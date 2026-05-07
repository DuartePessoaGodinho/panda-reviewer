import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { MR, ReviewEntry } from '../../types';

export type AiView = 'history' | 'new' | 'running' | 'reading';

export const useAiStore = defineStore('ai', () => {
  const running = ref(false);
  const view = ref<AiView>('history');
  const history = ref<ReviewEntry[]>([]);
  const activeEntry = ref<ReviewEntry | null>(null);
  const reviewingMr = ref<MR | null>(null);
  const rawOutput = ref('');
  const pendingContext = ref('');

  function startReview(mr: MR, context: string) {
    reviewingMr.value = mr;
    pendingContext.value = context;
    rawOutput.value = '';
    running.value = true;
    view.value = 'running';
  }

  function appendChunk(text: string) {
    rawOutput.value += text;
  }

  function finishReview(): ReviewEntry {
    running.value = false;
    const entry: ReviewEntry = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      context: pendingContext.value,
      output: rawOutput.value,
      notes: '',
    };
    history.value.unshift(entry);
    activeEntry.value = entry;
    view.value = 'reading';
    reviewingMr.value = null;
    return entry;
  }

  function failReview(msg: string) {
    running.value = false;
    rawOutput.value += `\n\n**Error:** ${msg}`;
    reviewingMr.value = null;
  }

  function cancelReview() {
    running.value = false;
    view.value = 'history';
    reviewingMr.value = null;
  }

  function loadHistory(entries: ReviewEntry[]) {
    history.value = entries;
  }

  return {
    running,
    view,
    history,
    activeEntry,
    reviewingMr,
    rawOutput,
    pendingContext,
    startReview,
    appendChunk,
    finishReview,
    failReview,
    cancelReview,
    loadHistory,
  };
});
