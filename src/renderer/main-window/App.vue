<template>
  <div class="app">
    <div class="titlebar">
      <span class="app-name">🐼 Panda Reviewer — Vue</span>
      <span class="status">{{ statusText }}</span>
    </div>
    <div class="body">
      <p>Vue + Pinia scaffold is running.</p>
      <p>IPC check: {{ ipcStatus }}</p>
      <p>MRs loaded: {{ mrs.toReviewMrs.length }} to review · {{ mrs.myMrs.length }} mine</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMrsStore } from './stores/mrs';

const mrs = useMrsStore();
const ipcStatus = ref('checking…');
const statusText = ref('Loading…');

onMounted(async () => {
  try {
    const data = await window.api.getMrs();
    mrs.update(data);
    ipcStatus.value = '✓ window.api reachable';
    statusText.value = `${data.toReview.length + data.myMrs.length} MRs`;
  } catch (e) {
    ipcStatus.value = `✗ ${String(e)}`;
    statusText.value = 'Error';
  }
});
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, 'Segoe UI', sans-serif;
  background: #0d1117;
  color: #e6edf3;
  height: 100vh;
}
.app { display: flex; flex-direction: column; height: 100vh; }
.titlebar {
  height: 40px;
  background: #161b22;
  border-bottom: 1px solid #21262d;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  -webkit-app-region: drag;
  flex-shrink: 0;
}
.app-name { font-size: 13px; font-weight: 600; color: #8b949e; }
.status { font-size: 11px; color: #484f58; }
.body { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 10px; color: #8b949e; font-size: 13px; }
</style>
