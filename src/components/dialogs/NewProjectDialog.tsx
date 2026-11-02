import { useState } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Button, Modal, Select } from '../ui';
import { ASPECTS, FPS_OPTIONS } from '../../lib/presets';
import { Icon } from '../Icons';
import type { TKey } from '../../i18n/en';

export function NewProjectDialog() {
  const t = useT();
  const openDialog = useStore((s) => s.openDialog);
  const createProject = useStore((s) => s.createProject);
  const lang = useStore((s) => s.lang);
  const [name, setName] = useState('');
  const [aspect, setAspect] = useState('16:9');
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [fps, setFps] = useState(30);
  const [busy, setBusy] = useState(false);

  const choose = (id: string) => {
    setAspect(id);
    const preset = ASPECTS.find((a) => a.id === id);
    if (preset) {
      setWidth(preset.w);
      setHeight(preset.h);
    }
  };

  const submit = async () => {
    setBusy(true);
    await createProject({
      name: name.trim() || t('new.defaultName'),
      width: Math.max(64, Math.min(7680, width)),
      height: Math.max(64, Math.min(4320, height)),
      fps,
    });
    setBusy(false);
  };

  return (
    <Modal
      title={t('new.title')}
      subtitle={t('app.tagline')}
      onClose={() => openDialog(null)}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => openDialog(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" icon="plus" loading={busy} onClick={() => void submit()}>
            {t('new.create')}
          </Button>
        </>
      }
    >
      <div className="new-project">
        <label className="field-label" htmlFor="np-name">
          {t('new.name')}
        </label>
        <input
          id="np-name"
          className="input"
          value={name}
          autoFocus
          placeholder={lang === 'ar' ? 'فيديوي الرائع' : 'My awesome video'}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />

        <div className="np-section">
          <p className="field-label">{t('new.aspect')}</p>
          <div className="aspect-grid">
            {ASPECTS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`aspect-card ${aspect === preset.id ? 'is-active' : ''}`}
                onClick={() => choose(preset.id)}
                aria-pressed={aspect === preset.id}
              >
                <span
                  className="aspect-shape"
                  style={{
                    width: preset.w >= preset.h ? 40 : 40 * (preset.w / preset.h),
                    height: preset.h >= preset.w ? 40 : 40 * (preset.h / preset.w),
                  }}
                />
                <span className="aspect-label">{t(preset.label as TKey)}</span>
                <span className="aspect-size mono">
                  {preset.w}×{preset.h}
                </span>
              </button>
            ))}
            <button
              type="button"
              className={`aspect-card ${aspect === 'custom' ? 'is-active' : ''}`}
              onClick={() => setAspect('custom')}
              aria-pressed={aspect === 'custom'}
            >
              <span className="aspect-shape aspect-custom">
                <Icon name="sliders" size={16} />
              </span>
              <span className="aspect-label">{t('aspect.custom')}</span>
              <span className="aspect-size mono">
                {width}×{height}
              </span>
            </button>
          </div>
          <p className="field-hint">{t('new.aspectHint')}</p>
        </div>

        {aspect === 'custom' ? (
          <div className="grid-2">
            <div className="field">
              <label className="field-label" htmlFor="np-w">
                {t('aspect.width')}
              </label>
              <input
                id="np-w"
                type="number"
                className="input"
                min={64}
                max={7680}
                step={2}
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value, 10) || 1920)}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="np-h">
                {t('aspect.height')}
              </label>
              <input
                id="np-h"
                type="number"
                className="input"
                min={64}
                max={4320}
                step={2}
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value, 10) || 1080)}
              />
            </div>
          </div>
        ) : null}

        <Select
          label={t('new.fps')}
          value={String(fps)}
          onChange={(v) => setFps(parseInt(v, 10))}
        >
          {FPS_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f} {t('common.fps')}
            </option>
          ))}
        </Select>
      </div>
    </Modal>
  );
}
