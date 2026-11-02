/* SRT / WebVTT parsing and serialising. */

export interface Cue {
  start: number;
  end: number;
  text: string;
}

const stripTags = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/\{\\[^}]+\}/g, '')
    .trim();

const parseTimestamp = (raw: string): number => {
  const cleaned = raw.trim().replace(',', '.');
  const parts = cleaned.split(':').map((p) => parseFloat(p));
  if (parts.some((n) => Number.isNaN(n))) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return NaN;
};

export function parseSubtitles(input: string): Cue[] {
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const blocks = text.split(/\n{2,}/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim().length > 0);
    if (!lines.length) continue;
    if (/^WEBVTT/i.test(lines[0])) continue;
    let idx = 0;
    if (/^\d+$/.test(lines[0].trim()) && lines.length > 1) idx = 1;
    const timingLine = lines[idx];
    if (!timingLine || !timingLine.includes('-->')) continue;
    const [rawStart, rawEnd] = timingLine.split('-->');
    const start = parseTimestamp(rawStart);
    const end = parseTimestamp((rawEnd ?? '').split(/\s+/).filter(Boolean)[0] ?? '');
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const body = lines
      .slice(idx + 1)
      .join('\n')
      .trim();
    if (!body) continue;
    cues.push({ start, end, text: stripTags(body) });
  }
  return cues.sort((a, b) => a.start - b.start);
}

const pad = (n: number, len = 2) => String(Math.floor(n)).padStart(len, '0');

export function formatSrtTime(t: number): string {
  const ms = Math.round(Math.max(0, t) * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(milli, 3)}`;
}

export function formatVttTime(t: number): string {
  return formatSrtTime(t).replace(',', '.');
}

export function toSrt(cues: Cue[]): string {
  return cues
    .map((c, i) => `${i + 1}\n${formatSrtTime(c.start)} --> ${formatSrtTime(c.end)}\n${c.text}\n`)
    .join('\n');
}

export function toVtt(cues: Cue[]): string {
  const body = cues
    .map((c) => `${formatVttTime(c.start)} --> ${formatVttTime(c.end)}\n${c.text}\n`)
    .join('\n');
  return `WEBVTT\n\n${body}`;
}

export function downloadText(filename: string, text: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
