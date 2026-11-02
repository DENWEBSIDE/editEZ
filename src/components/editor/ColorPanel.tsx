import { useMemo, useRef } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Badge, Button, EmptyState, Note, Select, Slider, Tip } from '../ui';
import { Icon } from '../Icons';
import { findClip } from '../../lib/edits';
import { defaultGrade } from '../../types';
import { importCube } from '../../lib/lut';

const PRESETS: { id: string; label: string; grade: Partial<ReturnType<typeof defaultGrade>> }[] = [
  { id: 'neutral', label: 'color.preset.neutral', grade: {} },
  { id: 'cinema', label: 'color.preset.cinema', grade: { contrast: 0.14, saturation: -0.05, temperature: -0.18, shadows: -0.08, highlights: 0.08 } },
  { id: 'warm', label: 'color.preset.warm', grade: { temperature: 0.34, saturation: 0.12, highlights: 0.1 } },
  { id: 'cool', label: 'color.preset.cool', grade: { temperature: -0.3, tint: -0.06, contrast: 0.08 } },
  { id: 'mono', label: 'color.preset.mono', grade: { saturation: -1, contrast: 0.22, blacks: -0.12 } },
  { id: 'vintage', label: 'color.preset.vintage', grade: { saturation: -0.3, temperature: 0.2, blacks: 0.16, whites: -0.1, contrast: 0.1 } },
];

export function ColorPanel() {
  const t = useT();
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const mutate = useStore((s) => s.mutate);
  const luts = useStore((s) => s.luts);
  const addLut = useStore((s) => s.addLut);
  const toast = useStore((s) => s.toast);
  const setCompare = useStore((s) => s.setCompare);
  const lutInput = useRef<HTMLInputElement>(null);

  const clip = useMemo(() => {
    if (!project || selection.length !== 1) return null;
    return findClip(project, selection[0])?.clip ?? null;
  }, [project, selection]);

  const grade = clip?.grade ?? defaultGrade();

  const patch = (fn: (g: typeof grade) => void, coalesce?: string) => {
    if (!clip) return;
    mutate(
      (p) => {
        for (const track of p.tracks) {
          const c = track.clips.find((x) => x.id === clip.id);
          if (!c) continue;
          if (!c.grade) c.grade = defaultGrade();
          fn(c.grade);
        }
      },
      { coalesce }
    );
  };

  const onLutFile = async (file: File) => {
    try {
      const text = await file.text();
      const lut = importCube(text);
      addLut(lut);
      patch((g) => {
        g.lutId = lut.id;
        g.lutAmount = 1;
      });
      toast('success', t('toast.lutImported', { name: lut.name }));
    } catch {
      toast('error', t('toast.lutError'));
    }
  };

  if (!clip) {
    return (
      <div className="panel-body">
        <div className="panel-head">
          <h2>{t('color.title')}</h2>
        </div>
        <div className="panel-scroll">
          <EmptyState icon="palette" title={t('props.empty')} description={t('props.emptyDesc')} />
        </div>
      </div>
    );
  }

  if (clip.type === 'audio' || clip.type === 'subtitle') {
    return (
      <div className="panel-body">
        <div className="panel-head">
          <h2>{t('color.title')}</h2>
        </div>
        <div className="panel-scroll">
          <Note kind="info">{t('props.noChromaVideo')}</Note>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-body">
      <div className="panel-head">
        <div>
          <h2>{t('color.title')}</h2>
          <p className="panel-sub">{clip.name}</p>
        </div>
        <Tip label={t('color.compareHint')}>
          <button
            type="button"
            className="preview-toggle"
            onPointerDown={() => setCompare(true)}
            onPointerUp={() => setCompare(false)}
            onPointerLeave={() => setCompare(false)}
            aria-label={t('color.before')}
          >
            <Icon name="layersOff" size={15} />
          </button>
        </Tip>
      </div>

      <div className="panel-scroll">
        <div className="chip-row chip-row-wrap">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="chip"
              onClick={() =>
                patch((g) => {
                  Object.assign(g, defaultGrade(), preset.grade, { lutId: g.lutId, lutAmount: g.lutAmount });
                })
              }
            >
              {t(preset.label)}
            </button>
          ))}
        </div>

        <div className="sliders">
          <Slider label={t('color.exposure')} min={-2} max={2} step={0.01} value={grade.exposure} unit={t('unit.stops')} onChange={(v) => patch((g) => { g.exposure = v; }, 'exposure')} />
          <Slider label={t('color.brightness')} min={-1} max={1} step={0.01} value={grade.brightness} onChange={(v) => patch((g) => { g.brightness = v; }, 'brightness')} />
          <Slider label={t('color.contrast')} min={-1} max={1} step={0.01} value={grade.contrast} onChange={(v) => patch((g) => { g.contrast = v; }, 'contrast')} />
          <Slider label={t('color.saturation')} min={-1} max={1} step={0.01} value={grade.saturation} onChange={(v) => patch((g) => { g.saturation = v; }, 'sat')} />
          <Slider label={t('color.temperature')} min={-1} max={1} step={0.01} value={grade.temperature} onChange={(v) => patch((g) => { g.temperature = v; }, 'temp')} />
          <Slider label={t('color.tint')} min={-1} max={1} step={0.01} value={grade.tint} onChange={(v) => patch((g) => { g.tint = v; }, 'tint')} />
        </div>

        <section className="panel-section">
          <div className="panel-section-head">
            <h3>{t('color.curves')}</h3>
          </div>
          <Slider label={t('color.highlights')} min={-1} max={1} step={0.01} value={grade.highlights} onChange={(v) => patch((g) => { g.highlights = v; }, 'hi')} />
          <Slider label={t('color.shadows')} min={-1} max={1} step={0.01} value={grade.shadows} onChange={(v) => patch((g) => { g.shadows = v; }, 'sh')} />
          <Slider label={t('color.whites')} min={-1} max={1} step={0.01} value={grade.whites} onChange={(v) => patch((g) => { g.whites = v; }, 'wh')} />
          <Slider label={t('color.blacks')} min={-1} max={1} step={0.01} value={grade.blacks} onChange={(v) => patch((g) => { g.blacks = v; }, 'bl')} />
          <Slider label={t('color.curveBlack')} min={-0.5} max={0.5} step={0.01} value={grade.curves.black} onChange={(v) => patch((g) => { g.curves.black = v; }, 'cb')} />
          <Slider label={t('color.curveMid')} min={-0.5} max={0.5} step={0.01} value={grade.curves.mid} onChange={(v) => patch((g) => { g.curves.mid = v; }, 'cm')} />
          <Slider label={t('color.curveWhite')} min={-0.5} max={0.5} step={0.01} value={grade.curves.white} onChange={(v) => patch((g) => { g.curves.white = v; }, 'cw')} />
          <Slider label={t('color.gamma')} min={0.4} max={2.2} step={0.01} value={grade.curves.gamma} onChange={(v) => patch((g) => { g.curves.gamma = v; }, 'cg')} />
        </section>

        <section className="panel-section">
          <div className="panel-section-head">
            <h3>{t('color.lut')}</h3>
            <Badge tone="neutral">{Object.keys(luts).length}</Badge>
          </div>
          <Select
            value={grade.lutId ?? ''}
            onChange={(v) => patch((g) => { g.lutId = v || null; })}
            label={t('color.lut')}
          >
            <option value="">{t('color.lutNone')}</option>
            {Object.values(luts).map((lut) => (
              <option key={lut.id} value={lut.id}>
                {lut.name} · {t('color.lutSize', { n: lut.size })}
              </option>
            ))}
          </Select>
          {grade.lutId ? (
            <Slider label={t('color.lutAmount')} min={0} max={1} step={0.01} value={grade.lutAmount} onChange={(v) => patch((g) => { g.lutAmount = v; }, 'luta')} />
          ) : null}
          <Button size="sm" variant="secondary" icon="upload" onClick={() => lutInput.current?.click()}>
            {t('color.lutImport')}
          </Button>
          <input
            ref={lutInput}
            type="file"
            hidden
            accept=".cube"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onLutFile(file);
              e.target.value = '';
            }}
          />
          <p className="field-hint">{t('color.lutImportHint')}</p>
        </section>

        <div className="btn-row">
          <Button
            size="sm"
            variant="ghost"
            icon="refresh"
            onClick={() => patch((g) => { Object.assign(g, defaultGrade()); })}
          >
            {t('color.reset')}
          </Button>
        </div>

        <Note kind="cap">{t('color.hint')}</Note>
      </div>
    </div>
  );
}
