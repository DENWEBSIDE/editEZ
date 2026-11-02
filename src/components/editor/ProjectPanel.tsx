import { useMemo } from 'react';
import { useStore } from '../../store';
import { useT, useLang } from '../../i18n';
import { Badge, Button, ColorField, Note, Section, Select, Slider, Toggle } from '../ui';
import { Icon } from '../Icons';
import { ASPECTS, FPS_OPTIONS } from '../../lib/presets';
import { formatBytes, formatRelative } from '../../lib/format';
import { requestPersistent } from '../../lib/db';
import type { ProjectSettings } from '../../types';

export function ProjectPanel() {
  const t = useT();
  const lang = useLang();
  const project = useStore((s) => s.project);
  const mutate = useStore((s) => s.mutate);
  const saveNow = useStore((s) => s.saveNow);
  const saveStatus = useStore((s) => s.saveStatus);
  const lastSavedAt = useStore((s) => s.lastSavedAt);
  const storage = useStore((s) => s.storage);
  const refreshStorage = useStore((s) => s.refreshStorage);
  const downloadBackup = useStore((s) => s.downloadBackup);
  const openDialog = useStore((s) => s.openDialog);
  const renameProject = useStore((s) => s.renameProject);
  const previewQuality = useStore((s) => s.previewQuality);
  const setPreviewQuality = useStore((s) => s.setPreviewQuality);
  const toast = useStore((s) => s.toast);

  const stats = useMemo(() => {
    if (!project) return { tracks: 0, clips: 0 };
    return {
      tracks: project.tracks.length,
      clips: project.tracks.reduce((n, tr) => n + tr.clips.length, 0),
    };
  }, [project]);

  if (!project) return null;

  const settings = project.settings;
  const patchSettings = (patch: Partial<ProjectSettings>, coalesce?: string) => {
    mutate(
      (p) => {
        Object.assign(p.settings, patch);
        p.updatedAt = Date.now();
      },
      { coalesce }
    );
  };

  const setCanvas = (w: number, h: number) => {
    mutate((p) => {
      p.canvas.w = Math.max(64, Math.round(w));
      p.canvas.h = Math.max(64, Math.round(h));
      p.updatedAt = Date.now();
    });
  };

  const activeAspect = ASPECTS.find((a) => Math.abs(a.w / a.h - project.canvas.w / project.canvas.h) < 0.01);
  const usagePct = storage.quota > 0 ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;

  return (
    <div className="panel-body">
      <div className="panel-head">
        <div>
          <h2>{t('project.title')}</h2>
          <p className="panel-sub">
            {t('editor.updated')} {lastSavedAt ? formatRelative(lastSavedAt, lang, t) : t('editor.neverSaved')}
          </p>
        </div>
        <Badge tone={saveStatus === 'error' ? 'danger' : saveStatus === 'saved' ? 'success' : 'warn'} icon={saveStatus === 'saving' ? 'refresh' : undefined}>
          {t(`editor.${saveStatus === 'dirty' ? 'unsaved' : saveStatus === 'saving' ? 'saving' : saveStatus === 'error' ? 'saveError' : 'saved'}`)}
        </Badge>
      </div>

      <div className="panel-scroll">
        <Section title={t('project.name')} icon="film" dense>
          <input
            className="input"
            value={project.name}
            aria-label={t('project.name')}
            onChange={(e) => renameProject(e.target.value)}
          />
          <p className="field-hint">{t('project.renameHint')}</p>
        </Section>

        <Section title={t('settings.canvas')} icon="monitor" dense>
          <div className="chip-row chip-row-wrap">
            {ASPECTS.map((aspect) => (
              <button
                key={aspect.id}
                type="button"
                className={`chip ${activeAspect?.id === aspect.id ? 'is-active' : ''}`}
                onClick={() => setCanvas(aspect.w, aspect.h)}
              >
                {aspect.id}
              </button>
            ))}
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="field-label" htmlFor="canvas-w">
                {t('settings.width')}
              </label>
              <input
                id="canvas-w"
                className="input"
                type="number"
                min={64}
                max={7680}
                step={2}
                value={project.canvas.w}
                onChange={(e) => setCanvas(parseInt(e.target.value, 10) || project.canvas.w, project.canvas.h)}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="canvas-h">
                {t('settings.height')}
              </label>
              <input
                id="canvas-h"
                className="input"
                type="number"
                min={64}
                max={7680}
                step={2}
                value={project.canvas.h}
                onChange={(e) => setCanvas(project.canvas.w, parseInt(e.target.value, 10) || project.canvas.h)}
              />
            </div>
          </div>
          <Select
            label={t('settings.fps')}
            value={String(project.canvas.fps)}
            onChange={(v) =>
              mutate((p) => {
                p.canvas.fps = parseInt(v, 10);
                p.updatedAt = Date.now();
              })
            }
          >
            {FPS_OPTIONS.map((fps) => (
              <option key={fps} value={fps}>
                {fps} fps
              </option>
            ))}
          </Select>
          <ColorField
            label={t('settings.background')}
            value={project.canvas.bg}
            onChange={(v) =>
              mutate((p) => {
                p.canvas.bg = v;
                p.updatedAt = Date.now();
              }, { coalesce: 'canvas-bg' })
            }
          />
          <div className="canvas-stats">
            <div>
              <span>{t('timeline.tracks')}</span>
              <strong className="mono">{stats.tracks}</strong>
            </div>
            <div>
              <span>{t('timeline.clips')}</span>
              <strong className="mono">{stats.clips}</strong>
            </div>
            <div>
              <span>{t('common.duration')}</span>
              <strong className="mono">{project.duration.toFixed(1)}s</strong>
            </div>
          </div>
          <Button size="sm" variant="ghost" icon="settings" onClick={() => openDialog('settings')}>
            {t('settings.advanced')}
          </Button>
        </Section>

        <Section title={t('settings.timeline')} icon="sliders" open={false} dense>
          <Toggle label={t('settings.snapping')} checked={settings.snapping} hint={t('settings.snappingHint')} onChange={(v) => patchSettings({ snapping: v })} />
          {settings.snapping ? (
            <Slider
              label={t('settings.snapThreshold')}
              min={2}
              max={24}
              step={1}
              value={settings.snapThreshold}
              unit="px"
              onChange={(v) => patchSettings({ snapThreshold: v }, 'snap-th')}
            />
          ) : null}
          <Toggle label={t('settings.ripple')} checked={settings.ripple} hint={t('settings.rippleHint')} onChange={(v) => patchSettings({ ripple: v })} />
          <Toggle label={t('settings.grid')} checked={settings.showGrid} onChange={(v) => patchSettings({ showGrid: v })} />
          <Toggle label={t('settings.safe')} checked={settings.safeMargins} onChange={(v) => patchSettings({ safeMargins: v })} />
          <Toggle label={t('settings.autosave')} checked={settings.autosave} hint={t('settings.autosaveHint')} onChange={(v) => patchSettings({ autosave: v })} />
        </Section>

        <Section title={t('settings.performance')} icon="cpu" open={false} dense>
          <Select label={t('preview.quality')} value={previewQuality} onChange={(v) => setPreviewQuality(v as typeof previewQuality)}>
            <option value="auto">{t('preview.quality.auto')}</option>
            <option value="full">{t('preview.quality.full')}</option>
            <option value="half">{t('preview.quality.half')}</option>
            <option value="third">{t('preview.quality.third')}</option>
          </Select>
          <Toggle label={t('settings.proxy')} checked={settings.proxy} hint={t('settings.proxyHint')} onChange={(v) => patchSettings({ proxy: v })} />
          {settings.proxy ? (
            <Slider
              label={t('settings.proxyQuality')}
              min={0.25}
              max={1}
              step={0.05}
              value={settings.proxyQuality}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => patchSettings({ proxyQuality: v }, 'proxy-q')}
            />
          ) : null}
          <p className="field-hint">{t('settings.proxyNote')}</p>
        </Section>

        <Section title={t('project.storage')} icon="database" dense>
          <div className="storage-bar">
            <div className="storage-track">
              <span style={{ width: `${usagePct}%` }} />
            </div>
            <div className="storage-meta">
              <span>
                {formatBytes(storage.usage)} / {storage.quota ? formatBytes(storage.quota) : '—'}
              </span>
              <span className="mono">{usagePct.toFixed(1)}%</span>
            </div>
          </div>
          <p className="field-hint">{t('project.storageHint')}</p>
          <div className="btn-row wrap">
            <Button size="sm" variant="secondary" icon="save" onClick={() => void saveNow()}>
              {t('editor.saveNow')}
            </Button>
            <Button size="sm" variant="ghost" icon="download" onClick={() => void downloadBackup(project.id)}>
              {t('project.backup')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon="shield"
              onClick={async () => {
                const ok = await requestPersistent();
                await refreshStorage();
                toast(ok ? 'success' : 'warn', ok ? t('project.persistOk') : t('project.persistNo'));
              }}
            >
              {t('project.persist')}
            </Button>
          </div>
          {!storage.supported ? <Note kind="warn">{t('project.noStorage')}</Note> : null}
        </Section>

        <Note kind="cap" title={t('cap.storage.title')}>
          {t('project.whereTitle')}
        </Note>
        <div className="btn-row">
          <Button size="sm" variant="ghost" icon="info" onClick={() => openDialog('capabilities')}>
            {t('cap.title')}
          </Button>
        </div>
      </div>
    </div>
  );
}
