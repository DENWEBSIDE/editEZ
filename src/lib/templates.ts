/* Demo + template projects built from generated sample media. */
import type { Asset, Clip, Lang, Project, Track, TransitionType } from '../types';
import { defaultAudioFx, defaultChroma, defaultGrade, defaultMask, defaultTransform, uid } from '../types';
import { clipBase, makeSubtitleClip, makeTextClip, makeTrack, newProject, updateDuration, CLIP_COLORS } from './edits';
import { generateMusic, generateScene, type SceneKind } from './samples';
import type { MusicKind as MusicKindT } from './samples';
import type { TKey } from '../i18n/en';

export const DEMO_ID = 'demo';

export interface TemplateDef {
  id: string;
  name: TKey;
  desc: TKey;
  tag: TKey;
  w: number;
  h: number;
  art: string;
  accent: string;
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'youtube',
    name: 'tpl.youtube.name',
    desc: 'tpl.youtube.desc',
    tag: 'tpl.tag.editing',
    w: 1920,
    h: 1080,
    art: 'linear-gradient(135deg,#1b2350,#5b3ea8 55%,#ff7a8f)',
    accent: '#7c5cff',
  },
  {
    id: 'tiktok',
    name: 'tpl.tiktok.name',
    desc: 'tpl.tiktok.desc',
    tag: 'tpl.tag.social',
    w: 1080,
    h: 1920,
    art: 'linear-gradient(160deg,#0c2530,#0f766e 55%,#38e1c8)',
    accent: '#38e1c8',
  },
  {
    id: 'reel',
    name: 'tpl.reel.name',
    desc: 'tpl.reel.desc',
    tag: 'tpl.tag.social',
    w: 1080,
    h: 1920,
    art: 'linear-gradient(150deg,#2a1030,#a13a6b 55%,#ffb245)',
    accent: '#ff5f8f',
  },
  {
    id: 'product',
    name: 'tpl.product.name',
    desc: 'tpl.product.desc',
    tag: 'tpl.tag.social',
    w: 1080,
    h: 1080,
    art: 'linear-gradient(135deg,#20180c,#6b4a1d 50%,#ffb245)',
    accent: '#ffb245',
  },
  {
    id: 'podcast',
    name: 'tpl.podcast.name',
    desc: 'tpl.podcast.desc',
    tag: 'tpl.tag.audio',
    w: 1080,
    h: 1080,
    art: 'linear-gradient(140deg,#191228,#3f2b6b 55%,#8b5cf6)',
    accent: '#a78bfa',
  },
  {
    id: 'news',
    name: 'tpl.news.name',
    desc: 'tpl.news.desc',
    tag: 'tpl.tag.titles',
    w: 1920,
    h: 1080,
    art: 'linear-gradient(120deg,#0a1420,#17364f 55%,#38bdf8)',
    accent: '#38bdf8',
  },
  {
    id: 'travel',
    name: 'tpl.travel.name',
    desc: 'tpl.travel.desc',
    tag: 'tpl.tag.editing',
    w: 1920,
    h: 1080,
    art: 'linear-gradient(140deg,#061a2b,#0c4a5c 45%,#f0a878)',
    accent: '#22c9a0',
  },
  {
    id: 'endcard',
    name: 'tpl.endcard.name',
    desc: 'tpl.endcard.desc',
    tag: 'tpl.tag.titles',
    w: 1920,
    h: 1080,
    art: 'linear-gradient(130deg,#101018,#2b2b45 60%,#7c5cff)',
    accent: '#7c5cff',
  },
  {
    id: 'greenscreen',
    name: 'tpl.greenscreen.name',
    desc: 'tpl.greenscreen.desc',
    tag: 'tpl.tag.vfx',
    w: 1920,
    h: 1080,
    art: 'linear-gradient(135deg,#04241a,#00b140 40%,#7c5cff)',
    accent: '#22c55e',
  },
];

const SAMPLE_TEXT = {
  en: {
    brand: 'EDIT EASY STUDIO',
    title: 'Your story starts here',
    subtitle: 'A 30-second demo edit',
    lowerName: 'Layla Haddad',
    lowerRole: 'Creative director',
    cta: 'Subscribe for more',
    ctaSub: 'New episodes every Thursday',
    announce: 'NEW DROP',
    announceSub: 'Available now',
    caption1: 'Shot on a phone, graded in the browser.',
    caption2: 'Titles, music and captions — all local.',
    caption3: 'Everything you see is editable.',
    caption4: 'Pick a preset and export in one click.',
    scene1: 'Golden hour',
    scene2: 'City lights',
    scene3: 'Deep water',
    scene4: 'Studio',
    lowerNews: 'Breaking',
    lowerNewsSub: 'Live from the studio',
    endTitle: 'Thanks for watching',
    chapter1: 'Intro',
    chapter2: 'Main',
    chapter3: 'Outro',
  },
  ar: {
    brand: 'استوديو إديت إيزي',
    title: 'قصتك تبدأ من هنا',
    subtitle: 'مونتاج تجريبي في ٣٠ ثانية',
    lowerName: 'ليلى حدّاد',
    lowerRole: 'المديرة الإبداعية',
    cta: 'اشترك للمزيد',
    ctaSub: 'حلقات جديدة كل خميس',
    announce: 'إصدار جديد',
    announceSub: 'متوفّر الآن',
    caption1: 'صُوّر بالهاتف وصُحّحت ألوانه في المتصفح.',
    caption2: 'عناوين وموسيقى وترجمات — كلها محلية.',
    caption3: 'كل ما تراه قابل للتعديل.',
    caption4: 'اختر إعدادًا وصدّر بضغطة واحدة.',
    scene1: 'الساعة الذهبية',
    scene2: 'أضواء المدينة',
    scene3: 'مياه عميقة',
    scene4: 'الاستوديو',
    lowerNews: 'عاجل',
    lowerNewsSub: 'مباشر من الاستوديو',
    endTitle: 'شكرًا للمشاهدة',
    chapter1: 'المقدمة',
    chapter2: 'المتن',
    chapter3: 'الخاتمة',
  },
};

type Texts = (typeof SAMPLE_TEXT)['en'];

interface SceneSpec {
  kind: SceneKind;
  name: string;
  duration: number;
  transition?: 'fade' | 'dissolve' | 'slideLeft' | 'zoom' | 'none';
  kenBurns?: boolean;
  grade?: 'warm' | 'cool' | 'cinema' | 'neutral';
}

interface Plan {
  id: string;
  name: string;
  w: number;
  h: number;
  fps: number;
  scenes: SceneSpec[];
  music: MusicKindT | null;
  titleTemplate?: 'title' | 'announcement';
  title?: string;
  subtitle?: string;
  lowerThird?: boolean;
  endCard?: boolean;
  captions?: string[];
  chroma?: { enabled: boolean; background?: SceneKind };
  markers?: boolean;
}

function makeImageAsset(name: string, img: { blob: Blob; thumb: string; width: number; height: number }): Asset {
  return {
    id: uid('asset'),
    name,
    kind: 'image',
    mime: 'image/jpeg',
    size: img.blob.size,
    duration: 5,
    width: img.width,
    height: img.height,
    hasAudio: false,
    url: URL.createObjectURL(img.blob),
    thumb: img.thumb,
    license: 'demo-generated',
    source: 'generated',
    createdAt: Date.now(),
  };
}

function gradeFor(kind: SceneSpec['grade']) {
  const g = defaultGrade();
  if (kind === 'warm') {
    g.temperature = 0.35;
    g.saturation = 0.1;
    g.highlights = 0.1;
  } else if (kind === 'cool') {
    g.temperature = -0.3;
    g.tint = -0.08;
    g.contrast = 0.08;
  } else if (kind === 'cinema') {
    g.contrast = 0.16;
    g.shadows = -0.1;
    g.saturation = -0.05;
    g.temperature = -0.12;
  }
  return g;
}

async function buildProject(plan: Plan, lang: Lang): Promise<{ project: Project; assets: { asset: Asset; blob: Blob }[] }> {
  const T: Texts = SAMPLE_TEXT[lang] ?? SAMPLE_TEXT.en;
  const base = newProject({ name: plan.name, width: plan.w, height: plan.h, fps: plan.fps, templateId: plan.id });
  const assets: { asset: Asset; blob: Blob }[] = [];
  const imageCache = new Map<string, Asset>();

  const sceneAsset = async (kind: SceneKind) => {
    const cached = imageCache.get(kind);
    if (cached) return cached;
    const img = await generateScene(kind, 1600, Math.round((1600 / plan.w) * plan.h), kind.length * 97);
    const asset = makeImageAsset(`${kind}.jpg`, img);
    imageCache.set(kind, asset);
    assets.push({ asset, blob: img.blob });
    return asset;
  };

  const tracks = base.tracks;
  const videoTrack = tracks.find((t) => t.kind === 'video')!;
  const textTrack = tracks.find((t) => t.kind === 'text')!;
  const overlayTrack = tracks.find((t) => t.kind === 'overlay')!;
  const musicTrack = tracks.find((t) => t.role === 'music')!;
  const subtitleTrack = tracks.find((t) => t.kind === 'subtitle')!;

  if (plan.chroma?.enabled) {
    overlayTrack.name = lang === 'ar' ? 'الشاشة الخضراء' : 'Green screen';
  }

  // background plate (for chroma) or the first scene
  if (plan.chroma?.enabled && plan.chroma.background) {
    const bgAsset = await sceneAsset(plan.chroma.background);
    const bg = clipBase('Backdrop', 'image', videoTrack.id, 0, 14);
    bg.assetId = bgAsset.id;
    bg.transform = { ...defaultTransform(), fit: 'cover', scale: 1.04 };
    bg.grade = gradeFor('cool');
    videoTrack.clips.push(bg);

    const gsAsset = await sceneAsset('greenscreen');
    const gs = clipBase('Presenter (keyed)', 'image', overlayTrack.id, 0, 14);
    gs.assetId = gsAsset.id;
    gs.type = 'image';
    gs.color = CLIP_COLORS.image;
    gs.transform = { ...defaultTransform(), fit: 'contain' };
    gs.chroma = {
      ...defaultChroma(),
      enabled: true,
      color: '#00b140',
      similarity: 0.34,
      smoothness: 0.18,
      spill: 0.55,
      edge: 0.1,
      bgAssetId: null,
      bgColor: '#000000',
    };
    gs.grade = defaultGrade();
    gs.mask = defaultMask();
    gs.effects = [{ id: uid('fx'), type: 'kenburns', enabled: true, params: { zoom: 0.06 } }];
    overlayTrack.clips.push(gs);
  } else {
    let cursor = 0;
    const sceneAssets: Asset[] = [];
    for (const scene of plan.scenes) {
      const asset = await sceneAsset(scene.kind);
      sceneAssets.push(asset);
      const clip = clipBase(scene.name, 'image', videoTrack.id, cursor, scene.duration);
      clip.assetId = asset.id;
      clip.grade = gradeFor(scene.grade ?? 'neutral');
      clip.transform = { ...defaultTransform(), fit: 'cover', scale: scene.kenBurns ? 1.02 : 1 };
      clip.mask = defaultMask();
      clip.chroma = { ...defaultChroma(), enabled: false };
      if (scene.kenBurns) {
        clip.effects = [{ id: uid('fx'), type: 'kenburns', enabled: true, params: { zoom: 0.14 } }];
      }
      clip.transitionIn = { type: (scene.transition ?? 'none') as TransitionType, duration: 0.7 };
      clip.transitionOut = { type: 'none', duration: 0.5 };
      videoTrack.clips.push(clip);
      if (plan.markers) {
        base.markers.push({
          id: uid('mrk'),
          t: cursor,
          label: scene.name,
          color: cursor === 0 ? '#ffb245' : '#7c5cff',
        });
      }
      cursor += scene.duration;
    }
    // second video layer for a picture-in-picture moment in longer templates
    if (plan.scenes.length >= 3) {
      const pipSource = sceneAssets[1];
      const pipTrack: Track = makeTrack('overlay', lang === 'ar' ? 'طبقة صورة' : 'Overlay');
      base.tracks.splice(base.tracks.indexOf(overlayTrack), 0, pipTrack);
      const pip = clipBase('Picture in picture', 'image', pipTrack.id, 1.6, 3.4);
      pip.assetId = pipSource.id;
      pip.type = 'image';
      pip.transform = { ...defaultTransform(), fit: 'cover', scale: 0.34, x: 0.76, y: 0.24 };
      pip.opacity = 1;
      pip.grade = gradeFor('neutral');
      pip.mask = { ...defaultMask(), shape: 'rect', cx: 0.76, cy: 0.24, w: 0.34, h: 0.3, feather: 0.02 };
      pip.transitionIn = { type: 'zoom', duration: 0.6 };
      pip.chroma = { ...defaultChroma(), enabled: false };
      pipTrack.clips.push(pip);
      void pipTrack;
    }
  }

  const totalScenes = plan.chroma?.enabled
    ? 14
    : plan.scenes.reduce((n, s) => n + s.duration, 0);

  // title
  if (plan.title) {
    const titlePreset = plan.titleTemplate ?? 'title';
    const titleClip = makeTextClip(
      textTrack.id,
      0.3,
      {
        content: plan.title,
        subtext: plan.subtitle ?? '',
        template: titlePreset,
        size: titlePreset === 'announcement' ? Math.round(plan.h * 0.075) : Math.round(plan.h * 0.062),
        weight: 700,
        animation: titlePreset === 'announcement' ? 'tracking' : 'fadeUp',
        uppercase: titlePreset === 'announcement',
        letterSpacing: titlePreset === 'announcement' ? 2 : 0,
        y: titlePreset === 'announcement' ? 0.5 : 0.46,
        color: titlePreset === 'announcement' ? '#0b0d16' : '#ffffff',
        background:
          titlePreset === 'announcement'
            ? { on: true, color: '#ffb245', padding: Math.round(plan.h * 0.028), radius: 16, opacity: 0.96 }
            : { on: false, color: '#000000', padding: 16, radius: 12, opacity: 0.5 },
      },
      3.2
    );
    textTrack.clips.push(titleClip);
  }

  // lower third
  if (plan.lowerThird) {
    const lower = makeTextClip(
      textTrack.id,
      2.6,
      {
        template: 'lowerThird',
        content: T.lowerName,
        subtext: T.lowerRole,
        align: 'left',
        x: 0.26,
        y: 0.78,
        size: Math.round(plan.h * 0.036),
        weight: 700,
        animation: 'slideIn',
        background: { on: true, color: '#0b0d16', padding: 16, radius: 10, opacity: 0.62 },
      },
      3.6
    );
    textTrack.clips.push(lower);
  }

  // captions
  if (plan.captions?.length) {
    let t = 1.2;
    for (const caption of plan.captions) {
      const clip = makeSubtitleClip(subtitleTrack.id, t, t + 3.1, caption);
      subtitleTrack.clips.push(clip);
      t += 3.6;
    }
  }

  // end card
  if (plan.endCard) {
    const start = Math.max(0.5, totalScenes - 3.2);
    const card = makeTextClip(
      textTrack.id,
      start,
      {
        template: 'endCard',
        content: T.endTitle,
        subtext: T.cta,
        size: Math.round(plan.h * 0.058),
        weight: 700,
        animation: 'pop',
        y: 0.45,
      },
      3
    );
    textTrack.clips.push(card);
  }

  // music bed
  if (plan.music) {
    const blob = await generateMusic(plan.music, Math.min(30, Math.max(12, Math.ceil(totalScenes) + 2)));
    const url = URL.createObjectURL(blob);
    const peaks = await peaksOf(blob);
    const asset: Asset = {
      id: uid('asset'),
      name: `${plan.music}.wav`,
      kind: 'music',
      mime: 'audio/wav',
      size: blob.size,
      duration: await durationOf(blob),
      width: 0,
      height: 0,
      hasAudio: true,
      url,
      peaks,
      license: 'demo-generated',
      source: 'generated',
      createdAt: Date.now(),
    };
    assets.push({ asset, blob });
    const clip = clipBase(asset.name, 'audio', musicTrack.id, 0, Math.min(asset.duration, totalScenes + 1));
    clip.assetId = asset.id;
    clip.audio = { ...defaultAudioFx(), gain: 0.55, fadeIn: 0.8, fadeOut: 1.4, duck: true, duckAmount: 0.55 };
    clip.volume = 0.8;
    musicTrack.clips.push(clip);
  }

  // clean up empty tracks (keep the structure tidy)
  for (const track of base.tracks) track.clips.sort((a, b) => a.start - b.start);
  base.tracks = base.tracks.filter((t) => t.clips.length > 0 || ['video', 'text', 'audio', 'subtitle'].includes(t.kind));
  updateDuration(base);
  base.duration = Math.max(12, Math.round((totalScenes + 2) * 10) / 10);
  return { project: base, assets };
}

async function peaksOf(blob: Blob): Promise<number[] | undefined> {
  try {
    const { blobToAudioBuffer, extractPeaks } = await import('./audio');
    const buffer = await blobToAudioBuffer(blob);
    return extractPeaks(buffer, 480);
  } catch {
    return undefined;
  }
}

async function durationOf(blob: Blob): Promise<number> {
  try {
    const { blobToAudioBuffer } = await import('./audio');
    const buffer = await blobToAudioBuffer(blob);
    return buffer.duration;
  } catch {
    return 16;
  }
}

const PLANS: Record<string, (T: Texts) => Plan> = {
  [DEMO_ID]: (T) => ({
    id: DEMO_ID,
    name: 'editEZ — Demo reel',
    w: 1920,
    h: 1080,
    fps: 30,
    music: 'upbeat',
    title: T.title,
    subtitle: T.subtitle,
    titleTemplate: 'title',
    lowerThird: true,
    endCard: true,
    markers: true,
    scenes: [
      { kind: 'mountain', name: T.scene1, duration: 5, transition: 'fade', kenBurns: true, grade: 'warm' },
      { kind: 'city', name: T.scene2, duration: 5, transition: 'dissolve', kenBurns: true, grade: 'cinema' },
      { kind: 'ocean', name: T.scene3, duration: 5, transition: 'fade', kenBurns: true, grade: 'cool' },
      { kind: 'studio', name: T.scene4, duration: 4, transition: 'zoom' },
    ],
    captions: [T.caption1, T.caption2, T.caption3, T.caption4],
  }),
  youtube: (T) => ({
    id: 'youtube',
    name: 'YouTube intro',
    w: 1920,
    h: 1080,
    fps: 30,
    music: 'upbeat',
    title: T.title,
    subtitle: T.subtitle,
    lowerThird: true,
    endCard: true,
    scenes: [
      { kind: 'studio', name: T.scene4, duration: 4, transition: 'zoom' },
      { kind: 'abstract', name: 'Abstract', duration: 4, transition: 'dissolve' },
      { kind: 'mountain', name: T.scene1, duration: 4, transition: 'fade', grade: 'warm', kenBurns: true },
    ],
  }),
  tiktok: (T) => ({
    id: 'tiktok',
    name: 'TikTok vertical',
    w: 1080,
    h: 1920,
    fps: 30,
    music: 'upbeat',
    title: T.announce,
    titleTemplate: 'announcement',
    captions: [T.caption1, T.caption2, T.caption4],
    scenes: [
      { kind: 'city', name: T.scene2, duration: 4, transition: 'zoom', grade: 'cinema' },
      { kind: 'portrait', name: 'Portrait', duration: 4, transition: 'slideLeft' },
      { kind: 'ocean', name: T.scene3, duration: 4, transition: 'dissolve', grade: 'cool' },
    ],
  }),
  reel: (T) => ({
    id: 'reel',
    name: 'Instagram Reel',
    w: 1080,
    h: 1920,
    fps: 30,
    music: 'ambient',
    title: T.title,
    lowerThird: true,
    endCard: true,
    captions: [T.caption2, T.caption3],
    scenes: [
      { kind: 'portrait', name: 'Portrait', duration: 4, transition: 'fade' },
      { kind: 'abstract', name: 'Abstract', duration: 3.5, transition: 'dissolve' },
      { kind: 'mountain', name: T.scene1, duration: 4, transition: 'fade', grade: 'warm' },
    ],
  }),
  product: (T) => ({
    id: 'product',
    name: 'Product promo',
    w: 1080,
    h: 1080,
    fps: 30,
    music: 'corporate',
    title: T.announce,
    titleTemplate: 'announcement',
    endCard: true,
    scenes: [
      { kind: 'product', name: 'Product', duration: 5, transition: 'zoom', kenBurns: true },
      { kind: 'abstract', name: 'Abstract', duration: 4, transition: 'dissolve' },
    ],
  }),
  podcast: (T) => ({
    id: 'podcast',
    name: 'Podcast clip',
    w: 1080,
    h: 1080,
    fps: 30,
    music: 'lofi',
    lowerThird: true,
    captions: [T.caption1, T.caption3, T.caption2],
    scenes: [
      { kind: 'portrait', name: 'Host', duration: 6, transition: 'fade' },
      { kind: 'abstract', name: 'Abstract', duration: 5, transition: 'dissolve' },
    ],
  }),
  news: (T) => ({
    id: 'news',
    name: 'News announcement',
    w: 1920,
    h: 1080,
    fps: 30,
    music: 'corporate',
    title: T.lowerNews,
    titleTemplate: 'announcement',
    lowerThird: true,
    scenes: [
      { kind: 'city', name: T.scene2, duration: 4, transition: 'slideLeft', grade: 'cool' },
      { kind: 'studio', name: T.scene4, duration: 4, transition: 'fade' },
    ],
  }),
  travel: (T) => ({
    id: 'travel',
    name: 'Travel vlog',
    w: 1920,
    h: 1080,
    fps: 30,
    music: 'ambient',
    title: T.title,
    markers: true,
    scenes: [
      { kind: 'ocean', name: T.scene3, duration: 5, transition: 'fade', kenBurns: true, grade: 'cinema' },
      { kind: 'mountain', name: T.scene1, duration: 5, transition: 'dissolve', kenBurns: true, grade: 'warm' },
      { kind: 'city', name: T.scene2, duration: 4, transition: 'fade', grade: 'cool' },
    ],
  }),
  endcard: (T) => ({
    id: 'endcard',
    name: 'End card',
    w: 1920,
    h: 1080,
    fps: 30,
    music: 'ambient',
    title: T.cta,
    subtitle: T.ctaSub,
    endCard: true,
    scenes: [{ kind: 'studio', name: T.scene4, duration: 8, transition: 'fade' }],
  }),
  greenscreen: (T) => ({
    id: 'greenscreen',
    name: 'Green screen studio',
    w: 1920,
    h: 1080,
    fps: 30,
    music: 'upbeat',
    title: T.announce,
    titleTemplate: 'announcement',
    chroma: { enabled: true, background: 'abstract' },
    scenes: [],
  }),
};

export async function buildTemplate(id: string, lang: Lang): Promise<{ project: Project; assets: { asset: Asset; blob: Blob }[] }> {
  const texts = SAMPLE_TEXT[lang] ?? SAMPLE_TEXT.en;
  const planFn = PLANS[id] ?? PLANS[DEMO_ID];
  const plan = planFn(texts);
  const built = await buildProject(plan, lang);
  if (id === DEMO_ID) built.project.name = lang === 'ar' ? 'إديت إيزي — العرض التجريبي' : 'editEZ — Demo reel';
  return built;
}

export { SAMPLE_TEXT };

