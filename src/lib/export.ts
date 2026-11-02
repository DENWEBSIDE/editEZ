/* Real-time export via MediaRecorder (canvas capture + WebAudio mix). */
import type { Asset, Lut, Project } from '../types';
import { Compositor } from './render';
import { contentEnd } from './edits';

export interface FormatOption {
  mime: string;
  ext: string;
  label: string;
  kind: 'webm' | 'mp4';
  codec: string;
}

const WEBM_CANDIDATES: FormatOption[] = [
  { mime: 'video/webm;codecs=vp9,opus', ext: 'webm', label: 'WebM · VP9', kind: 'webm', codec: 'VP9 + Opus' },
  { mime: 'video/webm;codecs=vp8,opus', ext: 'webm', label: 'WebM · VP8', kind: 'webm', codec: 'VP8 + Opus' },
  { mime: 'video/webm', ext: 'webm', label: 'WebM', kind: 'webm', codec: 'VP8/VP9' },
];

const MP4_CANDIDATES: FormatOption[] = [
  { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4', label: 'MP4 · H.264', kind: 'mp4', codec: 'H.264 + AAC' },
  { mime: 'video/mp4;codecs=h264,aac', ext: 'mp4', label: 'MP4 · H.264', kind: 'mp4', codec: 'H.264 + AAC' },
  { mime: 'video/mp4', ext: 'mp4', label: 'MP4', kind: 'mp4', codec: 'H.264' },
];

export function mediaRecorderSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
}

export function supportedFormats(): FormatOption[] {
  if (!mediaRecorderSupported()) return [];
  const all = [...WEBM_CANDIDATES, ...MP4_CANDIDATES];
  const supported = all.filter((f) => {
    try {
      return MediaRecorder.isTypeSupported(f.mime);
    } catch {
      return false;
    }
  });
  // de-duplicate by extension, keeping the first (highest quality) candidate
  const seen = new Set<string>();
  return supported.filter((f) => {
    if (seen.has(f.ext)) return false;
    seen.add(f.ext);
    return true;
  });
}

export interface ExportRequest {
  project: Project;
  assets: Record<string, Asset>;
  luts: Record<string, Lut>;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  includeAudio: boolean;
  format: 'auto' | 'webm' | 'mp4';
  onProgress?: (payload: { percent: number; time: number; total: number }) => void;
  onStatus?: (status: string) => void;
  signal?: AbortSignal;
}

export interface ExportResult {
  blob: Blob;
  url: string;
  ext: string;
  mime: string;
  duration: number;
}

export class ExportCancelled extends Error {
  constructor() {
    super('cancelled');
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function exportVideo(req: ExportRequest): Promise<ExportResult> {
  const { project, assets, luts, width, height, includeAudio } = req;
  const duration = contentEnd(project);
  if (!duration || duration < 0.2) throw new Error('empty-project');
  if (!mediaRecorderSupported()) throw new Error('unsupported');

  const formats = supportedFormats();
  if (!formats.length) throw new Error('unsupported');
  const chosen =
    req.format === 'mp4'
      ? formats.find((f) => f.kind === 'mp4')
      : req.format === 'webm'
        ? formats.find((f) => f.kind === 'webm')
        : formats[0];
  if (!chosen) throw new Error('format-unsupported');

  const compositor = new Compositor({ audio: includeAudio, monitor: false });
  compositor.resize(width, height);
  const canvas = compositor.canvas;
  canvas.style.cssText = 'position:fixed;left:-10000px;top:0;opacity:0;pointer-events:none';
  document.body.appendChild(canvas);

  let recorder: MediaRecorder | null = null;
  let raf = 0;
  let finished = false;

  const cleanup = () => {
    if (raf) window.clearTimeout(raf);
    compositor.pauseAll();
    try {
      compositor.audio.releaseExportStream();
    } catch {
      /* ignore */
    }
    compositor.destroy();
    canvas.remove();
  };

  try {
    req.onStatus?.('preparing');
    // Prime the first frame so media elements start decoding before recording.
    compositor.render(project, assets, luts, 0.001, { width, height, time: 0.001, playing: true });
    compositor.syncAudio(project, assets, 0.001, true);
    await sleep(260);

    const stream = canvas.captureStream(req.fps);
    if (includeAudio) {
      try {
        const audioStream = compositor.audio.createExportStream();
        if (audioStream) for (const track of audioStream.getAudioTracks()) stream.addTrack(track);
      } catch {
        /* keep the export alive without audio rather than failing outright */
      }
    }

    const mimeType = chosen.mime;
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: Math.round(req.bitrate),
      audioBitsPerSecond: includeAudio ? 128_000 : undefined,
    });
    const chunks: Blob[] = [];
    let recorderError: Error | null = null;
    const done = new Promise<Blob>((resolve) => {
      if (!recorder) return resolve(new Blob());
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      recorder.onerror = (event) => {
        const err = (event as unknown as { error?: Error }).error;
        recorderError = err ?? new Error('recorder-error');
        try {
          if (recorder && recorder.state !== 'inactive') recorder.stop();
        } catch {
          /* ignore */
        }
      };
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    recorder.start(250);
    req.onStatus?.('rendering');

    const started = performance.now();
    const frameMs = Math.max(16, Math.round(1000 / Math.max(12, req.fps)));
    await new Promise<void>((resolve, reject) => {
      // setTimeout instead of requestAnimationFrame: rAF is throttled to ~1fps in
      // background/offscreen frames (embedded previews), which used to produce a
      // frozen or empty recording while the progress bar still moved.
      const tick = () => {
        if (req.signal?.aborted) {
          reject(new ExportCancelled());
          return;
        }
        const elapsed = (performance.now() - started) / 1000;
        const time = Math.min(duration, elapsed);
        try {
          compositor.render(project, assets, luts, time, {
            width,
            height,
            time,
            playing: true,
          });
          compositor.syncAudio(project, assets, time, true);
        } catch {
          /* keep going — a single bad frame should not kill the export */
        }
        req.onProgress?.({ percent: Math.min(99, (time / duration) * 100), time, total: duration });
        if (elapsed >= duration) {
          resolve();
          return;
        }
        raf = window.setTimeout(tick, frameMs);
      };
      tick();
    });

    finished = true;
    req.onProgress?.({ percent: 99.5, time: duration, total: duration });
    // let the last frames flush
    await sleep(220);
    if (recorder.state !== 'inactive') recorder.stop();
    const blob = await done;
    compositor.pauseAll();
    req.onProgress?.({ percent: 100, time: duration, total: duration });
    if (recorderError) throw recorderError;
    if (!blob.size) throw new Error('empty-recording');
    return {
      blob,
      url: URL.createObjectURL(blob),
      ext: chosen.ext,
      mime: mimeType,
      duration,
    };
  } catch (e) {
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    if (e instanceof ExportCancelled) throw e;
    throw e;
  } finally {
    if (finished || true) {
      // media elements are still winding down; give them a beat then clean up
      setTimeout(cleanup, 400);
    }
  }
}

export function formatFilename(name: string, ext: string) {
  const base = name.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[^\w\u0600-\u06FF-]+/g, '-');
  return `${base || 'editez-export'}.${ext}`;
}
