<template>
  <div class="app-root">
    <!-- Titlebar -->
    <div class="titlebar">
      <div class="titlebar-left">
        <div class="app-mark">
          <img class="app-logo" src="/icon.svg" alt="" />
        </div>
        <span class="app-name">Panda Reviewer</span>
      </div>
      <div class="titlebar-actions">
        <div class="poll-status" :title="pollText">
          <div class="poll-dot" :class="pollState"></div>
          <span class="poll-text">{{ pollText }}</span>
        </div>
        <span class="last-updated" v-if="lastUpdated">{{ lastUpdated }}</span>
        <button
          class="theme-toggle"
          type="button"
          :title="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
          :aria-label="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
          :aria-pressed="theme === 'dark'"
          @click="toggleTheme"
        >
          <span class="theme-toggle-track">
            <span class="theme-toggle-thumb">
              <svg v-if="theme === 'dark'" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M9.6 14.7A6.7 6.7 0 0 1 8.2 1.4a.55.55 0 0 1 .54.86 5 5 0 0 0 5 7.78.55.55 0 0 1 .72.68A6.72 6.72 0 0 1 9.6 14.7Z"/>
              </svg>
              <svg v-else viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 11.25A3.25 3.25 0 1 0 8 4.75a3.25 3.25 0 0 0 0 6.5ZM8 .75a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1A.75.75 0 0 1 8 .75Zm0 12a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1a.75.75 0 0 1 .75-.75ZM14.5 7.25a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1 0-1.5h1Zm-12 0a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1 0-1.5h1Zm10.2-4.98a.75.75 0 0 1 1.06 1.06l-.7.7A.75.75 0 0 1 12 2.97l.7-.7ZM3.03 12a.75.75 0 0 1 1.06 1.06l-.7.7a.75.75 0 1 1-1.06-1.06l.7-.7Zm10.73.7a.75.75 0 0 1-1.06 1.06l-.7-.7A.75.75 0 1 1 13.06 12l.7.7ZM4.09 2.97A.75.75 0 1 1 3.03 4.03l-.7-.7a.75.75 0 1 1 1.06-1.06l.7.7Z"/>
              </svg>
            </span>
          </span>
        </button>
        <button class="titlebar-btn" :class="{ spinning: refreshing }" title="Refresh" @click="onRefresh">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
        </button>
        <button class="titlebar-btn" :class="{ active: showSettings }" title="Settings" @click="showSettings = !showSettings">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.892 3.433-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.892-1.64-.901-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.474l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
          </svg>
        </button>
        <div class="win-controls">
          <button class="win-btn" title="Minimize" @click="minimizeWindow">
            <svg viewBox="0 0 12 12" fill="currentColor">
              <rect y="5.5" width="12" height="1" rx="0.5"/>
            </svg>
          </button>
          <button class="win-btn close" title="Close" @click="closeWindow">
            <svg viewBox="0 0 12 12" fill="currentColor">
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="layout">
      <!-- Main split -->
      <div class="panel">
        <Transition name="slide-right" mode="out-in">
          <SettingsView v-if="showSettings" key="settings" @close="showSettings = false" />
          <div v-else key="main" class="split">
            <MrList
              ref="mrListRef"
              :ai-enabled="aiEnabled"
              @open="onMrOpen"
              @ai-review="onAiReview"
              @clone-needed="showCloneDialog"
            />
            <DiffPanel :ai-enabled="aiEnabled" :provider-label="providerLabel" />
          </div>
        </Transition>
      </div>
    </div>

    <!-- Clone dialog -->
    <Transition name="overlay-fade">
      <div v-if="cloneUrl" class="overlay" @click.self="cloneUrl = ''">
        <Transition name="scale-fade" appear>
          <div class="dialog" v-if="cloneUrl">
            <div class="dialog-icon">📦</div>
            <h3>Project not cloned locally</h3>
            <p>This project wasn't found in your configured repo folders. Clone it first, then try again.</p>
            <div class="clone-cmd">git clone {{ cloneUrl }}</div>
            <div class="dialog-actions">
              <button class="btn-dialog" @click="cloneUrl = ''">Dismiss</button>
              <button class="btn-dialog accent" @click="copyClone">{{ cloneCopied ? '✓ Copied!' : 'Copy command' }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- Toasts -->
    <div class="toast-container">
      <TransitionGroup name="toast" tag="div" class="toast-inner">
        <div v-for="t in toasts" :key="t.id" class="toast">
          <div class="toast-dot" :class="t.type"></div>
          <span>{{ t.msg }}</span>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { MR } from '../types';
import { useMrsStore } from './stores/mrs';
import { useCommentsStore } from './stores/comments';
import { useAiStore } from './stores/ai';
import { projectUrl } from './utils';
import MrList from './components/MrList.vue';
import DiffPanel from './components/DiffPanel.vue';
import SettingsView from './components/SettingsView.vue';
import './style.css';

const mrs      = useMrsStore();
const comments = useCommentsStore();
const ai       = useAiStore();

const mrListRef       = ref<InstanceType<typeof MrList> | null>(null);
const aiEnabled       = ref(true);
const aiProvider      = ref<string>('claude');
const showSettings    = ref(false);
const lastUpdated     = ref('');
const pollState       = ref<'loading' | 'ok' | 'err'>('loading');
const pollText        = ref('Connecting…');
const refreshing      = ref(false);
const cloneUrl        = ref('');
const cloneCopied     = ref(false);
const theme           = ref<'light' | 'dark'>(loadTheme());

interface Toast { id: number; msg: string; type: 'ok' | 'err' | 'info'; out: boolean }
const toasts = ref<Toast[]>([]);
let toastSeq = 0;

const providerLabel = computed(() => {
  if (aiProvider.value === 'copilot') return 'Copilot';
  if (aiProvider.value === 'codex')   return 'Codex';
  return 'Claude';
});

function showToast(msg: string, type: Toast['type'] = 'info', duration = 3000) {
  const id = ++toastSeq;
  toasts.value.push({ id, msg, type, out: false });
  setTimeout(() => {
    toasts.value = toasts.value.filter(x => x.id !== id);
  }, duration);
}

function setPollStatus(state: typeof pollState.value, text: string) {
  pollState.value = state;
  pollText.value  = text;
}

function minimizeWindow() { window.api.minimizeWindow(); }
function closeWindow()    { window.api.closeWindow(); }

function loadTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('panda-theme');
  return saved === 'dark' ? 'dark' : 'light';
}

function applyTheme(nextTheme: typeof theme.value) {
  document.documentElement.dataset.theme = nextTheme;
  void window.api?.setThemeBackground?.(nextTheme);
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  localStorage.setItem('panda-theme', theme.value);
  applyTheme(theme.value);
}

applyTheme(theme.value);

async function onRefresh() {
  refreshing.value = true;
  setPollStatus('loading', 'Refreshing…');
  await window.api.forcePoll();
  setTimeout(() => { refreshing.value = false; }, 2000);
}

function onMrOpen(mr: MR) {
  const isRunningReview = ai.running && ai.reviewingMr?.id === mr.id;

  mrs.setActiveMr(mr);
  mrs.setActivePanelTab(isRunningReview ? 'ai' : 'diff');
  mrs.setAiDrawerOpen(isRunningReview);
}

function onAiReview(mr: MR) {
  mrs.setActiveMr(mr);
  mrs.setActivePanelTab('ai');
  mrs.setAiDrawerOpen(true);
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
  applyTheme(theme.value);

  const settings = await window.api.getSettings();
  aiEnabled.value  = settings.aiReviewEnabled ?? true;
  aiProvider.value = settings.aiReviewProvider ?? 'claude';

  const data = await window.api.getMrs();
  mrs.update(data);
  await prefetchRepoPaths([...data.toReview, ...data.myMrs]);
  mrListRef.value?.clearLoading();

  const total = data.toReview.length + data.myMrs.length;
  setPollStatus('ok', total > 0 ? `${total} MR${total !== 1 ? 's' : ''} open` : 'All clear');

  window.api.onMrsUpdated(async (data: any) => {
    if (mrs.activeMr) void comments.refresh(mrs.activeMr);
    mrs.update(data);
    await prefetchRepoPaths([...data.toReview, ...data.myMrs]);
    const total = data.toReview.length + data.myMrs.length;
    lastUpdated.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setPollStatus('ok', total > 0 ? `${total} MR${total !== 1 ? 's' : ''} open` : 'All clear');
  });

  window.api.onSettingsUpdated((s: any) => {
    aiEnabled.value  = s.aiReviewEnabled ?? true;
    aiProvider.value = s.aiReviewProvider ?? 'claude';
    mrs.clearRepoCache();
    prefetchRepoPaths(mrs.uniqueOpenMrs);
  });

  window.api.onShowSettings(() => { showSettings.value = true; });

  window.api.onClaudeChunk((text: string) => ai.appendChunk(text));

  window.api.onClaudeDone(async () => {
    const mr = ai.reviewingMr;
    const entry = ai.finishReview();
    if (!mr) return;
    await window.api.saveReviewEntry(mr.id, entry);
    if (mrs.activeMr?.id === mr.id) {
      mrs.setAiDrawerOpen(true);
      mrs.setActivePanelTab('diff');
    }
    if (mrs.activeMr?.id !== mr.id || !mrs.aiDrawerOpen) {
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
.app-root {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  width: auto;
  height: auto;
  min-width: 0;
  background: var(--window-bg);
  overflow: hidden;
}

/* ── Titlebar ── */
.titlebar {
  height: 40px;
  background: linear-gradient(180deg, var(--surface2) 0%, var(--surface) 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px 0 14px;
  -webkit-app-region: drag;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  position: relative;
  min-width: 0;
}
.titlebar::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-glow2) 30%, var(--accent-glow2) 70%, transparent);
  opacity: 0.6;
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.app-mark {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-logo {
  width: 22px;
  height: 22px;
  display: block;
}

.app-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text2);
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.titlebar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: no-drag;
  min-width: 0;
  flex-shrink: 0;
}

.last-updated {
  font-size: 11px;
  color: var(--text3);
  margin-right: 6px;
  font-family: var(--font-mono);
}

.titlebar-btn {
  width: 27px;
  height: 27px;
  border: none;
  background: transparent;
  color: var(--text3);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--dur-fast), color var(--dur-fast), transform var(--dur-fast) var(--ease-spring);
}
.titlebar-btn:hover { background: var(--surface3); color: var(--text2); transform: scale(1.08); }
.titlebar-btn:active { transform: scale(0.92); }
.titlebar-btn.active { background: var(--surface3); color: var(--text); }
.titlebar-btn svg { width: 13px; height: 13px; pointer-events: none; }
.titlebar-btn.spinning svg { animation: spin 0.75s linear infinite; }

.theme-toggle {
  width: 45px;
  height: 27px;
  border: 0;
  background: transparent;
  color: var(--text2);
  cursor: pointer;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: transform var(--dur-fast) var(--ease-spring);
}
.theme-toggle:hover { transform: translateY(-1px); }
.theme-toggle:active { transform: scale(0.96); }
.theme-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.theme-toggle-track {
  width: 39px;
  height: 21px;
  border-radius: 999px;
  border: 1px solid var(--border2);
  background: var(--surface3);
  display: flex;
  align-items: center;
  padding: 2px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.08);
  transition: background var(--dur-base), border-color var(--dur-base);
}
.theme-toggle-thumb {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--surface);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  transform: translateX(0);
  transition: transform var(--dur-base) var(--ease-spring), background var(--dur-base), color var(--dur-base);
}
:global(:root[data-theme="dark"]) .theme-toggle-track {
  background: var(--accent-bg);
  border-color: var(--accent-border);
}
:global(:root[data-theme="dark"]) .theme-toggle-thumb {
  background: var(--surface);
  color: var(--accent);
}
.theme-toggle-thumb svg {
  width: 10px;
  height: 10px;
  pointer-events: none;
}

.poll-status {
  display: flex;
  align-items: center;
  gap: 7px;
  max-width: 145px;
  padding: 0 7px;
  color: var(--text3);
  font-family: var(--font-ui);
  font-size: 12px;
  letter-spacing: -0.01em;
}

.poll-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--border2);
  flex-shrink: 0;
  transition: background var(--dur-slow), box-shadow var(--dur-slow);
}

.poll-dot.ok      {
  background: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-bg), 0 0 8px var(--accent-glow2);
}
.poll-dot.err     { background: var(--red); }
.poll-dot.loading { background: var(--yellow); animation: pulse 1.4s ease-in-out infinite; }

.poll-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Window control buttons */
.win-controls {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-left: 4px;
  padding-left: 8px;
  border-left: 1px solid var(--border);
  flex-shrink: 0;
}

.win-btn {
  width: 27px;
  height: 27px;
  border: none;
  background: transparent;
  color: var(--text3);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--dur-fast), color var(--dur-fast), transform var(--dur-fast) var(--ease-spring);
}
.win-btn:hover { background: var(--surface3); color: var(--text2); transform: scale(1.08); }
.win-btn:active { transform: scale(0.92); }
.win-btn.close:hover { background: rgba(229,83,75,0.15); color: var(--red); }
.win-btn svg { width: 11px; height: 11px; pointer-events: none; }

/* ── Layout ── */
.layout { display: flex; flex: 1; overflow: hidden; min-height: 0; background: var(--bg); }
.panel  { display: flex; flex: 1; overflow: hidden; min-height: 0; }
.split  { display: flex; flex: 1; overflow: hidden; min-height: 0; }

/* ── Transitions ── */
.slide-right-enter-active {
  transition: transform var(--dur-slow) var(--ease-out), opacity var(--dur-base) var(--ease-out);
}
.slide-right-leave-active {
  transition: transform var(--dur-base) var(--ease-in), opacity var(--dur-base) var(--ease-in);
}
.slide-right-enter-from { transform: translateX(28px); opacity: 0; }
.slide-right-leave-to   { transform: translateX(20px); opacity: 0; }

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity var(--dur-base) var(--ease-out);
}
.overlay-fade-enter-from,
.overlay-fade-leave-to { opacity: 0; }

.scale-fade-enter-active {
  transition: transform var(--dur-slow) var(--ease-spring), opacity var(--dur-base) var(--ease-out);
}
.scale-fade-leave-active {
  transition: transform var(--dur-fast) var(--ease-in), opacity var(--dur-fast) var(--ease-in);
}
.scale-fade-enter-from { transform: scale(0.92) translateY(8px); opacity: 0; }
.scale-fade-leave-to   { transform: scale(0.96); opacity: 0; }

/* Toast TransitionGroup */
.toast-container {
  position: fixed;
  bottom: 20px; right: 20px;
  z-index: 200;
  pointer-events: none;
}
.toast-inner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast-enter-active {
  transition: transform var(--dur-base) var(--ease-spring), opacity var(--dur-fast) var(--ease-out);
}
.toast-leave-active {
  transition: transform var(--dur-fast) var(--ease-in), opacity var(--dur-fast) var(--ease-in);
}
.toast-enter-from { transform: translateX(18px) scale(0.94); opacity: 0; }
.toast-leave-to   { transform: translateX(10px) scale(0.96); opacity: 0; }
.toast-move {
  transition: transform var(--dur-base) var(--ease-out);
}
</style>
