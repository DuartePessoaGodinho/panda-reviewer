export {};
declare const Diff2Html: any;

type MR = any;

let activeTab: 'review' | 'mine' = 'review';
let toReviewMrs: MR[] = [];
let myMrs: MR[] = [];
let activeMr: MR | null = null;
let activePanelTab: 'diff' | 'ai' = 'diff';
let firstLoad = true;
let repoCache: Record<number, string | null> = {};
let aiRunning = false;
let aiReviewEnabled = true;
let aiReviewProvider: AiReviewProvider = 'claude';
let rawOutput = '';
let currentUserId: number | null = null;
const locallyApproved = new Set<number>(); // mr.id — approved in this session, survives poll refreshes

// ── Filter state ───────────────────────────────────────────────────────────

type ApprovalFilter = 'all' | 'pending' | 'approved';
let filterApproval: ApprovalFilter = 'all';
let filterNoComments = false;
let filterHideDrafts = false;
let filterAuthor = 'all';

// AI review history state
type AiView = 'history' | 'new' | 'running' | 'reading';
let aiView: AiView = 'history';
let aiHistory: ReviewEntry[] = [];
let activeReviewEntry: ReviewEntry | null = null;
let pendingReviewContext = '';
let reviewingMr: MR | null = null; // pinned at review start — survives activeMr changes
let notesSaveDebounce: ReturnType<typeof setTimeout> | null = null;

// ── Toast ──────────────────────────────────────────────────────────────────

function showToast(msg: string, type: 'ok' | 'err' | 'info' = 'info', duration = 3000): void {
  const container = document.getElementById('toastContainer')!;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<div class="toast-dot ${type}"></div><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

// ── Poll status ────────────────────────────────────────────────────────────

function setPollStatus(state: 'loading' | 'ok' | 'err', text: string): void {
  document.getElementById('pollDot')!.className = `poll-dot ${state}`;
  document.getElementById('pollText')!.textContent = text;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function approvedByMe(mr: MR): boolean {
  if (locallyApproved.has(mr.id)) return true;
  if (!currentUserId || !Array.isArray(mr.approved_by)) return false;
  return mr.approved_by.some((a: any) => a.user?.id === currentUserId);
}

function pipelineBadge(mr: MR): string {
  const s = mr.head_pipeline?.status;
  if (!s) return '';
  if (s === 'success') return '<span class="badge pipeline-ok">✓ CI</span>';
  if (s === 'failed')  return '<span class="badge pipeline-fail">✗ CI</span>';
  if (['running','pending'].includes(s)) return '<span class="badge pipeline-run">⟳ CI</span>';
  return '';
}

function isDraft(mr: MR): boolean {
  return mr.title?.startsWith('Draft:') || mr.title?.startsWith('WIP:') || mr.work_in_progress;
}

function projectName(mr: MR): string {
  const full = mr.references?.full ?? '';
  const match = full.match(/^(.+)!/);
  if (match) { const parts = match[1].split('/'); return parts[parts.length - 1]; }
  return `project ${mr.project_id}`;
}

function projectUrl(mr: MR): string {
  return mr.web_url.replace(/\/-\/merge_requests.*/, '');
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function resetFilters(): void {
  filterApproval = 'all';
  filterNoComments = false;
  filterHideDrafts = false;
  filterAuthor = 'all';
}

function isAnyFilterActive(): boolean {
  return filterApproval !== 'all' || filterNoComments || filterHideDrafts || filterAuthor !== 'all';
}

function filteredMrs(): MR[] {
  const mrs = activeTab === 'review' ? toReviewMrs : myMrs;
  return mrs.filter(mr => {
    if (filterApproval === 'pending' && approvedByMe(mr)) return false;
    if (filterApproval === 'approved' && !approvedByMe(mr)) return false;
    if (filterNoComments && mr.user_notes_count > 0) return false;
    if (filterHideDrafts && isDraft(mr)) return false;
    if (filterAuthor !== 'all' && mr.author.username !== filterAuthor) return false;
    return true;
  });
}

function renderFilterBar(): void {
  const bar = document.getElementById('filterBar');
  if (!bar) return;
  const allMrs = activeTab === 'review' ? toReviewMrs : myMrs;
  if (allMrs.length === 0) { bar.innerHTML = ''; return; }

  const authors = [...new Map(allMrs.map(m => [m.author.username, m.author])).values()]
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  const authorOptions = [
    '<option value="all">All authors</option>',
    ...authors.map((a: any) =>
      `<option value="${escapeAttr(a.username)}" ${filterAuthor === a.username ? 'selected' : ''}>${escapeAttr(a.name)}</option>`
    ),
  ].join('');

  const hasActive = isAnyFilterActive();

  bar.innerHTML = `
    <div class="fb-row">
      <div class="fb-group">
        <button class="fb-pill ${filterApproval === 'all' ? 'active' : ''}" data-value="all">All</button>
        <button class="fb-pill ${filterApproval === 'pending' ? 'active' : ''}" data-value="pending">Pending</button>
        <button class="fb-pill ${filterApproval === 'approved' ? 'active' : ''}" data-value="approved">Approved</button>
      </div>
      <select class="fb-select" id="fbAuthorSelect">${authorOptions}</select>
    </div>
    <div class="fb-row">
      <button class="fb-pill toggle ${filterNoComments ? 'active' : ''}" id="fbNoComments">No comments</button>
      <button class="fb-pill toggle-draft ${filterHideDrafts ? 'active' : ''}" id="fbHideDrafts">Hide drafts</button>
      ${hasActive ? '<button class="fb-clear" id="fbClear">Clear</button>' : ''}
    </div>
  `;

  bar.querySelectorAll<HTMLElement>('.fb-group .fb-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      filterApproval = btn.dataset.value as ApprovalFilter;
      renderFilterBar();
      renderList();
    });
  });

  bar.querySelector('#fbAuthorSelect')?.addEventListener('change', (e) => {
    filterAuthor = (e.target as HTMLSelectElement).value;
    renderFilterBar();
    renderList();
  });

  bar.querySelector('#fbNoComments')?.addEventListener('click', () => {
    filterNoComments = !filterNoComments;
    renderFilterBar();
    renderList();
  });

  bar.querySelector('#fbHideDrafts')?.addEventListener('click', () => {
    filterHideDrafts = !filterHideDrafts;
    renderFilterBar();
    renderList();
  });

  bar.querySelector('#fbClear')?.addEventListener('click', () => {
    resetFilters();
    renderFilterBar();
    renderList();
  });
}

function aiProviderLabel(): string {
  if (aiReviewProvider === 'copilot') return 'Copilot';
  if (aiReviewProvider === 'codex') return 'Codex';
  return 'Claude';
}

function slugify(t: string): string {
  return t.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

function reviewPreview(output: string): string {
  if (!output) return '';
  const lines = output.split('\n').map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && !l.startsWith('```') && !l.startsWith('---'));
  const first = lines[0] ?? '';
  const clean = first.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`([^`]+)`/g, '$1');
  return clean.length > 90 ? clean.slice(0, 90) + '…' : clean;
}

function buildToc(text: string): string {
  const matches = [...text.matchAll(/^## (.+)$/gm)];
  if (matches.length < 2) return '';
  return matches.map(m =>
    `<a class="ai-toc-item" data-slug="h-${slugify(m[1])}">${m[1]}</a>`
  ).join('');
}

// ── Repo cache pre-check ───────────────────────────────────────────────────

async function prefetchRepoPaths(mrs: MR[]): Promise<void> {
  const unique = [...new Map(mrs.map(m => [m.project_id, m])).values()];
  await Promise.all(unique.map(async (mr) => {
    if (mr.project_id in repoCache) return;
    repoCache[mr.project_id] = await window.api.findLocalRepoForMr(projectUrl(mr));
  }));
}

// ── Card render ────────────────────────────────────────────────────────────

function renderCard(mr: MR, index: number): string {
  const draft = isDraft(mr);
  const hasRepo = repoCache[mr.project_id] !== null && repoCache[mr.project_id] !== undefined;
  const aiDisabledTitle = !aiReviewEnabled
    ? 'title="Enable AI Review in Settings first"'
    : hasRepo ? '' : 'title="Clone this repo first to enable AI Review"';
  const displayTitle = mr.title.replace(/^(Draft:|WIP:)\s*/i, '');
  const pipelineStatus = mr.head_pipeline?.status;
  const isApprovedByMe = approvedByMe(mr);

  return `
    <div class="mr-card ${activeMr?.id === mr.id ? 'active' : ''} ${draft ? 'draft' : ''} ${isApprovedByMe ? 'card-approved' : ''} ${pipelineStatus === 'failed' ? 'card-pipeline-fail' : ''} ${['running', 'pending'].includes(pipelineStatus ?? '') ? 'card-pipeline-run' : ''}"
         data-id="${mr.id}" data-project="${mr.project_id}" data-iid="${mr.iid}"
         role="button" tabindex="0" aria-label="View diff for ${escapeAttr(displayTitle)}"
         style="animation-delay:${index * 0.04}s">
      <div class="mr-card-top">
        <img class="avatar" src="${mr.author.avatar_url}" alt="${mr.author.username}"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 26 26%22><rect width=%2226%22 height=%2226%22 fill=%22%2321262d%22/></svg>'" />
        <div class="mr-meta">
          <div class="mr-header-row">
            <span class="mr-ref">${mr.references?.full ?? '!' + mr.iid}</span>
            <div class="mr-badges">
              ${draft ? '<span class="badge draft">Draft</span>' : ''}
              ${pipelineBadge(mr)}
              ${approvedByMe(mr) ? '<span class="badge approved">✓ Approved</span>' : ''}
              ${mr.user_notes_count > 0 ? `<span class="badge comments" title="${mr.user_notes_count} comment${mr.user_notes_count !== 1 ? 's' : ''}"><svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2 3.5A2.5 2.5 0 0 1 4.5 1h7A2.5 2.5 0 0 1 14 3.5v4A2.5 2.5 0 0 1 11.5 10H7.9l-3.2 2.4A.45.45 0 0 1 4 12.04V10A2 2 0 0 1 2 8V3.5Z"/></svg>${mr.user_notes_count}</span>` : ''}
            </div>
          </div>
          <div class="mr-title">${displayTitle}</div>
          <div class="mr-author">by <span>${mr.author.name}</span> · ${projectName(mr)}</div>
        </div>
      </div>
      <div class="mr-card-bottom">
        <span class="branch-chip" title="${mr.source_branch}">${mr.source_branch}</span>
        <span class="arrow-icon">→</span>
        <span class="branch-chip" title="${mr.target_branch}">${mr.target_branch}</span>
        <span class="updated-time">${timeAgo(mr.updated_at)}</span>
      </div>
      <div class="card-actions">
        <button class="btn-sm ai ai-btn" ${(!hasRepo || !aiReviewEnabled) ? 'disabled' : ''} ${aiDisabledTitle}
                data-id="${mr.id}">
          ✦ AI Review
        </button>
        <button class="btn-sm ide-btn" data-url="${projectUrl(mr)}">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M6.854 4.646a.5.5 0 0 1 0 .708L4.207 8l2.647 2.646a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0zm2.292 0a.5.5 0 0 0 0 .708L11.793 8l-2.647 2.646a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708 0z"/></svg>
        </button>
        ${!approvedByMe(mr) ? `<button class="btn-sm approve-btn" data-id="${mr.id}" title="Approve this MR">✓ Approve</button>` : ''}
        <button class="btn-sm link external-btn" data-url="${mr.web_url}" title="Open in browser">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M10.604 1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.75.75 0 0 1-1.06-1.06l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1zM3.75 2A1.75 1.75 0 0 0 2 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0 0 14 12.25v-3.5a.75.75 0 0 0-1.5 0v3.5a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25v-8.5a.25.25 0 0 1 .25-.25h3.5a.75.75 0 0 0 0-1.5h-3.5z"/></svg>
        </button>
      </div>
    </div>
  `;
}

function mrFingerprint(mrs: MR[]): string {
  return mrs.map(m => {
    const approvers = (m.approved_by ?? []).map((a: any) => a.user?.id).sort().join('+');
    return `${m.id}:${m.updated_at}:${approvers}`;
  }).join(',');
}

function updateActiveCardState(): void {
  const activeId = activeMr?.id != null ? String(activeMr.id) : null;
  document.querySelectorAll<HTMLElement>('#mrList .mr-card').forEach(card => {
    card.classList.toggle('active', activeId !== null && card.dataset.id === activeId);
  });
}

function updateApprovedCardState(card: HTMLElement): void {
  const badges = card.querySelector('.mr-badges');
  if (badges && !badges.querySelector('.badge.approved')) {
    badges.insertAdjacentHTML('beforeend', '<span class="badge approved">✓ Approved</span>');
  }
  card.querySelector('.approve-btn')?.remove();
}

async function openDiffForMr(mr: MR): Promise<void> {
  activeMr = mr;
  activePanelTab = 'diff';
  updateActiveCardState();
  await loadDiff(mr);
}

// ── List render ────────────────────────────────────────────────────────────

function renderList(): void {
  const list = document.getElementById('mrList')!;
  const mrs = filteredMrs();
  list.classList.toggle('animate-cards', firstLoad);

  if (mrs.length === 0) {
    const rawMrs = activeTab === 'review' ? toReviewMrs : myMrs;
    const filtered = isAnyFilterActive() && rawMrs.length > 0;
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${filtered ? '🔍' : (activeTab === 'review' ? '✅' : '📭')}</div>
        <div class="empty-title">${filtered ? 'No matches' : (activeTab === 'review' ? 'Nothing to review' : 'No open MRs')}</div>
        <div class="empty-sub">${filtered
          ? 'No MRs match your current filters.<br>Try relaxing or clearing them.'
          : (activeTab === 'review'
            ? "You're all caught up.<br>No MRs are waiting for your review."
            : 'You have no open merge requests right now.')}</div>
      </div>`;
    return;
  }

  list.innerHTML = mrs.map((mr, i) => renderCard(mr, i)).join('');

  list.querySelectorAll('.mr-card').forEach(card => {
    card.addEventListener('click', async (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      const mr = findMrById(parseInt((card as HTMLElement).dataset.id!));
      if (!mr) return;
      await openDiffForMr(mr);
    });

    card.addEventListener('keydown', async (e) => {
      if (!(e instanceof KeyboardEvent) || (e.key !== 'Enter' && e.key !== ' ')) return;
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      const mr = findMrById(parseInt((card as HTMLElement).dataset.id!));
      if (!mr) return;
      await openDiffForMr(mr);
    });
  });

  list.querySelectorAll('.ai-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const card = (btn as HTMLElement).closest('.mr-card') as HTMLElement;
      const mr = findMrById(parseInt(card.dataset.id!));
      if (!mr) return;
      activeMr = mr;
      activePanelTab = 'ai';
      updateActiveCardState();
      await openAiPanel(mr);
    });
  });

  list.querySelectorAll('.ide-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const result = await window.api.openInIde((btn as HTMLElement).dataset.url!);
      if (result.found) showToast('Opening in IDE…', 'ok');
      else showCloneDialog(result.cloneUrl ?? (btn as HTMLElement).dataset.url!);
    });
  });

  list.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const card = (btn as HTMLElement).closest('.mr-card') as HTMLElement;
      const mr = findMrById(parseInt(card.dataset.id!));
      if (!mr) return;

      (btn as HTMLButtonElement).disabled = true;
      (btn as HTMLButtonElement).textContent = '…';

      try {
        await window.api.approveMr(mr.project_id, mr.iid);
        locallyApproved.add(mr.id);
        updateApprovedCardState(card);
        showToast('MR approved', 'ok');
      } catch {
        (btn as HTMLButtonElement).disabled = false;
        (btn as HTMLButtonElement).textContent = '✓ Approve';
        showToast('Failed to approve MR', 'err');
      }
    });
  });

  list.querySelectorAll('.external-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.api.openExternal((btn as HTMLElement).dataset.url!);
    });
  });
}

function updateCounts(): void {
  const rc = document.getElementById('reviewCount')!;
  const mc = document.getElementById('mineCount')!;
  rc.textContent = String(toReviewMrs.length);
  rc.className = `tab-count ${toReviewMrs.length === 0 ? 'zero' : ''}`;
  mc.textContent = String(myMrs.length);
  mc.className = `tab-count ${myMrs.length === 0 ? 'zero' : ''}`;
}

function updateList(): void {
  renderFilterBar();
  renderList();
}

function findMrById(id: number): MR | null {
  return [...toReviewMrs, ...myMrs].find(m => m.id === id) ?? null;
}

// ── App-level views ───────────────────────────────────────────────────────

function updateSidebarSelection(): void {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === activeTab);
  });
}

function showReviewScreen(): void {
  document.getElementById('reviewScreen')!.classList.remove('hidden');
  document.getElementById('settingsScreen')!.classList.add('hidden');
  document.getElementById('settingsBtn')!.classList.remove('active');
  updateSidebarSelection();
}

function showSettingsScreen(): void {
  const frame = document.getElementById('settingsFrame') as HTMLIFrameElement;
  if (!frame.src) frame.src = '../settings/index.html?embedded=1';
  document.getElementById('reviewScreen')!.classList.add('hidden');
  document.getElementById('settingsScreen')!.classList.remove('hidden');
  document.getElementById('settingsBtn')!.classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
}

// ── Panel tab bar ──────────────────────────────────────────────────────────

function renderPanelTabs(mr: MR): string {
  const isRunningHere = aiRunning && reviewingMr?.id === mr.id;
  const reviewCount = aiHistory.length;
  return `
    <div class="panel-tabs">
      <button class="panel-tab ${activePanelTab === 'diff' ? 'active' : ''}" id="panelTabDiff">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M5 10.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"/></svg>
        Diff
      </button>
      <button class="panel-tab ai-tab ${activePanelTab === 'ai' ? 'active' : ''}" id="panelTabAi" ${!aiReviewEnabled ? 'disabled title="Enable AI Review in Settings first"' : ''}>
        ✦ AI Review
        ${isRunningHere ? '<span class="ai-tab-dot running"></span>' : ''}
        ${reviewCount > 0 ? `<span class="panel-tab-badge" style="background:rgba(124,58,237,0.15);color:#c084fc">${reviewCount}</span>` : ''}
      </button>
    </div>
  `;
}

function bindPanelTabs(mr: MR): void {
  document.getElementById('panelTabDiff')?.addEventListener('click', async () => {
    activePanelTab = 'diff';
    await loadDiff(mr);
  });
  document.getElementById('panelTabAi')?.addEventListener('click', async () => {
    if (!aiReviewEnabled) return;
    activePanelTab = 'ai';
    await openAiPanel(mr);
  });
}

function bindDiffFileListScrolling(): void {
  const content = document.querySelector<HTMLElement>('#diffPanel .diff-content');
  if (!content) return;
  content.scrollTop = 0;

  content.querySelectorAll<HTMLAnchorElement>('.d2h-file-list a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (event) => {
      const href = anchor.getAttribute('href');
      if (!href || href.length < 2) return;
      const target = document.getElementById(decodeURIComponent(href.slice(1)));
      if (!target) return;

      event.preventDefault();
      const contentTop = content.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      content.scrollBy({ top: targetTop - contentTop - 8, behavior: 'smooth' });
    });
  });
}

// ── Diff ───────────────────────────────────────────────────────────────────

async function loadDiff(mr: MR): Promise<void> {
  const panel = document.getElementById('diffPanel')!;
  panel.innerHTML = renderPanelTabs(mr) + `
    <div class="diff-content" style="flex:1;overflow:auto;padding:12px;display:flex;align-items:center;justify-content:center;">
      <div class="diff-placeholder">
        <div class="diff-placeholder-icon">⏳</div>
        <strong style="color:var(--text2);font-size:13px;">Loading diff…</strong>
      </div>
    </div>`;
  bindPanelTabs(mr);

  try {
    const { changes } = await window.api.getMrDiff(mr.project_id, mr.iid);
    const added   = changes.reduce((n: number, c: any) => n + (c.diff.match(/^\+/mg) ?? []).length, 0);
    const deleted = changes.reduce((n: number, c: any) => n + (c.diff.match(/^-/mg) ?? []).length, 0);

    const combinedDiff = changes
      .map((c: any) => `diff --git a/${c.old_path} b/${c.new_path}\n--- a/${c.old_path}\n+++ b/${c.new_path}\n${c.diff}`)
      .join('\n');

    const html = Diff2Html.html(combinedDiff, {
      drawFileList: true,
      outputFormat: 'line-by-line',
      renderNothingWhenEmpty: false,
    });

    const descBodyHtml = mr.description?.trim() ? renderMarkdown(mr.description) : '';
    const descRow = descBodyHtml ? `
      <div class="diff-desc-row">
        <button class="diff-desc-toggle" id="diffDescToggle">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>
          Description
        </button>
        <div class="diff-desc-body" id="diffDescBody" style="display:none">${descBodyHtml}</div>
      </div>` : '';

    panel.innerHTML = renderPanelTabs(mr) + `
      <div class="diff-header">
        <span class="diff-title">${mr.title}</span>
        <div class="diff-meta">
          <span class="diff-badge files">${changes.length} file${changes.length !== 1 ? 's' : ''}</span>
          <span class="diff-badge add">+${added}</span>
          <span class="diff-badge del">-${deleted}</span>
        </div>
      </div>` + descRow + `
      <div class="diff-content">${html}</div>`;
    bindPanelTabs(mr);
    bindDiffFileListScrolling();
    document.getElementById('diffDescToggle')?.addEventListener('click', () => {
      const toggle = document.getElementById('diffDescToggle')!;
      const body = document.getElementById('diffDescBody')!;
      body.style.display = toggle.classList.toggle('open') ? 'block' : 'none';
    });
  } catch {
    panel.innerHTML = renderPanelTabs(mr) + `
      <div class="diff-content" style="flex:1;overflow:auto;padding:12px;">
        <div class="diff-placeholder">
          <div class="diff-placeholder-icon">⚠️</div>
          <strong style="color:var(--text2)">Failed to load diff</strong>
          <p>Check your connection and try again.</p>
        </div>
      </div>`;
    bindPanelTabs(mr);
    showToast('Failed to load diff', 'err');
  }
}

// ── AI Review panel ────────────────────────────────────────────────────────

async function openAiPanel(mr: MR): Promise<void> {
  const repoPath = repoCache[mr.project_id] ?? null;
  aiHistory = await window.api.getReviewHistory(mr.id);
  if (!aiReviewEnabled) {
    renderAiDisabled(mr);
  } else if (aiRunning && reviewingMr?.id === mr.id) {
    renderAiRunning(mr);
  } else {
    aiView = 'history';
    renderAiHistory(mr, repoPath);
  }
}

function renderAiDisabled(mr: MR): void {
  const panel = document.getElementById('diffPanel')!;
  panel.innerHTML = renderPanelTabs(mr) + `
    <div class="ai-panel">
      <div class="ai-hist-empty">
        <div style="font-size:28px;margin-bottom:8px">✦</div>
        <strong style="color:var(--text2)">AI Review is disabled</strong>
        <p>Enable AI Review in Settings to run local CLI reviews.</p>
      </div>
    </div>`;
  bindPanelTabs(mr);
}

function renderAiHistory(mr: MR, repoPath: string | null): void {
  aiView = 'history';
  const panel = document.getElementById('diffPanel')!;
  const noRepo = !repoPath;
  const lastContext = aiHistory[0]?.context ?? '';

  const historyItems = aiHistory.map((entry, i) => {
    const date = new Date(entry.createdAt);
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const contextSnippet = entry.context
      ? `<span class="ai-hist-context">"${entry.context.slice(0, 60)}${entry.context.length > 60 ? '…' : ''}"</span>`
      : '<span class="ai-hist-context no-context">No extra context</span>';
    const hasNotes = entry.notes?.trim();
    const preview = reviewPreview(entry.output);
    return `
      <div class="ai-hist-item" data-idx="${i}">
        <div class="ai-hist-item-top">
          <span class="ai-hist-date">${dateStr} ${timeStr}</span>
          ${hasNotes ? '<span class="ai-hist-notes-dot" title="Has notes">📝</span>' : ''}
        </div>
        ${contextSnippet}
        ${preview ? `<div class="ai-hist-preview">${preview}</div>` : ''}
      </div>`;
  }).join('');

  panel.innerHTML = renderPanelTabs(mr) + `
    <div class="ai-panel">
      <div class="ai-hist-header">
        <div class="ai-hist-title">✦ AI Reviews</div>
        ${!noRepo ? `<button class="ai-new-btn" id="aiNewBtn">+ New Review</button>` : ''}
      </div>
      ${noRepo ? `<div class="ai-repo-warning">⚠ Repository not found locally — clone it first to enable AI Review.</div>` : ''}
      <div class="ai-hist-list">
        ${aiHistory.length === 0 ? `
          <div class="ai-hist-empty">
            <div style="font-size:28px;margin-bottom:8px">✦</div>
            <strong style="color:var(--text2)">No reviews yet</strong>
            <p>${aiProviderLabel()} explores the branch using git commands<br>directly in your local repo — no checkout needed.</p>
            ${!noRepo ? `<button class="ai-run-btn" id="aiRunBtnEmpty" style="margin-top:12px">▶ Run First Review</button>` : ''}
          </div>` : historyItems}
      </div>
    </div>`;

  bindPanelTabs(mr);

  document.getElementById('aiNewBtn')?.addEventListener('click', () => renderAiNew(mr, repoPath, lastContext));
  document.getElementById('aiRunBtnEmpty')?.addEventListener('click', () => renderAiNew(mr, repoPath, lastContext));

  panel.querySelectorAll('.ai-hist-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt((el as HTMLElement).dataset.idx!);
      activeReviewEntry = aiHistory[idx];
      aiView = 'reading';
      renderAiReading(mr, repoPath, activeReviewEntry);
    });
  });
}

function renderAiNew(mr: MR, repoPath: string | null, lastContext: string): void {
  aiView = 'new';
  const panel = document.getElementById('diffPanel')!;
  panel.innerHTML = renderPanelTabs(mr) + `
    <div class="ai-panel" style="overflow-y:auto;">
      <div class="ai-new-header">
        <button class="ai-back-btn" id="aiNewBackBtn">← Back</button>
        <span class="ai-new-title">✦ New AI Review</span>
      </div>
      <div class="ai-new-body">
        <div>
          <div class="ai-new-label">Focus context</div>
          <div class="ai-new-hint">Optional — guide the review toward specific concerns or away from noise.</div>
        </div>
        <textarea class="ai-context-textarea" id="aiNewContext"
          placeholder="e.g. focus on error handling, ignore test files, this touches auth logic…"
          style="min-height:120px; max-height:none; resize:vertical;"
        >${lastContext}</textarea>
        <div style="display:flex; justify-content:flex-end; gap:8px; padding-top:4px;">
          <button class="ai-cancel-btn" id="aiNewCancelBtn">Cancel</button>
          <button class="ai-run-btn" id="aiRunBtn" ${!repoPath ? 'disabled' : ''}>▶ Run Review</button>
        </div>
      </div>
    </div>`;

  bindPanelTabs(mr);

  document.getElementById('aiNewBackBtn')?.addEventListener('click', () => renderAiHistory(mr, repoPath));
  document.getElementById('aiNewCancelBtn')?.addEventListener('click', () => renderAiHistory(mr, repoPath));

  document.getElementById('aiRunBtn')?.addEventListener('click', async () => {
    if (!repoPath) return;
    const ctx = (document.getElementById('aiNewContext') as HTMLTextAreaElement)?.value ?? '';
    pendingReviewContext = ctx;
    reviewingMr = mr;
    rawOutput = '';
    aiRunning = true;
    aiView = 'running';
    renderAiRunning(mr);
    await window.api.startAiReview({
      provider: aiReviewProvider,
      repoPath,
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      mrTitle: mr.title,
      userContext: ctx,
    });
  });
}

function renderAiRunning(mr: MR): void {
  const panel = document.getElementById('diffPanel')!;
  panel.innerHTML = renderPanelTabs(mr) + `
    <div class="ai-panel">
      <div class="ai-running-header">
        <div class="ai-status-dot running" style="flex-shrink:0"></div>
        <span style="color:var(--text2);font-size:13px;">${aiProviderLabel()} review in progress</span>
        <button class="ai-cancel-btn" id="aiCancelBtn" style="margin-left:auto">■ Stop</button>
      </div>
      <div class="ai-running-stage" aria-live="polite">
        <div class="ai-study-scene" aria-hidden="true">
          <div class="study-shadow"></div>
          <div class="study-desk">
            <div class="desk-top"></div>
            <div class="book-stack left">
              <span></span><span></span><span></span>
            </div>
            <div class="book-stack right">
              <span></span><span></span>
            </div>
            <div class="open-book">
              <div class="book-page left-page">
                <i></i><i></i><i></i>
              </div>
              <div class="book-page right-page">
                <i></i><i></i><i></i>
              </div>
              <div class="book-spine"></div>
            </div>
            <div class="floating-page page-one"><i></i><i></i><i></i></div>
            <div class="floating-page page-two"><i></i><i></i></div>
            <div class="panda-figure">
              <div class="panda-ear left"></div>
              <div class="panda-ear right"></div>
              <div class="panda-head">
                <div class="panda-patch left"><b></b></div>
                <div class="panda-patch right"><b></b></div>
                <div class="panda-nose"></div>
                <div class="panda-mouth"></div>
              </div>
              <div class="panda-body">
                <div class="panda-arm left"></div>
                <div class="panda-arm right"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="ai-running-copy">
          <h2>Panda is studying this merge request</h2>
          <p>${aiProviderLabel()} is reading the branch locally. The final review will appear here when the analysis is complete.</p>
          <div class="ai-review-steps">
            <span>Opening the diff</span>
            <span>Checking risky paths</span>
            <span>Reading changed files</span>
            <span>Looking for edge cases</span>
          </div>
          <div class="ai-progress-rail"><span></span></div>
        </div>
      </div>
    </div>`;

  bindPanelTabs(mr);

  document.getElementById('aiCancelBtn')?.addEventListener('click', async () => {
    await window.api.cancelAiReview();
    aiRunning = false;
    aiView = 'history';
    renderAiHistory(mr, repoCache[mr.project_id] ?? null);
  });
}

function renderAiReading(mr: MR, repoPath: string | null, entry: ReviewEntry): void {
  const panel = document.getElementById('diffPanel')!;
  const date = new Date(entry.createdAt);
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const toc = buildToc(entry.output);
  const hasNotes = !!entry.notes?.trim();

  panel.innerHTML = renderPanelTabs(mr) + `
    <div class="ai-panel">
      <div class="ai-reading-header">
        <button class="ai-back-btn" id="aiBackBtn">← Back</button>
        <span class="ai-reading-date">${dateStr} ${timeStr}</span>
        <button class="ai-cancel-btn" id="aiRerunBtn" style="margin-left:auto">↺ Re-run</button>
      </div>
      ${entry.context ? `<div class="ai-reading-context">"${entry.context}"</div>` : ''}
      ${toc ? `<div class="ai-toc" id="aiToc">${toc}</div>` : ''}
      <div class="ai-output-area" id="aiOutput" style="flex:1">
        ${renderMarkdown(entry.output)}
      </div>
      <div class="ai-notes-section" style="flex-shrink:0">
        <button class="ai-notes-toggle ${hasNotes ? 'open' : ''}" id="aiNotesToggle">
          My Notes${hasNotes ? ' 📝' : ''}
          <span class="ai-notes-saved" id="notesSaved"></span>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></svg>
        </button>
        <div class="ai-notes-body" id="aiNotesBody" style="display:${hasNotes ? 'block' : 'none'}">
          <textarea class="ai-notes-textarea" id="aiNotes"
            placeholder="Track what you fixed, what's still pending, questions for the author…"
          >${entry.notes}</textarea>
        </div>
      </div>
    </div>`;

  bindPanelTabs(mr);

  document.getElementById('aiBackBtn')?.addEventListener('click', () => renderAiHistory(mr, repoPath));

  document.getElementById('aiRerunBtn')?.addEventListener('click', () => {
    renderAiNew(mr, repoPath, entry.context);
  });

  document.getElementById('aiNotesToggle')?.addEventListener('click', () => {
    const toggle = document.getElementById('aiNotesToggle')!;
    const body = document.getElementById('aiNotesBody')!;
    const open = toggle.classList.toggle('open');
    body.style.display = open ? 'block' : 'none';
    if (open) (document.getElementById('aiNotes') as HTMLTextAreaElement)?.focus();
  });

  panel.querySelectorAll<HTMLElement>('.ai-toc-item').forEach(a => {
    a.addEventListener('click', () => {
      const slug = a.dataset.slug!;
      const output = document.getElementById('aiOutput')!;
      const target = output.querySelector<HTMLElement>(`#${slug}`);
      if (target) output.scrollBy({ top: target.getBoundingClientRect().top - output.getBoundingClientRect().top - 8, behavior: 'smooth' });
    });
  });

  const notesArea = document.getElementById('aiNotes') as HTMLTextAreaElement | null;
  notesArea?.addEventListener('input', () => {
    if (notesSaveDebounce) clearTimeout(notesSaveDebounce);
    notesSaveDebounce = setTimeout(async () => {
      entry.notes = notesArea.value;
      await window.api.updateReviewNotes(mr.id, entry.id, notesArea.value);
      const saved = document.getElementById('notesSaved');
      if (saved) { saved.textContent = '✓ saved'; setTimeout(() => { saved.textContent = ''; }, 2000); }
    }, 600);
  });
}

// Very simple markdown → HTML (no dependency needed)
function renderMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, (_, t) => `<h3 id="h-${slugify(t)}">${t}</h3>`)
    .replace(/^## (.+)$/gm,  (_, t) => `<h2 id="h-${slugify(t)}">${t}</h2>`)
    .replace(/^# (.+)$/gm,   (_, t) => `<h1 id="h-${slugify(t)}">${t}</h1>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hup]|<li|<hr|<pre)(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
}

// ── AI review process events ───────────────────────────────────────────────

window.api.onClaudeChunk((text: string) => {
  rawOutput += text;
});

window.api.onClaudeDone(async () => {
  aiRunning = false;
  const mr = reviewingMr;
  reviewingMr = null;
  if (!mr) return;

  const entry: ReviewEntry = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    context: pendingReviewContext,
    output: rawOutput,
    notes: '',
  };

  // Always save to the MR the review was started for
  await window.api.saveReviewEntry(mr.id, entry);

  if (activeMr?.id === mr.id && activePanelTab === 'ai') {
    // User is still looking at this MR's AI panel — navigate to reading view
    aiHistory.unshift(entry);
    activeReviewEntry = entry;
    aiView = 'reading';
    renderAiReading(mr, repoCache[mr.project_id] ?? null, entry);
  } else {
    // User navigated away — notify with a toast
    showToast(`✦ AI Review complete: ${mr.title.slice(0, 45)}${mr.title.length > 45 ? '…' : ''}`, 'ok', 6000);
  }
});

window.api.onClaudeError((msg: string) => {
  aiRunning = false;
  const mr = reviewingMr;
  reviewingMr = null;
  rawOutput += `\n\n**Error:** ${msg}`;
  showToast(msg, 'err', 5000);
  if (!mr) return;

  if (activeMr?.id === mr.id && activePanelTab === 'ai') {
    const panel = document.getElementById('diffPanel')!;
    panel.innerHTML = renderPanelTabs(mr) + `
      <div class="ai-panel">
        <div class="ai-running-header">
          <div class="ai-status-dot error" style="flex-shrink:0"></div>
          <span style="color:var(--red);font-size:13px;">Review failed</span>
          <button class="ai-cancel-btn" id="aiBackAfterErr" style="margin-left:auto">← Back</button>
        </div>
        <div class="ai-output-area" style="flex:1">
          ${renderMarkdown(rawOutput)}
        </div>
      </div>`;
    bindPanelTabs(mr);
    document.getElementById('aiBackAfterErr')?.addEventListener('click', () => {
      aiView = 'history';
      renderAiHistory(mr, repoCache[mr.project_id] ?? null);
    });
  }
});

// ── Clone dialog ───────────────────────────────────────────────────────────

function showCloneDialog(repoUrl: string): void {
  document.getElementById('cloneCmd')!.textContent = `git clone ${repoUrl}`;
  document.getElementById('cloneOverlay')!.classList.remove('hidden');
}

// ── Sidebar tabs ───────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    activeTab = (btn as HTMLElement).dataset.tab as 'review' | 'mine';
    resetFilters();
    showReviewScreen();
    activeMr = null;
    rawOutput = '';
    aiRunning = false;
    document.getElementById('diffPanel')!.innerHTML = `
      <div class="diff-placeholder">
        <div class="diff-placeholder-icon">📋</div>
        <strong style="color:var(--text2);font-size:13px;">No MR selected</strong>
        <p>Click an MR card or "AI Review"<br>to get started.</p>
      </div>`;
    updateList();
  });
});

document.getElementById('settingsBtn')!.addEventListener('click', () => showSettingsScreen());

window.addEventListener('message', (event) => {
  if (event.data?.type === 'settings-close') showReviewScreen();
});

window.api.onShowSettings(() => showSettingsScreen());

document.getElementById('refreshBtn')!.addEventListener('click', async () => {
  const btn = document.getElementById('refreshBtn')!;
  btn.classList.add('spinning');
  setPollStatus('loading', 'Refreshing…');
  await window.api.forcePoll();
  setTimeout(() => btn.classList.remove('spinning'), 2000);
});

document.getElementById('minimizeBtn')!.addEventListener('click', () => window.api.minimizeWindow());
document.getElementById('closeBtn')!.addEventListener('click', () => window.api.closeWindow());

const sidebar = document.getElementById('sidebar')!;
if (localStorage.getItem('sidebarCollapsed') === 'true') sidebar.classList.add('collapsed');
document.getElementById('sidebarToggle')!.addEventListener('click', () => {
  const collapsed = sidebar.classList.toggle('collapsed');
  localStorage.setItem('sidebarCollapsed', String(collapsed));
});

document.getElementById('cloneClose')!.addEventListener('click', () =>
  document.getElementById('cloneOverlay')!.classList.add('hidden')
);
document.getElementById('cloneCopy')!.addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('cloneCmd')!.textContent ?? '');
  const btn = document.getElementById('cloneCopy')!;
  const orig = btn.textContent;
  btn.textContent = '✓ Copied!';
  setTimeout(() => { btn.textContent = orig; }, 1500);
});

// ── Init ───────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  const settings = await window.api.getSettings();
  aiReviewEnabled = settings.aiReviewEnabled ?? true;
  aiReviewProvider = settings.aiReviewProvider ?? 'claude';

  const { toReview, myMrs: mine, currentUserId: uid } = await window.api.getMrs();
  toReviewMrs = toReview;
  myMrs = mine;
  if (uid) currentUserId = uid;
  updateCounts();
  await prefetchRepoPaths([...toReview, ...mine]);
  updateList();
  firstLoad = false;

  const total = toReview.length + mine.length;
  setPollStatus('ok', total > 0 ? `${total} MR${total !== 1 ? 's' : ''} open` : 'All clear');
}

window.api.onMrsUpdated(async (data: any) => {
  const prevReviewFp = mrFingerprint(toReviewMrs);
  const prevMineFp   = mrFingerprint(myMrs);

  toReviewMrs = data.toReview;
  myMrs = data.myMrs;
  if (data.currentUserId) currentUserId = data.currentUserId;

  const listChanged =
    mrFingerprint(toReviewMrs) !== prevReviewFp ||
    mrFingerprint(myMrs)       !== prevMineFp;

  updateCounts();
  if (listChanged) {
    await prefetchRepoPaths([...data.toReview, ...data.myMrs]);
    updateList();
  }

  const total = data.toReview.length + data.myMrs.length;
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const el = document.getElementById('lastUpdated');
  if (el) el.textContent = now;
  setPollStatus('ok', total > 0 ? `${total} MR${total !== 1 ? 's' : ''} open` : 'All clear');
});

window.api.onSettingsUpdated((settings: any) => {
  aiReviewEnabled = settings.aiReviewEnabled ?? true;
  aiReviewProvider = settings.aiReviewProvider ?? 'claude';
  updateList();
  if (activeMr && activePanelTab === 'ai' && !aiRunning) {
    openAiPanel(activeMr);
  }
});

init();
