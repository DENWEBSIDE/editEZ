/* Importing, probing and thumbnailing media files. */
import type { Asset, AssetKind } from '../types';
import { uid } from '../types';
import { blobToAudioBuffer, extractPeaks } from './audio';
import { parseSubtitles, type Cue } from './subtitles';

export class MediaError extends Error {
  code: 'unsupported' | 'decode' | 'too-big' | 'read';
  constructor(code: MediaError['code'], message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

const VIDEO_EXT = ['mp4', 'webm', 'mov', 'm4v', 'ogv', 'mkv', 'avi'];
const AUDIO_EXT = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'flac', 'opus'];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'bmp'];
const SUB_EXT = ['srt', 'vtt'];

export const ext = (name: string) => (name.split('.').pop() ?? '').toLowerCase();

export function kindOfFile(file: File): AssetKind | 'subtitle' | null {
  const e = ext(file.name);
  const mime = file.type.toLowerCase();
  if (mime.startsWith('video/') || VIDEO_EXT.includes(e)) return 'video';
  if (mime.startsWith('audio/') || AUDIO_EXT.includes(e)) return 'audio';
  if (mime.startsWith('image/') || IMAGE_EXT.includes(e)) return 'image';
  if (SUB_EXT.includes(e) || mime.includes('subrip') || mime.includes('vtt')) return 'subtitle';
  return null;
}

export function fileAccept() {
  return 'video/*,audio/*,image/*,.srt,.vtt';
}

export function canPlay(mime: string, kind: 'video' | 'audio'): boolean {
  const el = document.createElement(kind === 'video' ? 'video' : 'audio');
  if (!mime) return true;
  const result = el.canPlayType(mime);
  return result === 'probably' || result === 'maybe';
}

const waitFor = <T,>(target: EventTarget, ok: string, fail: string, timeout = 15000, action?: () => void) =>
  new Promise<T>((resolve, reject) => {
    let done = false;
    const cleanup = () => {
      target.removeEventListener(ok, onOk as EventListener);
      target.removeEventListener(fail, onFail as EventListener);
      clearTimeout(timer);
    };
    const onOk = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve(target as unknown as T);
    };
    const onFail = () => {
      if (done) return;
      done = true;
      cleanup();
      reject(new MediaError('decode', 'media element error'));
    };
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(new MediaError('decode', 'timed out reading media'));
    }, timeout);
    target.addEventListener(ok, onOk as EventListener, { once: true });
    target.addEventListener(fail, onFail as EventListener, { once: true });
    action?.();
  });

export interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
}

export async function probeVideo(url: string): Promise<ProbeResult> {
  const el = document.createElement('video');
  el.preload = 'metadata';
  el.muted = true;
  el.src = url;
  await waitFor<HTMLVideoElement>(el, 'loadedmetadata', 'error', 15000, () => el.load());
  const duration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
  const width = el.videoWidth;
  const height = el.videoHeight;
  if (!width || !height) throw new MediaError('decode', 'no video stream');
  // Audio detection is heuristic: most browsers expose webkitAudioDecodedByteCount
  const anyEl = el as HTMLVideoElement & { webkitAudioDecodedByteCount?: number; mozHasAudio?: boolean };
  const hasAudio = !!anyEl.mozHasAudio || (anyEl.webkitAudioDecodedByteCount ?? 0) > 0 || !/no-audio/i.test(el.currentSrc);
  return { duration, width, height, hasAudio };
}

export async function captureVideoThumb(url: string, duration: number): Promise<string | undefined> {
  const el = document.createElement('video');
  el.preload = 'auto';
  el.muted = true;
  el.crossOrigin = 'anonymous';
  el.src = url;
  try {
    await waitFor<HTMLVideoElement>(el, 'loadeddata', 'error', 12000, () => el.load());
    const target = Math.min(Math.max(0.1, duration * 0.25), Math.max(0.1, duration - 0.2));
    const seeked = waitFor(el, 'seeked', 'error', 8000, () => {
      el.currentTime = target;
    });
    await seeked.catch(() => undefined);
    const w = 320;
    const h = Math.max(1, Math.round((el.videoHeight / Math.max(1, el.videoWidth)) * w));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(el, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.72);
  } catch {
    return undefined;
  } finally {
    el.removeAttribute('src');
    el.load();
  }
}

export async function probeImage(url: string): Promise<{ width: number; height: number; thumb: string }> {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode().catch(() => {
    throw new MediaError('decode', 'image failed to load');
  });
  const w = 360;
  const h = Math.max(1, Math.round((img.naturalHeight / Math.max(1, img.naturalWidth)) * w));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new MediaError('decode');
  ctx.drawImage(img, 0, 0, w, h);
  return { width: img.naturalWidth, height: img.naturalHeight, thumb: canvas.toDataURL('image/jpeg', 0.78) };
}

export async function probeAudio(blob: Blob): Promise<{ duration: number; peaks?: number[] }> {
  try {
    const buffer = await blobToAudioBuffer(blob);
    return { duration: buffer.duration, peaks: extractPeaks(buffer, 700) };
  } catch {
    // Fall back to a media element for the duration (no waveform).
    const url = URL.createObjectURL(blob);
    try {
      const el = document.createElement('audio');
      el.preload = 'metadata';
      el.src = url;
      await waitFor<HTMLAudioElement>(el, 'loadedmetadata', 'error', 12000, () => el.load());
      return { duration: Number.isFinite(el.duration) ? el.duration : 0 };
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

export interface ImportOutcome {
  asset?: Asset;
  blob?: Blob;
  cues?: Cue[];
  error?: { code: string; name: string };
}

const MAX_FILE = 2.5 * 1024 * 1024 * 1024;

/** Reads one file into a ready-to-use asset (or subtitle cues). */
export async function importFile(file: File): Promise<ImportOutcome> {
  if (file.size > MAX_FILE) return { error: { code: 'too-big', name: file.name } };
  const kind = kindOfFile(file);
  if (!kind) return { error: { code: 'unsupported', name: file.name } };

  if (kind === 'subtitle') {
    try {
      const text = await file.text();
      const cues = parseSubtitles(text);
      if (!cues.length) return { error: { code: 'subtitle', name: file.name } };
      const id = uid('asset');
      const asset: Asset = {
        id,
        name: file.name,
        kind: 'subtitle',
        mime: file.type || 'text/plain',
        size: file.size,
        duration: cues[cues.length - 1].end,
        width: 0,
        height: 0,
        hasAudio: false,
        url: '',
        license: 'user',
        source: 'import',
        createdAt: Date.now(),
      };
      return { asset, blob: file, cues };
    } catch {
      return { error: { code: 'read', name: file.name } };
    }
  }

  const url = URL.createObjectURL(file);
  try {
    if (kind === 'video') {
      const probe = await probeVideo(url);
      const thumb = await captureVideoThumb(url, probe.duration);
      return {
        asset: {
          id: uid('asset'),
          name: file.name,
          kind: 'video',
          mime: file.type || 'video/mp4',
          size: file.size,
          duration: probe.duration,
          width: probe.width,
          height: probe.height,
          hasAudio: probe.hasAudio,
          url,
          thumb,
          license: 'user',
          source: 'import',
          createdAt: Date.now(),
        },
        blob: file,
      };
    }
    if (kind === 'image') {
      const probe = await probeImage(url);
      return {
        asset: {
          id: uid('asset'),
          name: file.name,
          kind: 'image',
          mime: file.type || 'image/*',
          size: file.size,
          duration: 5,
          width: probe.width,
          height: probe.height,
          hasAudio: false,
          url,
          thumb: probe.thumb,
          license: 'user',
          source: 'import',
          createdAt: Date.now(),
        },
        blob: file,
      };
    }
    // audio
    const probe = await probeAudio(file);
    return {
      asset: {
        id: uid('asset'),
        name: file.name,
        kind: 'audio',
        mime: file.type || 'audio/mpeg',
        size: file.size,
        duration: probe.duration || 5,
        width: 0,
        height: 0,
        hasAudio: true,
        url,
        peaks: probe.peaks,
        license: 'user',
        source: 'import',
        createdAt: Date.now(),
      },
      blob: file,
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    const code = e instanceof MediaError ? e.code : 'decode';
    return { error: { code, name: file.name } };
  }
}

/** Builds an asset + blob from generated or recorded media. */
export async function assetFromBlob(
  blob: Blob,
  name: string,
  kind: AssetKind,
  opts: { duration?: number; peaks?: number[]; thumb?: string; license?: Asset['license']; source?: Asset['source'] } = {}
): Promise<{ asset: Asset; blob: Blob }> {
  const url = URL.createObjectURL(blob);
  let duration = opts.duration ?? 0;
  let peaks = opts.peaks;
  let width = 0;
  let height = 0;
  let thumb = opts.thumb;
  if (kind === 'audio' || kind === 'music' || kind === 'sfx') {
    if (!duration || !peaks) {
      try {
        const buffer = await blobToAudioBuffer(blob);
        duration = duration || buffer.duration;
        peaks = peaks ?? extractPeaks(buffer, 700);
      } catch {
        /* ignore */
      }
    }
  } else if (kind === 'image') {
    try {
      const img = await probeImage(url);
      width = img.width;
      height = img.height;
      thumb = thumb ?? img.thumb;
      duration = duration || 5;
    } catch {
      /* ignore */
    }
  } else if (kind === 'video') {
    try {
      const probe = await probeVideo(url);
      duration = duration || probe.duration;
      width = probe.width;
      height = probe.height;
    } catch {
      /* ignore */
    }
  }
  const asset: Asset = {
    id: uid('asset'),
    name,
    kind,
    mime: blob.type || 'application/octet-stream',
    size: blob.size,
    duration: duration || 5,
    width,
    height,
    hasAudio: kind === 'audio' || kind === 'music' || kind === 'sfx' || kind === 'video',
    url,
    peaks,
    thumb,
    license: opts.license ?? 'demo-generated',
    source: opts.source ?? 'generated',
    createdAt: Date.now(),
  };
  return { asset, blob };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
