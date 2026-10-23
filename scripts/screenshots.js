// Regenerate the README screenshots by rendering the webview HTML in headless Chromium.
// run: npm run compile && node scripts/screenshots.js   (playwright-core: env PW, global npm, or newest npx cache)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'images', 'screenshots');
const { render } = require(path.join(root, 'out', 'viewerHtml'));
const { renderFiles } = require(path.join(root, 'out', 'filesHtml'));
const { levelOf, readGzipLines } = require(path.join(root, 'out', 'log'));

function findPlaywright() {
  if (process.env.PW) return process.env.PW;
  const npmRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
  for (const d of [path.join(npmRoot, 'playwright-core'), path.join(npmRoot, 'playwright', 'node_modules', 'playwright-core')]) {
    if (fs.existsSync(d)) return d;
  }
  const npx = path.join(process.env.HOME, '.npm', '_npx');
  const found = fs.existsSync(npx) ? fs.readdirSync(npx).map((d) => path.join(npx, d, 'node_modules', 'playwright-core'))
    .filter((d) => fs.existsSync(d)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs) : [];
  if (!found.length) throw new Error('playwright-core not found: set PW=<path> or run `npx playwright install chromium`');
  return found[0];
}

// Hostnames / package names of the real logs must not show up in the screenshots:
// MASK_WORDS="word1,word2" node scripts/screenshots.js  -> each word (case-insensitive) becomes "examplehost".
const maskRe = (process.env.MASK_WORDS ?? '').split(',').map((w) => w.trim()).filter(Boolean)
  .map((w) => new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
const mask = (s) => maskRe.reduce((t, re) => t.replace(re, 'examplehost'), s);
const logPath = (f) => path.join(root, 'logs', f);
const readLines = (f) => fs.readFileSync(logPath(f), 'utf8').split(/\r?\n/).filter((l, i, a) => l || i < a.length - 1);

// VS Code Dark+ theme variables
const THEME = `:root{--vscode-editor-background:#1e1e1e;--vscode-editor-foreground:#d4d4d4;
--vscode-editor-font-family:'Consolas','DejaVu Sans Mono','Courier New',monospace;--vscode-editor-font-size:13px;
--vscode-font-family:'Segoe UI','DejaVu Sans',sans-serif;--vscode-editorLineNumber-foreground:#858585;--vscode-panel-border:#3c3c3c;
--vscode-input-background:#3c3c3c;--vscode-input-foreground:#cccccc;--vscode-input-border:#3c3c3c;--vscode-button-background:#0e639c;
--vscode-button-foreground:#fff;--vscode-badge-background:#0e639c;--vscode-badge-foreground:#fff;--vscode-list-hoverBackground:#2a2d2e;
--vscode-descriptionForeground:#9d9d9d;--vscode-disabledForeground:#6b6b6b;--vscode-terminal-ansiBrightBlue:#3b8eea;
--vscode-terminal-ansiBlue:#2472c8;--vscode-terminal-ansiYellow:#d7ba7d;--vscode-terminal-ansiRed:#f14c4c;--vscode-terminal-ansiMagenta:#d670d6;
--vscode-editor-findMatchHighlightBackground:rgba(234,92,0,.33);--vscode-editorWidget-background:#252526;--vscode-editorWidget-border:#454545;
--vscode-inputValidation-errorBorder:#be1100;font-family:var(--vscode-font-family);font-size:13px}`;

const prepare = (html) => html
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '')
  .replace('const vscode = acquireVsCodeApi();', 'const vscode = { postMessage() {} };')
  .replace('<style>', '<style>' + THEME);

(async () => {
  const { chromium } = require(findPlaywright());
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    const shot = async (page, name, clip) => {
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(outDir, name), clip });
      console.log('wrote images/screenshots/' + name);
    };
    const viewer = async (lines, { w = 1280, h = 720 } = {}) => {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.setContent(prepare(render('csp')));
      const data = lines.map(mask).map((t) => [t, levelOf(t)]);
      await page.evaluate((d) => window.postMessage({ reset: true, open: false, lines: d }, '*'), data);
      await page.waitForFunction(() => document.getElementById('count').textContent !== '');
      return page;
    };
    const set = (page, sel, value, ev) => page.evaluate(([s, v, e]) => {
      const el = document.querySelector(s);
      if (typeof v === 'boolean') el.checked = v; else el.value = v;
      el.dispatchEvent(new Event(e, { bubbles: true }));
    }, [sel, value, ev]);
    const scrollTo = (page, top) => page.evaluate((t) => { document.getElementById('out').scrollTop = t; }, top);

    // 1. hero: Raw mode with level colors and stack traces, following the end of the file
    let page = await viewer(readLines('example-springboot.log'));
    await shot(page, 'raw.png');
    await page.close();

    // 2. Raw mode filtered: regex + level ERROR (stack traces inherit ERROR), Live paused
    page = await viewer(readLines('example-springboot.log'));
    await set(page, '#live', false, 'change');
    await set(page, '#lv', 'ERROR', 'change');
    await set(page, '#re', true, 'change');
    await set(page, '#q', 'Failed to|Exception', 'input');
    await page.waitForTimeout(300);
    await scrollTo(page, 0);
    await shot(page, 'raw-filter.png', { x: 0, y: 0, width: 1280, height: 420 });
    await page.close();

    // 3. Table mode on a JSON log, with extra columns from the field sidebar
    const bima = readLines('bima.log');
    page = await viewer(bima);
    await set(page, '#live', false, 'change');
    await page.click('#mTable');
    await page.click('aside input[data-k="thread"]');
    await page.click('aside input[data-k="className"]');
    await scrollTo(page, 0);
    await shot(page, 'table.png');

    // 4. expanded row (pretty JSON)
    await page.click('tr.doc[data-n="3"] td.num');
    await shot(page, 'table-expand.png', { x: 0, y: 0, width: 1280, height: 460 });
    await page.click('tr.doc[data-n="3"] td.num');
    await page.close();

    // 5. ⊕ / ⊖ on a cell, filter pills and highlighted matches
    page = await viewer(bima);
    await set(page, '#live', false, 'change');
    await page.click('#mTable');
    await page.click('aside input[data-k="thread"]');
    await scrollTo(page, 0);
    await page.hover('tr.doc[data-n="1"] td[data-k="level"]');
    await page.click('#act [data-f="+"]');
    await page.hover('tr.doc td[data-k="thread"]');
    await page.click('#act [data-f="-"]');
    await scrollTo(page, 0);
    await page.hover('tr.doc td[data-k="level"]');
    await shot(page, 'table-pills.png', { x: 0, y: 0, width: 1280, height: 420 });
    await page.close();

    // 6. "+ Add filter" popup: field + "is one of" + value list
    page = await viewer(bima);
    await set(page, '#live', false, 'change');
    await page.click('#mTable');
    await page.click('#addBtn');
    await set(page, '#fk', 'level', 'change');
    await page.click('#fvals input[data-v="ERROR"]');
    await page.click('#fvals input[data-v="WARN"]');
    await shot(page, 'add-filter.png', { x: 0, y: 0, width: 1280, height: 420 });
    await page.click('#fsave');
    await scrollTo(page, 0);
    await page.mouse.move(640, 5);
    await shot(page, 'add-filter-result.png', { x: 0, y: 0, width: 1280, height: 360 });
    await page.close();

    // 7. .log.gz opened directly (decompressed in memory)
    const gz = await readGzipLines(logPath('bima-bjb1-2026-10-19-1.log.gz'));
    page = await viewer(gz);
    await set(page, '#live', false, 'change');
    await page.click('#mTable');
    await set(page, '#lv', 'ERROR', 'change');
    await scrollTo(page, 0);
    await shot(page, 'gz.png', { x: 0, y: 0, width: 1280, height: 420 });
    await page.close();

    // 8. "Log Files" full view: the real logs/ files plus fictional ones to show grouping per folder
    const files = fs.readdirSync(path.join(root, 'logs')).filter((f) => /\.log(\.gz)?$/.test(f)).map((f) => {
      const st = fs.statSync(logPath(f));
      return { rel: mask('logs/' + f), size: st.size, mtime: st.mtimeMs };
    });
    for (let d = 1; d <= 4; d++) {
      files.push({ rel: `services/report-service/logs/report-2026-10-0${d}.log.gz`, size: 180000 + d * 23417, mtime: Date.UTC(2026, 9, d, 23, 59) });
    }
    files.push({ rel: 'services/report-service/logs/report.log', size: 734003, mtime: Date.UTC(2026, 9, 23, 8, 15) });
    page = await browser.newPage({ viewport: { width: 1000, height: 480 } });
    await page.setContent(prepare(renderFiles(files, 'csp')));
    await page.mouse.move(0, 0);
    await shot(page, 'log-files.png');
    await page.close();
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error('screenshots - failed:', e.stack || e);
  process.exitCode = 1;
});
