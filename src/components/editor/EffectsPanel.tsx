import { useMemo, useState } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Badge, Button, EmptyState, Note, SearchInput, Slider } from '../ui';
import { Icon } from '../Icons';
import { EFFECTS, LOOKS, QUICK_ACTIONS, effectDef, type EffectCategory, type LookDef } from '../../lib/presets';
import { getSnapshot } from '../../lib/previewBus';
import type { Clip, EffectInstance, EffectType } from '../../types';
import { uid } from '../../types';
import { findClip } from '../../lib/edits';

const CATEGORIES: { id: 'all' | 'favourites' | EffectCategory; label: string }[] = [
  { id: 'all', label: 'effects.cat.all' },
  { id: 'favourites', label: 'effects.cat.favourites' },
  { id: 'color', label: 'effects.cat.color' },
  { id: 'blur', label: 'effects.cat.blur' },
  { id: 'light', label: 'effects.cat.light' },
  { id: 'style', label: 'effects.cat.style' },
  { id: 'motion', label: 'effects.cat.motion' },
];

export function EffectStack({ clip }: { clip: Clip }) {
  const t = useT();
  const mutate = useStore((s) => s.mutate);
  if (!clip.effects.length) return null;

  const patch = (fxId: string, fn: (fx: EffectInstance) => void, coalesce?: string) => {
    mutate(
      (p) => {
        for (const track of p.tracks) {
          const c = track.clips.find((x) => x.id === clip.id);
          const fx = c?.effects.find((f) => f.id === fxId);
          if (fx) fn(fx);
        }
      },
      { coalesce }
    );
  };

  return (
    <div className="fx-stack">
      {clip.effects.map((fx) => {
        const def = effectDef(fx.type);
        return (
          <div className="fx-item" key={fx.id}>
            <div className="fx-item-head">
              <button
                type="button"
                className={`fx-toggle ${fx.enabled ? 'is-on' : ''}`}
                aria-label={fx.enabled ? t('common.enabled') : t('common.disabled')}
                aria-pressed={fx.enabled}
                onClick={() => patch(fx.id, (f) => { f.enabled = !f.enabled; })}
              >
                <Icon name={fx.enabled ? 'check' : 'minus'} size={11} />
              </button>
              <span className="fx-item-name">{def ? t(def.label) : fx.type}</span>
              <button
                type="button"
                className="icon-btn icon-btn-sm tone-danger"
                aria-label={t('effects.remove')}
                title={t('effects.remove')}
                onClick={() => mutate((p) => {
                  for (const track of p.tracks) {
                    const c = track.clips.find((x) => x.id === clip.id);
                    if (c) c.effects = c.effects.filter((f) => f.id !== fx.id);
                  }
                })}
              >
                <Icon name="trash" size={12} />
              </button>
            </div>
            {def?.params.map((param) => (
              <Slider
                key={param.key}
                label={t(param.label)}
                min={param.min}
                max={param.max}
                step={param.step}
                value={Number(fx.params[param.key] ?? param.default)}
                onChange={(v) => patch(fx.id, (f) => { f.params[param.key] = v; }, `fx-${fx.id}-${param.key}`)}
              />
            ))}
            <button
              type="button"
              className="link-btn small"
              onClick={() =>
                patch(fx.id, (f) => {
                  f.params = Object.fromEntries((def?.params ?? []).map((pd) => [pd.key, pd.default]));
                })
              }
            >
              {t('effects.reset')}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function EffectsPanel() {
  const t = useT();
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const mutate = useStore((s) => s.mutate);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const toast = useStore((s) => s.toast);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [snapshot, setSnapshot] = useState<string | undefined>(() => getSnapshot());

  const clip = useMemo(() => {
    if (!project || selection.length !== 1) return null;
    return findClip(project, selection[0])?.clip ?? null;
  }, [project, selection]);

  const visual = clip && clip.type !== 'audio';

  const filtered = useMemo(() => {
    let items = EFFECTS;
    if (category === 'favourites') items = items.filter((e) => favorites.includes(e.type));
    else if (category !== 'all') items = items.filter((e) => e.category === category);
    const q = query.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (e) => t(e.label).toLowerCase().includes(q) || t(e.desc).toLowerCase().includes(q) || e.type.includes(q)
      );
    }
    return items;
  }, [category, query, favorites, t]);

  const apply = (type: EffectType) => {
    if (!clip) {
      toast('warn', t('effects.needsClip'));
      return;
    }
    if (clip.type === 'audio') {
      toast('warn', t('effects.limit'));
      return;
    }
    const def = effectDef(type);
    if (!def) return;
    const params: Record<string, number | string | boolean> = {};
    for (const pd of def.params) params[pd.key] = pd.default;
    if (type === 'duotone') {
      params.colorA = '#1b2340';
      params.colorB = '#ffb245';
    }
    mutate((p) => {
      for (const track of p.tracks) {
        const c = track.clips.find((x) => x.id === clip.id);
        if (c) c.effects.push({ id: uid('fx'), type, enabled: true, params });
      }
    });
    toast('success', t('effects.added'));
  };

  const applyLook = (look: LookDef) => {
    if (!clip) {
      toast('warn', t('effects.needsClip'));
      return;
    }
    if (clip.type === 'audio') {
      toast('warn', t('effects.limit'));
      return;
    }
    mutate((p) => {
      for (const track of p.tracks) {
        const c = track.clips.find((x) => x.id === clip.id);
        if (!c) continue;
        if (c.grade) Object.assign(c.grade, look.grade);
        c.effects = look.effects.map((fx) => {
          const def = effectDef(fx.type);
          const params: Record<string, number | string | boolean> = {};
          for (const pd of def?.params ?? []) params[pd.key] = pd.default;
          Object.assign(params, fx.params);
          return { id: uid('fx'), type: fx.type, enabled: true, params };
        });
      }
    });
    toast('success', t('effects.lookApplied', { name: t(look.label) }));
  };

  const quick = (id: string) => {
    if (!clip) {
      toast('warn', t('effects.needsClip'));
      return;
    }
    mutate((p) => {
      for (const track of p.tracks) {
        const c = track.clips.find((x) => x.id === clip.id);
        if (!c) continue;
        if (id === 'slowmo') c.speed = 0.5;
        else if (id === 'speedup') c.speed = 2;
        else if (id === 'reverse') c.reverse = !c.reverse;
        else if (id === 'freeze') c.freezeFrame = !c.freezeFrame;
        else if (id === 'fade') {
          c.transitionIn = { type: 'fade', duration: 0.6 };
          c.transitionOut = { type: 'fade', duration: 0.6 };
        }
      }
    });
    toast('success', t('effects.applied'));
  };

  return (
    <div className="panel-body">
      <div className="panel-head">
        <div>
          <h2>{t('effects.title')}</h2>
          <p className="panel-sub">{clip ? t('effects.active', { n: clip.effects.length }) : t('effects.needsClip')}</p>
        </div>
        <button
          type="button"
          className="icon-btn icon-btn-sm"
          aria-label={t('common.refresh')}
          title={t('common.refresh')}
          onClick={() => setSnapshot(getSnapshot())}
        >
          <Icon name="refresh" size={14} />
        </button>
      </div>

      <div className="panel-scroll">
        {clip && clip.effects.length ? (
          <section className="panel-section">
            <div className="panel-section-head">
              <h3>{t('effects.stack')}</h3>
              <Badge tone="accent">{clip.effects.length}</Badge>
            </div>
            <EffectStack clip={clip} />
          </section>
        ) : null}

        <section className="panel-section">
          <div className="panel-section-head">
            <h3>{t('effects.looks')}</h3>
            <span className="fx-count">{t('effects.looksDesc')}</span>
          </div>
          <div className="look-grid">
            {LOOKS.map((look) => (
              <button
                key={look.id}
                type="button"
                className="look-card"
                onClick={() => applyLook(look)}
                title={t(look.desc)}
                disabled={!clip}
              >
                <span className="look-swatch" style={{ background: look.swatch }} aria-hidden="true" />
                <span className="look-name">{t(look.label)}</span>
                <span className="look-fx">{t('effects.fxCount', { n: look.effects.length + 1 })}</span>
              </button>
            ))}
          </div>
        </section>

        <SearchInput value={query} onChange={setQuery} placeholder={t('effects.search')} />
        <div className="chip-row chip-row-scroll">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip ${category === c.id ? 'is-active' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              {t(c.label)}
            </button>
          ))}
        </div>

        {!clip ? (
          <Note kind="info">{t('effects.needsClip')}</Note>
        ) : null}

        <div className="fx-grid">
          {filtered.map((effect) => (
            <div
              className="fx-card"
              key={effect.type}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('.fav-btn, .fx-thumb')) return;
                apply(effect.type);
              }}
            >
              <button
                type="button"
                className="fx-thumb"
                onClick={() => apply(effect.type)}
                aria-label={`${t(effect.label)} — ${t('effects.apply')}`}
                style={
                  snapshot
                    ? {
                        backgroundImage: `url(${snapshot})`,
                        filter: effect.previewCss ?? 'none',
                      }
                    : undefined
                }
              >
                {effect.overlay === 'vignette' ? <span className="fx-vignette" /> : null}
                {effect.overlay === 'grain' ? <span className="fx-grain" /> : null}
                {effect.overlay === 'glow' ? <span className="fx-glow" /> : null}
                {!snapshot ? <Icon name="wand" size={18} /> : null}
                <span className="fx-apply">
                  <Icon name="plus" size={13} />
                  {t('effects.apply')}
                </span>
              </button>
              <div className="fx-card-body">
                <div className="fx-card-title">
                  <span>{t(effect.label)}</span>
                  <button
                    type="button"
                    className={`fav-btn ${favorites.includes(effect.type) ? 'is-on' : ''}`}
                    aria-label={favorites.includes(effect.type) ? t('effects.unfavourite') : t('effects.favourite')}
                    aria-pressed={favorites.includes(effect.type)}
                    onClick={() => toggleFavorite(effect.type)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={favorites.includes(effect.type) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9z" />
                    </svg>
                  </button>
                </div>
                <p>{t(effect.desc)}</p>
              </div>
            </div>
          ))}
        </div>

        {!filtered.length ? (
          <EmptyState icon="search" title={t('effects.empty')} description={t('effects.emptyDesc')} compact />
        ) : null}

        <section className="panel-section">
          <div className="panel-section-head">
            <h3>{t('effects.cat.motion')}</h3>
          </div>
          <div className="quick-grid">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                className="quick-card"
                onClick={() => quick(action.id)}
                disabled={!clip}
              >
                <Icon
                  name={
                    action.id === 'slowmo' ? 'clock' : action.id === 'speedup' ? 'skipForward' : action.id === 'reverse' ? 'refresh' : action.id === 'freeze' ? 'image' : 'layers'
                  }
                  size={15}
                />
                <span>{t(action.label)}</span>
              </button>
            ))}
          </div>
          <Note kind="info">{t('effects.previewNote')}</Note>
        </section>
      </div>
    </div>
  );
}
