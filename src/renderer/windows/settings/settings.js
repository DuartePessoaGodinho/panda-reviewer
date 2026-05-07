let selectedIde = 'vscode';
let selectedAiProvider = 'claude';
let aiReviewEnabled = true;
let paths = [];
let intellijPath = '';
let pollingIntervalMins = 5;
let tokenDebounce = null;
function renderPaths() {
    const list = document.getElementById('pathList');
    list.innerHTML = '';
    if (paths.length === 0)
        return;
    paths.forEach((p, i) => {
        const row = document.createElement('div');
        row.className = 'path-row';
        row.innerHTML = `
      <input type="text" value="${p}" data-index="${i}" spellcheck="false" />
      <button class="btn-icon" data-browse="${i}" title="Browse">📂</button>
      <button class="btn-icon danger" data-remove="${i}" title="Remove">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M1 1l10 10M11 1L1 11"/>
        </svg>
      </button>
    `;
        list.appendChild(row);
    });
    list.querySelectorAll('input[data-index]').forEach(el => {
        el.addEventListener('input', e => {
            const idx = parseInt(e.target.dataset.index);
            paths[idx] = e.target.value;
        });
    });
    list.querySelectorAll('[data-browse]').forEach(el => {
        el.addEventListener('click', async () => {
            const idx = parseInt(el.dataset.browse);
            const folder = await window.api.pickFolder();
            if (folder) {
                paths[idx] = folder;
                renderPaths();
            }
        });
    });
    list.querySelectorAll('[data-remove]').forEach(el => {
        el.addEventListener('click', () => {
            const idx = parseInt(el.dataset.remove);
            paths.splice(idx, 1);
            renderPaths();
        });
    });
}
function selectIde(ide) {
    selectedIde = ide;
    document.getElementById('ideVscode').classList.toggle('selected', ide === 'vscode');
    document.getElementById('ideIntelliJ').classList.toggle('selected', ide === 'intellij');
    document.getElementById('intellijPathRow').style.display =
        ide === 'intellij' ? 'block' : 'none';
}
function selectAiProvider(provider) {
    selectedAiProvider = provider;
    document.getElementById('providerClaude').classList.toggle('selected', provider === 'claude');
    document.getElementById('providerCopilot').classList.toggle('selected', provider === 'copilot');
    document.getElementById('providerCodex').classList.toggle('selected', provider === 'codex');
}
function setAiReviewEnabled(enabled) {
    aiReviewEnabled = enabled;
    document.getElementById('aiReviewEnabled').checked = enabled;
    document.getElementById('aiProviderGrid').classList.toggle('disabled', !enabled);
}
function setTokenStatus(state, msg = '') {
    const el = document.getElementById('tokenStatus');
    const text = document.getElementById('tokenStatusText');
    const input = document.getElementById('token');
    el.className = `token-status ${state}`;
    text.textContent = msg;
    input.className = state === 'ok' ? 'valid' : state === 'err' ? 'invalid' : '';
}
function updateIntervalLabel(mins) {
    document.getElementById('intervalLabel').textContent = `${mins} min`;
}
async function init() {
    const settings = await window.api.getSettings();
    document.getElementById('token').value = settings.gitlabToken ?? '';
    paths = [...(settings.repoPaths ?? [])];
    intellijPath = settings.intellijPath ?? '';
    document.getElementById('intellijPath').value = intellijPath;
    pollingIntervalMins = Math.round((settings.pollingIntervalMs ?? 300000) / 60000);
    const slider = document.getElementById('pollingInterval');
    slider.value = String(pollingIntervalMins);
    updateIntervalLabel(pollingIntervalMins);
    renderPaths();
    selectIde(settings.ide ?? 'vscode');
    selectAiProvider(settings.aiReviewProvider ?? 'claude');
    setAiReviewEnabled(settings.aiReviewEnabled ?? true);
    if (settings.gitlabToken)
        setTokenStatus('ok', `Token saved`);
}
// Token live validation
document.getElementById('token').addEventListener('input', () => {
    if (tokenDebounce)
        clearTimeout(tokenDebounce);
    setTokenStatus('loading', 'Checking…');
    tokenDebounce = setTimeout(async () => {
        const token = document.getElementById('token').value.trim();
        if (!token) {
            setTokenStatus('hidden');
            return;
        }
        try {
            const res = await fetch('https://gitlab.com/api/v4/user', {
                headers: { 'PRIVATE-TOKEN': token },
            });
            if (res.ok) {
                const user = await res.json();
                setTokenStatus('ok', `Connected as ${user.name} (@${user.username})`);
            }
            else {
                setTokenStatus('err', 'Invalid token');
            }
        }
        catch {
            setTokenStatus('err', 'Network error');
        }
    }, 700);
});
document.getElementById('addPathBtn').addEventListener('click', async () => {
    const folder = await window.api.pickFolder();
    if (folder) {
        paths.push(folder);
        renderPaths();
    }
});
document.getElementById('pollingInterval').addEventListener('input', (e) => {
    pollingIntervalMins = parseInt(e.target.value);
    updateIntervalLabel(pollingIntervalMins);
});
document.getElementById('ideVscode').addEventListener('click', () => selectIde('vscode'));
document.getElementById('ideIntelliJ').addEventListener('click', () => selectIde('intellij'));
document.getElementById('providerClaude').addEventListener('click', () => selectAiProvider('claude'));
document.getElementById('providerCopilot').addEventListener('click', () => selectAiProvider('copilot'));
document.getElementById('providerCodex').addEventListener('click', () => selectAiProvider('codex'));
document.getElementById('aiReviewEnabled').addEventListener('change', (e) => {
    setAiReviewEnabled(e.target.checked);
});
document.getElementById('intellijPath').addEventListener('input', (e) => {
    intellijPath = e.target.value;
});
document.getElementById('browseIntelliJBtn').addEventListener('click', async () => {
    const file = await window.api.pickFile([{ name: 'Executable', extensions: ['exe'] }]);
    if (file) {
        intellijPath = file;
        document.getElementById('intellijPath').value = file;
    }
});
document.getElementById('tokenHelpLink').addEventListener('click', () => window.api.openExternal('https://gitlab.com/-/profile/personal_access_tokens'));
document.getElementById('closeBtn').addEventListener('click', () => window.api.closeWindow());
document.getElementById('cancelBtn').addEventListener('click', () => window.api.closeWindow());
document.getElementById('saveBtn').addEventListener('click', async () => {
    const btn = document.getElementById('saveBtn');
    const text = document.getElementById('saveBtnText');
    btn.classList.add('saving');
    text.textContent = 'Saving…';
    const token = document.getElementById('token').value.trim();
    await window.api.saveSettings({
        gitlabToken: token,
        repoPaths: paths.filter(p => p.trim()),
        ide: selectedIde,
        intellijPath: intellijPath.trim(),
        pollingIntervalMs: pollingIntervalMins * 60 * 1000,
        aiReviewEnabled,
        aiReviewProvider: selectedAiProvider,
    });
    btn.classList.remove('saving');
    btn.classList.add('saved');
    text.textContent = '✓ Saved!';
    setTimeout(() => window.api.closeWindow(), 600);
});
init();
export {};
