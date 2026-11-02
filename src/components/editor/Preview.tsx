import { useCallback, useEffect, useRef, useState } from 'react';
import { registerThumbProvider, useStore } from '../../store';
import { useT } from '../../i18n';
import { Compositor } from '../../lib/render';
import { resumeAudio } from '../../lib/audio';
import { setSnapshotProvider } from '../../lib/previewBus';
import { formatTimecode } from '../../lib/format';
import { Icon } from '../Icons';
import { IconButton, Tip } from '../ui';
import { contentEnd } from '../../lib/edits';

function renderSize(canvas: { w: number; h: number }, quality: string, proxy: boolean, proxyQuality: number) {
  let scale = 1;
  if (quality === 'half') scale = 0.5;
  else if (quality === 'third') scale = 0.34;
  else if (quality === 'full') scale = 1;
  else scale = proxy ? proxyQuality : 1;
  let w = Math.round(canvas.w * scale);
  let h = Math.round(canvas.h * scale);
  const cap = quality === 'full' ? 4_400_000 : 2_200_000;
  if (w * h > cap) {
    const k = Math.sqrt(cap / (w * h));
    w = Math.round(w * k);
    h = Math.round(h * k);
  }
  return { w: Math.max(2, w - (w % 2)), h: Math.max(2, h - (h % 2)) };
}

export function Preview() {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const compRef = useRef<Compositor | null>(null);
  const redrawTimer = useRef<number | null>(null);

  const project = useStore((s) => s.project);
  const assets = useStore((s) => s.assets);
  const luts = useStore((s) => s.luts);
  const playhead = useStore((s) => s.playhead);
  const playing = useStore((s) => s.playing);
  const compare = useStore((s) => s.compare);
  const selection = useStore((s) => s.selection);
  const previewQuality = useStore((s) => s.previewQuality);
  const volume = useStore((s) => s.volume);
  const muted = useStore((s) => s.muted);
  const settings = project?.settings;
  const exporting = useStore((s) => s.exporting);
  const eyedropper = useStore((s) => s.eyedropper);
  const [unsupported, setUnsupported] = useState(false);

  const draw = useCallback((time: number) => {
    const comp = compRef.current;
    const s = useStore.getState();
    if (!comp || !s.project) return;
    const size = renderSize(s.project.canvas, s.previewQuality, s.project.settings.proxy, s.project.settings.proxyQuality);
    try {
      comp.render(s.project, s.assets, s.luts, time, {
        width: size.w,
        height: size.h,
        time,
        playing: s.playing,
        compareClipId: s.compare ? s.selection[0] ?? null : null,
      });
      comp.audio.setMasterVolume(s.muted ? 0 : s.volume);
      comp.syncAudio(s.project, s.assets, time, s.playing);
    } catch (e) {
      console.error('render failed', e);
      setUnsupported(true);
    }
    if (!s.playing) {
      if (redrawTimer.current) window.clearTimeout(redrawTimer.current);
      redrawTimer.current = window.setTimeout(() => {
        const st = useStore.getState();
        if (compRef.current && !st.playing) {
          const size2 = renderSize(st.project!.canvas, st.previewQuality, st.project!.settings.proxy, st.project!.settings.proxyQuality);
          compRef.current.render(st.project!, st.assets, st.luts, st.playhead, {
            width: size2.w,
            height: size2.h,
            time: st.playhead,
            playing: false,
            compareClipId: st.compare ? st.selection[0] ?? null : null,
          });
        }
      }, 90);
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    let comp: Compositor;
    try {
      comp = new Compositor({ audio: true, monitor: true }, canvasRef.current);
    } catch {
      setUnsupported(true);
      return;
    }
    compRef.current = comp;
    const capture = () => {
      try {
        const c = document.createElement('canvas');
        const src = comp.canvas;
        c.width = 320;
        c.height = Math.max(1, Math.round((src.height / Math.max(1, src.width)) * 320));
        const ctx = c.getContext('2d');
        if (!ctx) return undefined;
        ctx.drawImage(src, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', 0.7);
      } catch {
        return undefined;
      }
    };
    registerThumbProvider(capture);
    setSnapshotProvider(() => {
      try {
        return comp.canvas.toDataURL('image/jpeg', 0.72);
      } catch {
        return undefined;
      }
    });
    const state = useStore.getState();
    draw(state.playhead);
    return () => {
      registerThumbProvider(null);
      setSnapshotProvider(null);
      comp.destroy();
      compRef.current = null;
      if (redrawTimer.current) window.clearTimeout(redrawTimer.current);
    };
  }, [draw]);

  useEffect(() => {
    if (playing || exporting) return;
    draw(playhead);
  }, [project, assets, luts, playhead, playing, previewQuality, compare, selection, exporting, draw]);

  useEffect(() => {
    if (playing) void resumeAudio();
  }, [playing]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let time = useStore.getState().playhead;
    const end = contentEnd(useStore.getState().project!);
    if (time >= end - 0.02) time = 0;
    const step = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      time += dt;
      if (time >= end) {
        useStore.getState().setPlayhead(end);
        draw(end);
        useStore.getState().setPlaying(false);
        return;
      }
      useStore.getState().setPlayhead(time);
      draw(time);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, draw]);

  const toggleFullscreen = () => {
    const el = stageRef.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => undefined);
  };

  const duration = project ? contentEnd(project) : 0;
  const fps = project?.canvas.fps ?? 30;
  const qualityOptions: { id: 'auto' | 'full' | 'half' | 'third'; label: string }[] = [
    { id: 'auto', label: t('preview.quality.auto') },
    { id: 'full', label: t('preview.quality.full') },
    { id: 'half', label: t('preview.quality.half') },
    { id: 'third', label: t('preview.quality.third') },
  ];

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = useStore.getState();
    if (!s.eyedropper || !compRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * compRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * compRef.current.height;
    const color = compRef.current.sampleColor(x, y);
    const clipId = s.selection[0];
    if (color && clipId) {
      s.mutate((p) => {
        for (const track of p.tracks) {
          const clip = track.clips.find((c) => c.id === clipId);
          if (clip && clip.chroma) clip.chroma.color = color;
        }
      });
      s.toast('success', t('toast.eyedropper', { color }));
    }
    s.setEyedropper(false);
  };

  return (
    <section className="preview" aria-label={t('preview.title')}>
      <div className="preview-stage" ref={stageRef}>
        <div
          className="preview-frame"
          style={{ aspectRatio: `${project?.canvas.w ?? 16} / ${project?.canvas.h ?? 9}` }}
        >
          <canvas
            ref={canvasRef}
            className={`preview-canvas ${eyedropper ? 'is-picking' : ''}`}
            onClick={onCanvasClick}
            aria-label={t('preview.title')}
          />
          {settings?.safeMargins ? (
            <div className="safe-margins" aria-hidden="true">
              <span className="safe-safe" />
              <span className="safe-action" />
            </div>
          ) : null}
          {settings?.showGrid ? (
            <div className="thirds" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : null}
          {unsupported ? (
            <div className="preview-overlay preview-error">
              <Icon name="alert" size={22} />
              <p>{t('error.noCanvas')}</p>
              <p className="muted">{t('error.unsupportedBrowserDesc')}</p>
            </div>
          ) : null}
          {eyedropper ? (
            <div className="preview-overlay preview-pick">
              <Icon name="eyedropper" size={18} />
              <p>{t('preview.eyedropper')}</p>
            </div>
          ) : null}
          {project && !duration ? (
            <div className="preview-overlay preview-empty">
              <Icon name="film" size={24} />
              <p className="preview-empty-title">{t('preview.noVideo')}</p>
              <p className="muted">{t('preview.noVideoDesc')}</p>
            </div>
          ) : null}
          {compare ? <span className="compare-badge">{t('preview.beforeAfterActive')}</span> : null}
        </div>
      </div>

      <div className="preview-bar">
        <div className="preview-transport">
          <IconButton icon="skipBack" label={t('preview.start')} shortcut="Home" size="sm" onClick={() => useStore.getState().setPlayhead(0)} />
          <IconButton
            icon="stepBack"
            label={t('preview.prevFrame')}
            shortcut="←"
            size="sm"
            onClick={() => useStore.getState().setPlayhead(useStore.getState().playhead - 1 / fps)}
          />
          <button
            type="button"
            className="play-btn"
            aria-label={playing ? t('preview.pause') : t('preview.play')}
            onClick={() => useStore.getState().togglePlay()}
          >
            <Icon name={playing ? 'pause' : 'play'} size={18} />
          </button>
          <IconButton
            icon="stepForward"
            label={t('preview.nextFrame')}
            shortcut="→"
            size="sm"
            onClick={() => useStore.getState().setPlayhead(useStore.getState().playhead + 1 / fps)}
          />
          <IconButton
            icon="skipForward"
            label={t('preview.end')}
            shortcut="End"
            size="sm"
            onClick={() => useStore.getState().setPlayhead(duration)}
          />
        </div>

        <div className="preview-time mono" dir="ltr">
          <span>{formatTimecode(playhead, fps, true)}</span>
          <span className="preview-time-sep">/</span>
          <span className="muted">{formatTimecode(duration, fps, true)}</span>
        </div>

        <div className="preview-tools">
          <Tip label={t('preview.beforeAfter')}>
            <button
              type="button"
              className={`preview-toggle ${compare ? 'is-active' : ''}`}
              onPointerDown={() => useStore.getState().setCompare(true)}
              onPointerUp={() => useStore.getState().setCompare(false)}
              onPointerLeave={() => useStore.getState().setCompare(false)}
              aria-label={t('preview.beforeAfter')}
            >
              <Icon name="layersOff" size={16} />
            </button>
          </Tip>
          <Tip label={settings?.safeMargins ? t('preview.safe') : t('preview.safe')}>
            <button
              type="button"
              className={`preview-toggle ${settings?.safeMargins ? 'is-active' : ''}`}
              aria-pressed={settings?.safeMargins}
              onClick={() =>
                useStore.getState().mutate((p) => {
                  p.settings.safeMargins = !p.settings.safeMargins;
                })
              }
            >
              <Icon name="shapes" size={16} />
            </button>
          </Tip>
          <Tip label={t('preview.grid')}>
            <button
              type="button"
              className={`preview-toggle ${settings?.showGrid ? 'is-active' : ''}`}
              aria-pressed={settings?.showGrid}
              onClick={() =>
                useStore.getState().mutate((p) => {
                  p.settings.showGrid = !p.settings.showGrid;
                })
              }
            >
              <Icon name="grid" size={16} />
            </button>
          </Tip>
          <select
            className="preview-quality"
            aria-label={t('preview.quality')}
            value={previewQuality}
            onChange={(e) => useStore.getState().setPreviewQuality(e.target.value as never)}
            title={t('preview.quality')}
          >
            {qualityOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="preview-volume">
            <IconButton
              icon={muted ? 'volumeOff' : 'volume'}
              label={muted ? t('preview.unmute') : t('preview.mute')}
              size="sm"
              onClick={() => useStore.getState().setMuted(!muted)}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              aria-label={t('preview.volume')}
              className="range range-vol"
              onChange={(e) => {
                useStore.getState().setVolume(parseFloat(e.target.value));
                useStore.getState().setMuted(false);
              }}
              style={{ ['--pct' as string]: `${(muted ? 0 : volume) * 100}%` }}
            />
          </div>
          <IconButton icon="fullscreen" label={t('preview.fullscreen')} size="sm" onClick={toggleFullscreen} />
        </div>
      </div>
    </section>
  );
}
