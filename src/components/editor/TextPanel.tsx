import { useMemo } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Badge, ColorField, Note, Segmented, Select, Slider, Toggle } from '../ui';
import { Icon } from '../Icons';
import { FONTS, TEXT_ANIMATIONS, TEXT_TEMPLATES } from '../../lib/presets';
import { findClip } from '../../lib/edits';
import type { TextAnimation, TextStyle } from '../../types';
import type { TKey } from '../../i18n/en';

export function TextPanel() {
  const t = useT();
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const addText = useStore((s) => s.addText);
  const mutate = useStore((s) => s.mutate);

  const clip = useMemo(() => {
    if (!project || selection.length !== 1) return null;
    const found = findClip(project, selection[0]);
    return found?.clip.type === 'text' ? found.clip : null;
  }, [project, selection]);

  const text = clip?.text;

  const patch = (fn: (tx: TextStyle) => void, coalesce?: string) => {
    if (!clip) return;
    mutate(
      (p) => {
        for (const track of p.tracks) {
          const c = track.clips.find((x) => x.id === clip.id);
          if (c?.text) fn(c.text);
        }
      },
      { coalesce }
    );
  };

  return (
    <div className="panel-body">
      <div className="panel-head">
        <div>
          <h2>{t('text.title')}</h2>
          <p className="panel-sub">{text ? t('props.section.text') : t('text.placeAtPlayhead')}</p>
        </div>
        <button type="button" className="icon-btn icon-btn-sm" aria-label={t('text.add')} onClick={() => addText('plain')}>
          <Icon name="plus" size={15} />
        </button>
      </div>

      <div className="panel-scroll">
        <section className="panel-section">
          <div className="panel-section-head">
            <h3>{t('text.templates')}</h3>
          </div>
          <div className="tpl-grid">
            {TEXT_TEMPLATES.map((tpl) => (
              <button key={tpl.id} type="button" className="tpl-card" onClick={() => addText(tpl.id)}>
                <span className={`tpl-preview tpl-${tpl.id}`} aria-hidden="true">
                  <span className="tpl-bar" />
                  <span className="tpl-line" />
                  <span className="tpl-line short" />
                </span>
                <span className="tpl-name">{t(tpl.label)}</span>
                <span className="tpl-desc">{t(tpl.desc)}</span>
              </button>
            ))}
          </div>
        </section>

        {text && clip ? (
          <>
            <section className="panel-section">
              <div className="panel-section-head">
                <h3>{t('props.section.text')}</h3>
                <Badge tone="accent">{clip.name.slice(0, 14)}</Badge>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="tx-content">
                  {t('text.content')}
                </label>
                <textarea
                  id="tx-content"
                  className="input textarea"
                  rows={2}
                  value={text.content}
                  onChange={(e) => patch((tx) => { tx.content = e.target.value; }, 'tx-content')}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="tx-sub">
                  {t('text.subtext')}
                </label>
                <input
                  id="tx-sub"
                  className="input"
                  value={text.subtext}
                  onChange={(e) => patch((tx) => { tx.subtext = e.target.value; }, 'tx-sub')}
                />
              </div>
              <Select label={t('text.font')} value={text.font} onChange={(v) => patch((tx) => { tx.font = v; })}>
                {FONTS.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.label}
                  </option>
                ))}
              </Select>
              <Slider label={t('text.size')} min={12} max={220} step={1} value={text.size} unit="px" onChange={(v) => patch((tx) => { tx.size = v; }, 'tx-size')} />
              <Slider label={t('text.weight')} min={300} max={800} step={100} value={text.weight} onChange={(v) => patch((tx) => { tx.weight = v; })} />
              <div className="grid-2">
                <Toggle label={t('text.italic')} checked={text.italic} onChange={(v) => patch((tx) => { tx.italic = v; })} />
                <Toggle label={t('text.uppercase')} checked={text.uppercase} onChange={(v) => patch((tx) => { tx.uppercase = v; })} />
              </div>
              <div className="grid-2">
                <ColorField label={t('text.color')} value={text.color} onChange={(v) => patch((tx) => { tx.color = v; }, 'tx-color')} />
                <ColorField label={t('text.accent')} value={text.accent} onChange={(v) => patch((tx) => { tx.accent = v; }, 'tx-accent')} />
              </div>
              <div className="field">
                <span className="field-label">{t('text.align')}</span>
                <Segmented
                  value={text.align}
                  onChange={(v) => patch((tx) => { tx.align = v; })}
                  options={[
                    { value: 'left', label: t('text.align.left') },
                    { value: 'center', label: t('text.align.center') },
                    { value: 'right', label: t('text.align.right') },
                  ]}
                  label={t('text.align')}
                />
              </div>
              <Slider label={t('text.posX')} min={0} max={1} step={0.005} value={text.x} onChange={(v) => patch((tx) => { tx.x = v; }, 'tx-x')} />
              <Slider label={t('text.posY')} min={0} max={1} step={0.005} value={text.y} onChange={(v) => patch((tx) => { tx.y = v; }, 'tx-y')} />
              <Slider label={t('text.letterSpacing')} min={-4} max={24} step={0.5} value={text.letterSpacing} onChange={(v) => patch((tx) => { tx.letterSpacing = v; }, 'tx-ls')} />
              <Slider label={t('text.lineHeight')} min={0.8} max={2.4} step={0.01} value={text.lineHeight} onChange={(v) => patch((tx) => { tx.lineHeight = v; }, 'tx-lh')} />
              <Select label={t('text.animation')} value={text.animation} onChange={(v) => patch((tx) => { tx.animation = v as TextAnimation; })}>
                {TEXT_ANIMATIONS.map((anim) => (
                  <option key={anim} value={anim}>
                    {t(`text.anim.${anim}` as TKey)}
                  </option>
                ))}
              </Select>
            </section>

            <section className="panel-section">
              <div className="panel-section-head">
                <h3>{t('text.outline')}</h3>
              </div>
              <Toggle label={t('text.outline')} checked={text.outline.on} onChange={(v) => patch((tx) => { tx.outline.on = v; })} />
              {text.outline.on ? (
                <>
                  <ColorField label={t('text.color')} value={text.outline.color} onChange={(v) => patch((tx) => { tx.outline.color = v; }, 'tx-ol')} />
                  <Slider label={t('text.outlineWidth')} min={0.5} max={10} step={0.5} value={text.outline.width} onChange={(v) => patch((tx) => { tx.outline.width = v; }, 'tx-olw')} />
                </>
              ) : null}
              <Toggle label={t('text.shadow')} checked={text.shadow.on} onChange={(v) => patch((tx) => { tx.shadow.on = v; })} />
              {text.shadow.on ? (
                <>
                  <ColorField label={t('text.color')} value={text.shadow.color} onChange={(v) => patch((tx) => { tx.shadow.color = v; }, 'tx-shc')} />
                  <Slider label={t('text.shadowBlur')} min={0} max={80} step={1} value={text.shadow.blur} onChange={(v) => patch((tx) => { tx.shadow.blur = v; }, 'tx-shb')} />
                </>
              ) : null}
              <Toggle label={t('text.background')} checked={text.background.on} onChange={(v) => patch((tx) => { tx.background.on = v; })} />
              {text.background.on ? (
                <>
                  <ColorField label={t('text.color')} value={text.background.color} onChange={(v) => patch((tx) => { tx.background.color = v; }, 'tx-bgc')} />
                  <Slider label={t('text.bgOpacity')} min={0} max={1} step={0.01} value={text.background.opacity} onChange={(v) => patch((tx) => { tx.background.opacity = v; }, 'tx-bgo')} />
                  <Slider label={t('text.bgPadding')} min={0} max={64} step={1} value={text.background.padding} onChange={(v) => patch((tx) => { tx.background.padding = v; }, 'tx-bgp')} />
                  <Slider label={t('text.bgRadius')} min={0} max={48} step={1} value={text.background.radius} onChange={(v) => patch((tx) => { tx.background.radius = v; }, 'tx-bgr')} />
                </>
              ) : null}
            </section>

            <Note kind="info">{t('text.arabicNote')}</Note>
          </>
        ) : (
          <Note kind="info" title={t('props.empty')}>
            {t('text.placeAtPlayhead')}
          </Note>
        )}
      </div>
    </div>
  );
}
