/* Pure project mutations — no React, no side effects. */
import type { Asset, Clip, ClipType, Project, Track, TrackKind, TrackRole } from '../types';
import {
  clamp,
  defaultAudioFx,
  defaultChroma,
  defaultGrade,
  defaultMask,
  defaultSettings,
  defaultText,
  defaultTransform,
  round,
  trackKindForClip,
  uid,
} from '../types';

export const MIN_CLIP = 0.08;

export const CLIP_COLORS: Record<ClipType, string> = {
  video: '#5b6cff',
  image: '#a06bff',
  audio: '#22c9a0',
  text: '#ffb245',
  subtitle: '#ff7a8f',
  shape: '#4bd0ff',
  adjust: '#8b93b5',
};

const TRACK_DEFAULTS: Record<TrackKind, { height: number; role: TrackRole; name: string }> = {
  video: { height: 62, role: 'main', name: 'Video' },
  overlay: { height: 52, role: 'overlay', name: 'Overlay' },
  text: { height: 40, role: 'text', name: 'Text' },
  audio: { height: 48, role: 'music', name: 'Audio' },
  subtitle: { height: 36, role: 'subtitle', name: 'Subtitles' },
};

export function makeTrack(kind: TrackKind, name: string, role?: TrackRole): Track {
  const d = TRACK_DEFAULTS[kind];
  return {
    id: uid('trk'),
    kind,
    role: role ?? d.role,
    name,
    locked: false,
    muted: false,
    hidden: false,
    height: d.height,
    volume: 1,
    clips: [],
  };
}

export interface NewProjectOptions {
  name: string;
  width: number;
  height: number;
  fps?: number;
  templateId?: string;
}

export function newProject(opts: NewProjectOptions): Project {
  const now = Date.now();
  const tracks: Track[] = [
    makeTrack('subtitle', 'Subtitles'),
    makeTrack('text', 'Text'),
    makeTrack('overlay', 'Overlay'),
    makeTrack('video', 'Video 1'),
    makeTrack('audio', 'Music', 'music'),
  ];
  return {
    id: uid('prj'),
    name: opts.name || 'Untitled project',
    createdAt: now,
    updatedAt: now,
    canvas: { w: opts.width, h: opts.height, fps: opts.fps ?? 30, bg: '#05060a' },
    tracks,
    markers: [],
    settings: defaultSettings(),
    duration: 20,
    templateId: opts.templateId,
  };
}

export function clipBase(name: string, type: ClipType, trackId: string, start: number, duration: number): Clip {
  return {
    id: uid('clp'),
    trackId,
    type,
    name,
    start: round(Math.max(0, start)),
    duration: round(Math.max(MIN_CLIP, duration)),
    inPoint: 0,
    speed: 1,
    reverse: false,
    freezeFrame: false,
    opacity: 1,
    blend: 'source-over',
    volume: 1,
    muted: false,
    color: CLIP_COLORS[type],
    transform: defaultTransform(),
    effects: [],
    keyframes: {},
    groupId: null,
  };
}

export function clipFromAsset(asset: Asset, trackId: string, start: number): Clip {
  const type: ClipType =
    asset.kind === 'video'
      ? 'video'
      : asset.kind === 'image'
        ? 'image'
        : asset.kind === 'subtitle'
          ? 'subtitle'
          : 'audio';
  const duration = asset.kind === 'image' ? 5 : Math.max(MIN_CLIP, asset.duration || 5);
  const clip = clipBase(asset.name, type, trackId, start, duration);
  clip.assetId = asset.id;
  if (type === 'audio') clip.audio = defaultAudioFx();
  if (type === 'video' || type === 'image') {
    clip.grade = defaultGrade();
    clip.chroma = { ...defaultChroma(), enabled: false };
    clip.mask = defaultMask();
    clip.transitionIn = { type: 'none', duration: 0.5 };
    clip.transitionOut = { type: 'none', duration: 0.5 };
  }
  return clip;
}

export function trackForClip(project: Project, type: ClipType): Track | undefined {
  const kind = trackKindForClip(type);
  return project.tracks.find((t) => t.kind === kind && !t.locked) ?? project.tracks.find((t) => t.kind === kind);
}

export function canHold(track: Track, clip: Pick<Clip, 'type'>): boolean {
  switch (track.kind) {
    case 'video':
    case 'overlay':
      return clip.type === 'video' || clip.type === 'image' || clip.type === 'shape';
    case 'text':
      return clip.type === 'text';
    case 'subtitle':
      return clip.type === 'subtitle';
    case 'audio':
      return clip.type === 'audio';
    default:
      return false;
  }
}

export function findClip(project: Project, clipId: string): { clip: Clip; track: Track; index: number } | null {
  for (const track of project.tracks) {
    const index = track.clips.findIndex((c) => c.id === clipId);
    if (index >= 0) return { clip: track.clips[index], track, index };
  }
  return null;
}

export const allClips = (project: Project): Clip[] => project.tracks.flatMap((t) => t.clips);

export function contentEnd(project: Project): number {
  let end = 0;
  for (const track of project.tracks) {
    for (const clip of track.clips) end = Math.max(end, clip.start + clip.duration);
  }
  return end;
}

export function updateDuration(project: Project) {
  project.duration = Math.max(10, round(contentEnd(project) + 3));
  project.updatedAt = Date.now();
}

export function isOverlapping(track: Track, start: number, duration: number, ignoreId?: string): boolean {
  return track.clips.some(
    (c) => c.id !== ignoreId && start < c.start + c.duration - 0.001 && start + duration > c.start + 0.001
  );
}

export function findFreeStart(track: Track, desired: number, duration: number, ignoreId?: string): number {
  let start = Math.max(0, desired);
  let guard = 0;
  while (isOverlapping(track, start, duration, ignoreId) && guard < 200) {
    const blockers = track.clips
      .filter((c) => c.id !== ignoreId && start < c.start + c.duration && start + duration > c.start)
      .sort((a, b) => a.start - b.start);
    if (!blockers.length) break;
    start = round(blockers[blockers.length - 1].start + blockers[blockers.length - 1].duration + 0.01);
    guard++;
  }
  return start;
}

export function addClip(project: Project, clip: Clip, opts: { avoidOverlap?: boolean } = {}): Clip {
  const track = project.tracks.find((t) => t.id === clip.trackId);
  if (!track) return clip;
  if (opts.avoidOverlap !== false) clip.start = findFreeStart(track, clip.start, clip.duration);
  track.clips.push(clip);
  track.clips.sort((a, b) => a.start - b.start);
  updateDuration(project);
  return clip;
}

export function splitClip(project: Project, clipId: string, atTime: number): Clip[] {
  const found = findClip(project, clipId);
  if (!found) return [];
  const { clip, track, index } = found;
  const local = atTime - clip.start;
  if (local <= MIN_CLIP || local >= clip.duration - MIN_CLIP) return [];
  const left = structuredClone(clip);
  const right = structuredClone(clip);
  left.duration = round(local);
  right.id = uid('clp');
  right.start = round(atTime);
  right.duration = round(clip.duration - local);
  right.inPoint = round(clip.inPoint + (clip.reverse ? right.duration : left.duration) * clip.speed);
  if (right.transitionIn) right.transitionIn = { type: 'none', duration: 0.5 };
  if (left.transitionOut) left.transitionOut = { type: 'none', duration: 0.5 };
  // split keyframes
  for (const prop of Object.keys(clip.keyframes) as (keyof Clip['keyframes'])[]) {
    const frames = clip.keyframes[prop];
    if (!frames) continue;
    left.keyframes[prop] = frames.filter((f) => f.t <= local).map((f) => ({ ...f }));
    right.keyframes[prop] = frames
      .filter((f) => f.t > local)
      .map((f) => ({ ...f, t: round(f.t - local) }));
  }
  right.groupId = null;
  track.clips.splice(index, 1, left, right);
  updateDuration(project);
  return [left, right];
}

export function removeClips(project: Project, ids: string[], ripple = false) {
  const set = new Set(ids);
  for (const track of project.tracks) {
    if (track.locked) continue;
    const removed = track.clips.filter((c) => set.has(c.id));
    if (!removed.length) continue;
    track.clips = track.clips.filter((c) => !set.has(c.id));
    if (ripple) {
      const sorted = removed.sort((a, b) => a.start - b.start);
      for (const r of sorted) {
        for (const c of track.clips) if (c.start >= r.start + r.duration - 0.001) c.start = round(c.start - r.duration);
        for (const c of track.clips) if (c.start > r.start + 0.001 && c.start < r.start + r.duration) c.start = round(r.start);
      }
      track.clips.sort((a, b) => a.start - b.start);
    }
  }
  updateDuration(project);
}

export function duplicateClips(project: Project, ids: string[]): Clip[] {
  const created: Clip[] = [];
  for (const id of ids) {
    const found = findClip(project, id);
    if (!found) continue;
    const copy = structuredClone(found.clip);
    copy.id = uid('clp');
    copy.groupId = null;
    copy.start = round(found.clip.start + found.clip.duration);
    const track = project.tracks.find((t) => t.id === copy.trackId);
    if (!track) continue;
    copy.start = findFreeStart(track, copy.start, copy.duration);
    track.clips.push(copy);
    track.clips.sort((a, b) => a.start - b.start);
    created.push(copy);
  }
  updateDuration(project);
  return created;
}

export function rippleShift(project: Project, trackId: string, from: number, delta: number, ignoreId?: string) {
  const track = project.tracks.find((t) => t.id === trackId);
  if (!track || Math.abs(delta) < 0.001) return;
  for (const c of track.clips) {
    if (c.id === ignoreId) continue;
    if (c.start >= from - 0.001) c.start = round(Math.max(0, c.start + delta));
  }
  track.clips.sort((a, b) => a.start - b.start);
  updateDuration(project);
}

export function splitAllAt(project: Project, time: number, trackIds?: string[]): Clip[] {
  const created: Clip[] = [];
  for (const track of project.tracks) {
    if (track.locked) continue;
    if (trackIds && !trackIds.includes(track.id)) continue;
    const targets = track.clips.filter((c) => time > c.start + MIN_CLIP && time < c.start + c.duration - MIN_CLIP);
    for (const clip of targets) created.push(...splitClip(project, clip.id, time));
  }
  return created;
}

export function setClipDuration(clip: Clip, duration: number) {
  clip.duration = round(Math.max(MIN_CLIP, duration));
}

export function fitClipToSource(clip: Clip, asset?: Asset) {
  if (!asset || !asset.duration) return;
  clip.duration = round(Math.max(MIN_CLIP, asset.duration / Math.max(0.1, clip.speed) - clip.inPoint / Math.max(0.1, clip.speed)));
}

export function groupClips(project: Project, ids: string[]): string | null {
  if (ids.length < 2) return null;
  const groupId = uid('grp');
  for (const id of ids) {
    const found = findClip(project, id);
    if (found) found.clip.groupId = groupId;
  }
  return groupId;
}

export function ungroupClips(project: Project, ids: string[]) {
  const groups = new Set<string>();
  for (const id of ids) {
    const found = findClip(project, id);
    if (found?.clip.groupId) groups.add(found.clip.groupId);
  }
  for (const track of project.tracks) {
    for (const clip of track.clips) if (clip.groupId && groups.has(clip.groupId)) clip.groupId = null;
  }
}

export function expandSelection(project: Project, ids: string[]): string[] {
  const out = new Set(ids);
  const groups = new Set<string>();
  for (const id of ids) {
    const found = findClip(project, id);
    if (found?.clip.groupId) groups.add(found.clip.groupId);
  }
  if (!groups.size) return ids;
  for (const track of project.tracks) for (const clip of track.clips) if (clip.groupId && groups.has(clip.groupId)) out.add(clip.id);
  return [...out];
}

export function makeTextClip(trackId: string, start: number, text: Partial<Clip['text']>, duration = 3): Clip {
  const clip = clipBase(String(text?.content ?? 'Text'), 'text', trackId, start, duration);
  clip.text = { ...defaultText(String(text?.content ?? 'Text')), ...text };
  clip.color = CLIP_COLORS.text;
  return clip;
}

export function makeSubtitleClip(trackId: string, start: number, end: number, content: string): Clip {
  const clip = clipBase(content.slice(0, 42), 'subtitle', trackId, start, Math.max(MIN_CLIP, end - start));
  clip.text = {
    ...defaultText(content),
    content,
    size: 40,
    weight: 600,
    y: 0.88,
    animation: 'none',
    outline: { on: true, color: '#000000', width: 2 },
    shadow: { on: true, color: '#000000', blur: 18, x: 0, y: 4 },
  };
  clip.color = CLIP_COLORS.subtitle;
  return clip;
}

export function normalizeProject(project: Project): Project {
  const p = { ...project };
  p.canvas = { ...{ w: 1920, h: 1080, fps: 30, bg: '#05060a' }, ...(p.canvas ?? {}) };
  p.settings = { ...defaultSettings(), ...(p.settings ?? {}) };
  p.markers = p.markers ?? [];
  p.tracks = (p.tracks ?? []).map((t) => ({
    ...t,
    clips: (t.clips ?? []).map((c) => ({
      ...c,
      transform: { ...defaultTransform(), ...(c.transform ?? {}) },
      keyframes: c.keyframes ?? {},
      effects: c.effects ?? [],
    })),
    volume: t.volume ?? 1,
  }));
  return p;
}

export function clipEnd(clip: Clip) {
  return clip.start + clip.duration;
}

export function clampTime(project: Project, time: number) {
  return clamp(time, 0, Math.max(1, project.duration));
}
