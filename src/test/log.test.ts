import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { LogTail, levelOf, readGzipLines } from '../log';
import { gzipSync } from 'zlib';

test('levelOf reads JSON and plain-text levels', () => {
  assert.equal(levelOf('{"level":"INFO","message":"ERROR inside message"}'), 'INFO');
  assert.equal(levelOf('{"severity": "warning"}'), 'WARN');
  assert.equal(levelOf('2026-10-21 11:21:29 ERROR [main] boom'), 'ERROR');
  assert.equal(levelOf('[debug] x'), 'DEBUG');
  assert.equal(levelOf('    at com.foo.Bar(Bar.java:10)'), '');
  assert.equal(levelOf('INFORMATION only'), '');
});

test('LogTail reads appended lines, open last line, truncation and size cap', () => {
  const f = join(mkdtempSync(join(tmpdir(), 'llv-')), 'a.log');
  writeFileSync(f, 'one\ntwo\n');
  const t = new LogTail(f);
  assert.deepEqual(t.read(), { reset: true, lines: ['one', 'two'], open: false });
  assert.deepEqual(t.read(), { reset: false, lines: [], open: false });

  appendFileSync(f, 'thr');
  assert.deepEqual(t.read(), { reset: false, lines: ['thr'], open: true });
  appendFileSync(f, 'ee\r\nfoé');
  assert.deepEqual(t.read(), { reset: false, lines: ['three', 'foé'], open: true });

  writeFileSync(f, 'new\n'); // rotasi / truncate
  assert.deepEqual(t.read(), { reset: true, lines: ['new'], open: false });

  writeFileSync(f, 'aaaa\nbbbb\ncc\n');
  assert.deepEqual(new LogTail(f, 6).read(), { reset: true, lines: ['cc'], open: false });
});

test('readGzipLines reads .gz without extracting, keeping only the last max bytes', async () => {
  const f = join(mkdtempSync(join(tmpdir(), 'llv-')), 'a.log.gz');
  writeFileSync(f, gzipSync('one\ntwo\r\nthree\n'));
  assert.deepEqual(await readGzipLines(f), ['one', 'two', 'three']);
  assert.deepEqual(await readGzipLines(f, 8), ['three']);
  writeFileSync(f, 'not gzip');
  await assert.rejects(readGzipLines(f));
});
