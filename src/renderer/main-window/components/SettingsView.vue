<template>
  <div class="settings-root">
    <div class="settings-header">
      <span class="settings-title">Settings</span>
      <button class="settings-close" @click="$emit('close')">✕</button>
    </div>

    <div class="settings-body">
      <!-- GitLab Token -->
      <div class="setting-section">
        <div class="setting-label">
          GitLab Token
          <a class="setting-link" @click="openTokenHelp">Get a token ↗</a>
        </div>
        <p class="setting-description">
          Used to load your merge requests from GitLab. The token is checked when you type and saved locally when you press Save.
        </p>
        <input
          v-model="token"
          type="password"
          class="setting-input"
          :class="tokenStatus.cls"
          placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
          spellcheck="false"
          @input="onTokenInput"
        />
        <div v-if="tokenStatus.msg" class="token-status" :class="tokenStatus.state">{{ tokenStatus.msg }}</div>
      </div>

      <!-- Repo paths -->
      <div class="setting-section">
        <div class="setting-label">
          Local repo folders
          <button class="btn-add" @click="addPath">+ Add folder</button>
        </div>
        <p class="setting-description">
          Panda searches these folders to match GitLab projects with local clones, so Open in IDE and AI Review can work from your files.
        </p>
        <div class="path-list" id="pathList">
          <div v-for="(p, i) in paths" :key="i" class="path-row">
            <input v-model="paths[i]" type="text" class="setting-input" spellcheck="false" />
            <button class="btn-icon" title="Browse" @click="browsePath(i)">📂</button>
            <button class="btn-icon danger" title="Remove" @click="paths.splice(i, 1)">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <path d="M1 1l10 10M11 1L1 11"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- IDE -->
      <div class="setting-section">
        <div class="setting-label">IDE</div>
        <p class="setting-description">
          Select which editor opens when you jump from a merge request to its matching local repository.
        </p>
        <div class="option-grid">
          <button class="option-btn" :class="{ selected: ide === 'vscode' }" @click="ide = 'vscode'">
            <span class="option-icon">⌨</span> VS Code
          </button>
          <button class="option-btn" :class="{ selected: ide === 'intellij' }" @click="ide = 'intellij'">
            <span class="option-icon">🧠</span> IntelliJ
          </button>
        </div>
        <div v-if="ide === 'intellij'" class="intellij-path-row" style="margin-top:8px">
          <input v-model="intellijPath" type="text" class="setting-input" placeholder="Path to idea.exe or idea64.exe" spellcheck="false" />
          <button class="btn-icon" title="Browse" @click="browseIntelliJ">📂</button>
        </div>
      </div>

      <!-- Polling interval -->
      <div class="setting-section">
        <div class="setting-label">
          Polling interval
          <span class="setting-value">{{ pollingMins }} min</span>
        </div>
        <p class="setting-description">
          Controls how often Panda refreshes merge requests while the app is in the background. Focused windows refresh more aggressively.
        </p>
        <input
          v-model.number="pollingMins"
          type="range" min="1" max="60" class="setting-range"
        />
      </div>

      <!-- AI Review -->
      <div class="setting-section">
        <div class="setting-label">
          AI Review
          <label class="toggle">
            <input v-model="aiEnabled" type="checkbox" />
            <span class="toggle-track"></span>
          </label>
        </div>
        <p class="setting-description">
          Enables local CLI reviews for merge requests. The selected provider reads your local repo and writes the review back in the app.
        </p>
        <div class="option-grid" :class="{ disabled: !aiEnabled }">
          <button class="option-btn" :class="{ selected: aiProvider === 'claude' }" @click="aiProvider = 'claude'">
            <span class="option-icon">✦</span> Claude
          </button>
          <button class="option-btn" :class="{ selected: aiProvider === 'copilot' }" @click="aiProvider = 'copilot'">
            <span class="option-icon">🤖</span> Copilot
          </button>
          <button class="option-btn" :class="{ selected: aiProvider === 'codex' }" @click="aiProvider = 'codex'">
            <span class="option-icon">⚡</span> Codex
          </button>
        </div>
      </div>
    </div>

    <div class="settings-footer">
      <button class="btn-cancel" @click="$emit('close')">Cancel</button>
      <button class="btn-save" :class="{ saving, saved }" @click="onSave">
        {{ saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { AiReviewProvider } from '../../types';

defineEmits<{ close: [] }>();

const token       = ref('');
const paths       = ref<string[]>([]);
const ide         = ref<'vscode' | 'intellij'>('vscode');
const intellijPath = ref('');
const pollingMins = ref(5);
const aiEnabled   = ref(true);
const aiProvider  = ref<AiReviewProvider>('claude');
const saving      = ref(false);
const saved       = ref(false);

interface TokenStatus { state: 'loading' | 'ok' | 'err' | ''; msg: string; cls: string }
const tokenStatus = ref<TokenStatus>({ state: '', msg: '', cls: '' });
let tokenDebounce: ReturnType<typeof setTimeout> | null = null;

onMounted(async () => {
  const s = await window.api.getSettings();
  token.value        = s.gitlabToken ?? '';
  paths.value        = [...(s.repoPaths ?? [])];
  ide.value          = s.ide ?? 'vscode';
  intellijPath.value = s.intellijPath ?? '';
  pollingMins.value  = Math.round((s.pollingIntervalMs ?? 300000) / 60000);
  aiEnabled.value    = s.aiReviewEnabled ?? true;
  aiProvider.value   = s.aiReviewProvider ?? 'claude';
  if (s.gitlabToken) tokenStatus.value = { state: 'ok', msg: 'Token saved', cls: 'valid' };
});

function onTokenInput() {
  if (tokenDebounce) clearTimeout(tokenDebounce);
  tokenStatus.value = { state: 'loading', msg: 'Checking…', cls: '' };
  tokenDebounce = setTimeout(async () => {
    const t = token.value.trim();
    if (!t) { tokenStatus.value = { state: '', msg: '', cls: '' }; return; }
    try {
      const res = await fetch('https://gitlab.com/api/v4/user', { headers: { 'PRIVATE-TOKEN': t } });
      if (res.ok) {
        const user = await res.json();
        tokenStatus.value = { state: 'ok', msg: `Connected as ${user.name} (@${user.username})`, cls: 'valid' };
      } else {
        tokenStatus.value = { state: 'err', msg: 'Invalid token', cls: 'invalid' };
      }
    } catch {
      tokenStatus.value = { state: 'err', msg: 'Network error', cls: 'invalid' };
    }
  }, 700);
}

function openTokenHelp() {
  window.api.openExternal('https://gitlab.com/-/profile/personal_access_tokens');
}

async function addPath() {
  const folder = await window.api.pickFolder();
  if (folder) paths.value.push(folder);
}

async function browsePath(i: number) {
  const folder = await window.api.pickFolder();
  if (folder) paths.value[i] = folder;
}

async function browseIntelliJ() {
  const file = await window.api.pickFile([{ name: 'Executable', extensions: ['exe'] }]);
  if (file) intellijPath.value = file;
}

async function onSave() {
  saving.value = true;
  await window.api.saveSettings({
    gitlabToken:       token.value.trim(),
    repoPaths:         paths.value.filter(p => p.trim()),
    ide:               ide.value,
    intellijPath:      intellijPath.value.trim(),
    pollingIntervalMs: pollingMins.value * 60 * 1000,
    aiReviewEnabled:   aiEnabled.value,
    aiReviewProvider:  aiProvider.value,
  });
  saving.value = false;
  saved.value  = true;
  setTimeout(() => { saved.value = false; }, 600);
}
</script>

<style scoped>
.settings-root {
  flex: 1; display: flex; flex-direction: column;
  background: var(--bg); overflow: hidden;
  animation: settingsFadeIn var(--dur-base) var(--ease-out) both;
}
@keyframes settingsFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.settings-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, var(--surface2) 0%, var(--surface) 100%);
  flex-shrink: 0;
}
.settings-title { font-size: 16px; font-weight: 700; color: var(--text); }
.settings-close {
  width: 28px; height: 28px; border: none; background: transparent;
  color: var(--text3); cursor: pointer; border-radius: var(--radius-sm); font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: background var(--dur-fast), color var(--dur-fast), transform var(--dur-fast) var(--ease-spring);
}
.settings-close:hover { background: var(--surface3); color: var(--text); transform: scale(1.1); }
.settings-close:active { transform: scale(0.9); }

.settings-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 22px; }

.setting-section {
  display: flex; flex-direction: column; gap: 8px;
  animation: sectionFadeIn var(--dur-base) var(--ease-out) both;
}
.setting-section:nth-child(1) { animation-delay: 0.04s; }
.setting-section:nth-child(2) { animation-delay: 0.08s; }
.setting-section:nth-child(3) { animation-delay: 0.12s; }
.setting-section:nth-child(4) { animation-delay: 0.16s; }
.setting-section:nth-child(5) { animation-delay: 0.20s; }
.setting-section:nth-child(6) { animation-delay: 0.24s; }
@keyframes sectionFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.setting-label {
  font-size: 12px; font-weight: 700; color: var(--text2);
  text-transform: uppercase; letter-spacing: 0.05em;
  display: flex; align-items: center; gap: 8px;
}
.setting-description {
  color: var(--text3);
  font-size: 13px;
  line-height: 1.45;
  max-width: 760px;
  user-select: none;
}
.setting-value { margin-left: auto; font-weight: 400; color: var(--text3); text-transform: none; letter-spacing: 0; }
.setting-link  { margin-left: auto; font-size: 12px; color: var(--accent); cursor: pointer; font-weight: 400; text-transform: none; letter-spacing: 0; }
.setting-link:hover { text-decoration: underline; }

.setting-input {
  width: 100%; padding: 8px 10px; border-radius: var(--radius-sm);
  border: 1px solid var(--border2); background: var(--surface);
  color: var(--text); font-size: 13px; outline: none;
  font-family: monospace; transition: border-color 0.15s;
}
.setting-input:focus  { border-color: var(--accent-border); }
.setting-input.valid  { border-color: var(--green); }
.setting-input.invalid{ border-color: var(--red); }

.token-status { font-size: 12px; padding: 2px 0; }
.token-status.ok      { color: var(--green); }
.token-status.err     { color: var(--red); }
.token-status.loading { color: var(--text3); }

.setting-range { width: 100%; accent-color: var(--accent); }

.path-list  { display: flex; flex-direction: column; gap: 6px; }
.path-row   { display: flex; align-items: center; gap: 6px; }
.path-row .setting-input { flex: 1; }

.btn-add {
  margin-left: auto; font-size: 11px; padding: 3px 8px;
  border-radius: 5px; border: 1px solid var(--border2);
  background: transparent; color: var(--accent); cursor: pointer;
  font-weight: 600; text-transform: none; letter-spacing: 0;
  transition: background 0.1s;
}
.btn-add:hover { background: var(--accent-bg); }

.btn-icon {
  width: 28px; height: 28px; border: 1px solid var(--border2);
  background: var(--surface); color: var(--text2); border-radius: 5px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0; transition: background 0.1s;
}
.btn-icon:hover       { background: var(--surface2); }
.btn-icon.danger:hover{ border-color: var(--red); color: var(--red); }

.option-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 6px; }
.option-grid.disabled { opacity: 0.4; pointer-events: none; }
.option-btn {
  padding: 10px 8px; border-radius: 8px; border: 1px solid var(--border2);
  background: var(--surface); color: var(--text2); cursor: pointer;
  font-size: 13px; font-weight: 500; display: flex; align-items: center;
  gap: 6px; transition: background 0.1s, border-color 0.1s, color 0.1s;
}
.option-btn:hover    { background: var(--surface2); color: var(--text); }
.option-btn.selected { background: var(--accent-bg); border-color: var(--accent-border); color: #58a6ff; font-weight: 700; }
.option-icon { font-size: 15px; }

/* Toggle switch */
.toggle { display: inline-flex; align-items: center; cursor: pointer; margin-left: auto; }
.toggle input { display: none; }
.toggle-track {
  width: 32px; height: 18px; border-radius: 999px; background: var(--border2);
  position: relative; transition: background 0.2s;
}
.toggle-track::after {
  content: ''; position: absolute; top: 2px; left: 2px;
  width: 14px; height: 14px; border-radius: 50%; background: white;
  transition: transform 0.2s;
}
.toggle input:checked + .toggle-track { background: var(--accent); }
.toggle input:checked + .toggle-track::after { transform: translateX(14px); }

.intellij-path-row { display: flex; gap: 6px; align-items: center; }
.intellij-path-row .setting-input { flex: 1; }

.settings-footer {
  padding: 14px 20px; border-top: 1px solid var(--border);
  display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0;
  background: var(--surface);
}
.btn-cancel {
  padding: 7px 16px; border-radius: 6px; border: 1px solid var(--border2);
  background: transparent; color: var(--text2); font-size: 14px; cursor: pointer;
  transition: background 0.1s;
}
.btn-cancel:hover { background: var(--surface2); }
.btn-save {
  padding: 7px 20px; border-radius: 6px;
  border: 1px solid var(--accent-border);
  background: var(--accent-bg); color: #58a6ff;
  font-size: 14px; font-weight: 600; cursor: pointer; min-width: 80px;
  transition: background 0.12s;
}
.btn-save:hover  { background: #1f3a5a; }
.btn-save.saved  { background: rgba(63,185,80,0.15); border-color: var(--green); color: var(--green); }
</style>
