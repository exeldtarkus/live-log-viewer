import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { fmtSize, renderFiles } from '../filesHtml';

test('renderFiles groups by folder and escapes paths', () => {
  const html = renderFiles([
    { rel: 'logs/b.log.gz', size: 2048, mtime: 0 },
    { rel: 'logs/a.log', size: 10, mtime: 0 },
    { rel: 'x<y>/c"d.log', size: 0, mtime: 0 },
    { rel: 'root.log', size: 0, mtime: 0 },
  ], 'csp');
  assert.ok(html.indexOf('>a.log<') < html.indexOf('>b.log.gz<'));
  assert.equal(html.match(/<section>/g)!.length, 3);
  assert.ok(html.includes('<h3>logs<span class="c">2</span>') && html.includes('<h3>.<span class="c">1</span>'));
  assert.ok(!html.includes('x<y>') && html.includes('data-rel="x&lt;y&gt;/c&quot;d.log"'));
  assert.ok(renderFiles([], 'csp').includes('No .log / .log.gz files'));
});

test('fmtSize', () => {
  assert.equal(fmtSize(10), '10 B');
  assert.equal(fmtSize(2048), '2.0 KB');
  assert.equal(fmtSize(5 * 1024 ** 2), '5.0 MB');
});
