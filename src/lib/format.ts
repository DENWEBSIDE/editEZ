/** Formatting helpers shared across the editor. */

export function formatTimecode(seconds: number, fps = 30, withFrames = false): string {
  const s = Math.max(0, seconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const f = Math.floor((s - Math.floor(s)) * fps);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (withFrames) return `${pad(h)}:${pad(m)}:${pad(sec)}:${pad(f)}`;
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

export function formatTimeShort(seconds: number): string {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function formatSeconds(seconds: number, decimals = 2): string {
  return `${(Math.round((seconds || 0) * 10 ** decimals) / 10 ** decimals).toFixed(decimals)}s`;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export function formatRelative(ts: number, lang: string, t: (k: string, v?: Record<string, string | number>) => string): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return t('home.justNow');
  if (min < 60) return t('home.minutesAgo', { n: min });
  const hours = Math.floor(min / 60);
  if (hours < 24) return t('home.hoursAgo', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t('home.daysAgo', { n: days });
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleDateString();
  }
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function snapValue(v: number, targets: number[], thresholdSeconds: number): { value: number; hit: number | null } {
  let best: { value: number; hit: number | null } = { value: v, hit: null };
  let bestDist = thresholdSeconds;
  for (const target of targets) {
    const d = Math.abs(target - v);
    if (d <= bestDist) {
      bestDist = d;
      best = { value: target, hit: target };
    }
  }
  return best;
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPad|iPhone/.test(navigator.platform || '');

export function modKey(): string {
  return isMac ? '⌘' : 'Ctrl';
}

export function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

export function aspectLabel(w: number, h: number): string {
  const d = gcd(w, h);
  const aw = w / d;
  const ah = h / d;
  if (aw <= 40 && ah <= 40) return `${aw}:${ah}`;
  return `${(w / h).toFixed(2)}:1`;
}
