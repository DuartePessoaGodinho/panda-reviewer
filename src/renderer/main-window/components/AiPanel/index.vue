<template>
  <div class="ai-wrapper">
    <!-- Disabled state -->
    <div v-if="!aiEnabled" class="ai-panel">
      <div class="ai-hist-empty">
        <div style="font-size:28px;margin-bottom:8px">✦</div>
        <strong style="color:var(--text2)">AI Review is disabled</strong>
        <p>Enable AI Review in Settings to run local CLI reviews.</p>
      </div>
    </div>

    <template v-else>
      <AiHistory
        v-if="ai.view === 'history'"
        :no-repo="!repoPath"
        :provider-label="providerLabel"
        @new="ai.view = 'new'"
        @read="onRead"
      />
      <AiNew
        v-else-if="ai.view === 'new'"
        :repo-path="repoPath"
        :last-context="lastContext"
        @back="ai.view = 'history'"
        @run="onRun"
      />
      <AiRunning
        v-else-if="ai.view === 'running'"
        :provider-label="providerLabel"
        @cancel="onCancel"
      />
      <AiReading
        v-else-if="ai.view === 'reading' && ai.activeEntry"
        :entry="ai.activeEntry"
        :mr-id="mr.id"
        @back="ai.view = 'history'"
        @rerun="onRerun"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import type { MR, ReviewEntry } from '../../../types';
import { useAiStore } from '../../stores/ai';
import { useMrsStore } from '../../stores/mrs';
import AiHistory from './AiHistory.vue';
import AiNew     from './AiNew.vue';
import AiRunning from './AiRunning.vue';
import AiReading from './AiReading.vue';

const props = defineProps<{ mr: MR; aiEnabled: boolean; providerLabel: string }>();

const ai  = useAiStore();
const mrs = useMrsStore();

const repoPath   = computed(() => mrs.repoCache[props.mr.project_id] ?? null);
const lastContext = computed(() => ai.history[0]?.context ?? '');

// Load history when MR changes or panel opens
watch(() => props.mr.id, async (id) => {
  const entries = await window.api.getReviewHistory(id);
  ai.loadHistory(entries);
  ai.view = 'history';
}, { immediate: true });

function onRead(entry: ReviewEntry) {
  ai.activeEntry = entry;
  ai.view = 'reading';
}

async function onRun(context: string) {
  if (!repoPath.value) return;
  ai.startReview(props.mr, context);
  await window.api.startAiReview({
    repoPath: repoPath.value,
    sourceBranch: props.mr.source_branch,
    targetBranch: props.mr.target_branch,
    mrIid: props.mr.iid,
    mrTitle: props.mr.title,
    userContext: context,
  });
}

async function onCancel() {
  await window.api.cancelAiReview();
  ai.cancelReview();
}

function onRerun() {
  ai.view = 'new';
}
</script>

<style scoped>
.ai-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
.ai-panel   { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
.ai-hist-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; gap: 6px; color: var(--text3); font-size: 12px; text-align: center; padding: 20px;
}
</style>
