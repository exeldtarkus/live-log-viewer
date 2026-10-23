import * as vscode from 'vscode';
import { statSync, unwatchFile, watchFile } from 'fs';
import { LogTail, levelOf, readGzipLines } from './log';
import { render } from './viewerHtml';
import { LogFile, fmtSize, renderFiles } from './filesHtml';

let log: vscode.LogOutputChannel;

export function activate(ctx: vscode.ExtensionContext) {
  log = vscode.window.createOutputChannel('Live Log Viewer', { log: true });
  ctx.subscriptions.push(
    log,
    vscode.window.registerCustomEditorProvider(
      'liveLogViewer.editor',
      { openCustomDocument: (uri) => ({ uri, dispose() {} }), resolveCustomEditor: (doc, panel) => open(doc.uri.fsPath, panel) },
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );
  setupLogList(ctx);
}

export function deactivate() {}

function open(path: string, panel: vscode.WebviewPanel) {
  panel.webview.options = { enableScripts: true };
  panel.webview.html = render(panel.webview.cspSource);

  if (path.endsWith('.gz')) return openGzip(path, panel);

  let tail: LogTail | undefined;
  const push = () => {
    if (!tail) return;
    try {
      const { reset, lines, open } = tail.read();
      if (reset || lines.length) panel.webview.postMessage({ reset, open, lines: lines.map((t) => [t, levelOf(t)]) });
    } catch (e) {
      log.error(`push - cannot read ${path}`, e);
    }
  };

  // watchFile (polling) dipakai karena fs.watch tidak andal di share /mnt (drvfs/cifs).
  watchFile(path, { interval: 500 }, push);
  panel.webview.onDidReceiveMessage((m) => {
    if (m !== 'ready') return;
    tail = new LogTail(path); // webview baru = mulai dari awal lagi
    push();
  });
  panel.onDidDispose(() => unwatchFile(path, push));
}

/** Arsip .gz tidak berubah lagi: dibaca sekali tanpa watch. */
function openGzip(path: string, panel: vscode.WebviewPanel) {
  panel.webview.onDidReceiveMessage(async (m) => {
    if (m !== 'ready') return;
    try {
      const lines = await readGzipLines(path);
      panel.webview.postMessage({ reset: true, open: false, lines: lines.map((t) => [t, levelOf(t)]) });
    } catch (e) {
      log.error(`openGzip - cannot read ${path}`, e);
      vscode.window.showErrorMessage(`Live Log Viewer: cannot read ${path}: ${e instanceof Error ? e.message : e}`);
    }
  });
}

// --- Status bar "Logs: N" + daftar semua file log di workspace
const LOG_GLOB = '**/*.{log,log.gz}';
const FULL_VIEW_FROM = 10; // lebih dari ini langsung buka tampilan penuh, bukan QuickPick
let status: vscode.StatusBarItem;
let filesPanel: vscode.WebviewPanel | undefined;
let found = new Map<string, vscode.Uri>(); // path relatif -> uri

function setupLogList(ctx: vscode.ExtensionContext) {
  status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  status.command = 'liveLogViewer.showLogs';
  const watcher = vscode.workspace.createFileSystemWatcher(LOG_GLOB, false, true, false);
  let timer: NodeJS.Timeout | undefined;
  const later = () => { clearTimeout(timer); timer = setTimeout(scan, 500); }; // rotasi log bisa memicu banyak event sekaligus
  ctx.subscriptions.push(
    status,
    watcher,
    watcher.onDidCreate(later),
    watcher.onDidDelete(later),
    vscode.workspace.onDidChangeWorkspaceFolders(later),
    vscode.commands.registerCommand('liveLogViewer.showLogs', showLogs),
    vscode.commands.registerCommand('liveLogViewer.showLogsFull', async () => { await scan(); showFull(); }),
  );
  scan();
}

async function scan() {
  try {
    const uris = await vscode.workspace.findFiles(LOG_GLOB, '**/node_modules/**', 5000);
    found = new Map(uris.map((u) => [vscode.workspace.asRelativePath(u, (vscode.workspace.workspaceFolders?.length ?? 0) > 1), u]));
  } catch (e) {
    log.error('scan - cannot search workspace for log files', e);
  }
  status.text = `$(output) Logs: ${found.size}`;
  status.tooltip = 'Log files in this workspace (.log, .log.gz). Click to open one.';
  found.size ? status.show() : status.hide();
  if (filesPanel) filesPanel.webview.html = renderFiles(fileInfos(), filesPanel.webview.cspSource);
}

function fileInfos(): LogFile[] {
  return [...found].map(([rel, u]) => {
    try {
      const st = statSync(u.fsPath);
      return { rel, size: st.size, mtime: st.mtimeMs };
    } catch (e) {
      log.error(`fileInfos - cannot stat ${u.fsPath}`, e); // file bisa terhapus di antara scan & stat
      return { rel, size: 0, mtime: 0 };
    }
  });
}

const openLog = (rel: string) => {
  const uri = found.get(rel);
  if (uri) vscode.commands.executeCommand('vscode.openWith', uri, 'liveLogViewer.editor');
};

async function showLogs() {
  await scan();
  if (found.size > FULL_VIEW_FROM) return showFull();
  const full = { label: '$(list-tree) Open full view…', rel: '' };
  const items = fileInfos()
    .sort((a, b) => b.mtime - a.mtime)
    .map((f) => ({
      label: `$(file) ${f.rel.slice(f.rel.lastIndexOf('/') + 1)}`,
      description: f.rel.includes('/') ? f.rel.slice(0, f.rel.lastIndexOf('/')) : '',
      detail: `${fmtSize(f.size)} · ${new Date(f.mtime).toLocaleString()}`,
      rel: f.rel,
    }));
  const pick = await vscode.window.showQuickPick([full, ...items], { placeHolder: 'Open a log file', matchOnDescription: true });
  if (pick === full) showFull();
  else if (pick) openLog(pick.rel);
}

function showFull() {
  if (filesPanel) return filesPanel.reveal();
  filesPanel = vscode.window.createWebviewPanel('liveLogViewer.files', 'Log Files', vscode.ViewColumn.Active, { enableScripts: true });
  filesPanel.webview.html = renderFiles(fileInfos(), filesPanel.webview.cspSource);
  filesPanel.webview.onDidReceiveMessage((m) => (m.open ? openLog(m.open) : m.refresh && scan()));
  filesPanel.onDidDispose(() => { filesPanel = undefined; });
}
