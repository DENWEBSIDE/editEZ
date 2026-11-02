/* ------------------------------------------------------------------ *
 * Canvas compositor.
 * Draws the project at a given time: transforms, effects, chroma key,
 * masks, blend modes, transitions, text and titles.
 * The same engine powers the live preview and the exported video.
 * ------------------------------------------------------------------ */
import type {
  Asset,
  Clip,
  EffectInstance,
  GradeSettings,
  Lut,
  Project,
  ProjectSettings,
  Track,
} from '../types';
import { clipSourceTime, clamp, defaultGrade } from '../types';
import { AudioEngine } from './audio';

export interface RenderInput {
  width: number;
  height: number;
  time: number;
  playing?: boolean;
  /** show this clip ungraded (before/after comparison) */
  compareClipId?: string | null;
  /** hides the guide overlays */
  skipAudio?: boolean;
}

export interface CompositorOptions {
  audio?: boolean;
  monitor?: boolean;
}

const PIXEL_EFFECTS = new Set(['sharpen', 'posterize', 'duotone', 'bleach', 'sepia', 'threshold', 'grain', 'chromaShift']);

let filterSupport: boolean | null = null;
function supportsFilter(): boolean {
  if (filterSupport !== null) return filterSupport;
  try {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (!ctx) return (filterSupport = false);
    ctx.filter = 'blur(2px)';
    filterSupport = ctx.filter === 'blur(2px)';
  } catch {
    filterSupport = false;
  }
  return filterSupport;
}

export const isGradeDefault = (g?: GradeSettings): boolean => {
  if (!g) return true;
  const d = defaultGrade();
  return (
    g.exposure === d.exposure &&
    g.brightness === d.brightness &&
    g.contrast === d.contrast &&
    g.saturation === d.saturation &&
    g.temperature === d.temperature &&
    g.tint === d.tint &&
    g.highlights === d.highlights &&
    g.shadows === d.shadows &&
    g.whites === d.whites &&
    g.blacks === d.blacks &&
    g.curves.black === 0 &&
    g.curves.mid === 0 &&
    g.curves.white === 0 &&
    Math.abs(g.curves.gamma - 1) < 0.001 &&
    !g.lutId
  );
};

const effectOf = (clip: Clip, type: string): EffectInstance | undefined =>
  clip.effects.find((e) => e.type === type && e.enabled);

const num = (e: EffectInstance | undefined, key: string, fallback: number) => {
  const v = e?.params?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
};

export function needsPixelPass(clip: Clip): boolean {
  if (clip.chroma?.enabled) return true;
  if (!isGradeDefault(clip.grade)) {
    const g = clip.grade!;
    const quickOnly =
      g.brightness === 0 &&
      g.highlights === 0 &&
      g.shadows === 0 &&
      g.whites === 0 &&
      g.blacks === 0 &&
      g.temperature === 0 &&
      g.tint === 0 &&
      g.curves.black === 0 &&
      g.curves.mid === 0 &&
      g.curves.white === 0 &&
      Math.abs(g.curves.gamma - 1) < 0.001 &&
      !g.lutId;
    if (!quickOnly) return true;
  }
  return clip.effects.some((e) => e.enabled && PIXEL_EFFECTS.has(e.type) && e.type !== 'grain');
}

/* --------------------------- colour machinery -------------------------- */

const gradeCache = new Map<string, Uint8ClampedArray>();

function buildGradeTable(g: GradeSettings): Uint8ClampedArray {
  const key = JSON.stringify([g.exposure, g.brightness, g.contrast, g.saturation, g.temperature, g.tint, g.highlights, g.shadows, g.whites, g.blacks, g.curves]);
  const cached = gradeCache.get(key);
  if (cached) return cached;
  const table = new Uint8ClampedArray(768);
  const gain = 2 ** g.exposure;
  const tempR = 1 + g.temperature * 0.3;
  const tempB = 1 - g.temperature * 0.3;
  const tintG = 1 - g.tint * 0.18;
  const tintRB = 1 + g.tint * 0.06;
  const gamma = 1 / Math.max(0.2, g.curves.gamma);
  for (let v = 0; v < 256; v++) {
    let x = v / 255;
    x *= gain;
    x += g.brightness * 0.34;
    x = (x - 0.5) * (1 + g.contrast) + 0.5;
    const shadowW = (1 - clamp(x, 0, 1)) ** 2;
    const highW = clamp(x, 0, 1) ** 2;
    x += g.shadows * 0.32 * shadowW;
    x += g.highlights * 0.32 * highW;
    x += g.blacks * 0.14 * (1 - clamp(x, 0, 1));
    x += g.whites * 0.2 * clamp(x, 0, 1);
    x = Math.pow(clamp(x, 0, 1), gamma);
    const mid = Math.sin(Math.PI * clamp(x, 0, 1)) * g.curves.mid * 0.16;
    x += mid;
    const blackPoint = g.curves.black * 0.22;
    x = (x - blackPoint) / Math.max(0.05, 1 - blackPoint);
    x *= 1 + g.curves.white * 0.3;
    const c = clamp(x, 0, 1) * 255;
    table[v * 3] = c * tempR * tintRB;
    table[v * 3 + 1] = c * tintG;
    table[v * 3 + 2] = c * tempB * tintRB;
  }
  if (gradeCache.size > 40) gradeCache.clear();
  gradeCache.set(key, table);
  return table;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const n = parseInt(full.slice(0, 6) || '000000', 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`;

/* ------------------------------- media pool ---------------------------- */

const hiddenHost = (() => {
  let host: HTMLDivElement | null = null;
  return () => {
    if (host && host.isConnected) return host;
    host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText =
      'position:fixed;left:-4px;top:-4px;width:2px;height:2px;overflow:hidden;opacity:0.01;pointer-events:none;z-index:-1';
    document.body.appendChild(host);
    return host;
  };
})();

interface MediaEntry {
  el: HTMLVideoElement | HTMLAudioElement;
  assetId: string;
  lastUsed: number;
  isVideo: boolean;
}

class MediaPool {
  private entries = new Map<string, MediaEntry>();
  private images = new Map<string, HTMLImageElement>();
  private thumbs = new Map<string, HTMLImageElement>();

  constructor(private engine: AudioEngine) {}

  private create(clipId: string, asset: Asset, isVideo: boolean): MediaEntry | null {
    if (!asset.url) return null;
    const el = isVideo ? document.createElement('video') : document.createElement('audio');
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    (el as HTMLVideoElement).playsInline = true;
    el.src = asset.url;
    el.load();
    // Route through WebAudio when possible so we control the mix.
    const chain = this.engine.ensureChain(el);
    if (!chain) el.muted = true;
    hiddenHost().appendChild(el);
    const entry: MediaEntry = { el, assetId: asset.id, lastUsed: performance.now(), isVideo };
    this.entries.set(clipId, entry);
    return entry;
  }

  get(clipId: string, asset: Asset | undefined, isVideo: boolean): MediaEntry | null {
    if (!asset) return null;
    const existing = this.entries.get(clipId);
    if (existing && existing.assetId === asset.id && existing.isVideo === isVideo) {
      existing.lastUsed = performance.now();
      return existing;
    }
    if (existing) this.drop(clipId);
    return this.create(clipId, asset, isVideo);
  }

  peek(clipId: string): MediaEntry | undefined {
    return this.entries.get(clipId);
  }

  pauseAll() {
    for (const entry of this.entries.values()) {
      try {
        entry.el.pause();
      } catch {
        /* ignore */
      }
    }
  }

  drop(clipId: string) {
    const entry = this.entries.get(clipId);
    if (!entry) return;
    try {
      entry.el.pause();
      entry.el.removeAttribute('src');
      entry.el.load();
      entry.el.remove();
    } catch {
      /* ignore */
    }
    this.entries.delete(clipId);
  }

  image(asset: Asset): HTMLImageElement | null {
    if (!asset.url) return null;
    const existing = this.images.get(asset.id);
    if (existing) return existing;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = asset.url;
    this.images.set(asset.id, img);
    return img;
  }

  prune(validClipIds: Set<string>) {
    for (const [clipId, entry] of [...this.entries.entries()]) {
      if (!validClipIds.has(clipId)) this.drop(clipId);
      else if (performance.now() - entry.lastUsed > 20000) this.drop(clipId);
    }
    if (this.entries.size > 20) {
      const sorted = [...this.entries.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed);
      for (let i = 0; i < sorted.length - 14; i++) this.drop(sorted[i][0]);
    }
  }

  destroy() {
    for (const id of [...this.entries.keys()]) this.drop(id);
    this.images.clear();
  }
}

/* -------------------------------- compositor ---------------------------- */

export class Compositor {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layer: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private fx: HTMLCanvasElement;
  private fxCtx: CanvasRenderingContext2D;
  private mask: HTMLCanvasElement;
  private mctx: CanvasRenderingContext2D;
  private pool: MediaPool;
  readonly audio: AudioEngine;
  private w = 0;
  private h = 0;
  private images = new Map<string, HTMLImageElement>();
  private thumbs = new Map<string, HTMLImageElement>();

  constructor(opts: CompositorOptions = {}, canvas?: HTMLCanvasElement) {
    this.canvas = canvas ?? document.createElement('canvas');
    this.canvas.width = canvas?.width || 1280;
    this.canvas.height = canvas?.height || 720;
    const ctx = this.canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    if (!ctx) throw new Error('canvas 2d unavailable');
    this.ctx = ctx;
    this.layer = document.createElement('canvas');
    this.lctx = this.layer.getContext('2d', { willReadFrequently: true })!;
    this.fx = document.createElement('canvas');
    this.fxCtx = this.fx.getContext('2d', { willReadFrequently: true })!;
    this.mask = document.createElement('canvas');
    this.mctx = this.mask.getContext('2d')!;
    this.audio = new AudioEngine({ monitor: opts.monitor ?? true });
    if (!opts.audio) this.audio.setMonitor(false);
    this.pool = new MediaPool(this.audio);
    this.resize(1280, 720);
  }

  resize(w: number, h: number) {
    const width = Math.max(2, Math.round(w));
    const height = Math.max(2, Math.round(h));
    if (width === this.w && height === this.h) return;
    this.w = width;
    this.h = height;
    for (const c of [this.canvas, this.layer, this.fx, this.mask]) {
      c.width = width;
      c.height = height;
    }
  }

  /** Samples a pixel from the last rendered frame (device pixels). */
  sampleColor(x: number, y: number): string | null {
    try {
      const d = this.ctx.getImageData(
        Math.max(0, Math.min(this.w - 1, Math.round(x))),
        Math.max(0, Math.min(this.h - 1, Math.round(y))),
        1,
        1
      ).data;
      return rgbToHex(d[0], d[1], d[2]);
    } catch {
      return null;
    }
  }

  get width() {
    return this.w;
  }
  get height() {
    return this.h;
  }

  destroy() {
    this.pool.destroy();
    this.images.clear();
  }

  private image(asset: Asset): HTMLImageElement | null {
    if (!asset.url) return null;
    let img = this.images.get(asset.id);
    if (!img) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = asset.url;
      this.images.set(asset.id, img);
    }
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  /** Draws one frame. Returns the list of media elements used this frame. */
  render(project: Project, assets: Record<string, Asset>, luts: Record<string, Lut>, time: number, opts: RenderInput) {
    if (opts.playing !== undefined) this.playing = opts.playing;
    this.resize(opts.width, opts.height);
    const { ctx } = this;
    const W = this.w;
    const H = this.h;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.fillStyle = project.canvas.bg || '#000000';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const activeIds = new Set<string>();
    const tracks = project.tracks;
    for (let i = tracks.length - 1; i >= 0; i--) {
      const track = tracks[i];
      if (track.hidden) continue;
      if (track.kind === 'audio') continue;
      for (const clip of track.clips) {
        if (time < clip.start - 0.0001 || time >= clip.start + clip.duration) continue;
        activeIds.add(clip.id);
        this.drawClip(clip, track, project, assets, luts, time, opts);
      }
    }
    this.pool.prune(new Set(project.tracks.flatMap((t) => t.clips.map((c) => c.id))));
    return activeIds;
  }

  private drawClip(
    clip: Clip,
    track: Track,
    project: Project,
    assets: Record<string, Asset>,
    luts: Record<string, Lut>,
    time: number,
    opts: RenderInput
  ) {
    const local = clamp(time - clip.start, 0, clip.duration);
    const p = clip.duration > 0 ? local / clip.duration : 0;
    const compare = opts.compareClipId === clip.id;
    const asset = clip.assetId ? assets[clip.assetId] : undefined;

    // ---- transitions ------------------------------------------------------
    let fade = 1;
    let slideX = 0;
    let zoom = 1;
    let extraBlur = 0;
    const tin = clip.transitionIn;
    if (tin && tin.duration > 0 && tin.type !== 'none') {
      const q = clamp(local / tin.duration, 0, 1);
      const e = compare ? 1 : q;
      if (tin.type === 'fade' || tin.type === 'dissolve') fade *= e;
      else if (tin.type === 'wipe') fade *= Math.min(1, e * 1.6);
      else if (tin.type === 'slideLeft') slideX += (e - 1) * this.w;
      else if (tin.type === 'slideRight') slideX += (1 - e) * this.w;
      else if (tin.type === 'zoom') zoom *= 1.18 - 0.18 * e;
      else if (tin.type === 'blurIn') extraBlur += (1 - e) * 24;
      if (tin.type === 'dissolve') extraBlur += (1 - e) * 8;
    }
    const tout = clip.transitionOut;
    if (tout && tout.duration > 0 && tout.type !== 'none') {
      const q = clamp((clip.duration - local) / tout.duration, 0, 1);
      const e = compare ? 1 : q;
      if (tout.type === 'fade' || tout.type === 'dissolve') fade *= e;
      else if (tout.type === 'wipe') fade *= Math.min(1, e * 1.6);
      else if (tout.type === 'slideLeft') slideX += (1 - e) * -this.w;
      else if (tout.type === 'slideRight') slideX += (1 - e) * this.w;
      else if (tout.type === 'zoom') zoom *= 1.18 - 0.18 * e;
      else if (tout.type === 'blurIn') extraBlur += (1 - e) * 24;
    }

    // ---- replace background for chroma key -------------------------------
    if (clip.chroma?.enabled && !compare) {
      this.drawChromaBackground(clip, assets, luts, time);
    }

    const L = this.lctx;
    L.setTransform(1, 0, 0, 1, 0, 0);
    L.globalCompositeOperation = 'source-over';
    L.globalAlpha = 1;
    L.filter = 'none';
    L.clearRect(0, 0, this.w, this.h);

    const isText = clip.type === 'text' || clip.type === 'subtitle';
    if (isText) {
      drawTextClip(L, clip, this.w, this.h, local, compare);
    } else if (clip.type === 'shape') {
      const fill = clip.shapes?.fill ?? clip.color;
      L.fillStyle = fill;
      if (clip.shapes?.kind === 'circle') {
        L.beginPath();
        L.arc(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.28, 0, Math.PI * 2);
        L.fill();
      } else if (clip.shapes?.kind === 'line') {
        L.fillRect(0, this.h * 0.47, this.w, this.h * 0.06);
      } else {
        L.fillRect(0, 0, this.w, this.h);
      }
    } else if (clip.type === 'image' || clip.type === 'video') {
      this.drawVisual(clip, asset, local, luts, compare, extraBlur);
    }

    if (!compare) this.applyMask(clip, L);

    const needsPixel = !compare && needsPixelPass(clip);

    // pixel pass on the layer
    if (needsPixel) this.pixelPass(clip, local, luts, !!compare);

    // ---- composite onto the frame ---------------------------------------
    const opacity = clamp(clip.opacity * fade, 0, 1);
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = opacity;
    try {
      ctx.globalCompositeOperation = track.kind === 'video' ? clip.blend : clip.blend;
    } catch {
      ctx.globalCompositeOperation = 'source-over';
    }
    const sx = slideX;
    if (zoom !== 1) {
      ctx.translate(this.w / 2 + sx, this.h / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-this.w / 2, -this.h / 2);
    } else if (sx !== 0) {
      ctx.translate(sx, 0);
    }
    if (extraBlur > 0.2 && supportsFilter()) {
      const prev = ctx.filter;
      ctx.filter = `blur(${extraBlur.toFixed(1)}px)`;
      ctx.drawImage(this.layer, 0, 0);
      ctx.filter = prev;
    } else {
      ctx.drawImage(this.layer, 0, 0);
    }
    ctx.restore();
  }

  private drawChromaBackground(clip: Clip, assets: Record<string, Asset>, luts: Record<string, Lut>, time: number) {
    const chroma = clip.chroma!;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const bgAsset = chroma.bgAssetId ? assets[chroma.bgAssetId] : undefined;
    if (bgAsset) {
      if (bgAsset.kind === 'image') {
        const img = this.image(bgAsset);
        if (img) {
          ctx.filter = chroma.bgBlur > 0 && supportsFilter() ? `blur(${chroma.bgBlur}px)` : 'none';
          drawCover(ctx, img, img.naturalWidth, img.naturalHeight, this.w, this.h, chroma.bgScale);
          ctx.filter = 'none';
        }
      } else if (bgAsset.kind === 'video') {
        const entry = this.pool.get(`${clip.id}::bg`, bgAsset, true) as MediaEntry | null;
        if (entry) {
          const el = entry.el as HTMLVideoElement;
          const src = ((time * 0.5) % Math.max(0.2, bgAsset.duration)) as number;
          if (Math.abs(el.currentTime - src) > 0.4) {
            try {
              el.currentTime = src;
            } catch {
              /* ignore */
            }
          }
          ctx.filter = chroma.bgBlur > 0 && supportsFilter() ? `blur(${chroma.bgBlur.toFixed(1)}px)` : 'none';
          if (el.readyState >= 2) drawCover(ctx, el, el.videoWidth, el.videoHeight, this.w, this.h, chroma.bgScale);
          else ctx.fillStyle = chroma.bgColor;
          if (el.readyState < 2) ctx.fillRect(0, 0, this.w, this.h);
          ctx.filter = 'none';
        }
      }
    } else if (chroma.bgColor && chroma.bgColor !== 'transparent') {
      ctx.fillStyle = chroma.bgColor;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    ctx.restore();
    void luts;
  }

  private drawVisual(
    clip: Clip,
    asset: Asset | undefined,
    local: number,
    luts: Record<string, Lut>,
    compare: boolean,
    extraBlur: number
  ) {
    const L = this.lctx;
    const W = this.w;
    const H = this.h;
    let source: CanvasImageSource | null = null;
    let sw = 0;
    let sh = 0;

    if (!asset) {
      L.fillStyle = 'rgba(255,255,255,0.06)';
      L.fillRect(0, 0, W, H);
      L.fillStyle = 'rgba(255,255,255,0.4)';
      L.font = `600 ${Math.round(H * 0.035)}px Inter, sans-serif`;
      L.textAlign = 'center';
      L.fillText('Media missing', W / 2, H / 2);
      return;
    }

    if (clip.type === 'video') {
      const entry = this.pool.get(clip.id, asset, true);
      if (entry) {
        const el = entry.el as HTMLVideoElement;
        const src = clipSourceTime(clip, local);
        const drift = src - el.currentTime;
        const playing = !!this.playing;
        if (Math.abs(drift) > (playing ? 0.3 : 0.02)) {
          try {
            el.currentTime = src;
          } catch {
            /* seeking not ready */
          }
        }
        if (Math.abs(el.playbackRate - clamp(clip.speed || 1, 0.1, 8)) > 0.01) {
          try {
            el.playbackRate = clamp(clip.speed || 1, 0.1, 8);
          } catch {
            /* ignore */
          }
        }
        if (el.readyState >= 2 && el.videoWidth) {
          source = el;
          sw = el.videoWidth;
          sh = el.videoHeight;
        }
      }
      if (!source && asset.thumb) {
        const img = this.thumbImage(asset);
        if (img) {
          source = img;
          sw = img.naturalWidth;
          sh = img.naturalHeight;
        }
      }
    } else if (clip.type === 'image') {
      const img = this.image(asset);
      if (img) {
        source = img;
        sw = img.naturalWidth || asset.width;
        sh = img.naturalHeight || asset.height;
      } else if (asset.thumb) {
        const t = this.thumbImage(asset);
        if (t) {
          source = t;
          sw = t.naturalWidth;
          sh = t.naturalHeight;
        }
      }
    }

    if (!source || !sw || !sh) {
      L.fillStyle = 'rgba(255,255,255,0.05)';
      L.fillRect(0, 0, W, H);
      return;
    }

    const t = clip.transform;
    const crop = t.crop || { t: 0, r: 0, b: 0, l: 0 };
    const sx = sw * crop.l;
    const sy = sh * crop.t;
    const sWidth = Math.max(1, sw * (1 - crop.l - crop.r));
    const sHeight = Math.max(1, sh * (1 - crop.t - crop.b));

    // fit
    let drawW: number;
    let drawH: number;
    if (t.fit === 'stretch') {
      drawW = W;
      drawH = H;
    } else {
      const scale = t.fit === 'cover' ? Math.max(W / sWidth, H / sHeight) : Math.min(W / sWidth, H / sHeight);
      drawW = sWidth * scale;
      drawH = sHeight * scale;
    }
    const k = clamp(t.scale || 1, 0.01, 12);
    drawW *= k;
    drawH *= k;

    // animated transform overrides
    const posX = keyVal(clip, 'x', local, t.x);
    const posY = keyVal(clip, 'y', local, t.y);
    const scaleKf = keyVal(clip, 'scale', local, 1);
    const rotKf = keyVal(clip, 'rotate', local, t.rotate);
    const opacityKf = keyVal(clip, 'opacity', local, 1);

    // ken burns quick effect
    const kb = clip.effects.find((e) => e.type === 'kenburns' && e.enabled);
    let kbScale = 1;
    if (kb) {
      const amt = num(kb, 'zoom', 0.12);
      kbScale = 1 + amt * clamp(local / Math.max(0.1, clip.duration), 0, 1);
    }

    const cx = posX * W;
    const cy = posY * H;
    const rotation = (rotKf * Math.PI) / 180;

    let filter = '';
    if (supportsFilter()) {
      const g = compare ? undefined : clip.grade;
      if (g && !needsPixelPass(clip)) {
        const brightness = 2 ** g.exposure;
        const contrast = 1 + g.contrast;
        const sat = 1 + g.saturation;
        if (Math.abs(brightness - 1) > 0.001) filter += `brightness(${brightness.toFixed(3)}) `;
        if (Math.abs(contrast - 1) > 0.001) filter += `contrast(${contrast.toFixed(3)}) `;
        if (Math.abs(sat - 1) > 0.001) filter += `saturate(${Math.max(0, sat).toFixed(3)}) `;
      }
      const blurFx = effectOf(clip, 'blur');
      const blurAmount = (blurFx ? num(blurFx, 'amount', 6) : 0) + extraBlur;
      if (blurAmount > 0.2) filter += `blur(${blurAmount.toFixed(2)}px) `;
      const sepiaFx = effectOf(clip, 'sepia');
      if (sepiaFx && !needsPixelPass(clip)) filter += `sepia(${clamp(num(sepiaFx, 'amount', 0.8), 0, 1)}) `;
    }

    L.save();
    if (filter) L.filter = filter.trim();
    L.globalAlpha = clamp(opacityKf, 0, 1);
    L.translate(cx, cy);
    L.rotate(rotation);
    L.scale((t.flipH ? -1 : 1) * scaleKf * kbScale, (t.flipV ? -1 : 1) * scaleKf * kbScale);
    // mirror quick effect
    const mirrorFx = clip.effects.find((e) => e.type === 'mirror' && e.enabled);
    if (mirrorFx) {
      const m = clamp(num(mirrorFx, 'amount', 1), 0, 1);
      L.scale(1, 1);
      L.globalAlpha *= m;
    }
    try {
      L.drawImage(source, sx, sy, sWidth, sHeight, -drawW / 2, -drawH / 2, drawW, drawH);
    } catch {
      /* tainted or not ready */
    }
    L.restore();

    if (mirrorFx) {
      // reflect the left half to the right for a kaleidoscope-like mirror
      const half = this.w / 2;
      L.save();
      L.globalAlpha = clamp(num(mirrorFx, 'amount', 0.9), 0, 1) * 0.9;
      L.translate(this.w, 0);
      L.scale(-1, 1);
      L.drawImage(this.layer, 0, 0, half, this.h, 0, 0, half, this.h);
      L.restore();
      void half;
    }

    // ---- composite effects ----
    const vignette = effectOf(clip, 'vignette');
    if (vignette) {
      const amount = clamp(num(vignette, 'amount', 0.55), 0, 1);
      const radius = clamp(num(vignette, 'radius', 0.75), 0.2, 1.6);
      const grad = L.createRadialGradient(
        this.w / 2,
        this.h / 2,
        Math.min(this.w, this.h) * (radius * 0.35),
        this.w / 2,
        this.h / 2,
        Math.max(this.w, this.h) * 0.75
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${amount})`);
      L.save();
      L.globalCompositeOperation = 'source-atop';
      L.fillStyle = grad;
      L.fillRect(0, 0, this.w, this.h);
      L.restore();
    }

    const grain = effectOf(clip, 'grain');
    if (grain) {
      const amount = clamp(num(grain, 'amount', 0.18), 0, 0.6);
      const tile = noiseTile();
      L.save();
      L.globalCompositeOperation = 'overlay';
      L.globalAlpha = amount;
      const size = 256;
      const ox = -((local * 37) % size);
      const oy = -((local * 61) % size);
      for (let x = ox; x < this.w; x += size) {
        for (let y = oy; y < this.h; y += size) L.drawImage(tile, x, y);
      }
      L.restore();
    }

    const glow = effectOf(clip, 'glow');
    if (glow) {
      const amount = clamp(num(glow, 'amount', 0.6), 0, 1);
      const radius = clamp(num(glow, 'radius', 18), 1, 80);
      const F = this.fxCtx;
      F.setTransform(1, 0, 0, 1, 0, 0);
      F.clearRect(0, 0, this.w, this.h);
      if (supportsFilter()) F.filter = `blur(${radius}px) brightness(1.25)`;
      F.drawImage(this.layer, 0, 0);
      F.filter = 'none';
      L.save();
      L.globalCompositeOperation = 'lighter';
      L.globalAlpha = amount;
      L.drawImage(this.fx, 0, 0);
      L.restore();
    }

    const wave = effectOf(clip, 'wave');
    if (wave) {
      const amp = clamp(num(wave, 'amount', 12), 0, 80);
      const freq = clamp(num(wave, 'frequency', 6), 0.5, 40);
      const F = this.fxCtx;
      F.setTransform(1, 0, 0, 1, 0, 0);
      F.clearRect(0, 0, this.w, this.h);
      const rows = Math.max(24, Math.floor(this.h / 4));
      const rowH = this.h / rows;
      for (let r = 0; r < rows; r++) {
        const offset = Math.sin((r / rows) * Math.PI * 2 * freq + local * 2) * amp;
        F.drawImage(
          this.layer,
          0,
          Math.floor(r * rowH),
          this.w,
          Math.ceil(rowH) + 1,
          offset,
          r * rowH,
          this.w,
          Math.ceil(rowH) + 1
        );
      }
      L.save();
      L.globalCompositeOperation = 'copy';
      L.drawImage(this.fx, 0, 0);
      L.restore();
    }
  }

  private thumbImage(asset: Asset): HTMLImageElement | null {
    if (!asset.thumb) return null;
    let img = this.thumbs.get(asset.id);
    if (!img) {
      img = new Image();
      img.src = asset.thumb;
      this.thumbs.set(asset.id, img);
      return null;
    }
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  /* ------------------------------ masks -------------------------------- */

  private applyMask(clip: Clip, L: CanvasRenderingContext2D) {
    const mask = clip.mask;
    if (!mask || mask.shape === 'none') return;
    const M = this.mctx;
    const W = this.w;
    const H = this.h;
    M.setTransform(1, 0, 0, 1, 0, 0);
    M.globalCompositeOperation = 'source-over';
    M.clearRect(0, 0, W, H);
    const feather = clamp(mask.feather, 0, 0.5);
    const blurPx = feather * Math.min(W, H) * 0.5;
    M.save();
    M.fillStyle = '#fff';
    if (mask.shape === 'rect' || mask.shape === 'ellipse') {
      const w = mask.w * W;
      const h = mask.h * H;
      const cx = mask.cx * W;
      const cy = mask.cy * H;
      M.translate(cx, cy);
      M.rotate((mask.angle * Math.PI) / 180);
      if (mask.shape === 'rect') {
        M.beginPath();
        const r = Math.min(w, h) * 0.06;
        roundRect(M, -w / 2, -h / 2, w, h, r);
        M.fill();
      } else {
        M.beginPath();
        M.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
        M.fill();
      }
    } else if (mask.shape === 'linear' || mask.shape === 'split') {
      const angle = (mask.angle * Math.PI) / 180;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const cx = mask.cx * W;
      const cy = mask.cy * H;
      const len = Math.hypot(W, H);
      const hard = mask.shape === 'split';
      const grad = M.createLinearGradient(cx - dx * len, cy - dy * len, cx + dx * len, cy + dy * len);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      if (hard) {
        grad.addColorStop(0.5 - 0.001, 'rgba(255,255,255,1)');
        grad.addColorStop(0.5 + 0.001, 'rgba(255,255,255,0)');
      } else {
        const edge = clamp(0.5 - feather * 0.5, 0.05, 0.49);
        grad.addColorStop(edge, 'rgba(255,255,255,1)');
        grad.addColorStop(Math.min(0.95, edge + feather + 0.001), 'rgba(255,255,255,0)');
      }
      M.fillStyle = grad;
      M.fillRect(0, 0, W, H);
    }
    M.restore();

    if (blurPx > 0.4 && supportsFilter() && mask.shape !== 'split' && mask.shape !== 'linear') {
      const F = this.fxCtx;
      F.setTransform(1, 0, 0, 1, 0, 0);
      F.clearRect(0, 0, W, H);
      F.filter = `blur(${blurPx.toFixed(1)}px)`;
      F.drawImage(this.mask, 0, 0);
      F.filter = 'none';
      M.save();
      M.globalCompositeOperation = 'copy';
      M.drawImage(this.fx, 0, 0);
      M.restore();
    }

    L.save();
    L.setTransform(1, 0, 0, 1, 0, 0);
    L.globalCompositeOperation = mask.invert ? 'destination-out' : 'destination-in';
    L.drawImage(this.mask, 0, 0);
    L.restore();
  }

  /* --------------------------- chroma + grade --------------------------- */

  private pixelPass(clip: Clip, local: number, luts: Record<string, Lut>, compare: boolean) {
    const L = this.lctx;
    const W = this.w;
    const H = this.h;
    let data: ImageData;
    try {
      data = L.getImageData(0, 0, W, H);
    } catch {
      return;
    }
    const px = data.data;
    const grade = clip.grade;
    const table = grade && !compare && !isGradeDefault(grade) ? buildGradeTable(grade) : null;
    const sat = grade && !compare ? grade.saturation : 0;
    const lut = grade?.lutId && !compare ? luts[grade.lutId] : undefined;
    const lutAmount = grade?.lutAmount ?? 1;
    const lutSize = lut?.size ?? 0;
    const lutData = lut?.data;
    const chroma = clip.chroma && !compare && clip.chroma.enabled ? clip.chroma : null;
    const key = chroma ? hexToRgb(chroma.color) : null;

    let kCb = 0;
    let kCr = 0;
    let keyChannel = 1;
    if (chroma && key) {
      const [kr, kg, kb] = key;
      kCb = (-0.168736 * kr - 0.331264 * kg + 0.5 * kb) / 255;
      kCr = (0.5 * kr - 0.418688 * kg - 0.081312 * kb) / 255;
      keyChannel = kg >= kr && kg >= kb ? 1 : kb >= kr ? 2 : 0;
    }
    const similarity = chroma ? clamp(chroma.similarity, 0, 1) : 0;
    const smoothness = chroma ? Math.max(0.005, clamp(chroma.smoothness, 0, 1) * 0.5) : 0;
    const edge = chroma ? clamp(chroma.edge, 0, 0.95) : 0;
    const spill = chroma ? clamp(chroma.spill, 0, 1) : 0;
    const transparency = chroma ? clamp(chroma.transparency, 0, 1) : 1;

    const sharpen = clip.effects.find((e) => e.type === 'sharpen' && e.enabled);
    const sharpenAmt = sharpen ? clamp(num(sharpen, 'amount', 0.5), 0, 1) : 0;
    const posterize = clip.effects.find((e) => e.type === 'posterize' && e.enabled);
    const posterizeLevels = posterize ? Math.max(2, Math.round(num(posterize, 'levels', 5))) : 0;
    const duotone = clip.effects.find((e) => e.type === 'duotone' && e.enabled);
    const duoA = duotone ? hexToRgb(String(duotone.params?.colorA ?? '#1b2340')) : null;
    const duoB = duotone ? hexToRgb(String(duotone.params?.colorB ?? '#ffb245')) : null;
    const bleach = clip.effects.find((e) => e.type === 'bleach' && e.enabled);
    const bleachAmt = bleach ? clamp(num(bleach, 'amount', 0.6), 0, 1) : 0;
    const sepiaFx = clip.effects.find((e) => e.type === 'sepia' && e.enabled);
    const sepiaAmt = sepiaFx ? clamp(num(sepiaFx, 'amount', 0.8), 0, 1) : 0;
    const threshold = clip.effects.find((e) => e.type === 'threshold' && e.enabled);
    const thresholdLevel = threshold ? clamp(num(threshold, 'levels', 0.5), 0, 1) * 255 : -1;
    const invertFx = clip.effects.find((e) => e.type === 'invert' && e.enabled);
    const invertAmt = invertFx ? clamp(num(invertFx, 'amount', 1), 0, 1) : 0;
    const solarFx = clip.effects.find((e) => e.type === 'solarize' && e.enabled);
    const solarAmt = solarFx ? clamp(num(solarFx, 'amount', 0.6), 0, 1) : 0;
    const solarLevel = solarAmt > 0 ? Math.max(1, solarAmt * 255) : 0;
    const tintFx = clip.effects.find((e) => e.type === 'tint' && e.enabled);
    const tintRgb = tintFx ? hexToRgb(String(tintFx.params?.color ?? '#ff9d5c')) : null;
    const tintAmt = tintFx ? clamp(num(tintFx, 'amount', 0.45), 0, 1) * 0.7 : 0;
    const pixelFx = clip.effects.find((e) => e.type === 'pixelate' && e.enabled);
    const pixelSize = pixelFx ? Math.max(1, Math.round(num(pixelFx, 'amount', 12))) : 1;
    const embossFx = clip.effects.find((e) => e.type === 'emboss' && e.enabled);
    const embossAmt = embossFx ? clamp(num(embossFx, 'amount', 0.6), 0, 1) : 0;
    const scanFx = clip.effects.find((e) => e.type === 'scanlines' && e.enabled);
    const scanAmt = scanFx ? clamp(num(scanFx, 'amount', 0.5), 0, 1) : 0;
    const leakFx = clip.effects.find((e) => e.type === 'lightLeak' && e.enabled);
    const leakRgb = leakFx ? hexToRgb(String(leakFx.params?.color ?? '#ffb066')) : null;
    const leakAmt = leakFx ? clamp(num(leakFx, 'amount', 0.5), 0, 1) * 0.65 : 0;

    const w4 = W * 4;
    const src = sharpenAmt > 0 ? new Uint8ClampedArray(px) : px;
    const amountE = 0.35 * sharpenAmt;

    for (let y = 0; y < H; y++) {
      const row = y * w4;
      for (let x = 0; x < W; x++) {
        const i = row + x * 4;
        const si =
          pixelSize > 1
            ? Math.floor(y / pixelSize) * pixelSize * w4 + Math.floor(x / pixelSize) * pixelSize * 4
            : i;
        let r = src[si];
        let g = src[si + 1];
        let b = src[si + 2];
        let a = src[si + 3];
        if (a === 0) continue;

        if (chroma && key) {
          const cb = (-0.168736 * r - 0.331264 * g + 0.5 * b) / 255;
          const cr = (0.5 * r - 0.418688 * g - 0.081312 * b) / 255;
          const dist = Math.hypot(cb - kCb, cr - kCr) * 2;
          let alpha = clamp((dist - similarity) / smoothness, 0, 1);
          alpha = alpha * alpha * (3 - 2 * alpha); // smoothstep
          if (edge > 0) alpha = clamp((alpha - edge) / Math.max(0.02, 1 - edge), 0, 1);
          a = a * alpha * transparency;
          if (a <= 1) {
            px[i + 3] = 0;
            continue;
          }
          if (spill > 0) {
            if (keyChannel === 1) {
              const maxRB = Math.max(r, b);
              if (g > maxRB) g = g - (g - maxRB) * spill;
            } else if (keyChannel === 2) {
              const maxRG = Math.max(r, g);
              if (b > maxRG) b = b - (b - maxRG) * spill;
            } else {
              const maxGB = Math.max(g, b);
              if (r > maxGB) r = r - (r - maxGB) * spill;
            }
          }
        }

        if (table) {
          const gi = Math.max(0, Math.min(255, Math.round(r))) * 3;
          r = table[gi];
          g = table[gi + 1];
          b = table[gi + 2];
        }

        if (sat !== 0) {
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const k2 = 1 + sat;
          r = luma + (r - luma) * k2;
          g = luma + (g - luma) * k2;
          b = luma + (b - luma) * k2;
        }

        if (bleachAmt > 0) {
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          r += (luma - r) * bleachAmt * 0.6;
          g += (luma - g) * bleachAmt * 0.6;
          b += (luma - b) * bleachAmt * 0.6;
          const c = 1 + bleachAmt * 0.55;
          r = (r - 128) * c + 128;
          g = (g - 128) * c + 128;
          b = (b - 128) * c + 128;
        }

        if (sepiaAmt > 0) {
          const sr = r * 0.393 + g * 0.769 + b * 0.189;
          const sg = r * 0.349 + g * 0.686 + b * 0.168;
          const sb = r * 0.272 + g * 0.534 + b * 0.131;
          r += (sr - r) * sepiaAmt;
          g += (sg - g) * sepiaAmt;
          b += (sb - b) * sepiaAmt;
        }

        if (invertAmt > 0) {
          r += (255 - r - r) * invertAmt;
          g += (255 - g - g) * invertAmt;
          b += (255 - b - b) * invertAmt;
        }

        if (solarLevel > 0) {
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          if (luma > solarLevel) {
            r = 255 - r;
            g = 255 - g;
            b = 255 - b;
          }
        }

        if (tintRgb) {
          r += (tintRgb[0] - r) * tintAmt;
          g += (tintRgb[1] - g) * tintAmt;
          b += (tintRgb[2] - b) * tintAmt;
        }

        if (embossAmt > 0) {
          const l = x > 0 ? si - 4 : si;
          const up = y > 0 ? si - w4 : si;
          const lumaHere = 0.299 * src[si] + 0.587 * src[si + 1] + 0.114 * src[si + 2];
          const lumaDiag = 0.299 * src[l] + 0.587 * src[up] + 0.114 * src[up];
          const edgeLuma = (lumaHere - lumaDiag) * embossAmt * 2.6 + 128;
          r = r * 0.35 + edgeLuma * 0.65;
          g = g * 0.35 + edgeLuma * 0.65;
          b = b * 0.35 + edgeLuma * 0.65;
        }

        if (duoA && duoB) {
          const luma = clamp((0.299 * r + 0.587 * g + 0.114 * b) / 255, 0, 1);
          r = duoA[0] + (duoB[0] - duoA[0]) * luma;
          g = duoA[1] + (duoB[1] - duoA[1]) * luma;
          b = duoA[2] + (duoB[2] - duoA[2]) * luma;
        }

        if (posterizeLevels > 0) {
          const step = 255 / (posterizeLevels - 1);
          r = Math.round(r / step) * step;
          g = Math.round(g / step) * step;
          b = Math.round(b / step) * step;
        }

        if (thresholdLevel >= 0) {
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          const v = luma >= thresholdLevel ? 255 : 0;
          r = v;
          g = v;
          b = v;
        }

        if (lutData && lutSize > 1) {
          const qr = clamp(r, 0, 255) / 255;
          const qg = clamp(g, 0, 255) / 255;
          const qb = clamp(b, 0, 255) / 255;
          const ri = Math.min(lutSize - 1, Math.round(qr * (lutSize - 1)));
          const gi = Math.min(lutSize - 1, Math.round(qg * (lutSize - 1)));
          const bi = Math.min(lutSize - 1, Math.round(qb * (lutSize - 1)));
          const idx = ((bi * lutSize + gi) * lutSize + ri) * 3;
          const lr = (lutData[idx] ?? 0) * 255;
          const lg = (lutData[idx + 1] ?? 0) * 255;
          const lb = (lutData[idx + 2] ?? 0) * 255;
          r += (lr - r) * lutAmount;
          g += (lg - g) * lutAmount;
          b += (lb - b) * lutAmount;
        }

        if (sharpenAmt > 0) {
          // unsharp mask: compare the source pixel with a 4-neighbour average
          const l = x > 0 ? i - 4 : i;
          const rt = x < W - 1 ? i + 4 : i;
          const up = y > 0 ? i - w4 : i;
          const dn = y < H - 1 ? i + w4 : i;
          const blurR = (src[l] + src[rt] + src[up] + src[dn]) / 4;
          const blurG = (src[l + 1] + src[rt + 1] + src[up + 1] + src[dn + 1]) / 4;
          const blurB = (src[l + 2] + src[rt + 2] + src[up + 2] + src[dn + 2]) / 4;
          r += (src[i] - blurR) * amountE * 2;
          g += (src[i + 1] - blurG) * amountE * 2;
          b += (src[i + 2] - blurB) * amountE * 2;
        }

        if (scanAmt > 0) {
          const line = y % 3 === 0 ? 1 - scanAmt * 0.34 : 1;
          r *= line;
          g *= line;
          b *= line;
        }

        if (leakRgb) {
          const dx = x / W - 0.82;
          const dy = y / H - 0.18;
          const glow = clamp(1 - Math.hypot(dx * 1.15, dy) * 1.35, 0, 1);
          const f = glow * glow * leakAmt;
          r += leakRgb[0] * f;
          g += leakRgb[1] * f;
          b += leakRgb[2] * f;
        }

        px[i] = r;
        px[i + 1] = g;
        px[i + 2] = b;
        px[i + 3] = a;
      }
    }

    // animated noise
    const noise = clip.effects.find((e) => e.type === 'noise' && e.enabled);
    if (noise) {
      const amt = clamp(num(noise, 'amount', 0.6), 0, 1) * 60;
      for (let i = 0; i < px.length; i += 4) {
        const n = (Math.random() - 0.5) * amt;
        px[i] += n;
        px[i + 1] += n;
        px[i + 2] += n;
      }
    }

    L.putImageData(data, 0, 0);
  }

  /* ------------------------------- audio -------------------------------- */

  private playing = false;

  /**
   * Keeps every audio-bearing element in sync with the playhead and applies
   * per-clip gain, fades, EQ, noise reduction and ducking.
   */
  syncAudio(project: Project, assets: Record<string, Asset>, time: number, playing: boolean) {
    this.playing = playing;
    const settings: ProjectSettings = project.settings;
    const voiceActive = project.tracks.some(
      (t) =>
        t.role === 'voice' &&
        !t.muted &&
        t.clips.some((c) => time >= c.start && time < c.start + c.duration)
    );
    for (const track of project.tracks) {
      if (track.hidden) continue;
      for (const clip of track.clips) {
        const asset = clip.assetId ? assets[clip.assetId] : undefined;
        if (!asset) continue;
        const carriesAudio = clip.type === 'audio' || (clip.type === 'video' && asset.hasAudio);
        if (!carriesAudio) continue;
        const active = time >= clip.start - 0.001 && time < clip.start + clip.duration;
        const entry = active ? this.pool.get(clip.id, asset, clip.type === 'video') : this.pool.peek(clip.id);
        if (!entry) continue;
        const el = entry.el;
        if (active && playing) {
          const src = clipSourceTime(clip, clamp(time - clip.start, 0, clip.duration));
          if (Math.abs(el.currentTime - src) > 0.32) {
            try {
              el.currentTime = src;
            } catch {
              /* ignore */
            }
          }
          const rate = clamp(clip.speed || 1, 0.1, 8);
          if (Math.abs(el.playbackRate - rate) > 0.01) {
            try {
              el.playbackRate = rate;
            } catch {
              /* ignore */
            }
          }
          if (el.paused && !clip.muted) {
            void el.play().catch(() => undefined);
          }
        } else if (!active && !el.paused) {
          el.pause();
        } else if (active && !playing && !el.paused) {
          el.pause();
        }

        const local = clamp(time - clip.start, 0, clip.duration);
        const fadeIn = clip.audio?.fadeIn ?? 0;
        const fadeOut = clip.audio?.fadeOut ?? 0;
        let gain = clip.audio?.gain ?? 1;
        gain *= clip.volume;
        gain *= track.volume;
        if (fadeIn > 0 && local < fadeIn) gain *= local / fadeIn;
        if (fadeOut > 0 && local > clip.duration - fadeOut) gain *= Math.max(0, (clip.duration - local) / fadeOut);
        gain *= keyVal(clip, 'volume', local, 1);
        if (clip.audio?.duck && voiceActive) gain *= 1 - clamp(clip.audio.duckAmount, 0, 1);
        if (clip.muted || track.muted || !active) gain = 0;
        this.audio.setGain(el, gain);
        if (clip.audio) {
          this.audio.setEq(el, {
            low: clip.audio.eq.low,
            mid: clip.audio.eq.mid,
            high: clip.audio.eq.high,
          });
          this.audio.setNoiseReduction(el, clip.audio.noiseReduction);
        }
        void settings;
      }
    }
  }

  pauseAll() {
    this.playing = false;
    this.pool.pauseAll();
  }
}

/* ------------------------------ helpers --------------------------------- */

let noiseCanvas: HTMLCanvasElement | null = null;
function noiseTile(): HTMLCanvasElement {
  if (noiseCanvas) return noiseCanvas;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.random() * 90;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  noiseCanvas = c;
  return c;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  sw: number,
  sh: number,
  W: number,
  H: number,
  scale = 1
) {
  if (!sw || !sh) return;
  const k = Math.max(W / sw, H / sh) * clamp(scale, 0.2, 4);
  const w = sw * k;
  const h = sh * k;
  ctx.drawImage(src, (W - w) / 2, (H - h) / 2, w, h);
}

export function keyVal(clip: Clip, prop: 'x' | 'y' | 'scale' | 'rotate' | 'opacity' | 'volume', local: number, fallback: number): number {
  const frames = clip.keyframes?.[prop];
  if (!frames || frames.length === 0) return fallback;
  if (frames.length === 1) return frames[0].v;
  const sorted = frames;
  if (local <= sorted[0].t) return sorted[0].v;
  if (local >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].v;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (local >= a.t && local <= b.t) {
      const span = Math.max(0.0001, b.t - a.t);
      let t = (local - a.t) / span;
      if ((a.ease ?? 'smooth') === 'smooth') t = t * t * (3 - 2 * t);
      return a.v + (b.v - a.v) * t;
    }
  }
  return fallback;
}

/* ------------------------------- text ---------------------------------- */

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

function fontStack(font: string, content: string): string {
  const arabic = ARABIC_RE.test(content);
  const families: Record<string, string> = {
    Sora: '"Sora", "Noto Kufi Arabic", system-ui, sans-serif',
    Inter: '"Inter", "Noto Kufi Arabic", system-ui, sans-serif',
    'Noto Kufi Arabic': '"Noto Kufi Arabic", "Sora", system-ui, sans-serif',
    Georgia: 'Georgia, "Noto Kufi Arabic", serif',
    'Courier New': '"Courier New", monospace',
    Impact: 'Impact, Haettenschweiler, "Noto Kufi Arabic", sans-serif',
    'Times New Roman': '"Times New Roman", "Noto Kufi Arabic", serif',
    'Arial': 'Arial, "Noto Kufi Arabic", sans-serif',
  };
  const stack = families[font] ?? `"${font}", "Noto Kufi Arabic", system-ui, sans-serif`;
  if (arabic && !stack.includes('Noto Kufi Arabic')) return '"Noto Kufi Arabic", ' + stack;
  return stack;
}

export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split('\n');
  const out: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

export function drawTextClip(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  W: number,
  H: number,
  local: number,
  compare: boolean
) {
  const t = clip.text;
  if (!t) return;
  const scale = H / 1080;
  const size = Math.max(6, t.size * scale);
  const content = t.uppercase ? t.content.toUpperCase() : t.content;
  if (!content.trim()) return;
  const isArabic = ARABIC_RE.test(content);
  const anim = compare ? 'none' : t.animation;
  const inDur = Math.min(0.9, Math.max(0.25, clip.duration * 0.35));
  const q = clamp(local / inDur, 0, 1);
  const eased = 1 - (1 - q) ** 3;
  const outQ = clamp((clip.duration - local) / 0.35, 0, 1);

  let alpha = 1;
  let dx = 0;
  let dy = 0;
  let scaleMul = 1;
  let visibleChars = content.length;
  let spacingMul = 1;
  let reveal = 1;

  switch (anim) {
    case 'fadeUp':
      alpha = eased;
      dy = (1 - eased) * size * 0.6;
      break;
    case 'typewriter':
      visibleChars = Math.ceil(content.length * clamp(q * 1.15, 0, 1));
      break;
    case 'pop':
      scaleMul = 0.72 + 0.28 * eased + Math.sin(q * Math.PI) * 0.06;
      alpha = clamp(q * 3, 0, 1);
      break;
    case 'slideIn':
      dx = (1 - eased) * W * 0.18 * (isArabic ? 1 : -1);
      alpha = eased;
      break;
    case 'reveal':
      reveal = eased;
      break;
    case 'bounce':
      dy = -Math.abs(Math.sin(q * Math.PI * 2)) * size * 0.35 * (1 - q);
      alpha = clamp(q * 4, 0, 1);
      break;
    case 'tracking':
      spacingMul = 1 + (1 - eased) * 3.2;
      alpha = eased;
      break;
    default:
      alpha = 1;
  }
  alpha *= Math.min(1, outQ * 3);

  const shown = content.slice(0, visibleChars);
  const lineHeight = size * t.lineHeight;
  ctx.save();
  ctx.font = `${t.italic ? 'italic ' : ''}${t.weight} ${size}px ${fontStack(t.font, content)}`;
  ctx.textAlign = t.align;
  ctx.textBaseline = 'middle';
  if (isArabic) ctx.direction = 'rtl';

  const letterSpacing = t.letterSpacing + (spacingMul - 1) * 8;
  const setSpacing = () => {
    const anyCtx = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    if ('letterSpacing' in anyCtx) anyCtx.letterSpacing = `${letterSpacing.toFixed(2)}px`;
  };
  setSpacing();

  const maxWidth = W * 0.86;
  const lines = wrapLines(ctx, shown, maxWidth);
  const totalH = lines.length * lineHeight;
  const baseX = t.x * W + dx;
  const baseY = t.y * H + dy - totalH / 2 + lineHeight / 2;
  const anchorX = t.align === 'center' ? 0 : t.align === 'left' ? -maxWidth / 2 : maxWidth / 2;

  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.translate(baseX, baseY);
  ctx.scale(scaleMul, scaleMul);

  // background box
  if (t.background.on) {
    let boxW = 0;
    for (const line of lines) boxW = Math.max(boxW, ctx.measureText(line).width);
    boxW += t.background.padding * 2;
    const boxH = totalH + t.background.padding * 2;
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1) * t.background.opacity;
    ctx.fillStyle = t.background.color;
    const bx = anchorX - boxW / 2;
    roundRect(ctx, bx, -boxH / 2, boxW, boxH, t.background.radius);
    ctx.fill();
    ctx.restore();
  }

  lines.forEach((line, i) => {
    const y = i * lineHeight;
    if (t.shadow.on) {
      ctx.save();
      ctx.shadowColor = t.shadow.color;
      ctx.shadowBlur = t.shadow.blur * scale;
      ctx.shadowOffsetX = t.shadow.x * scale;
      ctx.shadowOffsetY = t.shadow.y * scale;
      ctx.fillStyle = t.color;
      ctx.fillText(line, anchorX, y);
      ctx.restore();
    }
    if (t.outline.on) {
      ctx.lineWidth = Math.max(0.5, t.outline.width * scale * 2);
      ctx.strokeStyle = t.outline.color;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(line, anchorX, y);
    }
    ctx.fillStyle = t.color;
    ctx.fillText(line, anchorX, y);

    if (t.template === 'lowerThird' && i === 0) {
      ctx.save();
      ctx.globalAlpha *= 0.95;
      ctx.fillStyle = t.accent;
      const barW = Math.min(6 * scale, 10);
      const textW = ctx.measureText(line).width;
      const startX = anchorX - (t.align === 'center' ? textW / 2 : t.align === 'right' ? textW : 0);
      ctx.fillRect(startX - 16 * scale, y - size * 0.62, barW, size * 1.35);
      ctx.restore();
    }
  });

  // reveal bar
  if (anim === 'reveal') {
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    const w = maxWidth * reveal;
    ctx.fillStyle = t.accent;
    ctx.fillRect(anchorX - maxWidth / 2, totalH / 2 + size * 0.25, w, Math.max(2, 4 * scale));
    ctx.restore();
  }

  // secondary line
  if (t.subtext && t.template !== 'plain') {
    ctx.save();
    ctx.globalAlpha = clamp(alpha * 0.85, 0, 1);
    ctx.font = `${Math.max(300, t.weight - 300)} ${size * 0.42}px ${fontStack('Inter', t.subtext)}`;
    ctx.fillStyle = t.color;
    ctx.textAlign = t.align;
    if (isArabic) ctx.direction = 'rtl';
    const sub = t.uppercase ? t.subtext.toUpperCase() : t.subtext;
    const subLines = wrapLines(ctx, sub, maxWidth);
    subLines.forEach((line, i) => {
      ctx.fillText(line, anchorX, totalH / 2 + size * 0.15 + i * size * 0.55);
    });
    ctx.restore();
  }
  if (t.template === 'endCard') {
    ctx.save();
    ctx.globalAlpha = clamp(alpha * 0.9, 0, 1);
    ctx.fillStyle = t.accent;
    const w = Math.min(maxWidth * 0.4, size * 5);
    ctx.fillRect(anchorX - w / 2, totalH / 2 + size * 0.55, w, Math.max(2, 3 * scale));
    ctx.restore();
  }
  ctx.restore();
}
