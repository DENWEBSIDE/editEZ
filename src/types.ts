/* ------------------------------------------------------------------ *
 * editEZ — core document model
 * A project is plain JSON (safe to snapshot for undo / save to IndexedDB).
 * Binary media lives in IndexedDB, referenced by assetId.
 * ------------------------------------------------------------------ */

export type Lang = 'en' | 'ar';

export type AssetKind = 'video' | 'audio' | 'image' | 'subtitle' | 'music' | 'sfx';

export interface Asset {
  id: string;
  name: string;
  kind: AssetKind;
  mime: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
  /** blob: URL, re-created on load. runtime only. */
  url: string;
  /** data URL poster / thumbnail */
  thumb?: string;
  /** normalized 0..1 waveform peaks */
  peaks?: number[];
  license?: 'demo-generated' | 'user' | 'cc0';
  source?: 'import' | 'record' | 'generated';
  createdAt: number;
  missing?: boolean;
}

export type TrackKind = 'video' | 'overlay' | 'text' | 'audio' | 'subtitle';
export type TrackRole = 'main' | 'overlay' | 'text' | 'music' | 'voice' | 'sfx' | 'subtitle' | 'audio';

export interface Track {
  id: string;
  kind: TrackKind;
  role: TrackRole;
  name: string;
  locked: boolean;
  muted: boolean;
  hidden: boolean;
  height: number;
  volume: number;
  clips: Clip[];
}

export type ClipType = 'video' | 'image' | 'audio' | 'text' | 'subtitle' | 'shape' | 'adjust';

export type BlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface CropRect {
  t: number;
  r: number;
  b: number;
  l: number;
}

export interface Transform {
  x: number; // 0..1 normalized centre offset (0.5 = centre)
  y: number;
  scale: number; // 1 = fit to canvas
  rotate: number; // degrees
  flipH: boolean;
  flipV: boolean;
  crop: CropRect; // 0..0.45 per side
  fit: 'contain' | 'cover' | 'stretch';
}

export interface ChromaSettings {
  enabled: boolean;
  color: string;
  /** 0..1 — how far from the key colour a pixel still counts as background */
  similarity: number;
  /** 0..1 — soft edge zone width */
  smoothness: number;
  /** 0..1 — desaturate the key colour left on the subject */
  spill: number;
  /** 0..1 — erode the matte (edge cleanup) */
  edge: number;
  /** 0..1 — overall matte opacity */
  transparency: number;
  bgAssetId: string | null;
  bgColor: string;
  bgBlur: number;
  bgScale: number;
}

export interface Curves {
  black: number; // -1..1 lift of shadows
  mid: number; // -1..1
  white: number; // -1..1 lift of highlights
  gamma: number; // 0.4..2.2
}

export interface GradeSettings {
  exposure: number; // -2..2 stops
  brightness: number; // -1..1
  contrast: number; // -1..1
  saturation: number; // -1..1
  temperature: number; // -1..1  (cool -> warm)
  tint: number; // -1..1 (green -> magenta)
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  curves: Curves;
  lutId: string | null;
  lutAmount: number;
}

export interface Lut {
  id: string;
  name: string;
  size: number;
  data: number[]; // rgb triplets, size^3 * 3
  domain: [number, number];
  createdAt: number;
}

export type EffectType =
  | 'blur'
  | 'sharpen'
  | 'vignette'
  | 'grain'
  | 'glow'
  | 'wave'
  | 'posterize'
  | 'duotone'
  | 'bleach'
  | 'sepia'
  | 'noise'
  | 'threshold'
  | 'chromaShift'
  | 'mirror'
  | 'kenburns'
  | 'invert'
  | 'solarize'
  | 'tint'
  | 'pixelate'
  | 'emboss'
  | 'scanlines'
  | 'lightLeak'
  | 'none';

export interface EffectInstance {
  id: string;
  type: EffectType;
  enabled: boolean;
  params: Record<string, number | string | boolean>;
}

export interface Keyframe {
  t: number; // seconds relative to clip start
  v: number;
  ease?: 'linear' | 'smooth';
}

export type KeyframeProp = 'opacity' | 'x' | 'y' | 'scale' | 'rotate' | 'volume';

export type MaskShape = 'none' | 'rect' | 'ellipse' | 'linear' | 'split';

export interface MaskSettings {
  shape: MaskShape;
  cx: number;
  cy: number;
  w: number;
  h: number;
  feather: number;
  invert: boolean;
  angle: number;
  keyframed?: boolean;
}

export type TransitionType = 'none' | 'fade' | 'dissolve' | 'wipe' | 'slideLeft' | 'slideRight' | 'zoom' | 'blurIn';

export interface Transition {
  type: TransitionType;
  duration: number; // seconds
  direction?: 'left' | 'right' | 'up' | 'down';
}

export interface TextShadow {
  on: boolean;
  color: string;
  blur: number;
  x: number;
  y: number;
}

export type TextAnimation =
  | 'none'
  | 'fadeUp'
  | 'typewriter'
  | 'pop'
  | 'slideIn'
  | 'reveal'
  | 'bounce'
  | 'tracking';

export type TextTemplate = 'plain' | 'title' | 'lowerThird' | 'caption' | 'endCard' | 'announcement';

export interface TextStyle {
  content: string;
  font: string;
  size: number; // px relative to a 1080p canvas height
  weight: number;
  italic: boolean;
  uppercase: boolean;
  color: string;
  align: 'left' | 'center' | 'right';
  x: number; // 0..1
  y: number;
  letterSpacing: number;
  lineHeight: number;
  outline: { on: boolean; color: string; width: number };
  shadow: TextShadow;
  background: { on: boolean; color: string; padding: number; radius: number; opacity: number };
  animation: TextAnimation;
  template: TextTemplate;
  accent: string;
  subtext: string;
}

export interface AudioFx {
  gain: number; // 0..2
  fadeIn: number;
  fadeOut: number;
  loop: boolean;
  eq: { low: number; mid: number; high: number }; // -12..12 dB
  noiseReduction: number; // 0..1
  duck: boolean;
  duckAmount: number; // 0..1
  normalize: boolean;
}

export interface Clip {
  id: string;
  trackId: string;
  type: ClipType;
  name: string;
  assetId?: string;
  start: number; // seconds on timeline
  duration: number;
  inPoint: number; // seconds into source
  speed: number;
  reverse: boolean;
  freezeFrame: boolean;
  opacity: number;
  blend: BlendMode;
  volume: number;
  muted: boolean;
  color: string;
  transform: Transform;
  chroma?: ChromaSettings;
  grade?: GradeSettings;
  effects: EffectInstance[];
  transitionIn?: Transition;
  transitionOut?: Transition;
  mask?: MaskSettings;
  text?: TextStyle;
  audio?: AudioFx;
  keyframes: Partial<Record<KeyframeProp, Keyframe[]>>;
  groupId?: string | null;
  shapes?: { fill: string; kind: 'bar' | 'circle' | 'line' } | null;
}

export interface Marker {
  id: string;
  t: number;
  label: string;
  color: string;
}

export interface CanvasSettings {
  w: number;
  h: number;
  fps: number;
  bg: string;
}

export interface ProjectSettings {
  proxy: boolean;
  proxyQuality: number; // 0.3..1 preview scale
  snapping: boolean;
  snapThreshold: number;
  safeMargins: boolean;
  showGrid: boolean;
  ripple: boolean;
  autosave: boolean;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  canvas: CanvasSettings;
  tracks: Track[];
  markers: Marker[];
  settings: ProjectSettings;
  duration: number; // explicit end, extended automatically
  templateId?: string;
  /** legacy/unknown fields are preserved */
  [key: string]: unknown;
}

export interface ProjectMeta {
  id: string;
  name: string;
  updatedAt: number;
  createdAt: number;
  duration: number;
  thumb?: string;
  clipCount?: number;
  size?: number;
}

/* ---------------------------- utilities ---------------------------- */

export const uid = (prefix = 'id') =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const round = (v: number, p = 3) => Math.round(v * 10 ** p) / 10 ** p;

export const defaultChroma = (): ChromaSettings => ({
  enabled: true,
  color: '#00b140',
  similarity: 0.32,
  smoothness: 0.16,
  spill: 0.5,
  edge: 0.12,
  transparency: 1,
  bgAssetId: null,
  bgColor: '#101322',
  bgBlur: 0,
  bgScale: 1,
});

export const defaultGrade = (): GradeSettings => ({
  exposure: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  curves: { black: 0, mid: 0, white: 0, gamma: 1 },
  lutId: null,
  lutAmount: 1,
});

export const defaultTransform = (): Transform => ({
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotate: 0,
  flipH: false,
  flipV: false,
  crop: { t: 0, r: 0, b: 0, l: 0 },
  fit: 'contain',
});

export const defaultMask = (): MaskSettings => ({
  shape: 'none',
  cx: 0.5,
  cy: 0.5,
  w: 0.6,
  h: 0.6,
  feather: 0.08,
  invert: false,
  angle: 0,
});

export const defaultAudioFx = (): AudioFx => ({
  gain: 1,
  fadeIn: 0,
  fadeOut: 0,
  loop: false,
  eq: { low: 0, mid: 0, high: 0 },
  noiseReduction: 0,
  duck: false,
  duckAmount: 0.6,
  normalize: false,
});

export const defaultText = (content = ''): TextStyle => ({
  content,
  font: 'Sora',
  size: 64,
  weight: 600,
  italic: false,
  uppercase: false,
  color: '#ffffff',
  align: 'center',
  x: 0.5,
  y: 0.5,
  letterSpacing: 0,
  lineHeight: 1.2,
  outline: { on: false, color: '#000000', width: 2 },
  shadow: { on: true, color: '#000000', blur: 24, x: 0, y: 6 },
  background: { on: false, color: '#000000', padding: 18, radius: 12, opacity: 0.55 },
  animation: 'fadeUp',
  template: 'plain',
  accent: '#7c5cff',
  subtext: '',
});

export const defaultSettings = (): ProjectSettings => ({
  proxy: true,
  proxyQuality: 0.66,
  snapping: true,
  snapThreshold: 8,
  safeMargins: false,
  showGrid: false,
  ripple: false,
  autosave: true,
});

export const trackKindForClip = (type: ClipType): TrackKind => {
  switch (type) {
    case 'audio':
      return 'audio';
    case 'text':
      return 'text';
    case 'subtitle':
      return 'subtitle';
    case 'shape':
    case 'image':
      return 'overlay';
    default:
      return 'video';
  }
};

export const clipSourceTime = (clip: Clip, localTime: number): number => {
  const t = clamp(localTime, 0, clip.duration);
  if (clip.freezeFrame) return clip.inPoint;
  const src = clip.inPoint + (clip.reverse ? clip.duration - t : t) * clip.speed;
  return Math.max(0, src);
};
