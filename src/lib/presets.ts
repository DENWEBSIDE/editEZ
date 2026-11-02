/* Catalogues: canvas sizes, export presets, effects, fonts, text templates. */
import type { BlendMode, EffectType, TextAnimation, TextStyle, TextTemplate, TransitionType } from '../types';
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
};

export const SPEED_PRESETS = [0.25, 0.5, 1, 1.5, 2, 4];
