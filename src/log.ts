import { closeSync, createReadStream, openSync, readSync, statSync } from 'fs';
import { createGunzip } from 'zlib';
import { StringDecoder } from 'string_decoder';

export const LEVELS = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'] as const;
export type Level = (typeof LEVELS)[number] | '';

const JSON_LEVEL = /"(?:level|severity|log\.level)"\s*:\s*"(\w+)"/i;
const TEXT_LEVEL = /\b(FATAL|CRITICAL|ERROR|ERR|WARNING|WARN|INFO|DEBUG|TRACE)\b/i;
const ALIAS: Record<string, Level> = { CRITICAL: 'FATAL', ERR: 'ERROR', WARNING: 'WARN' };

/** Level dari baris JSON (`"level":"INFO"`) atau teks biasa (`... ERROR ...`); '' bila tidak ada. */
export function levelOf(line: string): Level {
  const m = JSON_LEVEL.exec(line) ?? TEXT_LEVEL.exec(line);
  if (!m) return '';
  const l = m[1].toUpperCase();
  return ALIAS[l] ?? ((LEVELS as readonly string[]).includes(l) ? (l as Level) : '');
}

// shortcut: hanya 20 MB terakhir yang dibaca saat file dibuka, naikkan bila perlu melihat file lebih besar.
export const MAX_INITIAL_BYTES = 20 * 1024 * 1024;

/**
 * Membaca baris baru dari file yang terus bertambah. `reset` = baca ulang dari awal (pertama kali / file dipotong / dirotasi).
 * `open` = baris terakhir belum diakhiri newline; pada read berikutnya baris itu dikirim ulang secara utuh.
 */
export class LogTail {
  private offset = 0;
  private partial = '';
  private decoder = new StringDecoder('utf8');

  constructor(private readonly path: string, private readonly maxInitial = MAX_INITIAL_BYTES) {}

  read(): { reset: boolean; lines: string[]; open: boolean } {
    const size = statSync(this.path).size;
    let reset = this.offset === 0;
    let skipFirst = false;
    if (size < this.offset) reset = true;
    if (reset) {
      this.offset = Math.max(0, size - this.maxInitial);
      skipFirst = this.offset > 0; // baris pertama terpotong di tengah
      this.partial = '';
      this.decoder = new StringDecoder('utf8');
    }
    if (size === this.offset) return { reset, lines: [], open: false };

    const buf = Buffer.alloc(size - this.offset);
    const fd = openSync(this.path, 'r');
    try {
      readSync(fd, buf, 0, buf.length, this.offset);
    } finally {
      closeSync(fd);
    }
    this.offset = size;

    const lines = (this.partial + this.decoder.write(buf)).split(/\r?\n/);
    this.partial = lines.pop()!;
    if (skipFirst) lines.shift();
    if (this.partial) lines.push(this.partial);
    return { reset, lines, open: !!this.partial };
  }
}

/** Isi file .gz tanpa extract ke disk: didekompres secara streaming, hanya `max` byte terakhir yang disimpan. */
export function readGzipLines(path: string, max = MAX_INITIAL_BYTES): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let trimmed = false;
    createReadStream(path)
      .on('error', reject)
      .pipe(createGunzip())
      .on('error', reject)
      .on('data', (c: Buffer) => {
        chunks.push(c);
        size += c.length;
        while (size - chunks[0].length >= max) { size -= chunks.shift()!.length; trimmed = true; }
      })
      .on('end', () => {
        let buf = Buffer.concat(chunks);
        if (buf.length > max) { buf = buf.subarray(buf.length - max); trimmed = true; }
        const lines = buf.toString('utf8').split(/\r?\n/);
        if (trimmed) lines.shift(); // baris pertama terpotong di tengah
        if (lines.at(-1) === '') lines.pop();
        resolve(lines);
      });
  });
}
