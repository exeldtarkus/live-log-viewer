import { randomBytes } from 'crypto';
import { LEVELS } from './log';

export function render(cspSource: string): string {
  const nonce = randomBytes(16).toString('base64');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  body { margin: 0; padding: 0; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
  .head { position: sticky; top: 0; z-index: 2; background: var(--vscode-editor-background); }
  .bar { display: flex; gap: 8px; align-items: center; padding: 8px 12px;
    background: var(--vscode-editor-background); border-bottom: 1px solid var(--vscode-panel-border); }
  .bar input[type=text] { flex: 1; min-width: 0; }
  input[type=text], select { padding: 4px 8px; color: var(--vscode-input-foreground); background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, transparent); border-radius: 2px; font: inherit; }
  input.bad { border-color: var(--vscode-inputValidation-errorBorder); }
  label { display: flex; gap: 4px; align-items: center; white-space: nowrap; font-family: var(--vscode-editor-font-family); }
  #count { opacity: .7; white-space: nowrap; }
  #out { font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size); line-height: 1.6; padding-bottom: 8px; }
  .ln { white-space: pre; width: max-content; min-width: 100%; box-sizing: border-box; padding-right: 12px; cursor: default; }
  .ln:hover { background: var(--vscode-editor-lineHighlightBackground, rgba(128,128,128,.1)); }
  .ln.wrap { width: auto; white-space: pre-wrap; word-break: break-all; }
  .ln .n { position: sticky; left: 0; background: var(--vscode-editor-background); }
  .n { display: inline-block; width: 6ch; margin-right: 2ch; text-align: right; color: var(--vscode-editorLineNumber-foreground); user-select: none; }
  .mode button { padding: 4px 10px; border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); background: transparent; color: inherit; font: inherit; cursor: pointer; }
  .mode button:first-child { border-radius: 2px 0 0 2px; } .mode button:last-child { border-radius: 0 2px 2px 0; border-left: 0; }
  .mode button.on { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .mode button:disabled { opacity: .4; cursor: not-allowed; }
  .main { display: flex; align-items: flex-start; }
  #out { flex: 1; min-width: 0; }
  /* #out jadi area scroll sendiri (vertikal + horizontal), toolbar & panel field tetap di tempat */
  #out { height: calc(100vh - var(--top, 45px)); box-sizing: border-box; overflow: auto; }
  aside { display: none; position: sticky; top: var(--top, 45px); width: 220px; flex: none; max-height: calc(100vh - var(--top, 45px)); box-sizing: border-box; overflow: auto;
    border-right: 1px solid var(--vscode-panel-border); padding: 8px 0; }
  .table aside { display: block; }
  aside h4 { display: flex; align-items: center; margin: 4px 12px; font-size: 11px; text-transform: uppercase; opacity: .7; }
  aside h4 button { margin-left: auto; padding: 0 6px; border: 1px solid var(--vscode-panel-border); border-radius: 2px;
    background: transparent; color: inherit; font: inherit; text-transform: none; cursor: pointer; }
  aside label { padding: 2px 12px; font-family: inherit; cursor: pointer; }
  aside label:hover { background: var(--vscode-list-hoverBackground); }
  aside .c { margin-left: auto; opacity: .6; font-size: 11px; }
  table { border-collapse: collapse; width: 100%; }
  th { position: sticky; top: 0; z-index: 1; box-shadow: inset 0 -1px var(--vscode-panel-border); text-align: left; padding: 4px 8px; background: var(--vscode-editor-background); border-bottom: 1px solid var(--vscode-panel-border); white-space: nowrap; }
  td { vertical-align: top; padding: 4px 8px; border-bottom: 1px solid var(--vscode-panel-border); color: var(--vscode-editor-foreground); }
  td.lv, td.num { color: inherit; } td.num { width: 1%; }
  td > div { white-space: nowrap; max-width: 40ch; overflow: hidden; text-overflow: ellipsis; }
  td.msg > div, td.raw > div { white-space: pre-wrap; word-break: break-word; min-width: 40ch; max-width: 80ch; max-height: 4.8em; }
  td.raw > div { max-width: none; }
  tr.doc { cursor: pointer; } tr.doc:hover { background: var(--vscode-list-hoverBackground); }
  tr.detail pre { margin: 0; white-space: pre-wrap; word-break: break-word; color: var(--vscode-editor-foreground); }
  #addBtn, #resetBtn { padding: 4px 10px; border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); border-radius: 2px;
    background: transparent; color: inherit; font: inherit; cursor: pointer; white-space: nowrap; }
  .pop { position: absolute; left: 12px; top: 100%; z-index: 3; width: 420px; display: flex; flex-direction: column; gap: 6px; padding: 10px;
    background: var(--vscode-editorWidget-background, var(--vscode-editor-background)); border: 1px solid var(--vscode-editorWidget-border, var(--vscode-panel-border));
    box-shadow: 0 4px 12px rgba(0,0,0,.35); }
  .pop[hidden] { display: none; }
  .pop .row2 { display: flex; gap: 6px; } .pop .row2 select { flex: 1; min-width: 0; }
  #fvals { max-height: 240px; overflow: auto; border: 1px solid var(--vscode-panel-border); }
  #fvals label { padding: 2px 6px; font-family: var(--vscode-editor-font-family); }
  #fvals label[hidden] { display: none; }
  #fvals .c { margin-left: auto; opacity: .6; font-size: 11px; }
  .pop .btns { display: flex; justify-content: flex-end; gap: 6px; }
  .pop .btns button { padding: 4px 12px; border: 1px solid var(--vscode-panel-border); border-radius: 2px; background: transparent; color: inherit; font: inherit; cursor: pointer; }
  .pop .btns button.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-color: transparent; }
  .pop .btns button:disabled { opacity: .5; cursor: not-allowed; }
  #pills { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px; }
  #pills:not(:empty) { padding: 6px 12px; border-bottom: 1px solid var(--vscode-panel-border); }
  .pill { display: flex; align-items: center; gap: 6px; padding: 2px 4px 2px 8px; border-radius: 3px; cursor: pointer;
    background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); font-family: var(--vscode-editor-font-family); }
  .pill.neg { text-decoration: line-through; opacity: .85; }
  .pill.neg::before { content: 'NOT'; font-weight: bold; text-decoration: none; }
  .pill .pt { max-width: 60ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pill button { border: 0; background: transparent; color: inherit; cursor: pointer; padding: 0 4px; }
  td[data-k] { position: relative; }
  td.hit > div { background: var(--vscode-editor-findMatchHighlightBackground, rgba(234,92,0,.33)); }
  #act { display: none; position: absolute; top: 2px; right: 2px; gap: 2px; }
  td:hover > #act { display: flex; }
  #act button { padding: 0 5px; border: 1px solid var(--vscode-panel-border); border-radius: 2px; cursor: pointer;
    background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
  .LFATAL { color: var(--vscode-terminal-ansiMagenta); font-weight: bold; }
  .LERROR { color: var(--vscode-terminal-ansiRed); }
  .LWARN { color: var(--vscode-terminal-ansiYellow); }
  .LINFO { color: var(--vscode-terminal-ansiBrightBlue, var(--vscode-terminal-ansiBlue)); }
  .LDEBUG { color: var(--vscode-descriptionForeground); }
  .LTRACE { color: var(--vscode-disabledForeground); }
</style>
</head>
<body>
<div class="head" id="head"><div class="bar">
  <span class="mode"><button id="mRaw" class="on" title="Raw log lines">Raw</button><button id="mTable" disabled title="Only for JSON logs">Table</button></span>
  <input id="q" type="text" placeholder="Filter by text…" aria-label="Filter by text">
  <button id="addBtn" hidden title="Filter by field values">+ Add filter</button>
  <button id="resetBtn" hidden title="Remove all filters: field filters, text, regex and level">Reset filters</button>
  <label title="Regular expression"><input id="re" type="checkbox">.*</label>
  <select id="lv" aria-label="Level"><option value="">All levels</option>${LEVELS.map((l) => `<option>${l}</option>`).join('')}</select>
  <label title="Show new lines as they arrive and follow the end; uncheck to pause the view"><input id="live" type="checkbox" checked>Live</label>
  <span id="count"></span>
</div>
<div id="addf" class="pop" hidden>
  <div class="row2"><select id="fk" aria-label="Field"></select>
    <select id="fop" aria-label="Operator"><option value="">is one of</option><option value="neg">is not one of</option></select></div>
  <input id="fq" type="text" placeholder="Search values…" aria-label="Search values">
  <div id="fvals"></div>
  <div class="btns"><button id="fcancel">Cancel</button><button id="fsave" class="primary" disabled>Add filter</button></div>
</div>
<div id="pills"></div></div>
<div class="main"><aside id="fields"></aside><div id="out"></div></div>
<span id="act"><button data-f="+" title="Filter for value">⊕</button><button data-f="-" title="Filter out value">⊖</button></span>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  // shortcut: hanya 100k baris terakhir disimpan & dirender tanpa virtual scroll; tambah virtual scroll bila terasa berat.
  const MAX = 100000;
  const $ = (id) => document.getElementById(id);
  const q = $('q'), re = $('re'), lv = $('lv'), live = $('live'), out = $('out'), count = $('count'), aside = $('fields');
  const mRaw = $('mRaw'), mTable = $('mTable');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const LEVEL_KEYS = ['level', 'severity', 'log.level'], MSG_KEYS = ['message', 'msg'];
  let all = [], n = 0, lastOpen = false, shown = 0, stale = false, match = () => true;
  let mode = 'raw', jsonCount = 0, cols = null, pills = []; // pills: [{ k, vs: [nilai...], neg }]
  const act = $('act'), pillsEl = $('pills'), head = $('head'), addBtn = $('addBtn'), resetBtn = $('resetBtn'), addf = $('addf');
  const fk = $('fk'), fop = $('fop'), fq = $('fq'), fvals = $('fvals'), fsave = $('fsave');
  const MAX_VALUES = 500;
  const fields = new Map(); // nama field -> jumlah dokumen yang punya field itu

  const parse = (t) => {
    if (t[0] !== '{') return undefined;
    try { const j = JSON.parse(t); return j && typeof j === 'object' && !Array.isArray(j) ? j : undefined; } catch { return undefined; }
  };
  // shortcut: hanya field level teratas; objek bersarang ditampilkan sebagai JSON di sel.
  const cell = (v) => v === undefined || v === null ? '-' : typeof v === 'object' ? JSON.stringify(v) : v;
  const isJsonLog = () => jsonCount > 0 && jsonCount * 2 >= all.length;
  function defaultCols() {
    const pick = (ks) => ks.find((k) => fields.has(k));
    return [pick(['@timestamp', 'timestamp', 'time', 'ts', 'date']), pick(LEVEL_KEYS), pick(MSG_KEYS)].filter(Boolean);
  }
  const row = (e) => mode === 'raw'
    ? '<div class="ln L' + e.l + '"><span class="n">' + e.n + '</span>' + esc(e.t) + '</div>'
    : '<tr class="doc L' + e.l + '" data-n="' + e.n + '"><td class="num">' + e.n + '</td>' + (e.j
      ? cols.map((k) => '<td data-k="' + esc(k) + '" class="' + (LEVEL_KEYS.includes(k) ? 'lv' : MSG_KEYS.includes(k) ? 'msg' : '')
        + (pills.some((p) => !p.neg && p.k === k && p.vs.includes(String(cell(e.j[k])))) ? ' hit' : '') + '"><div>' + esc(cell(e.j[k])) + '</div></td>').join('')
      : '<td class="raw" colspan="' + cols.length + '"><div>' + esc(e.t) + '</div></td>') + '</tr>';
  const target = () => mode === 'raw' ? out : out.querySelector('tbody');

  function renderFields() {
    const sorted = [...fields].sort((a, b) => a[0].localeCompare(b[0]));
    const item = ([k, c]) => '<label><input type="checkbox" data-k="' + esc(k) + '"' + (cols.includes(k) ? ' checked' : '') + '>'
      + esc(k) + '<span class="c">' + c + '</span></label>';
    aside.innerHTML = '<h4>Selected fields<button data-reset title="Back to default columns">Reset</button></h4>' + sorted.filter(([k]) => cols.includes(k)).map(item).join('')
      + '<h4>Available fields</h4>' + sorted.filter(([k]) => !cols.includes(k)).map(item).join('');
  }
  function renderPills() {
    pillsEl.innerHTML = pills.map((p, i) => {
      const text = (p.neg ? 'NOT ' : '') + p.k + ': ' + (p.vs.length > 1 ? 'is one of ' : '') + p.vs.join(', ');
      return '<span class="pill' + (p.neg ? ' neg' : '') + '" data-i="' + i + '" title="' + esc(text) + '\\n(click to include/exclude)">'
        + '<span class="pt">' + esc(p.k) + ': ' + (p.vs.length > 1 ? 'is one of ' : '') + esc(p.vs.join(', ')) + '</span>'
        + '<button data-x="' + i + '" title="Remove filter">×</button></span>';
    }).join('');
    document.body.style.setProperty('--top', head.offsetHeight + 'px');
  }
  function addPill(k, vs, neg) {
    const same = (p) => p.k === k && p.vs.length === vs.length && p.vs.every((v) => vs.includes(v));
    pills = pills.filter((p) => !same(p)).concat({ k, vs, neg });
    renderPills(); renderAll();
  }
  function setMode(m) {
    mode = m;
    mRaw.classList.toggle('on', m === 'raw'); mTable.classList.toggle('on', m === 'table');
    document.body.classList.toggle('table', m === 'table');
    if (m === 'table') { cols ??= defaultCols(); renderFields(); }
    renderAll();
  }

  function compile() {
    const text = q.value, level = lv.value;
    let test = () => true;
    q.classList.remove('bad');
    if (text && re.checked) {
      try { const r = new RegExp(text, 'i'); test = (s) => r.test(s); } catch { q.classList.add('bad'); }
    } else if (text) {
      const t = text.toLowerCase(); test = (s) => s.toLowerCase().includes(t);
    }
    match = (e) => (!level || e.l === level) && test(e.t) && pills.every((p) => {
      const d = e.j ?? e.p;
      return (d !== undefined && p.vs.includes(String(cell(d[p.k])))) !== p.neg;
    });
  }
  const stick = () => {
    if (!live.checked) return;
    out.scrollTop = out.scrollHeight;
  };
  const status = () => { count.textContent = shown + ' / ' + all.length; };
  function renderAll() {
    compile();
    const rows = all.filter(match);
    shown = rows.length;
    out.innerHTML = mode === 'raw' ? rows.map(row).join('')
      : '<table><thead><tr><th>#</th>' + cols.map((k) => '<th>' + esc(k) + '</th>').join('') + '</tr></thead><tbody>'
        + rows.map(row).join('') + '</tbody></table>';
    stale = false;
    status(); stick();
  }

  window.addEventListener('message', ({ data: m }) => {
    let full = m.reset;
    if (m.reset) { all = []; n = 0; jsonCount = 0; fields.clear(); }
    else if (lastOpen) { const e = all.pop(); n--; full = true; forget(e); } // baris terakhir sebelumnya belum lengkap, ganti dengan versi baru
    const added = [];
    let newField = false;
    for (const [t, l] of m.lines) {
      // baris tanpa level (stack trace, lanjutan pesan) ikut level baris sebelumnya
      const prev = added.at(-1) ?? all.at(-1);
      const e = { t, l: l || prev?.l || '', n: ++n, j: parse(t) };
      if (!e.j) e.p = prev?.j ?? prev?.p; // stack trace dll. ikut dokumen JSON di atasnya untuk filter field
      if (e.j) { jsonCount++; for (const k in e.j) { if (!fields.has(k)) newField = true; fields.set(k, (fields.get(k) ?? 0) + 1); } }
      added.push(e);
    }
    all.push(...added);
    lastOpen = m.open;
    if (all.length > MAX) { all.splice(0, all.length - MAX).forEach(forget); full = true; }
    mTable.disabled = !isJsonLog();
    addBtn.hidden = resetBtn.hidden = mTable.disabled;
    if (mode === 'table' && mTable.disabled) return setMode('raw');
    if (mode === 'table' && newField) renderFields();
    if (!live.checked) { stale = true; return status(); } // dijeda: baris tetap dikumpulkan, tampil saat Live dicentang lagi
    if (full || stale) return renderAll();
    const rows = added.filter(match);
    shown += rows.length;
    target().insertAdjacentHTML('beforeend', rows.map(row).join(''));
    status(); stick();
  });

  let timer;
  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(renderAll, 150); });
  re.addEventListener('change', renderAll);
  lv.addEventListener('change', renderAll);
  live.addEventListener('change', () => (live.checked && stale ? renderAll() : stick()));
  function forget(e) {
    if (!e?.j) return;
    jsonCount--;
    for (const k in e.j) { const c = fields.get(k) - 1; c ? fields.set(k, c) : fields.delete(k); }
  }
  out.addEventListener('click', (ev) => {
    if (getSelection().toString()) return;
    if (mode === 'raw') return ev.target.closest('.ln')?.classList.toggle('wrap');
    const tr = ev.target.closest('tr.doc');
    if (!tr) return;
    if (tr.nextElementSibling?.classList.contains('detail')) return tr.nextElementSibling.remove();
    const e = all.find((x) => x.n === +tr.dataset.n);
    tr.insertAdjacentHTML('afterend', '<tr class="detail"><td></td><td colspan="' + cols.length + '"><pre>'
      + esc(e.j ? JSON.stringify(e.j, null, 2) : e.t) + '</pre></td></tr>');
  });
  aside.addEventListener('click', (ev) => {
    if (!ev.target.closest('[data-reset]')) return;
    cols = defaultCols();
    renderFields(); renderAll();
  });
  resetBtn.addEventListener('click', () => {
    pills = []; q.value = ''; re.checked = false; lv.value = ''; addf.hidden = true;
    renderPills(); renderAll();
  });
  aside.addEventListener('change', (ev) => {
    const k = ev.target.dataset.k;
    cols = ev.target.checked ? [...cols, k] : cols.filter((c) => c !== k);
    renderFields(); renderAll();
  });
  out.addEventListener('mouseover', (ev) => {
    const td = ev.target.closest('td[data-k]');
    if (td && act.parentNode !== td) td.appendChild(act);
  });
  act.addEventListener('click', (ev) => {
    const f = ev.target.dataset.f, td = act.parentNode, tr = td?.closest?.('tr.doc');
    if (!f || !tr) return;
    ev.stopPropagation();
    const e = all.find((x) => x.n === +tr.dataset.n), d = e.j ?? e.p;
    if (d) addPill(td.dataset.k, [String(cell(d[td.dataset.k]))], f === '-');
  });
  pillsEl.addEventListener('click', (ev) => {
    const x = ev.target.dataset.x, pill = ev.target.closest('.pill');
    if (x !== undefined) pills.splice(+x, 1);
    else if (pill) pills[+pill.dataset.i].neg = !pills[+pill.dataset.i].neg;
    else return;
    renderPills(); renderAll();
  });
  // --- popup "Add filter": field + is (not) one of + daftar nilai yang ada di log
  function fillValues() {
    const counts = new Map();
    for (const e of all) if (e.j) { const v = String(cell(e.j[fk.value])); counts.set(v, (counts.get(v) ?? 0) + 1); }
    const top = [...counts].sort((a, b) => b[1] - a[1]);
    fvals.innerHTML = top.slice(0, MAX_VALUES).map(([v, c]) => '<label><input type="checkbox" data-v="' + esc(v) + '">' + esc(v)
      + '<span class="c">' + c + '</span></label>').join('')
      + (top.length > MAX_VALUES ? '<label>… ' + (top.length - MAX_VALUES) + ' more, use search / ⊕</label>' : '');
    fq.value = ''; fsave.disabled = true;
  }
  addBtn.addEventListener('click', () => {
    if (!addf.hidden) return (addf.hidden = true);
    const keys = [...fields.keys()].sort();
    fk.innerHTML = keys.map((k) => '<option value="' + esc(k) + '">' + esc(k) + '</option>').join('');
    if (keys.includes(fk.dataset.last)) fk.value = fk.dataset.last;
    addf.hidden = false; fillValues(); fq.focus();
  });
  fk.addEventListener('change', () => { fk.dataset.last = fk.value; fillValues(); });
  fq.addEventListener('input', () => {
    const t = fq.value.toLowerCase();
    for (const l of fvals.children) l.hidden = !l.textContent.toLowerCase().includes(t);
  });
  fvals.addEventListener('change', () => { fsave.disabled = !fvals.querySelector('input:checked'); });
  $('fcancel').addEventListener('click', () => { addf.hidden = true; });
  fsave.addEventListener('click', () => {
    const vs = [...fvals.querySelectorAll('input:checked')].map((i) => i.dataset.v);
    addf.hidden = true;
    addPill(fk.value, vs, fop.value === 'neg');
  });
  mRaw.addEventListener('click', () => setMode('raw'));
  mTable.addEventListener('click', () => setMode('table'));
  renderPills(); // set --top awal
  window.addEventListener('resize', renderPills);
  vscode.postMessage('ready');
</script>
</body>
</html>`;
}
