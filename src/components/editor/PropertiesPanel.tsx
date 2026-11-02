import { useMemo } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Badge, Button, ColorField, EmptyState, IconButton, Note, Section, Select, Slider, Toggle } from '../ui';
import { Icon } from '../Icons';
import { BLEND_MODES, TRANSITIONS, blendLabel, transitionLabel } from '../../lib/presets';
import { findClip } from '../../lib/edits';
import { clamp, defaultAudioFx, defaultChroma, defaultMask, defaultTransform, defaultGrade } from '../../types';
import type { Project } from '../../types';
import type { BlendMode, ChromaSettings, Clip, KeyframeProp, MaskShape, TextAnimation, Track, TransitionType } from '../../types';
import { keyVal } from '../../lib/render';
import { EffectStack } from './EffectsPanel';
import type { TKey } from '../../i18n/en';

const KEYFRAME_PROPS: { prop: KeyframeProp; label: TKey; base: (c: Clip) => number }[] = [
  { prop: 'x', label: 'props.positionX', base: (c) => c.transform.x },
  { prop: 'y', label: 'props.positionY', base: (c) => c.transform.y },
  { prop: 'scale', label: 'props.scale', base: () => 1 },
  { prop: 'rotate', label: 'props.rotate', base: (c) => c.transform.rotate },
  { prop: 'opacity', label: 'props.opacity', base: () => 1 },
];

function ClipSection({ clip, track }: { clip: Clip; track: Track }) {
  const t = useT();
  const playhead = useStore((s) => s.playhead);
  const mutate = useStore((s) => s.mutate);
  const assets = useStore((s) => s.assets);
  const setEyedropper = useStore((s) => s.setEyedropper);
  const eyedropper = useStore((s) => s.eyedropper);
  const setPanel = useStore((s) => s.setPanel);

  const local = clamp(playhead - clip.start, 0, clip.duration);
  const asset = clip.assetId ? assets[clip.assetId] : undefined;
  const visual = clip.type === 'video' || clip.type === 'image';
  const audioBearing = clip.type === 'audio' || (clip.type === 'video' && !!asset?.hasAudio);
  const isText = clip.type === 'text' || clip.type === 'subtitle';

  const patch = (fn: (c: Clip) => void, coalesce?: string, history = true) =>
    mutate(
      (p) => {
        for (const tr of p.tracks) {
          const c = tr.clips.find((x) => x.id === clip.id);
          if (c) fn(c);
        }
      },
      { coalesce, history }
    );

  const setAnimated = (prop: KeyframeProp, value: number, base: (c: Clip) => void, coalesce: string) => {
    patch((c) => {
      const frames = c.keyframes[prop];
      if (frames && frames.length) {
        const idx = frames.findIndex((f) => Math.abs(f.t - local) < 0.03);
        if (idx >= 0) frames[idx].v = value;
        else {
          frames.push({ t: local, v: value, ease: 'smooth' });
          frames.sort((a, b) => a.t - b.t);
        }
      } else {
        base(c);
      }
    }, coalesce);
  };

  const addKeyframe = (prop: KeyframeProp, baseFn: (c: Clip) => number) => {
    patch((c) => {
      const frames = c.keyframes[prop] ?? [];
      const current = keyVal(c, prop, local, baseFn(c));
      const idx = frames.findIndex((f) => Math.abs(f.t - local) < 0.03);
      if (idx >= 0) frames[idx].v = current;
      else frames.push({ t: local, v: current, ease: 'smooth' });
      frames.sort((a, b) => a.t - b.t);
      c.keyframes[prop] = frames;
    });
  };

  const removeKeyframe = (prop: KeyframeProp) => {
    patch((c) => {
      const frames = c.keyframes[prop] ?? [];
      c.keyframes[prop] = frames.filter((f) => Math.abs(f.t - local) >= 0.03);
    });
  };

  const clearKeyframes = (prop: KeyframeProp) => {
    patch((c) => {
      delete c.keyframes[prop];
    });
  };

  const transitionPatch = (side: 'in' | 'out', type: TransitionType) => {
    patch((c) => {
      const value = { type, duration: (side === 'in' ? c.transitionIn?.duration : c.transitionOut?.duration) ?? 0.6 };
      if (side === 'in') c.transitionIn = value;
      else c.transitionOut = value;
    });
  };

  const chroma = clip.chroma;
  const chromaPatch = (fn: (ch: ChromaSettings) => void, coalesce?: string) => {
    patch((c) => {
      if (!c.chroma) c.chroma = { ...defaultChroma(), enabled: true };
      fn(c.chroma);
    }, coalesce);
  };

  const grade = clip.grade ?? defaultGrade();

  const bgOptions = useMemo(
    () => Object.values(assets).filter((a) => a.kind === 'image' || a.kind === 'video'),
    [assets]
  );

  return (
    <>
      <div className="inspector-head">
        <span className="inspector-icon" style={{ background: `${clip.color}22`, color: clip.color }}>
          <Icon
            name={
              clip.type === 'video' ? 'video' : clip.type === 'image' ? 'image' : clip.type === 'audio' ? 'audio' : clip.type === 'subtitle' ? 'subtitle' : 'text'
            }
            size={16}
          />
        </span>
        <div className="inspector-title">
          <p>{clip.name}</p>
          <span className="mono">
            {clip.type} · {clip.duration.toFixed(2)}s
          </span>
        </div>
        <div className="inspector-actions">
          <IconButton icon="duplicate" label={t('common.duplicate')} size="sm" onClick={() => useStore.getState().duplicateSelection()} />
          <IconButton icon="scissors" label={t('timeline.splitAt')} size="sm" onClick={() => useStore.getState().splitAtPlayhead(clip.id)} />
          <IconButton icon="trash" label={t('props.deleteClip')} size="sm" tone="danger" onClick={() => useStore.getState().deleteSelection()} />
        </div>
      </div>

      <div className="panel-scroll">
        <Section title={t('props.section.timing')} icon="clock" dense>
          <div className="grid-2">
            <div className="field">
              <label className="field-label" htmlFor="clip-start">
                {t('props.timing.start')}
              </label>
              <input
                id="clip-start"
                className="input"
                type="number"
                step={0.05}
                min={0}
                value={Math.round(clip.start * 100) / 100}
                onChange={(e) => patch((c) => { c.start = Math.max(0, parseFloat(e.target.value) || 0); }, 'clip-start')}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="clip-dur">
                {t('props.timing.duration')}
              </label>
              <input
                id="clip-dur"
                className="input"
                type="number"
                step={0.05}
                min={0.05}
                value={Math.round(clip.duration * 100) / 100}
                onChange={(e) => patch((c) => { c.duration = Math.max(0.05, parseFloat(e.target.value) || 0.05); }, 'clip-dur')}
              />
            </div>
          </div>
          <Slider
            label={t('props.timing.speed')}
            min={0.25}
            max={4}
            step={0.05}
            value={clip.speed}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(v) => patch((c) => { c.speed = v; }, 'clip-speed')}
          />
          <div className="grid-2">
            <Toggle label={t('props.timing.reverse')} checked={clip.reverse} onChange={(v) => patch((c) => { c.reverse = v; })} />
            <Toggle label={t('props.timing.freeze')} checked={clip.freezeFrame} onChange={(v) => patch((c) => { c.freezeFrame = v; })} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="field-label" htmlFor="clip-in">
                {t('props.timing.in')}
              </label>
              <input
                id="clip-in"
                className="input"
                type="number"
                step={0.05}
                min={0}
                value={Math.round(clip.inPoint * 100) / 100}
                onChange={(e) => patch((c) => { c.inPoint = Math.max(0, parseFloat(e.target.value) || 0); }, 'clip-in')}
              />
            </div>
            <div className="readout">
              <span>{t('props.timing.end')}</span>
              <strong className="mono">{(clip.start + clip.duration).toFixed(2)}s</strong>
            </div>
          </div>
          <p className="field-hint">{t('props.speedHint')}</p>
        </Section>

        {visual ? (
          <>
            <Section title={t('props.section.transitions')} icon="layers" dense>
              <Select label={t('props.transition.in')} value={clip.transitionIn?.type ?? 'none'} onChange={(v) => transitionPatch('in', v as TransitionType)}>
                {TRANSITIONS.map((type) => (
                  <option key={type} value={type}>
                    {t(transitionLabel(type))}
                  </option>
                ))}
              </Select>
              {clip.transitionIn && clip.transitionIn.type !== 'none' ? (
                <Slider
                  label={t('props.transition.duration')}
                  min={0.1}
                  max={3}
                  step={0.05}
                  value={clip.transitionIn.duration}
                  format={(v) => `${v.toFixed(2)}s`}
                  onChange={(v) => patch((c) => { if (c.transitionIn) c.transitionIn.duration = v; }, 'tin')}
                />
              ) : null}
              <Select label={t('props.transition.out')} value={clip.transitionOut?.type ?? 'none'} onChange={(v) => transitionPatch('out', v as TransitionType)}>
                {TRANSITIONS.map((type) => (
                  <option key={type} value={type}>
                    {t(transitionLabel(type))}
                  </option>
                ))}
              </Select>
              {clip.transitionOut && clip.transitionOut.type !== 'none' ? (
                <Slider
                  label={t('props.transition.duration')}
                  min={0.1}
                  max={3}
                  step={0.05}
                  value={clip.transitionOut.duration}
                  format={(v) => `${v.toFixed(2)}s`}
                  onChange={(v) => patch((c) => { if (c.transitionOut) c.transitionOut.duration = v; }, 'tout')}
                />
              ) : null}
            </Section>

            <Section title={t('props.section.transform')} icon="crop" dense>
              <Slider
                label={t('props.positionX')}
                min={-0.2}
                max={1.2}
                step={0.005}
                value={keyVal(clip, 'x', local, clip.transform.x)}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => setAnimated('x', v, (c) => { c.transform.x = v; }, 'tx')}
              />
              <Slider
                label={t('props.positionY')}
                min={-0.2}
                max={1.2}
                step={0.005}
                value={keyVal(clip, 'y', local, clip.transform.y)}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => setAnimated('y', v, (c) => { c.transform.y = v; }, 'ty')}
              />
              <Slider
                label={t('props.scale')}
                min={0.05}
                max={3}
                step={0.01}
                value={keyVal(clip, 'scale', local, 1) * clip.transform.scale}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => setAnimated('scale', v / clip.transform.scale, (c) => { c.transform.scale = v; }, 'tscale')}
              />
              <Slider
                label={t('props.rotate')}
                min={-180}
                max={180}
                step={1}
                value={keyVal(clip, 'rotate', local, clip.transform.rotate)}
                unit="°"
                onChange={(v) => setAnimated('rotate', v, (c) => { c.transform.rotate = v; }, 'trot')}
              />
              <div className="grid-2">
                <Toggle label={t('props.flipH')} checked={clip.transform.flipH} onChange={(v) => patch((c) => { c.transform.flipH = v; })} />
                <Toggle label={t('props.flipV')} checked={clip.transform.flipV} onChange={(v) => patch((c) => { c.transform.flipV = v; })} />
              </div>
              <Select
                label={t('props.fit')}
                value={clip.transform.fit}
                onChange={(v) => patch((c) => { c.transform.fit = v as 'contain' | 'cover' | 'stretch'; })}
              >
                <option value="contain">{t('props.fit.contain')}</option>
                <option value="cover">{t('props.fit.cover')}</option>
                <option value="stretch">{t('props.fit.stretch')}</option>
              </Select>
              <Button size="sm" variant="ghost" icon="refresh" onClick={() => patch((c) => { c.transform = defaultTransform(); })}>
                {t('props.resetTransform')}
              </Button>
            </Section>

            <Section title={t('props.section.crop')} icon="crop" open={false} dense>
              {(['t', 'r', 'b', 'l'] as const).map((side) => (
                <Slider
                  key={side}
                  label={t(side === 't' ? 'props.cropTop' : side === 'r' ? 'props.cropRight' : side === 'b' ? 'props.cropBottom' : 'props.cropLeft')}
                  min={0}
                  max={0.45}
                  step={0.005}
                  value={clip.transform.crop[side]}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => patch((c) => { c.transform.crop[side] = v; }, `crop-${side}`)}
                />
              ))}
            </Section>

            <Section title={t('props.section.motion')} icon="keyframe" open={false} dense>
              {KEYFRAME_PROPS.map(({ prop, label, base }) => {
                const frames = clip.keyframes[prop] ?? [];
                const hasKey = frames.some((f) => Math.abs(f.t - local) < 0.03);
                return (
                  <div className="kf-row" key={prop}>
                    <span className="kf-label">{t(label)}</span>
                    <span className="kf-count mono">{frames.length || '—'}</span>
                    <button
                      type="button"
                      className={`kf-btn ${hasKey ? 'is-on' : ''} ${frames.length ? 'has-frames' : ''}`}
                      aria-label={hasKey ? t('props.keyframe.remove') : t('props.keyframe.add')}
                      title={hasKey ? t('props.keyframe.remove') : t('props.keyframe.add')}
                      onClick={() => (hasKey ? removeKeyframe(prop) : addKeyframe(prop, base))}
                    >
                      <Icon name="keyframe" size={13} />
                    </button>
                    {frames.length ? (
                      <button
                        type="button"
                        className="kf-clear"
                        aria-label={t('common.clear')}
                        title={t('common.clear')}
                        onClick={() => clearKeyframes(prop)}
                      >
                        <Icon name="close" size={11} />
                      </button>
                    ) : null}
                  </div>
                );
              })}
              <p className="field-hint">{t('props.keyframe.hint')}</p>
            </Section>

            <Section title={t('props.section.opacity')} icon="layers" dense>
              <Slider
                label={t('props.opacity')}
                min={0}
                max={1}
                step={0.01}
                value={keyVal(clip, 'opacity', local, clip.opacity)}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => setAnimated('opacity', v, (c) => { c.opacity = v; }, 'topacity')}
              />
              <Select label={t('props.blend')} value={clip.blend} onChange={(v) => patch((c) => { c.blend = v as BlendMode; })}>
                {BLEND_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(blendLabel(mode))}
                  </option>
                ))}
              </Select>
            </Section>

            <Section title={t('props.section.mask')} icon="shapes" open={clip.mask?.shape !== 'none'} dense>
              <Select
                label={t('props.mask.shape')}
                value={clip.mask?.shape ?? 'none'}
                onChange={(v) =>
                  patch((c) => {
                    if (!c.mask) c.mask = defaultMask();
                    c.mask.shape = v as MaskShape;
                  })
                }
              >
                <option value="none">{t('props.mask.none')}</option>
                <option value="rect">{t('props.mask.rect')}</option>
                <option value="ellipse">{t('props.mask.ellipse')}</option>
                <option value="linear">{t('props.mask.linear')}</option>
                <option value="split">{t('props.mask.split')}</option>
              </Select>
              {clip.mask && clip.mask.shape !== 'none' ? (
                <>
                  <Slider label={t('props.mask.x')} min={0} max={1} step={0.005} value={clip.mask.cx} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch((c) => { if (c.mask) c.mask.cx = v; }, 'mkx')} />
                  <Slider label={t('props.mask.y')} min={0} max={1} step={0.005} value={clip.mask.cy} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch((c) => { if (c.mask) c.mask.cy = v; }, 'mky')} />
                  {clip.mask.shape === 'rect' || clip.mask.shape === 'ellipse' ? (
                    <>
                      <Slider label={t('props.mask.width')} min={0.02} max={1.5} step={0.005} value={clip.mask.w} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch((c) => { if (c.mask) c.mask.w = v; }, 'mkw')} />
                      <Slider label={t('props.mask.height')} min={0.02} max={1.5} step={0.005} value={clip.mask.h} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch((c) => { if (c.mask) c.mask.h = v; }, 'mkh')} />
                    </>
                  ) : null}
                  <Slider label={t('props.mask.feather')} min={0} max={0.5} step={0.005} value={clip.mask.feather} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch((c) => { if (c.mask) c.mask.feather = v; }, 'mkf')} />
                  <Slider label={t('props.mask.angle')} min={-180} max={180} step={1} value={clip.mask.angle} unit="°" onChange={(v) => patch((c) => { if (c.mask) c.mask.angle = v; }, 'mka')} />
                  <Toggle label={t('props.mask.invert')} checked={clip.mask.invert} onChange={(v) => patch((c) => { if (c.mask) c.mask.invert = v; })} />
                </>
              ) : null}
              <p className="field-hint">{t('props.mask.hint')}</p>
            </Section>

            <Section title={t('chroma.title')} icon="palette2" open={!!clip.chroma?.enabled} dense>
              <Toggle
                label={t('chroma.enable')}
                checked={!!clip.chroma?.enabled}
                hint={t('chroma.desc')}
                onChange={(v) => chromaPatch((ch) => { ch.enabled = v; })}
              />
              {chroma?.enabled ? (
                <>
                  <div className="chroma-top">
                    <ColorField label={t('chroma.color')} value={chroma.color} onChange={(v) => chromaPatch((ch) => { ch.color = v; }, 'chc')} />
                    <button
                      type="button"
                      className={`pick-btn ${eyedropper ? 'is-active' : ''}`}
                      onClick={() => setEyedropper(!eyedropper)}
                      aria-pressed={eyedropper}
                    >
                      <Icon name="eyedropper" size={15} />
                      {t('chroma.eyedropper')}
                    </button>
                  </div>
                  <div className="chip-row">
                    <button type="button" className="chip chip-green" onClick={() => chromaPatch((ch) => { ch.color = '#00b140'; })}>
                      <span className="swatch" style={{ background: '#00b140' }} /> {t('chroma.green')}
                    </button>
                    <button type="button" className="chip chip-blue" onClick={() => chromaPatch((ch) => { ch.color = '#0047bb'; })}>
                      <span className="swatch" style={{ background: '#0047bb' }} /> {t('chroma.blue')}
                    </button>
                  </div>
                  <Slider label={t('chroma.similarity')} min={0} max={1} step={0.005} value={chroma.similarity} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => chromaPatch((ch) => { ch.similarity = v; }, 'chsim')} />
                  <Slider label={t('chroma.smoothness')} min={0} max={1} step={0.005} value={chroma.smoothness} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => chromaPatch((ch) => { ch.smoothness = v; }, 'chsm')} />
                  <Slider label={t('chroma.spill')} min={0} max={1} step={0.005} value={chroma.spill} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => chromaPatch((ch) => { ch.spill = v; }, 'chsp')} />
                  <Slider label={t('chroma.edge')} min={0} max={0.95} step={0.005} value={chroma.edge} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => chromaPatch((ch) => { ch.edge = v; }, 'ched')} />
                  <Slider label={t('chroma.transparency')} min={0} max={1} step={0.005} value={chroma.transparency} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => chromaPatch((ch) => { ch.transparency = v; }, 'chtr')} />
                  <div className="panel-section-head">
                    <h3>{t('chroma.background')}</h3>
                    <Badge tone="neutral">{t('chroma.preview')}</Badge>
                  </div>
                  <Select
                    label={t('chroma.background')}
                    value={chroma.bgAssetId ?? ''}
                    onChange={(v) => chromaPatch((ch) => { ch.bgAssetId = v || null; })}
                  >
                    <option value="">{t('chroma.bgNone')}</option>
                    {bgOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                  {chroma.bgAssetId ? (
                    <>
                      <Slider label={t('chroma.bgBlur')} min={0} max={40} step={1} value={chroma.bgBlur} unit="px" onChange={(v) => chromaPatch((ch) => { ch.bgBlur = v; }, 'chbgblur')} />
                      <Slider label={t('chroma.bgScale')} min={0.5} max={2} step={0.01} value={chroma.bgScale} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => chromaPatch((ch) => { ch.bgScale = v; }, 'chbgscale')} />
                    </>
                  ) : (
                    <ColorField label={t('chroma.bgColor')} value={chroma.bgColor === 'transparent' ? '#000000' : chroma.bgColor} onChange={(v) => chromaPatch((ch) => { ch.bgColor = v; }, 'chbgc')} />
                  )}
                  <Toggle
                    label={t('chroma.bgNone')}
                    checked={chroma.bgColor === 'transparent' && !chroma.bgAssetId}
                    onChange={(v) => chromaPatch((ch) => { ch.bgColor = v ? 'transparent' : '#101322'; })}
                  />
                  <p className="field-hint">{t('chroma.hint')}</p>
                  <p className="field-hint muted">{t('chroma.pickHint')}</p>
                </>
              ) : null}
            </Section>
          </>
        ) : null}

        {clip.effects.length ? (
          <Section title={t('effects.stack')} icon="wand" dense>
            <EffectStack clip={clip} />
            <Button size="sm" variant="ghost" icon="sparkles" onClick={() => setPanel('effects')}>
              {t('effects.title')}
            </Button>
          </Section>
        ) : (
          <Section title={t('effects.stack')} icon="wand" open={false} dense>
            <p className="field-hint">{t('effects.stackEmpty')}</p>
            <Button size="sm" variant="secondary" icon="wand" onClick={() => setPanel('effects')}>
              {t('effects.apply')}
            </Button>
          </Section>
        )}

        {audioBearing ? (
          <Section title={t('props.section.audio')} icon="volume" open={false} dense>
            <Toggle
              label={t('audio.mute')}
              checked={clip.muted}
              onChange={(v) => patch((c) => { c.muted = v; })}
            />
            <Slider
              label={t('props.clipVolume')}
              min={0}
              max={2}
              step={0.01}
              value={clip.audio?.gain ?? 1}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => patch((c) => { if (!c.audio) c.audio = defaultAudioFx(); c.audio.gain = v; }, 'gain')}
            />
            {clip.type === 'video' ? (
              <Button size="sm" variant="secondary" icon="audio" onClick={() => useStore.getState().mutate((p) => detachAudioInProject(p, clip.id))}>
                {t('props.detachAudio')}
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" icon="waveform" onClick={() => setPanel('audio')}>
              {t('audio.title')}
            </Button>
          </Section>
        ) : null}

        {isText ? (
          <Section title={t('props.section.text')} icon="text" dense>
            <div className="field">
              <label className="field-label" htmlFor="insp-text">
                {t('text.content')}
              </label>
              <textarea
                id="insp-text"
                className="input textarea"
                rows={2}
                value={clip.text?.content ?? ''}
                onChange={(e) => patch((c) => { if (c.text) c.text.content = e.target.value; }, 'insp-text')}
              />
            </div>
            {clip.text ? (
              <Select
                label={t('text.animation')}
                value={clip.text.animation}
                onChange={(v) => patch((c) => { if (c.text) c.text.animation = v as TextAnimation; })}
              >
                {(['none', 'fadeUp', 'typewriter', 'pop', 'slideIn', 'reveal', 'bounce', 'tracking'] as TextAnimation[]).map((anim) => (
                  <option key={anim} value={anim}>
                    {t(`text.anim.${anim}` as TKey)}
                  </option>
                ))}
              </Select>
            ) : null}
            <Button size="sm" variant="secondary" icon="text" onClick={() => setPanel(clip.type === 'subtitle' ? 'subtitles' : 'text')}>
              {t('text.title')}
            </Button>
          </Section>
        ) : null}

        {visual ? (
          <Section title={t('color.title')} icon="palette" open={false} dense>
            <div className="grade-readout">
              <span>
                {t('color.exposure')} <strong className="mono">{grade.exposure.toFixed(2)}</strong>
              </span>
              <span>
                {t('color.contrast')} <strong className="mono">{grade.contrast.toFixed(2)}</strong>
              </span>
              <span>
                {t('color.saturation')} <strong className="mono">{grade.saturation.toFixed(2)}</strong>
              </span>
            </div>
            <Button size="sm" variant="secondary" icon="palette" onClick={() => setPanel('color')}>
              {t('color.title')}
            </Button>
          </Section>
        ) : null}

        <div className="clip-meta">
          <span>
            {t('timeline.track')} <strong>{track.name}</strong>
          </span>
          <span>
            {t('props.grouped')} <strong>{clip.groupId ? t('common.yes') : t('common.no')}</strong>
          </span>
          {clip.assetId ? (
            <span>
              {t('media.license')} <strong>{asset?.license === 'user' ? t('media.licenseUser') : t('media.licenseGenerated')}</strong>
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}

function detachAudioInProject(project: Project, clipId: string) {
  for (const track of project.tracks) {
    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) continue;
    let audioTrack = project.tracks.find((tr) => tr.role === 'voice');
    if (!audioTrack) {
      const audioIndex = project.tracks.findIndex((tr) => tr.kind === 'audio');
      audioTrack = {
        id: `trk_${Math.random().toString(36).slice(2, 9)}`,
        kind: 'audio',
        role: 'voice',
        name: 'Voice',
        locked: false,
        muted: false,
        hidden: false,
        height: 58,
        volume: 1,
        clips: [],
      };
      project.tracks.splice(audioIndex < 0 ? project.tracks.length : audioIndex + 1, 0, audioTrack);
    }
    const target = audioTrack;
    const clone: Clip = structuredClone(clip);
    clone.id = `clp_${Math.random().toString(36).slice(2, 9)}`;
    clone.type = 'audio';
    clone.trackId = target.id;
    clone.assetId = clip.assetId;
    clone.audio = defaultAudioFx();
    clone.transform = defaultTransform();
    clone.effects = [];
    clone.chroma = undefined;
    clone.grade = defaultGrade();
    clone.mask = defaultMask();
    clone.text = undefined;
    clone.groupId = null;
    clone.color = '#22c9a0';
    target.clips.push(clone);
    target.clips.sort((a, b) => a.start - b.start);
    clip.muted = true;
    return;
  }
}

export function PropertiesPanel() {
  const t = useT();
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const selectedTrackId = useStore((s) => s.selectedTrackId);
  const mutate = useStore((s) => s.mutate);

  const found = useMemo(() => {
    if (!project || selection.length !== 1) return null;
    return findClip(project, selection[0]);
  }, [project, selection]);

  const track = useMemo(() => project?.tracks.find((tr) => tr.id === selectedTrackId) ?? null, [project, selectedTrackId]);

  if (!project) return null;

  if (selection.length > 1) {
    return (
      <div className="properties">
        <div className="props-head">
          <h2>{t('props.title')}</h2>
        </div>
        <div className="panel-scroll">
          <Note kind="info" title={t('props.multi', { n: selection.length })}>
            {t('props.multiDesc')}
          </Note>
          <div className="btn-row wrap">
            <Button size="sm" variant="primary" icon="group" onClick={() => useStore.getState().groupSelection()}>
              {t('timeline.group')}
            </Button>
            <Button size="sm" variant="secondary" icon="layersOff" onClick={() => useStore.getState().ungroupSelection()}>
              {t('timeline.ungroup')}
            </Button>
            <Button size="sm" variant="ghost" icon="duplicate" onClick={() => useStore.getState().duplicateSelection()}>
              {t('common.duplicate')}
            </Button>
            <Button size="sm" variant="danger" icon="trash" onClick={() => useStore.getState().deleteSelection()}>
              {t('common.delete')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (found) {
    return (
      <div className="properties">
        <div className="props-head">
          <h2>{t('props.title')}</h2>
        </div>
        <ClipSection clip={found.clip} track={found.track} />
      </div>
    );
  }

  if (track) {
    return (
      <div className="properties">
        <div className="props-head">
          <h2>{t('props.title')}</h2>
        </div>
        <div className="panel-scroll">
          <div className="inspector-head">
            <span className="inspector-icon" style={{ background: '#ffffff11', color: 'var(--text-2)' }}>
              <Icon name="layers" size={16} />
            </span>
            <div className="inspector-title">
              <p>{track.name}</p>
              <span className="mono">{track.kind}</span>
            </div>
          </div>
          <Section title={t('props.trackProps')} icon="sliders" dense>
            <Toggle label={t('timeline.lock')} checked={track.locked} onChange={(v) => useStore.getState().setTrack(track.id, { locked: v })} />
            <Toggle label={t('timeline.hide')} checked={track.hidden} onChange={(v) => useStore.getState().setTrack(track.id, { hidden: v })} />
            <Toggle label={t('timeline.mute')} checked={track.muted} onChange={(v) => useStore.getState().setTrack(track.id, { muted: v })} />
            {track.kind === 'audio' ? (
              <Slider
                label={t('props.trackVolume')}
                min={0}
                max={2}
                step={0.01}
                value={track.volume}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) =>
                  mutate(
                    (p) => {
                      const tr = p.tracks.find((x) => x.id === track.id);
                      if (tr) tr.volume = v;
                    },
                    { coalesce: 'track-vol' }
                  )
                }
              />
            ) : null}
            <Button size="sm" variant="ghost" icon="trash" onClick={() => useStore.getState().removeTrack(track.id)}>
              {t('timeline.removeTrack')}
            </Button>
          </Section>
          <Note kind="info">{t('timeline.groupHint')}</Note>
        </div>
      </div>
    );
  }

  return (
    <div className="properties">
      <div className="props-head">
        <h2>{t('props.title')}</h2>
      </div>
      <div className="panel-scroll">
        <EmptyState icon="sliders" title={t('props.empty')} description={t('props.nothingDesc')} />
        <Section title={t('props.canvas')} icon="monitor" dense>
          <div className="canvas-stats">
            <div>
              <span>{t('settings.width')}</span>
              <strong className="mono">{project.canvas.w}</strong>
            </div>
            <div>
              <span>{t('settings.height')}</span>
              <strong className="mono">{project.canvas.h}</strong>
            </div>
            <div>
              <span>{t('settings.fps')}</span>
              <strong className="mono">{project.canvas.fps}</strong>
            </div>
            <div>
              <span>{t('common.duration')}</span>
              <strong className="mono">{project.duration.toFixed(1)}s</strong>
            </div>
          </div>
          <Button size="sm" variant="secondary" icon="settings" onClick={() => useStore.getState().openDialog('settings')}>
            {t('settings.title')}
          </Button>
        </Section>
        <Note kind="cap">{t('cap.perf.desc')}</Note>
      </div>
    </div>
  );
}
