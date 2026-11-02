/* Central app state: project document, selection, transport, UI and autosave. */
import { create } from 'zustand';
import type { Asset, Clip, Lang, Lut, Project, ProjectMeta, Track, TrackKind } from './types';
import { clamp, uid } from './types';
import { setActiveLang, t } from './i18n';
import * as db from './lib/db';
import {
  addClip as addClipToProject,
  canHold,
  clipFromAsset,
  duplicateClips,
  expandSelection,
  findClip,
  findFreeStart,
  groupClips,
  makeSubtitleClip,
  makeTextClip,
  makeTrack,
  newProject,
  normalizeProject,
  removeClips,
  rippleShift,
  splitAllAt,
  splitClip,
  trackForClip,
  ungroupClips,
  updateDuration,
  MIN_CLIP,
} from './lib/edits';
import { downloadBlob, importFile, type ImportOutcome } from './lib/media';
import { buildTemplate } from './lib/templates';
import { TEXT_PRESETS } from './lib/presets';
import type { TextStyle } from './types';

export type PanelId = 'media' | 'effects' | 'text' | 'audio' | 'subtitles' | 'color' | 'project';
export type DialogId = null | 'new' | 'export' | 'settings' | 'shortcuts' | 'onboard' | 'capabilities' | 'subsExport' | 'recover';
export type MobileTab = 'media' | 'preview' | 'props' | 'timeline';
export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

export interface ToastItem {
  id: string;
  kind: 'info' | 'success' | 'error' | 'warn';
  message: string;
  actionLabel?: string;
  action?: () => void;
}

export interface ExportOptions {
  presetId: string;
  width: number;
  height: number;
  fps: number;
  quality: string;
  bitrate: number;
  format: string;
  filename: string;
  includeAudio: boolean;
  fitToAspect: boolean;
}

export interface RecoveryInfo {
  projectId: string;
  doc: Project;
}

export interface CueInput {
  start: number;
  end: number;
  text: string;
}

interface State {
  lang: Lang;
  booted: boolean;
  view: 'home' | 'editor';
  projects: ProjectMeta[];
  projectsLoading: boolean;
  projectsError: string | null;

  project: Project | null;
  assets: Record<string, Asset>;
  luts: Record<string, Lut>;
  past: Project[];
  future: Project[];

  selection: string[];
  selectedTrackId: string | null;
  playhead: number;
  playing: boolean;
  zoom: number;
  tool: 'select' | 'razor';

  panel: PanelId;
  dialog: DialogId;
  mobileTab: MobileTab;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  toasts: ToastItem[];
  busy: string | null;

  clipboard: Clip[] | null;
  favorites: string[];
  onboardingSeen: boolean;
  tipsSeen: Record<string, boolean>;

  previewQuality: 'auto' | 'full' | 'half' | 'third';
  volume: number;
  muted: boolean;
  compare: boolean;
  eyedropper: boolean;
  exporting: boolean;

  storage: { usage: number; quota: number; supported: boolean };
  recovery: RecoveryInfo | null;
  exportOptions: ExportOptions;
  lastCoalesceKey: string | null;
  lastMutationAt: number;

  boot: () => Promise<void>;
  setLang: (l: Lang) => void;
  refreshProjects: () => Promise<void>;
  goHome: () => void;
  createProject: (opts: { name: string; width: number; height: number; fps?: number; templateId?: string }) => Promise<void>;
  openTemplate: (templateId: string) => Promise<void>;
  openProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<void>;
  renameProject: (name: string) => void;

  mutate: (fn: (p: Project) => void, opts?: { history?: boolean; coalesce?: string }) => void;
  undo: () => void;
  redo: () => void;
  saveNow: () => Promise<void>;
  scheduleSave: () => void;

  setSelection: (ids: string[], trackId?: string | null) => void;
  toggleSelection: (id: string) => void;
  selectTrack: (id: string | null) => void;
  setPlayhead: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setZoom: (z: number) => void;
  setTool: (tool: 'select' | 'razor') => void;
  setPanel: (panel: PanelId) => void;
  openDialog: (d: DialogId) => void;
  setMobileTab: (tab: MobileTab) => void;
  setPreviewQuality: (q: State['previewQuality']) => void;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  setCompare: (c: boolean) => void;
  setEyedropper: (v: boolean) => void;
  setExporting: (v: boolean) => void;

  toast: (kind: ToastItem['kind'], message: string, actionLabel?: string, action?: () => void) => void;
  dismissToast: (id: string) => void;
  setBusy: (v: string | null) => void;
  toggleFavorite: (type: string) => void;
  markOnboardingSeen: () => void;
  markTipSeen: (id: string) => void;

  importFiles: (files: FileList | File[]) => Promise<void>;
  addAssetToTimeline: (assetId: string, trackId?: string, at?: number) => void;
  removeAsset: (assetId: string) => Promise<void>;
  addGeneratedAsset: (asset: Asset, blob: Blob, opts?: { addToTimeline?: boolean }) => Promise<void>;
  importCues: (cues: CueInput[]) => void;

  addText: (presetId: string, content?: string, at?: number) => void;
  addSubtitle: (text?: string, at?: number, duration?: number) => void;
  addTrack: (kind: TrackKind, role?: Track['role']) => Track | null;
  removeTrack: (trackId: string) => void;
  setTrack: (trackId: string, patch: Partial<Track>) => void;
  addMarker: (at?: number) => void;
  removeMarker: (id: string) => void;

  splitAtPlayhead: (clipId?: string) => void;
  deleteSelection: (ripple?: boolean) => void;
  duplicateSelection: () => void;
  copySelection: () => void;
  pasteClipboard: () => void;
  groupSelection: () => void;
  ungroupSelection: () => void;
  addLut: (lut: Lut) => void;

  applyRecovery: () => Promise<void>;
  dismissRecovery: () => void;
  refreshStorage: () => Promise<void>;
  clearAllData: () => Promise<void>;
  downloadBackup: (projectId?: string) => Promise<void>;
  restoreBackup: (file: File) => Promise<void>;
  setExportOptions: (patch: Partial<ExportOptions>) => void;
}

let thumbProvider: (() => string | undefined) | null = null;
export const registerThumbProvider = (fn: (() => string | undefined) | null) => {
  thumbProvider = fn;
};

let saveTimer: number | null = null;
const assetUrlCache = new Map<string, string>();

const updateMeta = (project: Project) => {
  void db.saveProject;
  void project;
};

const TRACK_ORDER: Record<TrackKind, number> = {
  subtitle: 0,
  text: 1,
  overlay: 2,
  video: 3,
  audio: 4,
};

export const useStore = create<State>((set, get) => {
  const appendCueClips = (cues: CueInput[]) => {
    const project = get().project;
    if (!project || !cues.length) return;
    const draft = structuredClone(project);
    let track = draft.tracks.find((tr) => tr.kind === 'subtitle');
    if (!track) {
      track = makeTrack('subtitle', 'Subtitles');
      draft.tracks.unshift(track);
    }
    let added = 0;
    for (const cue of cues) {
      if (cue.end - cue.start < 0.1) continue;
      const overlaps = track.clips.some(
        (c) => cue.start < c.start + c.duration - 0.05 && cue.end > c.start + 0.05
      );
      if (overlaps) continue;
      track.clips.push(makeSubtitleClip(track.id, cue.start, cue.end, cue.text));
      added++;
    }
    track.clips.sort((a, b) => a.start - b.start);
    updateDuration(draft);
    set({
      project: draft,
      past: [...get().past.slice(-59), project],
      future: [],
      saveStatus: 'dirty',
    });
    get().scheduleSave();
    if (added) {
      set({ selectedTrackId: track.id, selection: [] });
      get().toast('success', t('subs.imported', { n: added }));
    } else {
      get().toast('warn', t('toast.subError'));
    }
  };

  return {
    lang: 'en',
    booted: false,
    view: 'home',
    projects: [],
    projectsLoading: true,
    projectsError: null,

    project: null,
    assets: {},
    luts: {},
    past: [],
    future: [],

    selection: [],
    selectedTrackId: null,
    playhead: 0,
    playing: false,
    zoom: 70,
    tool: 'select',

    panel: 'media',
    dialog: null,
    mobileTab: 'preview',
    saveStatus: 'saved',
    lastSavedAt: null,
    toasts: [],
    busy: null,

    clipboard: null,
    favorites: [],
    onboardingSeen: false,
    tipsSeen: {},

    previewQuality: 'auto',
    volume: 0.9,
    muted: false,
    compare: false,
    eyedropper: false,
    exporting: false,

    storage: { usage: 0, quota: 0, supported: false },
    recovery: null,
    exportOptions: {
      presetId: 'youtube',
      width: 1920,
      height: 1080,
      fps: 30,
      quality: 'high',
      bitrate: 10_000_000,
      format: 'auto',
      filename: 'editez-export',
      includeAudio: true,
      fitToAspect: true,
    },
    lastCoalesceKey: null,
    lastMutationAt: 0,

    /* ------------------------------------------------------------ boot */
    boot: async () => {
      const storedLang = (await db.kvGet<Lang>('lang')) ?? 'en';
      const onboardingSeen = (await db.kvGet<boolean>('onboardSeen')) ?? false;
      const favorites = (await db.kvGet<string[]>('favorites')) ?? [];
      const tipsSeen = (await db.kvGet<Record<string, boolean>>('tipsSeen')) ?? {};
      setActiveLang(storedLang);
      set({ lang: storedLang, onboardingSeen, favorites, tipsSeen });
      await get().refreshProjects();
      void get().refreshStorage();
      set({ booted: true });
    },

    setLang: (lang) => {
      setActiveLang(lang);
      set({ lang });
      void db.kvSet('lang', lang);
    },

    refreshProjects: async () => {
      set({ projectsLoading: true, projectsError: null });
      try {
        const projects = await db.listProjects();
        set({ projects, projectsLoading: false });
      } catch (e) {
        set({ projectsLoading: false, projectsError: e instanceof Error ? e.message : 'storage unavailable' });
      }
    },

    goHome: () => {
      if (saveTimer) {
        window.clearTimeout(saveTimer);
        saveTimer = null;
        void get().saveNow();
      } else if (get().saveStatus === 'dirty') {
        void get().saveNow();
      }
      set({ view: 'home', playing: false, dialog: null, selection: [], recovery: null });
      void get().refreshProjects();
      void get().refreshStorage();
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    },

    createProject: async ({ name, width, height, fps, templateId }) => {
      const doc = newProject({ name, width, height, fps, templateId });
      if (saveTimer) window.clearTimeout(saveTimer);
      set({
        project: doc,
        assets: {},
        luts: {},
        past: [],
        future: [],
        selection: [],
        selectedTrackId: doc.tracks.find((tr) => tr.kind === 'video')?.id ?? null,
        playhead: 0,
        playing: false,
        view: 'editor',
        saveStatus: 'saving',
        zoom: 70,
        mobileTab: 'preview',
        recovery: null,
        dialog: null,
      });
      await db.saveProject(doc).catch(() => undefined);
      set({ saveStatus: 'saved', lastSavedAt: Date.now() });
      location.hash = `#/editor/${doc.id}`;
      await get().refreshProjects();
    },

    openTemplate: async (templateId) => {
      set({ busy: t('demo.loading') });
      try {
        const built = await buildTemplate(templateId, get().lang);
        for (const { asset, blob } of built.assets) {
          await db.saveMedia(asset, blob).catch(() => undefined);
          if (asset.url) assetUrlCache.set(asset.id, asset.url);
        }
        const doc = normalizeProject(built.project);
        await db.saveProject(doc);
        const assets: Record<string, Asset> = {};
        for (const a of built.assets) assets[a.asset.id] = a.asset;
        set({
          project: doc,
          assets,
          luts: {},
          past: [],
          future: [],
          selection: [],
          selectedTrackId: doc.tracks.find((tr) => tr.kind === 'video')?.id ?? null,
          playhead: 0,
          playing: false,
          view: 'editor',
          saveStatus: 'saved',
          lastSavedAt: Date.now(),
          busy: null,
          zoom: 70,
          mobileTab: 'preview',
          recovery: null,
          dialog: null,
          exportOptions: {
            ...get().exportOptions,
            filename: doc.name.replace(/[^\w\u0600-\u06FF-]+/g, '-').toLowerCase() || 'editez-export',
          },
        });
        location.hash = `#/editor/${doc.id}`;
        await get().refreshProjects();
        if (templateId.startsWith('demo')) get().toast('success', t('toast.demoReady'));
      } catch (e) {
        set({ busy: null });
        get().toast('error', e instanceof Error ? e.message : t('toast.projectOpenError'));
      }
    },

    openProject: async (id) => {
      set({ busy: t('common.loadingEditor') });
      try {
        const stored = await db.getProject(id);
        if (!stored) {
          set({ busy: null });
          get().toast('error', t('toast.projectOpenError'));
          return;
        }
        const doc = normalizeProject(stored.doc);
        const assetIds = new Set<string>();
        for (const track of doc.tracks) for (const clip of track.clips) if (clip.assetId) assetIds.add(clip.assetId);
        const assets: Record<string, Asset> = {};
        let missing = 0;
        for (const assetId of assetIds) {
          const media = await db.getMedia(assetId);
          if (media) {
            let url = assetUrlCache.get(assetId);
            if (!url) {
              url = URL.createObjectURL(media.blob);
              assetUrlCache.set(assetId, url);
            }
            assets[assetId] = { ...media.meta, url };
          } else {
            missing++;
            assets[assetId] = {
              id: assetId,
              name: assetId,
              kind: 'video',
              mime: '',
              size: 0,
              duration: 5,
              width: 0,
              height: 0,
              hasAudio: false,
              url: '',
              missing: true,
              createdAt: Date.now(),
            };
          }
        }
        const luts = (await db.kvGet<Record<string, Lut>>(`luts:${id}`)) ?? {};
        const journal = await db.readJournal(id);
        let recovery: RecoveryInfo | null = null;
        if (journal?.doc && JSON.stringify(journal.doc) !== JSON.stringify(stored.doc)) {
          recovery = { projectId: id, doc: normalizeProject(journal.doc) };
        }
        set({
          project: doc,
          assets,
          luts,
          past: [],
          future: [],
          selection: [],
          selectedTrackId: doc.tracks.find((tr) => tr.kind === 'video')?.id ?? null,
          playhead: 0,
          playing: false,
          view: 'editor',
          busy: null,
          saveStatus: 'saved',
          lastSavedAt: stored.updatedAt,
          mobileTab: 'preview',
          recovery,
          dialog: recovery ? 'recover' : null,
          exportOptions: {
            ...get().exportOptions,
            filename: doc.name.replace(/[^\w\u0600-\u06FF-]+/g, '-').toLowerCase() || 'editez-export',
          },
        });
        location.hash = `#/editor/${doc.id}`;
        if (missing) get().toast('warn', t('toast.missingMedia'));
      } catch (e) {
        set({ busy: null });
        get().toast('error', e instanceof Error ? e.message : t('toast.projectOpenError'));
      }
    },

    deleteProject: async (id) => {
      await db.deleteProject(id);
      if (get().project?.id === id) set({ project: null, view: 'home' });
      await get().refreshProjects();
      get().toast('success', t('home.deleted'));
      void get().refreshStorage();
    },

    duplicateProject: async (id) => {
      const stored = await db.getProject(id);
      if (!stored) return;
      const copy = structuredClone(stored.doc);
      copy.id = uid('prj');
      copy.name = `${stored.name} — copy`;
      copy.createdAt = Date.now();
      copy.updatedAt = Date.now();
      await db.saveProject(copy);
      await get().refreshProjects();
      get().toast('success', t('home.duplicated'));
    },

    renameProject: (name) => {
      get().mutate((p) => {
        p.name = name.trim() || p.name;
      });
    },

    /* --------------------------------------------------------- history */
    mutate: (fn, opts = {}) => {
      const s = get();
      if (!s.project) return;
      const now = Date.now();
      const skipSnapshot = !!opts.coalesce && s.lastCoalesceKey === opts.coalesce && now - s.lastMutationAt < 800;
      const history = opts.history !== false && !skipSnapshot;
      const draft = structuredClone(s.project);
      fn(draft);
      updateDuration(draft);
      set({
        project: draft,
        past: history ? [...s.past.slice(-59), s.project] : s.past,
        future: history ? [] : s.future,
        saveStatus: 'dirty',
        lastCoalesceKey: opts.coalesce ?? null,
        lastMutationAt: now,
      });
      get().scheduleSave();
    },

    undo: () => {
      const { past, project, future } = get();
      if (!past.length || !project) {
        get().toast('info', t('toast.nothingToUndo'));
        return;
      }
      const previous = past[past.length - 1];
      set({
        project: previous,
        past: past.slice(0, -1),
        future: [project, ...future].slice(0, 60),
        saveStatus: 'dirty',
        selection: get().selection.filter((id) => !!findClip(previous, id)),
      });
      get().scheduleSave();
    },

    redo: () => {
      const { future, project, past } = get();
      if (!future.length || !project) {
        get().toast('info', t('toast.nothingToRedo'));
        return;
      }
      const next = future[0];
      set({
        project: next,
        future: future.slice(1),
        past: [...past, project].slice(-60),
        saveStatus: 'dirty',
        selection: get().selection.filter((id) => !!findClip(next, id)),
      });
      get().scheduleSave();
    },

    saveNow: async () => {
      const { project } = get();
      if (!project) return;
      set({ saveStatus: 'saving' });
      try {
        const thumb = thumbProvider?.();
        await db.saveProject({ ...project, updatedAt: Date.now() }, { thumb });
        void db.kvSet(`luts:${project.id}`, get().luts);
        set({ saveStatus: 'saved', lastSavedAt: Date.now() });
        void get().refreshProjects();
        void get().refreshStorage();
      } catch (e) {
        set({ saveStatus: 'error' });
        const name = e instanceof Error ? e.name : '';
        get().toast('error', name === 'QuotaExceededError' ? t('toast.storageFull') : t('toast.autosaveFailed'));
      }
    },

    scheduleSave: () => {
      if (saveTimer) window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        saveTimer = null;
        void get().saveNow();
      }, 900);
    },

    /* ------------------------------------------------------------ ui */
    setSelection: (ids, trackId) => {
      const project = get().project;
      set({
        selection: project ? expandSelection(project, ids) : ids,
        ...(trackId !== undefined ? { selectedTrackId: trackId } : {}),
      });
    },

    toggleSelection: (id) => {
      const current = get().selection;
      get().setSelection(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
    },

    selectTrack: (id) => set({ selectedTrackId: id }),
    setPlayhead: (time) => {
      const project = get().project;
      set({ playhead: clamp(time, 0, project ? Math.max(1, project.duration) : 60) });
    },
    setPlaying: (playing) => set({ playing }),
    togglePlay: () => set({ playing: !get().playing }),
    setZoom: (z) => set({ zoom: clamp(z, 10, 500) }),
    setTool: (tool) => set({ tool }),
    setPanel: (panel) => set({ panel }),
    openDialog: (dialog) => set({ dialog }),
    setMobileTab: (mobileTab) => set({ mobileTab }),
    setPreviewQuality: (previewQuality) => set({ previewQuality }),
    setVolume: (volume) => set({ volume: clamp(volume, 0, 1) }),
    setMuted: (muted) => set({ muted }),
    setCompare: (compare) => set({ compare }),
    setEyedropper: (eyedropper) => set({ eyedropper }),
    setExporting: (exporting) => set({ exporting, playing: false }),

    toast: (kind, message, actionLabel, action) => {
      const id = uid('toast');
      set({ toasts: [...get().toasts.slice(-3), { id, kind, message, actionLabel, action }] });
      window.setTimeout(() => get().dismissToast(id), kind === 'error' ? 7000 : 4200);
    },
    dismissToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
    setBusy: (busy) => set({ busy }),

    toggleFavorite: (type) => {
      const favorites = get().favorites.includes(type)
        ? get().favorites.filter((f) => f !== type)
        : [...get().favorites, type];
      set({ favorites });
      void db.kvSet('favorites', favorites);
    },
    markOnboardingSeen: () => {
      set({ onboardingSeen: true });
      void db.kvSet('onboardSeen', true);
    },
    markTipSeen: (id) => {
      const tipsSeen = { ...get().tipsSeen, [id]: true };
      set({ tipsSeen });
      void db.kvSet('tipsSeen', tipsSeen);
    },

    /* ---------------------------------------------------------- media */
    importFiles: async (files) => {
      const list = Array.from(files);
      if (!list.length) return;
      set({ busy: t('media.importing', { name: list[0].name }) });
      const outcomes: ImportOutcome[] = [];
      for (const file of list) {
        try {
          outcomes.push(await importFile(file));
        } catch {
          outcomes.push({ error: { code: 'read', name: file.name } });
        }
      }
      set({ busy: null });
      let imported = 0;
      for (const outcome of outcomes) {
        if (outcome.error || !outcome.asset || !outcome.blob) {
          const code = outcome.error?.code ?? 'decode';
          const message =
            code === 'too-big'
              ? t('toast.fileTooBig')
              : code === 'subtitle'
                ? t('subs.importError')
                : code === 'unsupported'
                  ? `${t('media.unsupported')} — ${outcome.error?.name ?? ''}`
                  : `${t('toast.unsupported')} — ${outcome.error?.name ?? ''}`;
          get().toast('error', message);
          continue;
        }
        const { asset, blob, cues } = outcome;
        try {
          await db.saveMedia(asset, blob);
        } catch {
          get().toast('error', t('toast.storageFull'));
        }
        if (asset.url) assetUrlCache.set(asset.id, asset.url);
        set({ assets: { ...get().assets, [asset.id]: asset } });
        imported++;
        if (cues && cues.length) appendCueClips(cues);
      }
      if (imported) get().toast('success', t('media.imported', { n: imported }));
      void get().refreshStorage();
    },

    addAssetToTimeline: (assetId, trackId, at) => {
      const { project, assets, playhead } = get();
      const asset = assets[assetId];
      if (!project || !asset) return;
      const draft = structuredClone(project);
      let track = trackId ? draft.tracks.find((tr) => tr.id === trackId) : undefined;
      if (asset.kind === 'subtitle') {
        get().importCues([]);
        return;
      }
      if (!track) {
        const type = asset.kind === 'video' ? 'video' : asset.kind === 'image' ? 'image' : 'audio';
        track = trackForClip(draft, type);
      }
      if (!track) {
        const kind: TrackKind = asset.kind === 'audio' || asset.kind === 'music' || asset.kind === 'sfx' ? 'audio' : 'video';
        track = makeTrack(kind, kind === 'audio' ? 'Audio' : 'Video 2');
        draft.tracks.push(track);
      }
      if (track.locked) {
        get().toast('warn', t('toast.locked'));
        return;
      }
      const clip = clipFromAsset(asset, track.id, at ?? playhead);
      addClipToProject(draft, clip, { avoidOverlap: true });
      set({
        project: draft,
        past: [...get().past.slice(-59), project],
        future: [],
        selection: [clip.id],
        selectedTrackId: track.id,
        saveStatus: 'dirty',
      });
      get().scheduleSave();
      get().toast('success', t('toast.clipAdded'));
    },

    removeAsset: async (assetId) => {
      const { project, assets } = get();
      if (!project) return;
      const draft = structuredClone(project);
      for (const track of draft.tracks) track.clips = track.clips.filter((c) => c.assetId !== assetId);
      updateDuration(draft);
      const nextAssets = { ...assets };
      delete nextAssets[assetId];
      await db.deleteMedia(assetId);
      assetUrlCache.delete(assetId);
      set({
        project: draft,
        assets: nextAssets,
        past: [...get().past.slice(-59), project],
        future: [],
        selection: [],
        saveStatus: 'dirty',
      });
      get().scheduleSave();
      void get().refreshStorage();
    },

    addGeneratedAsset: async (asset, blob, opts = {}) => {
      try {
        await db.saveMedia(asset, blob);
      } catch {
        get().toast('error', t('toast.storageFull'));
      }
      if (asset.url) assetUrlCache.set(asset.id, asset.url);
      set({ assets: { ...get().assets, [asset.id]: asset } });
      if (opts.addToTimeline) get().addAssetToTimeline(asset.id);
      void get().refreshStorage();
    },

    importCues: (cues) => {
      if (!cues.length) return;
      appendCueClips(cues);
    },

    /* ----------------------------------------------------------- text */
    addText: (presetId, content, at) => {
      const { project, playhead } = get();
      if (!project) return;
      const draft = structuredClone(project);
      let track = draft.tracks.find((tr) => tr.kind === 'text');
      if (!track) {
        track = makeTrack('text', 'Text');
        draft.tracks.unshift(track);
      }
      const preset = TEXT_PRESETS[presetId] ?? TEXT_PRESETS.plain;
      const start = at ?? playhead;
      const clip = makeTextClip(
        track.id,
        start,
        { ...preset.text, ...(content !== undefined ? { content } : {}) } as Partial<TextStyle>,
        preset.duration
      );
      addClipToProject(draft, clip, { avoidOverlap: true });
      set({
        project: draft,
        past: [...get().past.slice(-59), project],
        future: [],
        selection: [clip.id],
        selectedTrackId: track.id,
        panel: 'text',
        saveStatus: 'dirty',
      });
      get().scheduleSave();
      get().toast('success', t('text.added'));
    },

    addSubtitle: (text, at, duration) => {
      const { project, playhead } = get();
      if (!project) return;
      const draft = structuredClone(project);
      let track = draft.tracks.find((tr) => tr.kind === 'subtitle');
      if (!track) {
        track = makeTrack('subtitle', 'Subtitles');
        draft.tracks.unshift(track);
      }
      const start = at ?? playhead;
      const clip = makeSubtitleClip(track.id, start, start + (duration ?? 2.5), text ?? '');
      addClipToProject(draft, clip, { avoidOverlap: true });
      set({
        project: draft,
        past: [...get().past.slice(-59), project],
        future: [],
        selection: [clip.id],
        selectedTrackId: track.id,
        panel: 'subtitles',
        saveStatus: 'dirty',
      });
      get().scheduleSave();
    },

    addTrack: (kind, role) => {
      const { project } = get();
      if (!project) return null;
      if (project.tracks.length >= 24) {
        get().toast('warn', t('toast.maxTracks'));
        return null;
      }
      const draft = structuredClone(project);
      const count = draft.tracks.filter((tr) => tr.kind === kind).length + 1;
      const names: Record<TrackKind, string> = {
        video: 'Video',
        overlay: 'Overlay',
        text: 'Text',
        audio: 'Audio',
        subtitle: 'Subtitles',
      };
      const track = makeTrack(kind, `${names[kind]} ${count}`, role);
      let index = draft.tracks.length;
      for (let i = 0; i < draft.tracks.length; i++) {
        if (TRACK_ORDER[draft.tracks[i].kind] > TRACK_ORDER[kind]) {
          index = i;
          break;
        }
      }
      draft.tracks.splice(index, 0, track);
      set({
        project: draft,
        past: [...get().past.slice(-59), project],
        future: [],
        selectedTrackId: track.id,
        saveStatus: 'dirty',
      });
      get().scheduleSave();
      return track;
    },

    removeTrack: (trackId) => {
      const { project } = get();
      if (!project) return;
      const draft = structuredClone(project);
      draft.tracks = draft.tracks.filter((tr) => tr.id !== trackId);
      if (!draft.tracks.length) draft.tracks.push(makeTrack('video', 'Video 1'));
      updateDuration(draft);
      set({
        project: draft,
        past: [...get().past.slice(-59), project],
        future: [],
        selectedTrackId: draft.tracks[0]?.id ?? null,
        saveStatus: 'dirty',
      });
      get().scheduleSave();
    },

    setTrack: (trackId, patch) => {
      get().mutate((p) => {
        const track = p.tracks.find((tr) => tr.id === trackId);
        if (track) Object.assign(track, patch);
      });
    },

    addMarker: (at) => {
      const { project, playhead } = get();
      if (!project) return;
      const time = at ?? playhead;
      get().mutate((p) => {
        if (p.markers.some((m) => Math.abs(m.t - time) < 0.05)) return;
        p.markers.push({ id: uid('mrk'), t: time, label: '', color: '#ffb245' });
        p.markers.sort((a, b) => a.t - b.t);
      });
      get().toast('success', t('toast.markerAdded'));
    },

    removeMarker: (id) => {
      get().mutate((p) => {
        p.markers = p.markers.filter((m) => m.id !== id);
      });
    },

    /* ---------------------------------------------------------- edits */
    splitAtPlayhead: (clipId) => {
      const { project, playhead } = get();
      if (!project) return;
      const draft = structuredClone(project);
      let created: Clip[] = [];
      if (clipId) created = splitClip(draft, clipId, playhead);
      else created = splitAllAt(draft, playhead);
      if (!created.length) {
        get().toast('info', t('toast.noClipHere'));
        return;
      }
      set({
        project: draft,
        past: [...get().past.slice(-59), project],
        future: [],
        selection: created.map((c) => c.id),
        saveStatus: 'dirty',
      });
      get().scheduleSave();
      get().toast('success', t('toast.clipSplit'));
    },

    deleteSelection: (ripple) => {
      const { project, selection } = get();
      if (!project || !selection.length) return;
      const draft = structuredClone(project);
      removeClips(draft, selection, ripple ?? project.settings.ripple);
      set({
        project: draft,
        past: [...get().past.slice(-59), project],
        future: [],
        selection: [],
        saveStatus: 'dirty',
      });
      get().scheduleSave();
      get().toast('success', t('toast.clipDeleted'));
    },

    duplicateSelection: () => {
      const { project, selection } = get();
      if (!project || !selection.length) return;
      const draft = structuredClone(project);
      const created = duplicateClips(draft, selection);
      set({
        project: draft,
        past: [...get().past.slice(-59), project],
        future: [],
        selection: created.map((c) => c.id),
        saveStatus: 'dirty',
      });
      get().scheduleSave();
      get().toast('success', t('toast.clipDuplicated'));
    },

    copySelection: () => {
      const { project, selection } = get();
      if (!project || !selection.length) return;
      const clips: Clip[] = [];
      for (const id of selection) {
        const found = findClip(project, id);
        if (found) clips.push(structuredClone(found.clip));
      }
      set({ clipboard: clips });
      get().toast('success', t('toast.copied'));
    },

    pasteClipboard: () => {
      const { project, clipboard, playhead } = get();
      if (!project || !clipboard?.length) return;
      const draft = structuredClone(project);
      const minStart = Math.min(...clipboard.map((c) => c.start));
      const created: Clip[] = [];
      for (const clip of clipboard) {
        const copy = structuredClone(clip);
        copy.id = uid('clp');
        copy.groupId = null;
        copy.start = playhead + (clip.start - minStart);
        let track = draft.tracks.find((tr) => tr.kind === (clip.type === 'audio' ? 'audio' : trackKindOf(clip)));
        if (!track) {
          track = makeTrack(clip.type === 'audio' ? 'audio' : trackKindOf(clip), 'Pasted');
          draft.tracks.push(track);
        }
        copy.trackId = track.id;
        copy.start = findFreeStart(track, copy.start, copy.duration);
        track.clips.push(copy);
        track.clips.sort((a, b) => a.start - b.start);
        created.push(copy);
      }
      updateDuration(draft);
      set({
        project: draft,
        past: [...get().past.slice(-59), project],
        future: [],
        selection: created.map((c) => c.id),
        saveStatus: 'dirty',
      });
      get().scheduleSave();
      get().toast('success', t('toast.pasted'));
    },

    groupSelection: () => {
      const { project, selection } = get();
      if (!project || selection.length < 2) {
        get().toast('info', t('timeline.groupHint'));
        return;
      }
      const draft = structuredClone(project);
      groupClips(draft, selection);
      set({
        project: draft,
        past: [...get().past.slice(-59), project],
        future: [],
        saveStatus: 'dirty',
      });
      get().scheduleSave();
      get().toast('success', t('timeline.grouped'));
    },

    ungroupSelection: () => {
      const { project, selection } = get();
      if (!project) return;
      const draft = structuredClone(project);
      ungroupClips(draft, selection);
      set({
        project: draft,
        past: [...get().past.slice(-59), project],
        future: [],
        saveStatus: 'dirty',
      });
      get().scheduleSave();
    },

    addLut: (lut) => {
      set({ luts: { ...get().luts, [lut.id]: lut } });
      const project = get().project;
      if (project) void db.kvSet(`luts:${project.id}`, get().luts);
    },

    /* ------------------------------------------------------- recovery */
    applyRecovery: async () => {
      const recovery = get().recovery;
      if (!recovery) return;
      set({
        project: recovery.doc,
        recovery: null,
        dialog: null,
        past: [],
        future: [],
        saveStatus: 'dirty',
      });
      get().toast('success', t('editor.recovered'));
      await get().saveNow();
    },

    dismissRecovery: () => {
      const recovery = get().recovery;
      if (recovery) void db.clearJournal(recovery.projectId);
      set({ recovery: null, dialog: null });
    },

    refreshStorage: async () => {
      const info = await db.storageEstimate();
      set({ storage: info });
    },

    clearAllData: async () => {
      await db.clearEverything();
      set({
        projects: [],
        project: null,
        assets: {},
        luts: {},
        past: [],
        future: [],
        selection: [],
        view: 'home',
      });
      assetUrlCache.clear();
      await get().refreshProjects();
      await get().refreshStorage();
      get().toast('success', t('settings.clearAllDone'));
    },

    downloadBackup: async (projectId) => {
      const project = get().project;
      const id = projectId ?? project?.id;
      if (!id) return;
      const stored = await db.getProject(id);
      if (!stored) return;
      const assetIds = new Set<string>();
      for (const track of stored.doc.tracks) for (const clip of track.clips) if (clip.assetId) assetIds.add(clip.assetId);
      const media: { meta: Asset; dataUrl: string }[] = [];
      for (const assetId of assetIds) {
        const record = await db.getMedia(assetId);
        if (!record) continue;
        const dataUrl = await blobToDataUrl(record.blob);
        media.push({ meta: { ...record.meta, url: '' } as Asset, dataUrl });
      }
      const luts = (await db.kvGet<Record<string, Lut>>(`luts:${id}`)) ?? {};
      const payload = {
        format: 'editez-backup',
        version: 1,
        exportedAt: Date.now(),
        doc: stored.doc,
        luts,
        media,
      };
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      downloadBlob(blob, `${stored.name.replace(/[^\w\u0600-\u06FF-]+/g, '-').toLowerCase() || 'project'}.editez`);
    },

    restoreBackup: async (file) => {
      try {
        const text = await file.text();
        const payload = JSON.parse(text) as {
          format: string;
          doc: Project;
          luts?: Record<string, Lut>;
          media?: { meta: Asset; dataUrl: string }[];
        };
        if (payload.format !== 'editez-backup' || !payload.doc) throw new Error('invalid');
        const doc = normalizeProject(payload.doc);
        const newId = uid('prj');
        const idMap = new Map<string, string>();
        doc.id = newId;
        doc.name = `${doc.name} (restored)`;
        const assets: Record<string, Asset> = {};
        for (const item of payload.media ?? []) {
          const blob = await dataUrlToBlob(item.dataUrl);
          const url = URL.createObjectURL(blob);
          const asset: Asset = { ...item.meta, id: uid('asset'), url };
          if (item.meta.id) idMap.set(item.meta.id, asset.id);
          await db.saveMedia(asset, blob);
          assets[asset.id] = asset;
        }
        for (const track of doc.tracks) {
          for (const clip of track.clips) {
            if (clip.assetId && idMap.has(clip.assetId)) clip.assetId = idMap.get(clip.assetId);
          }
        }
        await db.saveProject(doc);
        set({
          project: doc,
          assets,
          luts: payload.luts ?? {},
          past: [],
          future: [],
          selection: [],
          view: 'editor',
          saveStatus: 'saved',
          lastSavedAt: Date.now(),
          dialog: null,
        });
        location.hash = `#/editor/${doc.id}`;
        get().toast('success', t('settings.restoreDone'));
        await get().refreshProjects();
      } catch {
        get().toast('error', t('settings.restoreError'));
      }
    },

    setExportOptions: (patch) => set({ exportOptions: { ...get().exportOptions, ...patch } }),
  };
});

function trackKindOf(clip: Clip): TrackKind {
  switch (clip.type) {
    case 'audio':
      return 'audio';
    case 'text':
      return 'text';
    case 'subtitle':
      return 'subtitle';
    case 'image':
    case 'shape':
      return 'overlay';
    default:
      return 'video';
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export const useCurrentClip = (): { clip: Clip | null; track: Track | null } => {
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const id = selection[0];
  if (!project || !id) return { clip: null, track: null };
  const found = findClip(project, id);
  return { clip: found?.clip ?? null, track: found?.track ?? null };
};

export { canHold, MIN_CLIP, rippleShift };
