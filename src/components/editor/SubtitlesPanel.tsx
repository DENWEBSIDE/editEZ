import { useMemo, useRef } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Badge, Button, ColorField, EmptyState, Note, Slider, Toggle } from '../ui';
import { Icon } from '../Icons';
import { findClip } from '../../lib/edits';
import { formatTimecode } from '../../lib/format';
import type { TextStyle } from '../../types';

export function SubtitlesPanel() {
  const t = useT();
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const addSubtitle = useStore((s) => s.addSubtitle);
  const importFiles = useStore((s) => s.importFiles);
  const openDialog = useStore((s) => s.openDialog);
  const mutate = useStore((s) => s.mutate);
  const setPlayhead = useStore((s) => s.setPlayhead);
  const setSelection = useStore((s) => s.setSelection);
  const fileRef = useRef<HTMLInputElement>(null);

  const track = project?.tracks.find((tr) => tr.kind === 'subtitle');
  const cues = useMemo(() => (track ? [...track.clips].sort((a, b) => a.start - b.start) : []), [track]);

  const clip = useMemo(() => {
    if (!project || selection.length !== 1) return null;
    const found = findClip(project, selection[0]);
    return found?.clip.type === 'subtitle' ? found.clip : null;
  }, [project, selection]);

  const patch = (fn: (tx: TextStyle) => void, coalesce?: string) => {
    if (!clip) return;
    mutate(
      (p) => {
        for (const tr of p.tracks) {
          const c = tr.clips.find((x) => x.id === clip.id);
          if (c?.text) fn(c.text);
        }
      },
      { coalesce }
    );
  };

  const patchTiming = (start: number, duration: number, coalesce: string) => {
    if (!clip) return;
    mutate(
      (p) => {
        for (const tr of p.tracks) {
          const c = tr.clips.find((x) => x.id === clip.id);
          if (c) {
            c.start = Math.max(0, start);
            c.duration = Math.max(0.2, duration);
          }
        }
      },
      { coalesce }
    );
  };

  const applyStyleToAll = () => {
    if (!clip?.text || !track) return;
    const style = clip.text;
    mutate((p) => {
      for (const tr of p.tracks) {
        if (tr.kind !== 'subtitle') continue;
        for (const c of tr.clips) {
          if (c.text) {
            c.text.size = style.size;
            c.text.color = style.color;
            c.text.font = style.font;
            c.text.weight = style.weight;
            c.text.outline = { ...style.outline };
            c.text.shadow = { ...style.shadow };
            c.text.background = { ...style.background };
            c.text.y = style.y;
            c.text.align = style.align;
          }
        }
      }
    });
  };

  return (
    <div className="panel-body">
      <div className="panel-head">
        <div>
          <h2>{t('subs.title')}</h2>
          <p className="panel-sub">{t('subs.count', { n: cues.length })}</p>
        </div>
        <div className="head-actions">
          <button type="button" className="icon-btn icon-btn-sm" aria-label={t('subs.import')} title={t('subs.import')} onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={15} />
          </button>
          <button type="button" className="icon-btn icon-btn-sm" aria-label={t('subs.export')} title={t('subs.export')} onClick={() => openDialog('subsExport')}>
            <Icon name="download" size={15} />
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".srt,.vtt,text/plain"
          onChange={(e) => {
            const files = e.target.files;
            if (files?.length) void importFiles(files);
            e.target.value = '';
          }}
        />
      </div>

      <div className="panel-scroll">
        <div className="btn-row">
          <Button size="sm" variant="primary" icon="plus" onClick={() => addSubtitle('', undefined, 2.5)}>
            {t('subs.addAtPlayhead')}
          </Button>
          <Button size="sm" variant="secondary" icon="upload" onClick={() => fileRef.current?.click()}>
            {t('subs.import')}
          </Button>
          <Button size="sm" variant="ghost" icon="download" onClick={() => openDialog('subsExport')}>
            {t('subs.export')}
          </Button>
        </div>

        <Note kind="cap" title={t('subs.autoTitle')}>
          {t('subs.autoDesc')}
        </Note>

        {cues.length ? (
          <div className="cue-list">
            {cues.map((cue) => (
              <button
                key={cue.id}
                type="button"
                className={`cue-item ${selection.includes(cue.id) ? 'is-selected' : ''}`}
                onClick={() => {
                  setSelection([cue.id], track?.id ?? null);
                  setPlayhead(cue.start + 0.02);
                }}
              >
                <span className="cue-time mono">
                  {formatTimecode(cue.start, project?.canvas.fps ?? 30)} → {formatTimecode(cue.start + cue.duration, project?.canvas.fps ?? 30)}
                </span>
                <span className="cue-item-text">{cue.text?.content || t('common.empty')}</span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState icon="subtitle" title={t('subs.empty')} description={t('subs.emptyDesc')} compact />
        )}

        {clip && clip.text ? (
          <section className="panel-section">
            <div className="panel-section-head">
              <h3>{t('subs.timing')}</h3>
              <Badge tone="accent">{t('subs.count', { n: 1 })}</Badge>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="sub-text">
                {t('subs.text')}
              </label>
              <textarea
                id="sub-text"
                className="input textarea"
                rows={3}
                value={clip.text.content}
                onChange={(e) => patch((tx) => { tx.content = e.target.value; }, 'sub-text')}
              />
            </div>
            <div className="grid-2">
              <div className="field">
                <label className="field-label" htmlFor="sub-start">
                  {t('subs.start')}
                </label>
                <input
                  id="sub-start"
                  type="number"
                  step={0.05}
                  min={0}
                  className="input"
                  value={Math.round(clip.start * 100) / 100}
                  onChange={(e) => patchTiming(parseFloat(e.target.value) || 0, clip.start + clip.duration - (parseFloat(e.target.value) || 0), 'sub-start')}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="sub-end">
                  {t('subs.end')}
                </label>
                <input
                  id="sub-end"
                  type="number"
                  step={0.05}
                  min={0}
                  className="input"
                  value={Math.round((clip.start + clip.duration) * 100) / 100}
                  onChange={(e) => patchTiming(clip.start, (parseFloat(e.target.value) || 0) - clip.start, 'sub-end')}
                />
              </div>
            </div>
            <p className="field-hint">{t('subs.splitHint')}</p>

            <div className="panel-section-head">
              <h3>{t('subs.style')}</h3>
            </div>
            <Slider label={t('text.size')} min={14} max={120} step={1} value={clip.text.size} onChange={(v) => patch((tx) => { tx.size = v; }, 'sub-size')} />
            <ColorField label={t('text.color')} value={clip.text.color} onChange={(v) => patch((tx) => { tx.color = v; }, 'sub-color')} />
            <Slider label={t('text.posY')} min={0.4} max={1} step={0.005} value={clip.text.y} onChange={(v) => patch((tx) => { tx.y = v; }, 'sub-y')} />
            <Toggle label={t('text.outline')} checked={clip.text.outline.on} onChange={(v) => patch((tx) => { tx.outline.on = v; })} />
            <Toggle label={t('text.background')} checked={clip.text.background.on} onChange={(v) => patch((tx) => { tx.background.on = v; })} />
            {clip.text.background.on ? (
              <Slider label={t('text.bgOpacity')} min={0} max={1} step={0.01} value={clip.text.background.opacity} onChange={(v) => patch((tx) => { tx.background.opacity = v; }, 'sub-bgo')} />
            ) : null}
            <Button size="sm" variant="secondary" icon="layers" onClick={applyStyleToAll}>
              {t('subs.style')} — {t('common.all')}
            </Button>
            <p className="field-hint">{t('subs.styleHint')}</p>
          </section>
        ) : null}

        <Note kind="info">{t('subs.importHint')}</Note>
      </div>
    </div>
  );
}
