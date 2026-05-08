<template>
  <div class="app-root">
    <!-- Titlebar -->
    <div class="titlebar">
      <div class="titlebar-left">
        <img class="app-logo" src="/icon.svg" alt="" />
        <span class="app-name">Panda Reviewer</span>
      </div>
      <div class="titlebar-actions">
        <span class="last-updated">{{ lastUpdated }}</span>
        <button class="titlebar-btn" :class="{ spinning: refreshing }" title="Refresh now" @click="onRefresh">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
        </button>
        <button class="titlebar-btn" title="Minimize" @click="minimizeWindow">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 8a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 8z"/></svg>
        </button>
        <button class="titlebar-btn" title="Close" @click="closeWindow">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Body -->
    <div class="layout">
      <!-- Sidebar -->
      <div class="sidebar" :class="{ collapsed: sidebarCollapsed }" id="sidebar">
        <div class="tab-nav">
          <button class="sidebar-toggle" title="Collapse sidebar" @click="toggleSidebar">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
            </svg>
          </button>
          <button
            v-for="tab in tabs" :key="tab.key"
            class="tab-btn"
            :class="{ active: filters.activeTab === tab.key }"
            :data-tab="tab.key"
            :title="tab.label"
            @click="switchTab(tab.key)"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.label }}</span>
            <span class="tab-count" :class="{ zero: tab.count === 0 }">{{ tab.count }}</span>
          </button>
        </div>
        <div class="sidebar-footer">
          <div class="poll-status">
            <div class="poll-dot" :class="pollState"></div>
            <span id="pollText">{{ pollText }}</span>
          </div>
          <button class="settings-btn" :class="{ active: showSettings }" @click="showSettings = !showSettings">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.892 3.433-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.892-1.64-.901-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.474l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
            </svg>
            <span class="tab-label">Settings</span>
          </button>
        </div>
      </div>

      <!-- Main split -->
      <div class="panel">
        <SettingsView v-if="showSettings" @close="showSettings = false" />
        <div v-else class="split">
          <MrList
            ref="mrListRef"
            :ai-enabled="aiEnabled"
            @open="onMrOpen"
            @ai-review="onAiReview"
            @clone-needed="showCloneDialog"
          />
          <DiffPanel :ai-enabled="aiEnabled" :provider-label="providerLabel" />
        </div>
      </div>
    </div>

    <!-- Clone dialog -->
    <div class="overlay" :class="{ hidden: !cloneUrl }" @click.self="cloneUrl = ''">
      <div class="dialog">
        <div class="dialog-icon">📦</div>
        <h3>Project not cloned locally</h3>
        <p>This project wasn't found in your configured repo folders. Clone it first, then try again.</p>
        <div class="clone-cmd">git clone {{ cloneUrl }}</div>
        <div class="dialog-actions">
          <button class="btn-dialog" @click="cloneUrl = ''">Dismiss</button>
          <button class="btn-dialog accent" @click="copyClone">{{ cloneCopied ? '✓ Copied!' : 'Copy command' }}</button>
        </div>
      </div>
    </div>

    <!-- Toasts -->
    <div class="toast-container">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="{ out: t.out }">
        <div class="toast-dot" :class="t.type"></div>
        <span>{{ t.msg }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { MR } from '../types';
import { useMrsStore } from './stores/mrs';
import { useFiltersStore } from './stores/filters';
import { useAiStore } from './stores/ai';
import { projectUrl } from './utils';
import MrList from './components/MrList.vue';
import DiffPanel from './components/DiffPanel.vue';
import SettingsView from './components/SettingsView.vue';
import './style.css';

const mrs     = useMrsStore();
const filters = useFiltersStore();
const ai      = useAiStore();

const mrListRef       = ref<InstanceType<typeof MrList> | null>(null);
const sidebarCollapsed = ref(localStorage.getItem('sidebarCollapsed') === 'true');
const aiEnabled       = ref(true);
const aiProvider      = ref<string>('claude');
const showSettings    = ref(false);
const lastUpdated     = ref('');
const pollState       = ref<'loading' | 'ok' | 'err'>('loading');
const pollText        = ref('Connecting…');
const refreshing      = ref(false);
const cloneUrl        = ref('');
const cloneCopied     = ref(false);

interface Toast { id: number; msg: string; type: 'ok' | 'err' | 'info'; out: boolean }
const toasts = ref<Toast[]>([]);
let toastSeq = 0;

const providerLabel = computed(() => {
  if (aiProvider.value === 'copilot') return 'Copilot';
  if (aiProvider.value === 'codex')   return 'Codex';
  return 'Claude';
});

const tabs = computed(() => [
  { key: 'review' as const, icon: '👀', label: ' To Review', count: mrs.toReviewMrs.length },
  { key: 'mine'   as const, icon: '🔀', label: ' My MRs',    count: mrs.myMrs.length },
]);

function showToast(msg: string, type: Toast['type'] = 'info', duration = 3000) {
  const id = ++toastSeq;
  toasts.value.push({ id, msg, type, out: false });
  setTimeout(() => {
    const t = toasts.value.find(x => x.id === id);
    if (t) t.out = true;
    setTimeout(() => { toasts.value = toasts.value.filter(x => x.id !== id); }, 200);
  }, duration);
}

function setPollStatus(state: typeof pollState.value, text: string) {
  pollState.value = state;
  pollText.value  = text;
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed.value));
}

function minimizeWindow() {
  window.api.minimizeWindow();
}

function closeWindow() {
  window.api.closeWindow();
}

function switchTab(tab: 'review' | 'mine') {
  filters.switchTab(tab);
  mrs.setActiveMr(null);
}

async function onRefresh() {
  refreshing.value = true;
  setPollStatus('loading', 'Refreshing…');
  await window.api.forcePoll();
  setTimeout(() => { refreshing.value = false; }, 2000);
}

function onMrOpen(mr: MR) {
  mrs.setActiveMr(mr);
  mrs.setActivePanelTab('diff');
}

function onAiReview(mr: MR) {
  mrs.setActiveMr(mr);
  mrs.setActivePanelTab('ai');
}

function showCloneDialog(url: string) { cloneUrl.value = url; }

async function copyClone() {
  await navigator.clipboard.writeText(`git clone ${cloneUrl.value}`);
  cloneCopied.value = true;
  setTimeout(() => { cloneCopied.value = false; }, 1500);
}

async function prefetchRepoPaths(mrsArr: MR[]) {
  const unique = [...new Map(mrsArr.map(m => [m.project_id, m])).values()];
  await Promise.all(unique.map(async (mr) => {
    if (mr.project_id in mrs.repoCache) return;
    const path = await window.api.findLocalRepoForMr(projectUrl(mr));
    mrs.setRepoCache(mr.project_id, path);
  }));
}

onMounted(async () => {
  // Load settings
  const settings = await window.api.getSettings();
  aiEnabled.value  = settings.aiReviewEnabled ?? true;
  aiProvider.value = settings.aiReviewProvider ?? 'claude';

  // Load initial MR data
  const data = await window.api.getMrs();
  mrs.update(data);
  await prefetchRepoPaths([...data.toReview, ...data.myMrs]);
  mrListRef.value?.clearLoading();

  const total = data.toReview.length + data.myMrs.length;
  setPollStatus('ok', total > 0 ? `${total} MR${total !== 1 ? 's' : ''} open` : 'All clear');

  // IPC listeners
  window.api.onMrsUpdated(async (data: any) => {
    mrs.update(data);
    await prefetchRepoPaths([...data.toReview, ...data.myMrs]);
    const total = data.toReview.length + data.myMrs.length;
    lastUpdated.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setPollStatus('ok', total > 0 ? `${total} MR${total !== 1 ? 's' : ''} open` : 'All clear');
  });

  window.api.onSettingsUpdated((s: any) => {
    aiEnabled.value  = s.aiReviewEnabled ?? true;
    aiProvider.value = s.aiReviewProvider ?? 'claude';
  });

  window.api.onShowSettings(() => { showSettings.value = true; });

  // AI review IPC events
  window.api.onClaudeChunk((text: string) => ai.appendChunk(text));

  window.api.onClaudeDone(async () => {
    const entry = ai.finishReview();
    const mr = ai.reviewingMr;
    if (!mr) return;
    await window.api.saveReviewEntry(mr.id, entry);
    if (mrs.activeMr?.id !== mr.id || mrs.activePanelTab !== 'ai') {
      showToast(`✦ AI Review complete: ${mr.title.slice(0, 45)}${mr.title.length > 45 ? '…' : ''}`, 'ok', 6000);
    }
  });

  window.api.onClaudeError((msg: string) => {
    ai.failReview(msg);
    showToast(msg, 'err', 5000);
  });
});
</script>

<style scoped>
.app-root { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

/* Titlebar */
.titlebar {
  height: 40px; background: var(--surface);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px 0 16px; -webkit-app-region: drag;
  border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.titlebar-left { display: flex; align-items: center; gap: 10px; }
.app-logo  { width: 20px; height: 20px; border-radius: 5px; display: block; flex-shrink: 0; }
.app-name  { font-size: 13px; font-weight: 600; color: var(--text2); letter-spacing: -0.01em; }
.titlebar-actions { display: flex; align-items: center; gap: 2px; -webkit-app-region: no-drag; }
.last-updated { font-size: 10px; color: var(--text3); margin-right: 8px; white-space: nowrap; }
.titlebar-btn {
  width: 28px; height: 28px; border: none; background: transparent;
  color: var(--text2); cursor: pointer; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.12s, color 0.12s;
}
.titlebar-btn:hover { background: var(--border); color: var(--text); }
.titlebar-btn svg { width: 14px; height: 14px; pointer-events: none; }
.titlebar-btn.spinning svg { animation: spin 0.7s linear infinite; }

/* Layout */
.layout { display: flex; flex: 1; overflow: hidden; min-height: 0; }
.panel  { display: flex; flex: 1; overflow: hidden; min-height: 0; }
.split  { display: flex; flex: 1; overflow: hidden; min-height: 0; }

/* Sidebar */
.sidebar {
  width: 220px; background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column; flex-shrink: 0;
  transition: width 0.18s ease;
}
.sidebar.collapsed { width: 48px; }
.tab-nav { padding: 10px 8px 8px; display: flex; flex-direction: column; gap: 1px; }

.sidebar-toggle {
  display: flex; align-items: center; justify-content: flex-end;
  padding: 2px 6px 2px 10px; border: none; background: transparent;
  color: var(--text3); cursor: pointer; width: 100%; border-radius: 6px;
  transition: color 0.1s, background 0.1s;
}
.sidebar-toggle:hover { color: var(--text2); background: var(--surface2); }
.sidebar-toggle svg { width: 11px; height: 11px; transition: transform 0.18s ease; flex-shrink: 0; }
.sidebar.collapsed .sidebar-toggle { justify-content: center; padding: 2px 0; }
.sidebar.collapsed .sidebar-toggle svg { transform: rotate(180deg); }

.tab-btn {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 10px; border-radius: 7px; border: none;
  background: transparent; color: var(--text2); cursor: pointer;
  font-size: 13px; text-align: left; width: 100%;
  transition: background 0.1s, color 0.1s; position: relative;
}
.tab-btn:hover  { background: var(--surface2); color: var(--text); }
.tab-btn.active { background: var(--surface2); color: var(--text); font-weight: 600; }
.tab-btn.active::before {
  content: ''; position: absolute; left: 0; top: 6px; bottom: 6px;
  width: 3px; background: var(--accent); border-radius: 0 2px 2px 0;
}
.tab-icon  { font-size: 14px; width: 18px; text-align: center; }
.tab-count {
  margin-left: auto; background: var(--gitlab); color: white;
  font-size: 10px; font-weight: 700; border-radius: 10px;
  padding: 1px 6px; min-width: 18px; text-align: center; transition: background 0.2s;
}
.tab-count.zero { background: var(--border); color: var(--text3); }

.sidebar.collapsed .tab-label   { display: none; }
.sidebar.collapsed .tab-btn     { justify-content: center; padding: 10px 0; }
.sidebar.collapsed .tab-count   { position: absolute; top: 3px; right: 3px; min-width: 14px; font-size: 8px; padding: 0 3px; }
.sidebar.collapsed .tab-count.zero { display: none; }
.sidebar.collapsed .settings-btn { justify-content: center; padding: 8px 0; }
.sidebar.collapsed .poll-status  { justify-content: center; padding: 5px 0; }
.sidebar.collapsed #pollText     { display: none; }

.sidebar-footer {
  margin-top: auto; padding: 8px;
  border-top: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 4px;
}
.poll-status {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 10px; font-size: 10px; color: var(--text3);
}
.poll-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text3); flex-shrink: 0; }
.poll-dot.ok      { background: var(--green); }
.poll-dot.err     { background: var(--red); }
.poll-dot.loading { background: var(--yellow); animation: pulse 1s ease-in-out infinite; }

.settings-btn {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 10px; border-radius: 7px; border: none;
  background: transparent; color: var(--text2); cursor: pointer;
  font-size: 13px; width: 100%; transition: background 0.1s, color 0.1s;
}
.settings-btn:hover { background: var(--surface2); color: var(--text); }
</style>
