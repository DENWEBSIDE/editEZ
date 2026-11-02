/* Catalogues: canvas sizes, export presets, effects, fonts, text templates. */
import type { BlendMode, EffectType, GradeSettings, TextAnimation, TextStyle, TextTemplate, TransitionType } from '../types';
import type { TKey } from '../i18n/en';

export interface AspectPreset {
  id: string;
  label: TKey;
  w: number;
  h: number;
}

export const ASPECTS: AspectPreset[] = [
  { id: '16:9', label: 'aspect.16:9', w: 1920, h: 1080 },
  { id: '9:16', label: 'aspect.9:16', w: 1080, h: 1920 },
  { id: '1:1', label: 'aspect.1:1', w: 1080, h: 1080 },
  { id: '4:5', label: 'aspect.4:5', w: 1080, h: 1350 },
  { id: '4:3', label: 'aspect.4:3', w: 1440, h: 1080 },
  { id: '21:9', label: 'aspect.21:9', w: 2560, h: 1080 },
];

export interface ExportPreset {
  id: string;
  label: TKey;
  w: number;
  h: number;
  fps: number;
  bitrate: number;
  heavy?: boolean;
}

export const EXPORT_PRESETS: ExportPreset[] = [
  { id: 'youtube', label: 'export.preset.youtube', w: 1920, h: 1080, fps: 30, bitrate: 10_000_000 },
  { id: 'youtube4k', label: 'export.preset.youtube4k', w: 3840, h: 2160, fps: 30, bitrate: 28_000_000, heavy: true },
  { id: 'shorts', label: 'export.preset.shorts', w: 1080, h: 1920, fps: 30, bitrate: 8_000_000 },
  { id: 'tiktok', label: 'export.preset.tiktok', w: 1080, h: 1920, fps: 30, bitrate: 7_000_000 },
  { id: 'reels', label: 'export.preset.reels', w: 1080, h: 1920, fps: 30, bitrate: 8_000_000 },
  { id: 'instagram', label: 'export.preset.instagram', w: 1080, h: 1350, fps: 30, bitrate: 7_000_000 },
  { id: 'square', label: 'export.preset.square', w: 1080, h: 1080, fps: 30, bitrate: 6_000_000 },
];

export const RESOLUTIONS = [
  { w: 3840, h: 2160, label: '2160p · 4K', heavy: true },
  { w: 2560, h: 1440, label: '1440p · QHD' },
  { w: 1920, h: 1080, label: '1080p · Full HD' },
  { w: 1280, h: 720, label: '720p · HD' },
  { w: 854, h: 480, label: '480p · SD' },
];

export const QUALITIES = [
  { id: 'low', label: 'export.quality.low' as TKey, factor: 0.45 },
  { id: 'medium', label: 'export.quality.medium' as TKey, factor: 0.7 },
  { id: 'high', label: 'export.quality.high' as TKey, factor: 1 },
  { id: 'max', label: 'export.quality.max' as TKey, factor: 1.5 },
];

export const FPS_OPTIONS = [24, 25, 30, 50, 60];

export const FONTS: { id: string; label: string; note?: string }[] = [
  { id: 'Sora', label: 'Sora' },
  { id: 'Inter', label: 'Inter' },
  { id: 'Noto Kufi Arabic', label: 'Noto Kufi Arabic', note: 'ar' },
  { id: 'Georgia', label: 'Georgia' },
  { id: 'Times New Roman', label: 'Times New Roman' },
  { id: 'Arial', label: 'Arial' },
  { id: 'Impact', label: 'Impact' },
  { id: 'Courier New', label: 'Courier New' },
];

export const BLEND_MODES: BlendMode[] = [
  'source-over',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'color-dodge',
  'color-burn',
  'hue',
  'saturation',
  'color',
  'luminosity',
];

export const blendLabel = (mode: BlendMode): TKey => `blend.${mode}` as TKey;

export const TRANSITIONS: TransitionType[] = [
  'none',
  'fade',
  'dissolve',
  'wipe',
  'slideLeft',
  'slideRight',
  'zoom',
  'blurIn',
];

export const transitionLabel = (type: TransitionType): TKey => `props.transition.${type}` as TKey;

export const TEXT_ANIMATIONS: TextAnimation[] = [
  'none',
  'fadeUp',
  'typewriter',
  'pop',
  'slideIn',
  'reveal',
  'bounce',
  'tracking',
];

export const TEXT_TEMPLATES: { id: TextTemplate; label: TKey; desc: TKey }[] = [
  { id: 'title', label: 'text.template.title', desc: 'text.template.templateDesc' },
  { id: 'lowerThird', label: 'text.template.lowerThird', desc: 'text.template.lowerThirdDesc' },
  { id: 'caption', label: 'text.template.caption', desc: 'text.template.captionDesc' },
  { id: 'endCard', label: 'text.template.endCard', desc: 'text.template.endCardDesc' },
  { id: 'announcement', label: 'text.template.announcement', desc: 'text.template.announcementDesc' },
  { id: 'plain', label: 'text.template.plain', desc: 'text.template.plainDesc' },
];

export type EffectCategory = 'color' | 'blur' | 'light' | 'style' | 'motion' | 'audio';

export interface ParamDef {
  key: string;
  label: TKey;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface EffectDef {
  type: EffectType;
  label: TKey;
  desc: TKey;
  category: EffectCategory;
  params: ParamDef[];
  /** approximate CSS filter used for library thumbnails */
  previewCss?: string;
  overlay?: 'vignette' | 'grain' | 'glow';
}

const amountParam = (min: number, max: number, step: number, def: number): ParamDef => ({
  key: 'amount',
  label: 'effects.param.amount',
  min,
  max,
  step,
  default: def,
});

export const EFFECTS: EffectDef[] = [
  {
    type: 'blur',
    label: 'effect.blur',
    desc: 'effect.blurDesc',
    category: 'blur',
    params: [{ key: 'amount', label: 'effects.param.radius', min: 0, max: 40, step: 0.5, default: 6 }],
    previewCss: 'blur(2px)',
  },
  {
    type: 'sharpen',
    label: 'effect.sharpen',
    desc: 'effect.sharpenDesc',
    category: 'blur',
    params: [amountParam(0, 1, 0.01, 0.45)],
    previewCss: 'contrast(1.25) saturate(1.05)',
  },
  {
    type: 'vignette',
    label: 'effect.vignette',
    desc: 'effect.vignetteDesc',
    category: 'light',
    params: [
      amountParam(0, 1, 0.01, 0.55),
      { key: 'radius', label: 'effects.param.radius', min: 0.2, max: 1.6, step: 0.01, default: 0.75 },
    ],
    overlay: 'vignette',
  },
  {
    type: 'grain',
    label: 'effect.grain',
    desc: 'effect.grainDesc',
    category: 'style',
    params: [amountParam(0, 0.6, 0.01, 0.18)],
    overlay: 'grain',
  },
  {
    type: 'glow',
    label: 'effect.glow',
    desc: 'effect.glowDesc',
    category: 'light',
    params: [
      amountParam(0, 1, 0.01, 0.6),
      { key: 'radius', label: 'effects.param.radius', min: 1, max: 80, step: 1, default: 18 },
    ],
    overlay: 'glow',
  },
  {
    type: 'wave',
    label: 'effect.wave',
    desc: 'effect.waveDesc',
    category: 'style',
    params: [
      { key: 'amount', label: 'effects.param.amount', min: 0, max: 60, step: 1, default: 12 },
      { key: 'frequency', label: 'effects.param.frequency', min: 0.5, max: 20, step: 0.5, default: 5 },
    ],
  },
  {
    type: 'posterize',
    label: 'effect.posterize',
    desc: 'effect.posterizeDesc',
    category: 'style',
    params: [{ key: 'levels', label: 'effects.param.levels', min: 2, max: 20, step: 1, default: 5 }],
    previewCss: 'contrast(1.6) saturate(1.2)',
  },
  {
    type: 'duotone',
    label: 'effect.duotone',
    desc: 'effect.duotoneDesc',
    category: 'color',
    params: [],
    previewCss: 'grayscale(1) sepia(0.6) hue-rotate(190deg) saturate(1.6)',
  },
  {
    type: 'bleach',
    label: 'effect.bleach',
    desc: 'effect.bleachDesc',
    category: 'color',
    params: [amountParam(0, 1, 0.01, 0.6)],
    previewCss: 'contrast(1.45) saturate(0.55) brightness(1.05)',
  },
  {
    type: 'sepia',
    label: 'effect.sepia',
    desc: 'effect.sepiaDesc',
    category: 'color',
    params: [amountParam(0, 1, 0.01, 0.8)],
    previewCss: 'sepia(0.9)',
  },
  {
    type: 'noise',
    label: 'effect.noise',
    desc: 'effect.noiseDesc',
    category: 'style',
    params: [amountParam(0, 1, 0.01, 0.5)],
    overlay: 'grain',
  },
  {
    type: 'threshold',
    label: 'effect.threshold',
    desc: 'effect.thresholdDesc',
    category: 'style',
    params: [{ key: 'levels', label: 'effects.param.levels', min: 0, max: 1, step: 0.01, default: 0.5 }],
    previewCss: 'grayscale(1) contrast(6)',
  },
  {
    type: 'mirror',
    label: 'effect.mirror',
    desc: 'effect.mirrorDesc',
    category: 'style',
    params: [amountParam(0, 1, 0.01, 0.9)],
  },
  {
    type: 'kenburns',
    label: 'effect.kenburns',
    desc: 'effect.kenburnsDesc',
    category: 'motion',
    params: [{ key: 'zoom', label: 'effects.param.zoom', min: 0.02, max: 0.5, step: 0.01, default: 0.12 }],
  },
  {
    type: 'invert',
    label: 'effect.invert',
    desc: 'effect.invertDesc',
    category: 'style',
    params: [amountParam(0, 1, 0.01, 1)],
    previewCss: 'invert(1)',
  },
  {
    type: 'solarize',
    label: 'effect.solarize',
    desc: 'effect.solarizeDesc',
    category: 'style',
    params: [{ key: 'amount', label: 'effects.param.threshold', min: 0, max: 1, step: 0.01, default: 0.6 }],
    previewCss: 'invert(0.35) saturate(1.4)',
  },
  {
    type: 'tint',
    label: 'effect.tint',
    desc: 'effect.tintDesc',
    category: 'color',
    params: [amountParam(0, 1, 0.01, 0.45)],
    previewCss: 'sepia(0.5) hue-rotate(-18deg) saturate(1.6)',
  },
  {
    type: 'pixelate',
    label: 'effect.pixelate',
    desc: 'effect.pixelateDesc',
    category: 'style',
    params: [{ key: 'amount', label: 'effects.param.size', min: 2, max: 48, step: 1, default: 12 }],
  },
  {
    type: 'emboss',
    label: 'effect.emboss',
    desc: 'effect.embossDesc',
    category: 'style',
    params: [amountParam(0, 1, 0.01, 0.6)],
    previewCss: 'contrast(1.6) grayscale(0.6)',
  },
  {
    type: 'scanlines',
    label: 'effect.scanlines',
    desc: 'effect.scanlinesDesc',
    category: 'style',
    params: [amountParam(0, 1, 0.01, 0.5)],
    previewCss: 'contrast(1.2) brightness(0.9)',
  },
  {
    type: 'lightLeak',
    label: 'effect.lightleak',
    desc: 'effect.lightleakDesc',
    category: 'light',
    params: [amountParam(0, 1, 0.01, 0.5)],
    previewCss: 'saturate(1.3) brightness(1.1) sepia(0.25)',
  },
];


/* ------------------------------- looks ---------------------------------- */
/* One-tap CapCut-style filters: a grade tweak plus a small effect stack. */
export interface LookEffect {
  type: EffectType;
  params: Record<string, number | string>;
}

export interface LookDef {
  id: string;
  label: TKey;
  desc: TKey;
  swatch: string;
  grade: Partial<GradeSettings>;
  effects: LookEffect[];
}

export const LOOKS: LookDef[] = [
  {
    id: 'cinema',
    label: 'look.cinema',
    desc: 'look.cinemaDesc',
    swatch: 'linear-gradient(135deg, #0e3550, #2f8fb8 60%, #f0c37a)',
    grade: { temperature: -0.24, contrast: 0.16, saturation: -0.05, shadows: 0.1 },
    effects: [{ type: 'vignette', params: { amount: 0.3 } }],
  },
  {
    id: 'golden',
    label: 'look.golden',
    desc: 'look.goldenDesc',
    swatch: 'linear-gradient(135deg, #ffd89b, #f6a25a 60%, #a8501f)',
    grade: { temperature: 0.34, saturation: 0.14, exposure: 0.08 },
    effects: [{ type: 'glow', params: { amount: 0.35 } }],
  },
  {
    id: 'neon',
    label: 'look.neon',
    desc: 'look.neonDesc',
    swatch: 'linear-gradient(135deg, #1b1f4b, #7b2bff 55%, #16e0ff)',
    grade: { tint: 0.24, contrast: 0.2, saturation: 0.26 },
    effects: [
      { type: 'glow', params: { amount: 0.45 } },
      { type: 'scanlines', params: { amount: 0.25 } },
    ],
  },
  {
    id: 'vintage',
    label: 'look.vintage',
    desc: 'look.vintageDesc',
    swatch: 'linear-gradient(135deg, #d8c3a5, #b08968 60%, #6b4f3a)',
    grade: { temperature: 0.2, saturation: -0.24, blacks: 0.12 },
    effects: [
      { type: 'sepia', params: { amount: 0.5 } },
      { type: 'grain', params: { amount: 0.32 } },
      { type: 'vignette', params: { amount: 0.42 } },
    ],
  },
  {
    id: 'noir',
    label: 'look.noir',
    desc: 'look.noirDesc',
    swatch: 'linear-gradient(135deg, #2b2b2b, #8c8c8c 70%, #f2f2f2)',
    grade: { saturation: -1, contrast: 0.34 },
    effects: [
      { type: 'vignette', params: { amount: 0.55 } },
      { type: 'grain', params: { amount: 0.22 } },
    ],
  },
  {
    id: 'dreamy',
    label: 'look.dreamy',
    desc: 'look.dreamyDesc',
    swatch: 'linear-gradient(135deg, #ffe3f1, #c9d6ff 55%, #9be7ff)',
    grade: { brightness: 0.08, contrast: -0.12, saturation: 0.1 },
    effects: [
      { type: 'blur', params: { amount: 1.2 } },
      { type: 'glow', params: { amount: 0.5 } },
    ],
  },
  {
    id: 'pop',
    label: 'look.pop',
    desc: 'look.popDesc',
    swatch: 'linear-gradient(135deg, #ff5c8a, #ffd166 55%, #16c5e6)',
    grade: { contrast: 0.22, saturation: 0.34 },
    effects: [{ type: 'sharpen', params: { amount: 0.6 } }],
  },
  {
    id: 'faded',
    label: 'look.faded',
    desc: 'look.fadedDesc',
    swatch: 'linear-gradient(135deg, #dfe7f0, #c3cfda 60%, #9aa8b6)',
    grade: { contrast: -0.2, blacks: 0.2, saturation: -0.14 },
    effects: [{ type: 'bleach', params: { amount: 0.35 } }],
  },
  {
    id: 'infrared',
    label: 'look.infrared',
    desc: 'look.infraredDesc',
    swatch: 'linear-gradient(135deg, #0b2a4a, #ff5a3c 65%, #ffd166)',
    grade: { saturation: 0.2, contrast: 0.12 },
    effects: [{ type: 'duotone', params: { colorA: '#0b2a4a', colorB: '#ff5a3c' } }],
  },
  {
    id: 'vhs',
    label: 'look.vhs',
    desc: 'look.vhsDesc',
    swatch: 'linear-gradient(135deg, #14322c, #3f7f6f 55%, #d4ff7a)',
    grade: { contrast: 0.1, saturation: 0.22 },
    effects: [
      { type: 'chromaShift', params: { amount: 2 } },
      { type: 'scanlines', params: { amount: 0.4 } },
      { type: 'grain', params: { amount: 0.28 } },
    ],
  },
  {
    id: 'comic',
    label: 'look.comic',
    desc: 'look.comicDesc',
    swatch: 'linear-gradient(135deg, #ffd166, #ef476f 55%, #118ab2)',
    grade: { saturation: 0.4, contrast: 0.28 },
    effects: [
      { type: 'posterize', params: { levels: 5 } },
      { type: 'sharpen', params: { amount: 0.8 } },
    ],
  },
  {
    id: 'frost',
    label: 'look.frost',
    desc: 'look.frostDesc',
    swatch: 'linear-gradient(135deg, #dff3ff, #9ed8ff 55%, #4aa3d8)',
    grade: { temperature: -0.3, brightness: 0.05 },
    effects: [{ type: 'tint', params: { amount: 0.35, color: '#8fd4ff' } }],
  },
];

export const effectDef = (type: EffectType): EffectDef | undefined => EFFECTS.find((e) => e.type === type);

export interface QuickAction {
  id: 'slowmo' | 'speedup' | 'reverse' | 'freeze' | 'fade' | 'slowmoQuarter' | 'fastDouble';
  label: TKey;
  desc: TKey;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'slowmo', label: 'effect.slowmo', desc: 'effect.slowmoDesc' },
  { id: 'speedup', label: 'effect.speedup', desc: 'effect.speedupDesc' },
  { id: 'reverse', label: 'props.timing.reverse', desc: 'effect.mirrorDesc' },
  { id: 'freeze', label: 'timeline.freezeFrame', desc: 'effect.kenburnsDesc' },
  { id: 'fade', label: 'effect.fade', desc: 'effect.fadeDesc' },
];

export interface TextPresetSpec {
  template: TextTemplate;
  text: Partial<TextStyle>;
  duration: number;
}

export const TEXT_PRESETS: Record<string, TextPresetSpec> = {
  title: {
    template: 'title',
    duration: 3,
    text: {
      template: 'title',
      content: 'Your story starts here',
      subtext: '',
      size: 84,
      weight: 700,
      animation: 'fadeUp',
      y: 0.5,
      color: '#ffffff',
      letterSpacing: 0,
    },
  },
  lowerThird: {
    template: 'lowerThird',
    duration: 4,
    text: {
      template: 'lowerThird',
      content: 'Layla Haddad',
      subtext: 'Creative director',
      size: 46,
      weight: 700,
      align: 'left',
      x: 0.24,
      y: 0.78,
      animation: 'slideIn',
      background: { on: true, color: '#0b0d16', padding: 16, radius: 10, opacity: 0.62 },
      letterSpacing: 0.2,
    },
  },
  caption: {
    template: 'caption',
    duration: 3,
    text: {
      template: 'caption',
      content: 'Add your caption here',
      size: 40,
      weight: 600,
      y: 0.86,
      animation: 'fadeUp',
      outline: { on: true, color: '#000000', width: 2 },
      background: { on: false, color: '#000000', padding: 12, radius: 8, opacity: 0.5 },
    },
  },
  endCard: {
    template: 'endCard',
    duration: 4,
    text: {
      template: 'endCard',
      content: 'Thanks for watching',
      subtext: 'Subscribe for more',
      size: 72,
      weight: 700,
      animation: 'pop',
      y: 0.45,
    },
  },
  announcement: {
    template: 'announcement',
    duration: 3,
    text: {
      template: 'announcement',
      content: 'NEW DROP',
      subtext: 'Available now',
      size: 96,
      weight: 700,
      uppercase: true,
      animation: 'tracking',
      color: '#0b0d16',
      background: { on: true, color: '#ffb245', padding: 26, radius: 14, opacity: 0.96 },
    },
  },
  plain: {
    template: 'plain',
    duration: 3,
    text: { template: 'plain', content: 'New text', size: 60, weight: 600, animation: 'fadeUp' },
  },
  /* ------------------------- ready-made animations ---------------------- */
  neonTitle: {
    template: 'title',
    duration: 3.2,
    text: {
      template: 'title',
      content: 'NEON NIGHTS',
      size: 86,
      weight: 700,
      animation: 'tracking',
      color: '#8ff6ff',
      letterSpacing: 0.32,
      outline: { on: true, color: '#0a2740', width: 4 },
      shadow: { on: true, color: '#16c5e6', blur: 28, x: 0, y: 0 },
      y: 0.5,
    },
  },
  popBold: {
    template: 'title',
    duration: 2.6,
    text: {
      template: 'title',
      content: 'WATCH THIS',
      size: 98,
      weight: 700,
      animation: 'pop',
      color: '#ffffff',
      outline: { on: true, color: '#0a6cff', width: 10 },
      y: 0.5,
    },
  },
  typeStory: {
    template: 'plain',
    duration: 3.6,
    text: {
      template: 'plain',
      content: 'It started with one idea…',
      size: 54,
      weight: 500,
      animation: 'typewriter',
      color: '#ffffff',
      align: 'center',
      y: 0.62,
    },
  },
  quoteCard: {
    template: 'caption',
    duration: 4,
    text: {
      template: 'caption',
      content: '“Make it simple, then make it beautiful.”',
      size: 44,
      weight: 600,
      animation: 'reveal',
      align: 'center',
      color: '#ffffff',
      background: { on: true, color: '#0a6cff', padding: 22, radius: 16, opacity: 0.86 },
      y: 0.5,
      x: 0.5,
    },
  },
  sticker: {
    template: 'lowerThird',
    duration: 3.4,
    text: {
      template: 'lowerThird',
      content: 'Youssef Mosbeh',
      subtext: 'Creator',
      size: 42,
      weight: 700,
      animation: 'slideIn',
      align: 'left',
      x: 0.22,
      y: 0.8,
      color: '#0b1a2e',
      background: { on: true, color: '#ffe066', padding: 16, radius: 12, opacity: 1 },
      letterSpacing: 0.08,
    },
  },
  endCta: {
    template: 'endCard',
    duration: 4.5,
    text: {
      template: 'endCard',
      content: 'Follow for more',
      subtext: '@youssefmosbeh',
      size: 64,
      weight: 700,
      animation: 'bounce',
      color: '#ffffff',
      align: 'center',
      y: 0.5,
      x: 0.5,
    },
  },
  glitchTitle: {
    template: 'title',
    duration: 2.4,
    text: {
      template: 'title',
      content: 'SYSTEM ERROR',
      size: 80,
      weight: 700,
      animation: 'pop',
      color: '#ffffff',
      outline: { on: true, color: '#ef4b6b', width: 6 },
      shadow: { on: true, color: '#16c5e6', blur: 18, x: 4, y: 0 },
      y: 0.5,
    },
  },
};

export const ANIMATION_PRESETS: { id: string; label: TKey; desc: TKey; css: string }[] = [
  { id: 'neonTitle', label: 'anim.neon', desc: 'anim.neonDesc', css: 'linear-gradient(135deg, #0a2740, #16c5e6)' },
  { id: 'popBold', label: 'anim.pop', desc: 'anim.popDesc', css: 'linear-gradient(135deg, #0a6cff, #5cb8ff)' },
  { id: 'typeStory', label: 'anim.typewriter', desc: 'anim.typewriterDesc', css: 'linear-gradient(135deg, #1b2230, #4a5a72)' },
  { id: 'quoteCard', label: 'anim.quote', desc: 'anim.quoteDesc', css: 'linear-gradient(135deg, #0a6cff, #16c5e6 70%, #ffe066)' },
  { id: 'sticker', label: 'anim.sticker', desc: 'anim.stickerDesc', css: 'linear-gradient(135deg, #ffe066, #f6a25a)' },
  { id: 'endCta', label: 'anim.endCta', desc: 'anim.endCtaDesc', css: 'linear-gradient(135deg, #ef4b6b, #ffb066)' },
  { id: 'glitchTitle', label: 'anim.glitch', desc: 'anim.glitchDesc', css: 'linear-gradient(135deg, #ef4b6b, #16c5e6)' },
];

export const SPEED_PRESETS = [0.25, 0.5, 1, 1.5, 2, 4];
