import { randomBytes } from 'crypto';

export interface LogFile {
  /** Path relatif terhadap workspace, dengan '/' */
  rel: string;
  size: number;
  mtime: number;
}

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const fmtSize = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`;

const dirOf = (rel: string) => (rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '.');
const nameOf = (rel: string) => rel.slice(rel.lastIndexOf('/') + 1);

/** Halaman penuh: semua file log dikelompokkan per folder, klik untuk membuka. */
export function renderFiles(files: LogFile[], cspSource: string): string {
  const nonce = randomBytes(16).toString('base64');
  const groups = new Map<string, LogFile[]>();
  for (const f of [...files].sort((a, b) => a.rel.localeCompare(b.rel))) {
    const d = dirOf(f.rel);
    groups.set(d, [...(groups.get(d) ?? []), f]);
  }
  const body = [...groups]
    .map(([dir, fs]) => `<section>
  <h3>${esc(dir)}<span class="c">${fs.length}</span></h3>
  ${fs.map((f) => `<button class="f" data-rel="${esc(f.rel)}" title="${esc(f.rel)}">
    <span class="name">${esc(nameOf(f.rel))}</span><span class="size">${fmtSize(f.size)}</span>
    <span class="time">${new Date(f.mtime).toLocaleString()}</span></button>`).join('\n  ')}
</section>`)
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  body { margin: 0; padding: 12px 16px; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); font-family: var(--vscode-font-family); }
  .top { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
  .top input { flex: 1; padding: 4px 8px; color: var(--vscode-input-foreground); background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, transparent); border-radius: 2px; font: inherit; }
  .top button { padding: 4px 10px; border: 1px solid var(--vscode-panel-border); border-radius: 2px; background: transparent; color: inherit; font: inherit; cursor: pointer; }
  #count { opacity: .7; white-space: nowrap; }
  h3 { display: flex; align-items: center; gap: 8px; margin: 14px 0 4px; font-size: 12px; font-family: var(--vscode-editor-font-family);
    color: var(--vscode-descriptionForeground); }
  h3 .c, .size, .time { opacity: .7; font-size: 11px; }
  .f { display: flex; gap: 16px; width: 100%; padding: 4px 8px; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  .f:hover, .f:focus { background: var(--vscode-list-hoverBackground); outline: none; }
  .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--vscode-editor-font-family); }
  .size { width: 8ch; text-align: right; } .time { width: 22ch; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<div class="top">
  <input id="q" type="text" placeholder="Search log files…" aria-label="Search log files">
  <span id="count">${files.length} files</span>
  <button id="refresh" title="Scan the workspace again">Refresh</button>
</div>
${body || '<p>No .log / .log.gz files in this workspace.</p>'}
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const q = document.getElementById('q'), count = document.getElementById('count');
  q.addEventListener('input', () => {
    const t = q.value.toLowerCase();
    let n = 0;
    for (const s of document.querySelectorAll('section')) {
      let any = false;
      for (const f of s.querySelectorAll('.f')) { const hit = f.dataset.rel.toLowerCase().includes(t); f.hidden = !hit; any ||= hit; n += hit; }
      s.hidden = !any;
    }
    count.textContent = n + ' files';
  });
  document.body.addEventListener('click', (e) => {
    const f = e.target.closest('.f');
    if (f) vscode.postMessage({ open: f.dataset.rel });
    if (e.target.id === 'refresh') vscode.postMessage({ refresh: true });
  });
  q.focus();
</script>
</body>
</html>`;
}
