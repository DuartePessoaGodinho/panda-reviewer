import type { MR } from '../types';

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function isDraft(mr: MR): boolean {
  return mr.title?.startsWith('Draft:') || mr.title?.startsWith('WIP:') || mr.work_in_progress;
}

export function displayTitle(mr: MR): string {
  return mr.title.replace(/^(Draft:|WIP:)\s*/i, '');
}

export function projectName(mr: MR): string {
  const full = mr.references?.full ?? '';
  const match = full.match(/^(.+)!/);
  if (match) { const parts = match[1].split('/'); return parts[parts.length - 1]; }
  return `project ${mr.project_id}`;
}

export function projectUrl(mr: MR): string {
  return mr.web_url.replace(/\/-\/merge_requests.*/, '');
}

export function slugify(t: string): string {
  return t.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

export function extractCodexReview(output: string): string {
  if (!output.includes('OpenAI Codex')) return output;

  // Split on lone "codex" lines — each marks a new assistant turn in the session log
  const parts = output.split(/(?:^|\n)codex\n/);
  if (parts.length < 2) return output;

  // The last block is the final review; strip the trailing "tokens used" footer
  const last = parts[parts.length - 1]
    .replace(/\ntokens used[\s\S]*$/, '')
    .trim();

  return last || output;
}

export function renderMarkdown(text: string): string {
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
    .replace(/^- (.+)$/gm,  '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hup]|<li|<hr|<pre)(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
}
