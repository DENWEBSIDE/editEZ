import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import { EFFECTS } from '../../lib/presets';
import { useT } from '../../i18n';
import { Icon, type IconName } from '../Icons';
import { IconButton, Tip, useConfirm } from '../ui';
import { formatTimecode, formatTimeShort, modKey } from '../../lib/format';
import { MIN_CLIP, rippleShift, splitClip } from '../../lib/edits';
import type { Clip, Track, TrackKind } from '../../types';
import { clamp } from '../../types';

const RULER_H = 30;
const TICK_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];

const TRACK_ICONS: Record<TrackKind, IconName> = {
  video: 'film',
  overlay: 'layers',
  text: 'text',
  audio: 'waveform',
  subtitle: 'subtitle',
};

interface DragState {
  mode: 'move' | 'trimL' | 'trimR';
  clipId: string;
  trackId: string;
  origin: Clip;
  startX: number;
  dx: number;
  targetTrackId: string;
  snapTime: number | null;
  moved: boolean;
}

function tickStep(zoom: number) {
  for (const step of TICK_STEPS) if (step * zoom >= 64) return step;
  return 300;
}

function Waveform({ peaks, width, height }: { peaks: number[]; width: number; height: number }) {
  const bars = useMemo(() => {
    const count = Math.max(8, Math.min(500, Math.floor(width / 3)));
    const out: { x: number; h: number }[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.min(peaks.length - 1, Math.floor((i / count) * peaks.length));
      out.push({ x: i * 3, h: Math.max(1, (peaks[idx] ?? 0) * Math.max(2, height - 6)) });
    }
    return out;
  }, [peaks, width, height]);

  return (
    <svg className="waveform" width={Math.max(4, width)} height={Math.max(4, height)} aria-hidden="true">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={(height - b.h) / 2} width={2} height={b.h} rx={1} fill="rgba(255,255,255,.72)" />
      ))}
    </svg>
  );
}

function ClipView({
  clip,
  track,
  zoom,
  selected,
  dragging,
  onPointerDown,
  onContextMenu,
  onDoubleClick,
}: {
  clip: Clip;
  track: Track;
  zoom: number;
  selected: boolean;
  dragging: boolean;
  onPointerDown: (e: React.PointerEvent, clip: Clip, track: Track, mode: 'move' | 'trimL' | 'trimR') => void;
  onContextMenu: (e: React.MouseEvent, clip: Clip, track: Track) => void;
  onDoubleClick: (clip: Clip) => void;
}) {
  const t = useT();
  const assets = useStore((s) => s.assets);
  const asset = clip.assetId ? assets[clip.assetId] : undefined;
  const width = Math.max(8, clip.duration * zoom);
  const height = Math.max(18, track.height - 6);
  const label = clip.type === 'text' || clip.type === 'subtitle' ? clip.text?.content || clip.name : clip.name;

  return (
    <div
      className={`clip clip-${clip.type} ${selected ? 'is-selected' : ''} ${dragging ? 'is-dragging' : ''} ${
        asset?.missing ? 'is-missing' : ''
      }`}
      style={{
        width,
        height,
        ['--clip-color' as string]: clip.color,
        backgroundImage: (clip.type === 'video' || clip.type === 'image') && asset?.thumb ? `url(${asset.thumb})` : undefined,
        backgroundSize: (clip.type === 'video' || clip.type === 'image') && asset?.thumb ? 'auto 100%' : undefined,
        backgroundRepeat: (clip.type === 'video' || clip.type === 'image') && asset?.thumb ? 'repeat-x' : undefined,
      }}
      role="button"
      tabIndex={0}
      aria-label={`${label || t('common.empty')} · ${formatTimeShort(clip.duration)}`}
      aria-selected={selected}
      onPointerDown={(e) => onPointerDown(e, clip, track, 'move')}
      onContextMenu={(e) => onContextMenu(e, clip, track)}
      onDoubleClick={() => onDoubleClick(clip)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          useStore.getState().setSelection([clip.id], track.id);
        }
      }}
    >
      <span
        className="clip-edge clip-edge-l"
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown(e, clip, track, 'trimL');
        }}
      />
      <span
        className="clip-edge clip-edge-r"
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown(e, clip, track, 'trimR');
        }}
      />
      <span className="clip-tint" aria-hidden="true" />
      <span className="clip-content">
        {clip.type === 'audio' ? (
          asset?.peaks?.length ? (
            <Waveform peaks={asset.peaks} width={width} height={height - 20} />
          ) : (
            <span className="clip-stripes" aria-hidden="true" />
          )
        ) : null}
        <span className="clip-label">
          {clip.type === 'audio' ? <Icon name="waveform" size={12} /> : null}
          {clip.type === 'text' ? <Icon name="text" size={12} /> : null}
          {clip.type === 'subtitle' ? <Icon name="subtitle" size={12} /> : null}
          {asset?.missing ? <Icon name="alert" size={12} /> : null}
          <span className="clip-label-text">{label || t('common.empty')}</span>
        </span>
        <span className="clip-badges">
          {clip.speed !== 1 ? <span className="clip-badge mono">{clip.speed.toFixed(2)}×</span> : null}
          {clip.reverse ? <span className="clip-badge">⏪</span> : null}
          {clip.chroma?.enabled ? <span className="clip-badge chroma" title="chroma" /> : null}
          {Object.values(clip.keyframes).some((f) => f && f.length) ? (
            <span className="clip-badge kf">
              <Icon name="keyframe" size={9} />
            </span>
          ) : null}
          {clip.effects.length ? <span className="clip-badge mono">{clip.effects.length}fx</span> : null}
          {clip.muted ? (
            <span className="clip-badge">
              <Icon name="volumeOff" size={9} />
            </span>
          ) : null}
        </span>
      </span>
      {width > 44
        ? (() => {
            const times = new Set<number>();
            for (const frames of Object.values(clip.keyframes)) {
              frames?.forEach((f) => times.add(f.t));
            }
            if (!times.size) return null;
            return [...times].map((time, i) => (
              <span
                key={`kf-${i}`}
                className="clip-kf"
                style={{ left: `${clamp(time / Math.max(0.001, clip.duration), 0, 1) * 100}%` }}
                aria-hidden="true"
              />
            ));
          })()
        : null}
      {clip.transitionIn && clip.transitionIn.type !== 'none' ? (
        <span className="clip-trans clip-trans-in" title={t('props.transition.in')} />
      ) : null}
      {clip.transitionOut && clip.transitionOut.type !== 'none' ? (
        <span className="clip-trans clip-trans-out" title={t('props.transition.out')} />
      ) : null}
    </div>
  );
}

export function Timeline() {
  const t = useT();
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const playhead = useStore((s) => s.playhead);
  const playing = useStore((s) => s.playing);
  const zoom = useStore((s) => s.zoom);
  const tool = useStore((s) => s.tool);
  const selectedTrackId = useStore((s) => s.selectedTrackId);
  const exporting = useStore((s) => s.exporting);
  const confirm = useConfirm();

  const bodyRef = useRef<HTMLDivElement>(null);
  const headersRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [dragView, setDragView] = useState<{ dx: number; snapTime: number | null; mode: DragState['mode']; ids: string[] } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; clip: Clip; track: Track } | null>(null);
  const [trackMenu, setTrackMenu] = useState<{ x: number; y: number; track: Track } | null>(null);
  const [addMenu, setAddMenu] = useState<{ x: number; y: number } | null>(null);
  const [drop, setDrop] = useState<{ time: number; trackId: string } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [viewportW, setViewportW] = useState(800);

  const tracks = project?.tracks ?? [];
  const duration = project ? Math.max(project.duration, 12) : 30;
  const contentWidth = Math.max(viewportW, duration * zoom);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const update = () => setViewportW(el.clientWidth);
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const syncScroll = useCallback(() => {
    if (headersRef.current && bodyRef.current) headersRef.current.scrollTop = bodyRef.current.scrollTop;
  }, []);

  useEffect(() => {
    const fit = () => {
      const el = bodyRef.current;
      const state = useStore.getState();
      if (!el || !state.project) return;
      state.setZoom(clamp((el.clientWidth - 56) / Math.max(4, state.project.duration), 10, 400));
    };
    const center = () => {
      const el = bodyRef.current;
      if (!el) return;
      const state = useStore.getState();
      el.scrollLeft = Math.max(0, state.playhead * state.zoom - el.clientWidth / 2);
    };
    window.addEventListener('editez:fit-timeline', fit);
    window.addEventListener('editez:center-playhead', center);
    return () => {
      window.removeEventListener('editez:fit-timeline', fit);
      window.removeEventListener('editez:center-playhead', center);
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const el = bodyRef.current;
    if (!el) return;
    const x = playhead * zoom;
    const right = el.scrollLeft + el.clientWidth - 40;
    if (x > right || x < el.scrollLeft) el.scrollLeft = Math.max(0, x - el.clientWidth * 0.3);
  }, [playhead, playing, zoom]);

  useEffect(() => {
    if (!menu && !trackMenu && !addMenu) return;
    const close = () => {
      setMenu(null);
      setTrackMenu(null);
      setAddMenu(null);
    };
    const onDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.menu')) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu, trackMenu, addMenu]);

  const snapTargets = useMemo(() => {
    if (!project) return [] as number[];
    const targets = new Set<number>([0, playhead]);
    for (const marker of project.markers) targets.add(marker.t);
    for (const track of project.tracks) {
      for (const clip of track.clips) {
        if (selection.includes(clip.id)) continue;
        targets.add(clip.start);
        targets.add(clip.start + clip.duration);
      }
    }
    return [...targets];
  }, [project, playhead, selection]);

  const timeFromEvent = useCallback(
    (clientX: number, laneEl: HTMLElement) => {
      const rect = laneEl.getBoundingClientRect();
      return Math.max(0, (clientX - rect.left) / zoom);
    },
    [zoom]
  );

  const onClipPointerDown = useCallback(
    (e: React.PointerEvent, clip: Clip, track: Track, mode: 'move' | 'trimL' | 'trimR') => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const s = useStore.getState();
      if (track.locked) {
        s.toast('warn', t('toast.locked'));
        return;
      }
      const laneEl = (e.currentTarget as HTMLElement).closest('.lane') as HTMLElement | null;
      if (s.tool === 'razor' && mode === 'move' && laneEl) {
        const time = timeFromEvent(e.clientX, laneEl);
        s.setPlayhead(time);
        s.mutate((p) => {
          splitClip(p, clip.id, time);
        });
        return;
      }
      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      if (additive) s.toggleSelection(clip.id);
      else if (!s.selection.includes(clip.id)) s.setSelection([clip.id], track.id);
      else s.selectTrack(track.id);
      const currentSelection = useStore.getState().selection;
      dragRef.current = {
        mode,
        clipId: clip.id,
        trackId: track.id,
        origin: structuredClone(clip),
        startX: e.clientX,
        dx: 0,
        targetTrackId: track.id,
        snapTime: null,
        moved: false,
      };
      setDragView({ dx: 0, snapTime: null, mode, ids: currentSelection.includes(clip.id) ? currentSelection : [clip.id] });
    },
    [t, timeFromEvent]
  );

  const dragActive = !!dragView;

  useEffect(() => {
    if (!dragActive) return;

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dxPx = e.clientX - drag.startX;
      if (Math.abs(dxPx) > 2) drag.moved = true;
      const origin = drag.origin;
      const project2 = useStore.getState().project;
      let dx = dxPx;
      let snapTime: number | null = null;
      const snapping = project2?.settings.snapping ?? true;
      if (snapping && !e.altKey) {
        const threshold = (project2?.settings.snapThreshold ?? 8) / zoom;
        const edges =
          drag.mode === 'move'
            ? [origin.start, origin.start + origin.duration]
            : drag.mode === 'trimL'
              ? [origin.start]
              : [origin.start + origin.duration];
        let best: { dx: number; time: number } | null = null;
        for (const edge of edges) {
          const raw = edge + dxPx / zoom;
          for (const target of snapTargets) {
            const diff = target - raw;
            if (Math.abs(diff) <= threshold) {
              const candidate = dxPx + diff * zoom;
              if (!best || Math.abs(candidate - dxPx) < Math.abs(best.dx - dxPx)) best = { dx: candidate, time: target };
            }
          }
        }
        if (best) {
          dx = best.dx;
          snapTime = best.time;
        }
      }
      let targetTrackId = drag.trackId;
      if (drag.mode === 'move' && project2) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const row = el?.closest('[data-track-id]') as HTMLElement | null;
        const candidate = row ? project2.tracks.find((tr) => tr.id === row.dataset.trackId) : undefined;
        const wantsAudio = origin.type === 'audio';
        if (candidate && !candidate.locked && (candidate.kind === 'audio') === wantsAudio) {
          targetTrackId = candidate.id;
        }
      }
      drag.dx = dx;
      drag.snapTime = snapTime;
      drag.targetTrackId = targetTrackId;
      drag.moved = drag.moved || Math.abs(dxPx) > 2;
      setDragView((prev) =>
        prev ? { ...prev, dx, snapTime, ids: prev.ids } : { dx, snapTime, mode: drag.mode, ids: [drag.clipId] }
      );
    };

    const onUp = () => {
      const drag = dragRef.current;
      const s = useStore.getState();
      if (drag && drag.moved) {
        const deltaSec = drag.dx / zoom;
        const origin = drag.origin;
        const ids = dragView?.ids ?? [drag.clipId];
        const multi = ids.length > 1 && ids.includes(drag.clipId);
        const minStart = multi
          ? Math.min(
              ...ids.map((id) => project?.tracks.flatMap((tr) => tr.clips).find((c) => c.id === id)?.start ?? origin.start)
            )
          : origin.start;
        const delta = Math.max(deltaSec, -minStart + 0.001);

        s.mutate((p) => {
          if (drag.mode === 'move') {
            const target = p.tracks.find((tr) => tr.id === drag.targetTrackId);
            if (!multi && target && target.id !== drag.trackId && !target.locked) {
              const from = p.tracks.find((tr) => tr.id === drag.trackId);
              const clip = from?.clips.find((c) => c.id === drag.clipId);
              if (from && clip) {
                from.clips = from.clips.filter((c) => c.id !== clip.id);
                clip.trackId = target.id;
                clip.start = Math.max(0, origin.start + delta);
                target.clips.push(clip);
                target.clips.sort((a, b) => a.start - b.start);
              }
            }
            for (const id of multi ? ids : [drag.clipId]) {
              for (const track of p.tracks) {
                const clip = track.clips.find((c) => c.id === id);
                if (clip) clip.start = Math.max(0, clip.start + delta);
              }
            }
            for (const track of p.tracks) track.clips.sort((a, b) => a.start - b.start);
          } else if (drag.mode === 'trimL') {
            for (const track of p.tracks) {
              const clip = track.clips.find((c) => c.id === drag.clipId);
              if (!clip) continue;
              const newStart = clamp(origin.start + delta, 0, origin.start + origin.duration - MIN_CLIP);
              const diff = newStart - origin.start;
              clip.start = newStart;
              clip.duration = Math.max(MIN_CLIP, origin.duration - diff);
              clip.inPoint = Math.max(0, origin.inPoint + diff * origin.speed);
            }
          } else {
            for (const track of p.tracks) {
              const clip = track.clips.find((c) => c.id === drag.clipId);
              if (!clip) continue;
              const nextDuration = Math.max(MIN_CLIP, origin.duration + delta);
              const deltaDuration = nextDuration - origin.duration;
              clip.duration = nextDuration;
              if (p.settings.ripple && Math.abs(deltaDuration) > 0.001) {
                rippleShift(p, clip.trackId, origin.start + origin.duration, deltaDuration, clip.id);
              }
            }
            for (const track of p.tracks) track.clips.sort((a, b) => a.start - b.start);
          }
        });
      }
      dragRef.current = null;
      setDragView(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragActive, dragView?.ids, zoom, snapTargets, project]);

  const seekAt = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    useStore.getState().setPlayhead(Math.max(0, (clientX - rect.left) / zoom));
  };

  const startSeek = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    seekAt(e.clientX, el);
    const onMove = (ev: PointerEvent) => seekAt(ev.clientX, el);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const s = useStore.getState();
      const factor = e.deltaY > 0 ? 0.86 : 1.16;
      const next = clamp(s.zoom * factor, 10, 400);
      const rect = el.getBoundingClientRect();
      const timeAt = (e.clientX - rect.left + el.scrollLeft) / s.zoom;
      s.setZoom(next);
      requestAnimationFrame(() => {
        el.scrollLeft = Math.max(0, timeAt * next - (e.clientX - rect.left));
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  if (!project) return null;

  const step = tickStep(zoom);
  const ticks: { time: number; major: boolean }[] = [];
  const total = Math.ceil(duration / (step / 2)) * (step / 2);
  for (let time = 0; time <= total + step; time += step / 2) ticks.push({ time, major: Math.abs(time % step) < 0.0001 });

  const allClips = project.tracks.flatMap((tr) => tr.clips);
  const selectedClip = selection.length === 1 ? allClips.find((c) => c.id === selection[0]) : null;
  const selectedFx = selectedClip?.effects ?? [];

  const patchClip = (id: string, fn: (c: Clip) => void) => {
    useStore.getState().mutate((p) => {
      for (const track of p.tracks) {
        const clip = track.clips.find((c) => c.id === id);
        if (clip) fn(clip);
      }
    });
  };

  return (
    <section className="timeline" aria-label={t('timeline.title')}>
      <div className="tl-toolbar">
        <div className="tl-tools">
          <Tip label={t('timeline.select')} shortcut="V">
            <button
              type="button"
              className={`tl-tool ${tool === 'select' ? 'is-active' : ''}`}
              aria-pressed={tool === 'select'}
              onClick={() => useStore.getState().setTool('select')}
            >
              <Icon name="cursor" size={16} />
            </button>
          </Tip>
          <Tip label={t('timeline.razor')} shortcut="C">
            <button
              type="button"
              className={`tl-tool ${tool === 'razor' ? 'is-active' : ''}`}
              aria-pressed={tool === 'razor'}
              onClick={() => useStore.getState().setTool('razor')}
            >
              <Icon name="scissors" size={16} />
            </button>
          </Tip>
          <Tip label={t('timeline.splitAt')} shortcut={`${modKey()} B`}>
            <button
              type="button"
              className="tl-tool"
              disabled={!selection.length}
              onClick={() => useStore.getState().splitAtPlayhead()}
            >
              <Icon name="split" size={16} />
            </button>
          </Tip>
          <Tip label={t('common.duplicate')} shortcut={`${modKey()} D`}>
            <button
              type="button"
              className="tl-tool"
              disabled={!selection.length}
              onClick={() => useStore.getState().duplicateSelection()}
            >
              <Icon name="duplicate" size={16} />
            </button>
          </Tip>
          <Tip label={t('common.delete')} shortcut="Del">
            <button
              type="button"
              className="tl-tool"
              disabled={!selection.length}
              onClick={() => useStore.getState().deleteSelection()}
            >
              <Icon name="trash" size={16} />
            </button>
          </Tip>
          <span className="tl-sep" />
          <Tip label={t('timeline.snap')} shortcut="N">
            <button
              type="button"
              className={`tl-tool ${project.settings.snapping ? 'is-active' : ''}`}
              aria-pressed={project.settings.snapping}
              onClick={() => {
                const next = !project.settings.snapping;
                useStore.getState().mutate((p) => {
                  p.settings.snapping = next;
                });
                useStore.getState().toast('info', next ? t('toast.snapOn') : t('toast.snapOff'));
              }}
            >
              <Icon name="magnet" size={16} />
            </button>
          </Tip>
          <Tip label={t('timeline.ripple')}>
            <button
              type="button"
              className={`tl-tool ${project.settings.ripple ? 'is-active' : ''}`}
              aria-pressed={project.settings.ripple}
              onClick={() =>
                useStore.getState().mutate((p) => {
                  p.settings.ripple = !p.settings.ripple;
                })
              }
            >
              <Icon name="ripple" size={16} />
            </button>
          </Tip>
          <span className="tl-sep" />
          <IconButton icon="scissors" label={t('timeline.splitAt')} shortcut="S" size="sm" onClick={() => useStore.getState().splitAtPlayhead()} />
          <IconButton icon="trash" label={t('timeline.removeClip')} shortcut="Del" size="sm" onClick={() => useStore.getState().deleteSelection()} />
          <IconButton icon="duplicate" label={t('timeline.duplicateClip')} size="sm" onClick={() => useStore.getState().duplicateSelection()} />
          <span className="tl-sep" />
          <Tip label={t('timeline.marker')} shortcut="M">
            <button type="button" className="tl-tool" onClick={() => useStore.getState().addMarker()}>
              <Icon name="marker" size={16} />
            </button>
          </Tip>
          <Tip label={`${t('timeline.keyframe')} — ${t('timeline.keyframeHint')}`} shortcut="K">
            <button
              type="button"
              className="tl-tool tl-tool-kf"
              disabled={!selectedClip}
              onClick={() => useStore.getState().addKeyframesHere()}
            >
              <Icon name="keyframe" size={16} />
            </button>
          </Tip>
          <Tip label={t('timeline.addTrack')}>
            <button
              type="button"
              className="tl-tool"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setAddMenu({ x: rect.left, y: rect.bottom + 6 });
              }}
            >
              <Icon name="plus" size={16} />
            </button>
          </Tip>
        </div>

        <div className="tl-time mono" dir="ltr">
          <span>{formatTimecode(playhead, project.canvas.fps, true)}</span>
          <span className="tl-time-sep">/</span>
          <span className="tl-time-total">{formatTimecode(duration, project.canvas.fps, true)}</span>
        </div>

        <div className="tl-spacer" />

        <div className="tl-right">
          <span className="tl-zoom-label mono">{Math.round(zoom)} px/s</span>
          <IconButton icon="zoomOut" label={t('timeline.zoomOut')} size="sm" onClick={() => useStore.getState().setZoom(zoom / 1.35)} />
          <input
            type="range"
            className="range range-zoom"
            min={10}
            max={400}
            step={1}
            value={zoom}
            aria-label={t('timeline.zoomIn')}
            onChange={(e) => useStore.getState().setZoom(parseFloat(e.target.value))}
            style={{ ['--pct' as string]: `${((zoom - 10) / 390) * 100}%` }}
          />
          <IconButton icon="zoomIn" label={t('timeline.zoomIn')} size="sm" onClick={() => useStore.getState().setZoom(zoom * 1.35)} />
          <IconButton
            icon="crop"
            label={t('timeline.fit')}
            size="sm"
            onClick={() => {
              const el = bodyRef.current;
              if (!el) return;
              useStore.getState().setZoom(clamp((el.clientWidth - 60) / Math.max(4, duration), 10, 400));
            }}
          />
        </div>
      </div>

      <div className="tl-fx-strip" aria-label={t('timeline.fx')}>
        <span className="tl-fx-title">
          <Icon name="sparkles" size={13} />
          {t('timeline.fx')}
        </span>
        <div className="tl-fx-chips">
          {selectedClip ? (
            selectedFx.length ? (
              selectedFx.map((fx) => {
                const def = EFFECTS.find((d) => d.type === fx.type);
                return (
                  <button
                    key={fx.id}
                    type="button"
                    className={`tl-fx-chip ${fx.enabled ? '' : 'is-off'}`}
                    title={def ? t(def.label) : fx.type}
                    onClick={() => useStore.getState().setPanel('effects')}
                  >
                    <span className="tl-fx-dot" />
                    {def ? t(def.label) : fx.type}
                  </button>
                );
              })
            ) : (
              <span className="tl-fx-empty">{t('timeline.fxNone')}</span>
            )
          ) : (
            <span className="tl-fx-empty">{t('timeline.fxNone')}</span>
          )}
        </div>
        <span className="tl-spacer" />
        {selectedClip ? (
          <button type="button" className="tl-fx-add" onClick={() => useStore.getState().setPanel('effects')} title={t('timeline.fxOpen')}>
            <Icon name="plus" size={12} />
            {t('timeline.fxAdd')}
          </button>
        ) : null}
      </div>

      <div className={`tl-main ${dragActive ? 'is-dragging' : ''}`}>
        <div className="tl-headers" ref={headersRef} dir="ltr">
          <div className="tl-head-space" style={{ height: RULER_H }} />
          {tracks.map((track) => (
            <div
              key={track.id}
              className={`tl-head ${selectedTrackId === track.id ? 'is-selected' : ''}`}
              style={{ height: track.height }}
              onClick={() => useStore.getState().selectTrack(track.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setTrackMenu({ x: e.clientX, y: e.clientY, track });
              }}
            >
              <span className={`tl-head-icon kind-${track.kind}`}>
                <Icon name={TRACK_ICONS[track.kind]} size={14} />
              </span>
              <div className="tl-head-main">
                {renaming === track.id ? (
                  <input
                    className="tl-rename"
                    defaultValue={track.name}
                    autoFocus
                    aria-label={t('timeline.trackName')}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value) useStore.getState().setTrack(track.id, { name: value });
                      setRenaming(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                  />
                ) : (
                  <button type="button" className="tl-head-name" onClick={() => setRenaming(track.id)} title={t('timeline.trackName')}>
                    {track.name}
                  </button>
                )}
                <span className="tl-head-meta mono">{formatTimeShort(track.clips.reduce((n, c) => Math.max(n, c.start + c.duration), 0))}</span>
              </div>
              <div className="tl-head-actions">
                <button
                  type="button"
                  className={`tl-mini ${track.locked ? 'is-on' : ''}`}
                  aria-label={track.locked ? t('timeline.unlock') : t('timeline.lock')}
                  aria-pressed={track.locked}
                  onClick={(e) => {
                    e.stopPropagation();
                    useStore.getState().setTrack(track.id, { locked: !track.locked });
                  }}
                >
                  <Icon name={track.locked ? 'lock' : 'unlock'} size={13} />
                </button>
                {track.kind !== 'text' && track.kind !== 'subtitle' ? (
                  <button
                    type="button"
                    className={`tl-mini ${track.muted ? 'is-on' : ''}`}
                    aria-label={track.muted ? t('timeline.unmute') : t('timeline.mute')}
                    aria-pressed={track.muted}
                    onClick={(e) => {
                      e.stopPropagation();
                      useStore.getState().setTrack(track.id, { muted: !track.muted });
                    }}
                  >
                    <Icon name={track.muted ? 'volumeOff' : 'volume'} size={13} />
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`tl-mini ${track.hidden ? 'is-on' : ''}`}
                  aria-label={track.hidden ? t('timeline.show') : t('timeline.hide')}
                  aria-pressed={track.hidden}
                  onClick={(e) => {
                    e.stopPropagation();
                    useStore.getState().setTrack(track.id, { hidden: !track.hidden });
                  }}
                >
                  <Icon name={track.hidden ? 'eyeOff' : 'eye'} size={13} />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="tl-add-track-btn"
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setAddMenu({ x: rect.left, y: rect.top - 190 });
            }}
          >
            <Icon name="plus" size={13} />
            {t('timeline.addTrack')}
          </button>
        </div>

        <div className="tl-body" ref={bodyRef} onScroll={syncScroll} dir="ltr">
          <div className="tl-inner" style={{ width: contentWidth }}>
            <div className="tl-ruler" style={{ height: RULER_H }} onPointerDown={startSeek} onDoubleClick={() => useStore.getState().addMarker()}>
              {ticks.map((tick, i) => (
                <span key={i} className={`tl-tick ${tick.major ? 'is-major' : ''}`} style={{ left: tick.time * zoom }}>
                  {tick.major ? <em className="mono">{formatTimecode(tick.time, project.canvas.fps)}</em> : null}
                </span>
              ))}
              {project.markers.map((marker) => (
                <button
                  key={marker.id}
                  type="button"
                  className="tl-marker"
                  style={{ left: marker.t * zoom, ['--marker-color' as string]: marker.color }}
                  title={`${marker.label || t('timeline.markers')} · ${formatTimeShort(marker.t)}`}
                  aria-label={marker.label || t('timeline.markers')}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    useStore.getState().setPlayhead(marker.t);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    useStore.getState().removeMarker(marker.id);
                  }}
                />
              ))}
              <span className="tl-playhead-head" style={{ left: playhead * zoom }} />
            </div>

            {tracks.map((track) => (
              <div
                key={track.id}
                className={`lane lane-${track.kind} ${track.locked ? 'is-locked' : ''} ${track.hidden ? 'is-hidden' : ''} ${
                  selectedTrackId === track.id ? 'is-selected' : ''
                }`}
                data-track-id={track.id}
                style={{ height: track.height }}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) {
                    useStore.getState().setSelection([]);
                    useStore.getState().selectTrack(track.id);
                  }
                }}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes('application/x-editez-asset')) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDrop({ time: Math.max(0, (e.clientX - rect.left) / zoom), trackId: track.id });
                  }
                }}
                onDragLeave={() => setDrop(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const assetId = e.dataTransfer.getData('application/x-editez-asset');
                  const rect = e.currentTarget.getBoundingClientRect();
                  const time = Math.max(0, (e.clientX - rect.left) / zoom);
                  setDrop(null);
                  if (assetId) useStore.getState().addAssetToTimeline(assetId, track.id, time);
                }}
              >
                {track.clips.map((clip) => {
                  const offset = dragView && dragView.mode === 'move' && dragView.ids.includes(clip.id) ? dragView.dx : 0;
                  return (
                    <span
                      key={clip.id}
                      className="clip-holder"
                      style={{
                        transform: `translateX(${clip.start * zoom + offset}px)`,
                        width: Math.max(8, clip.duration * zoom),
                        height: '100%',
                      }}
                    >
                      <ClipView
                        clip={clip}
                        track={track}
                        zoom={zoom}
                        selected={selection.includes(clip.id)}
                        dragging={dragView !== null && dragView.ids.length === 1 && dragView.ids[0] === clip.id}
                        onPointerDown={onClipPointerDown}
                        onContextMenu={(e, c, tr) => {
                          e.preventDefault();
                          useStore.getState().setSelection([c.id], tr.id);
                          setMenu({ x: e.clientX, y: e.clientY, clip: c, track: tr });
                        }}
                        onDoubleClick={(c) => {
                          useStore.getState().setSelection([c.id], track.id);
                          useStore
                            .getState()
                            .setPanel(c.type === 'text' ? 'text' : c.type === 'subtitle' ? 'subtitles' : c.type === 'audio' ? 'audio' : 'color');
                        }}
                      />
                    </span>
                  );
                })}
                {dragView?.snapTime !== null && dragView?.snapTime !== undefined ? (
                  <span className="tl-snapline" style={{ left: dragView.snapTime * zoom }} />
                ) : null}
                {drop && drop.trackId === track.id ? (
                  <span className="tl-dropline" style={{ left: drop.time * zoom }}>
                    <em>{t('timeline.dropHere', { time: formatTimecode(drop.time, project.canvas.fps) })}</em>
                  </span>
                ) : null}
              </div>
            ))}

            <span className="tl-playhead" style={{ left: playhead * zoom, top: 0 }} />

            {!allClips.length ? (
              <div className="tl-empty" style={{ top: RULER_H + 24 }}>
                <Icon name="layers" size={20} />
                <p>{t('timeline.emptyTitle')}</p>
                <span>{t('timeline.emptyDesc')}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {menu ? (
        <div className="menu context-menu" role="menu" style={{ left: menu.x, top: menu.y }}>
          <button role="menuitem" onClick={() => { useStore.getState().splitAtPlayhead(menu.clip.id); setMenu(null); }}>
            <Icon name="scissors" size={15} /> {t('timeline.splitAt')}
          </button>
          <button role="menuitem" onClick={() => { useStore.getState().duplicateSelection(); setMenu(null); }}>
            <Icon name="duplicate" size={15} /> {t('timeline.duplicateClip')}
          </button>
          <button role="menuitem" onClick={() => { useStore.getState().copySelection(); setMenu(null); }}>
            <Icon name="copy" size={15} /> {t('timeline.copy')}
          </button>
          <button role="menuitem" onClick={() => { useStore.getState().pasteClipboard(); setMenu(null); }}>
            <Icon name="paste" size={15} /> {t('timeline.paste')}
          </button>
          <div className="menu-sep" />
          <button role="menuitem" onClick={() => { useStore.getState().deleteSelection(false); setMenu(null); }}>
            <Icon name="trash" size={15} /> {t('timeline.removeClip')}
          </button>
          <button role="menuitem" onClick={() => { useStore.getState().deleteSelection(true); setMenu(null); }}>
            <Icon name="ripple" size={15} /> {t('timeline.deleteRipple')}
          </button>
          <div className="menu-sep" />
          <button role="menuitem" onClick={() => { patchClip(menu.clip.id, (c) => { c.freezeFrame = !c.freezeFrame; }); setMenu(null); }}>
            <Icon name="image" size={15} /> {t('timeline.freezeFrame')}
          </button>
          <button role="menuitem" onClick={() => { patchClip(menu.clip.id, (c) => { c.reverse = !c.reverse; }); setMenu(null); }}>
            <Icon name="refresh" size={15} /> {t('props.timing.reverse')}
          </button>
          <button role="menuitem" onClick={() => { patchClip(menu.clip.id, (c) => { c.speed = c.speed === 1 ? 0.5 : 1; }); setMenu(null); }}>
            <Icon name="clock" size={15} /> {t('timeline.speed')}
          </button>
          <div className="menu-sep" />
          <button role="menuitem" onClick={() => { useStore.getState().addMarker(menu.clip.start); setMenu(null); }}>
            <Icon name="marker" size={15} /> {t('timeline.insertMarker')}
          </button>
          <button role="menuitem" onClick={() => { useStore.getState().groupSelection(); setMenu(null); }}>
            <Icon name="group" size={15} /> {t('timeline.group')}
          </button>
          <button role="menuitem" onClick={() => { useStore.getState().ungroupSelection(); setMenu(null); }}>
            <Icon name="layersOff" size={15} /> {t('timeline.ungroup')}
          </button>
        </div>
      ) : null}

      {trackMenu ? (
        <div className="menu context-menu" role="menu" style={{ left: trackMenu.x, top: trackMenu.y }}>
          <button role="menuitem" onClick={() => { setRenaming(trackMenu.track.id); setTrackMenu(null); }}>
            <Icon name="edit" size={15} /> {t('common.rename')}
          </button>
          <button role="menuitem" onClick={() => { useStore.getState().setTrack(trackMenu.track.id, { locked: !trackMenu.track.locked }); setTrackMenu(null); }}>
            <Icon name={trackMenu.track.locked ? 'unlock' : 'lock'} size={15} />
            {trackMenu.track.locked ? t('timeline.unlock') : t('timeline.lock')}
          </button>
          <button role="menuitem" onClick={() => { useStore.getState().setTrack(trackMenu.track.id, { hidden: !trackMenu.track.hidden }); setTrackMenu(null); }}>
            <Icon name={trackMenu.track.hidden ? 'eye' : 'eyeOff'} size={15} />
            {trackMenu.track.hidden ? t('timeline.show') : t('timeline.hide')}
          </button>
          <div className="menu-sep" />
          <button
            role="menuitem"
            className="is-danger"
            onClick={() => {
              const track = trackMenu.track;
              setTrackMenu(null);
              confirm({
                title: t('modal.deleteTrackTitle'),
                description: t('timeline.removeTrackConfirm', { name: track.name }),
                confirmLabel: t('common.delete'),
                danger: true,
                onConfirm: () => useStore.getState().removeTrack(track.id),
              });
            }}
          >
            <Icon name="trash" size={15} /> {t('timeline.removeTrack')}
          </button>
        </div>
      ) : null}

      {addMenu ? (
        <div className="menu context-menu" role="menu" style={{ left: addMenu.x, top: addMenu.y }}>
          {(
            [
              ['video', 'timeline.addVideoTrack'],
              ['overlay', 'timeline.addOverlayTrack'],
              ['text', 'timeline.addTextTrack'],
              ['audio', 'timeline.addAudioTrack'],
              ['subtitle', 'timeline.addSubtitleTrack'],
            ] as [TrackKind, string][]
          ).map(([kind, label]) => (
            <button
              key={kind}
              role="menuitem"
              onClick={() => {
                useStore.getState().addTrack(kind);
                setAddMenu(null);
              }}
            >
              <Icon name={TRACK_ICONS[kind]} size={15} /> {t(label)}
            </button>
          ))}
        </div>
      ) : null}
      {exporting ? <div className="tl-blocker" aria-hidden="true" /> : null}
    </section>
  );
}
