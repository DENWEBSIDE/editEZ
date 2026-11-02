import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Kbd } from '../ui';
import { clamp } from '../../types';

export function StatusBar() {
  const t = useT();
  const project = useStore((s) => s.project);
  const playhead = useStore((s) => s.playhead);
  const selection = useStore((s) => s.selection);
  const tool = useStore((s) => s.tool);
  const zoom = useStore((s) => s.zoom);
  const setZoom = useStore((s) => s.setZoom);
  const previewQuality = useStore((s) => s.previewQuality);
  const busy = useStore((s) => s.busy);
  const saveStatus = useStore((s) => s.saveStatus);

  if (!project) return null;
  const clips = project.tracks.reduce((n, tr) => n + tr.clips.length, 0);

  return (
    <footer className="statusbar">
      <div className="sb-left">
        <span className={`sb-chip tool-chip ${tool === 'razor' ? 'is-razor' : ''}`}>
          <span className="sb-dot" aria-hidden="true" />
          {tool === 'razor' ? t('timeline.razor') : t('timeline.select')}
        </span>
        <span className="sb-item">
          {selection.length ? t('status.selected', { n: selection.length }) : t('status.noSelection')}
        </span>
        <span className="sb-item hide-sm">
          {project.tracks.length} {t('timeline.tracks')} · {clips} {t('timeline.clips')}
        </span>
        {busy ? <span className="sb-item sb-busy">{busy}</span> : null}
      </div>

      <div className="sb-center">
        <span className="sb-item hide-md">
          <Kbd>S</Kbd> {t('timeline.select')} · <Kbd>C</Kbd> {t('timeline.razor')} · <Kbd>Space</Kbd> {t('shortcuts.play')}
        </span>
      </div>

      <div className="sb-right">
        <span className="sb-item mono">
          {playhead.toFixed(2)}s / {project.duration.toFixed(2)}s
        </span>
        <span className={`sb-item sb-save save-${saveStatus}`}>
          {t(`editor.${saveStatus === 'dirty' ? 'unsaved' : saveStatus === 'saving' ? 'saving' : saveStatus === 'error' ? 'saveError' : 'saved'}`)}
        </span>
        <span className="sb-item hide-sm">{t(`preview.quality.${previewQuality}`)}</span>
        <span className="sb-credit hide-sm">
          © {new Date().getFullYear()} Youssef Mosbeh
        </span>
        <span className="sb-zoom">
          <button type="button" onClick={() => setZoom(clamp(zoom / 1.4, 8, 400))} aria-label={t('timeline.zoomOut')}>
            −
          </button>
          <span className="mono">{Math.round(zoom)}%</span>
          <button type="button" onClick={() => setZoom(clamp(zoom * 1.4, 8, 400))} aria-label={t('timeline.zoomIn')}>
            +
          </button>
        </span>
      </div>
    </footer>
  );
}
