import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Button, ColorField, Modal, Note, Select, Slider, Toggle, useConfirm } from '../ui';
import { ASPECTS, FPS_OPTIONS } from '../../lib/presets';
import { formatBytes } from '../../lib/format';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { ThemeToggle } from '../ThemeToggle';
import { requestPersistent } from '../../lib/db';

export function SettingsDialog() {
  const t = useT();
  const openDialog = useStore((s) => s.openDialog);
  const project = useStore((s) => s.project);
  const mutate = useStore((s) => s.mutate);
  const storage = useStore((s) => s.storage);
  const clearAllData = useStore((s) => s.clearAllData);
  const downloadBackup = useStore((s) => s.downloadBackup);
  const restoreBackup = useStore((s) => s.restoreBackup);
  const refreshStorage = useStore((s) => s.refreshStorage);
  const confirm = useConfirm();
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    void refreshStorage();
  }, [refreshStorage]);

  const settings = project?.settings;
  const canvas = project?.canvas;
  const usagePct = storage.quota > 0 ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;

  return (
    <Modal
      title={t('settings.title')}
      subtitle={project?.name}
      onClose={() => openDialog(null)}
      size="lg"
      footer={
        <Button variant="primary" onClick={() => openDialog(null)}>
          {t('common.done')}
        </Button>
      }
    >
      <div className="settings-grid">
        {project && canvas && settings ? (
          <section className="settings-block">
            <h3>{t('settings.canvas')}</h3>
            <div className="field">
              <span className="field-label">{t('settings.aspect')}</span>
              <div className="chip-row">
                {ASPECTS.map((preset) => {
                  const active = canvas.w === preset.w && canvas.h === preset.h;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`chip ${active ? 'is-active' : ''}`}
                      onClick={() =>
                        mutate((p) => {
                          p.canvas.w = preset.w;
                          p.canvas.h = preset.h;
                        })
                      }
                    >
                      {preset.id}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label className="field-label" htmlFor="set-w">
                  {t('settings.width')}
                </label>
                <input
                  id="set-w"
                  className="input"
                  type="number"
                  min={64}
                  max={7680}
                  step={2}
                  value={canvas.w}
                  onChange={(e) =>
                    mutate(
                      (p) => {
                        p.canvas.w = Math.max(64, Math.min(7680, parseInt(e.target.value, 10) || canvas.w));
                      },
                      { coalesce: 'canvas-w' }
                    )
                  }
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="set-h">
                  {t('settings.height')}
                </label>
                <input
                  id="set-h"
                  className="input"
                  type="number"
                  min={64}
                  max={4320}
                  step={2}
                  value={canvas.h}
                  onChange={(e) =>
                    mutate(
                      (p) => {
                        p.canvas.h = Math.max(64, Math.min(4320, parseInt(e.target.value, 10) || canvas.h));
                      },
                      { coalesce: 'canvas-h' }
                    )
                  }
                />
              </div>
            </div>
            <div className="grid-2">
              <Select
                label={t('settings.fps')}
                value={String(canvas.fps)}
                onChange={(v) =>
                  mutate((p) => {
                    p.canvas.fps = parseInt(v, 10);
                  })
                }
              >
                {FPS_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f} fps
                  </option>
                ))}
              </Select>
              <ColorField
                label={t('settings.background')}
                value={canvas.bg}
                onChange={(v) =>
                  mutate((p) => {
                    p.canvas.bg = v;
                  }, { coalesce: 'canvas-bg' })
                }
              />
            </div>
            <StrokeDivider />
            <h3>{t('settings.general')}</h3>
            <Toggle
              label={t('settings.autosave')}
              checked={settings.autosave}
              hint={t('settings.autosaveDesc')}
              onChange={(v) =>
                mutate((p) => {
                  p.settings.autosave = v;
                })
              }
            />
            <Toggle
              label={t('settings.proxy')}
              checked={settings.proxy}
              hint={t('settings.proxyDesc')}
              onChange={(v) =>
                mutate((p) => {
                  p.settings.proxy = v;
                })
              }
            />
            <Slider
              label={t('settings.proxyQuality')}
              min={0.3}
              max={1}
              step={0.02}
              value={settings.proxyQuality}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) =>
                mutate((p) => {
                  p.settings.proxyQuality = v;
                }, { coalesce: 'proxy-q' })
              }
            />
            <Toggle
              label={t('settings.snapping')}
              checked={settings.snapping}
              onChange={(v) =>
                mutate((p) => {
                  p.settings.snapping = v;
                })
              }
            />
            <Slider
              label={t('settings.snapThreshold')}
              min={2}
              max={24}
              step={1}
              value={settings.snapThreshold}
              unit="px"
              onChange={(v) =>
                mutate((p) => {
                  p.settings.snapThreshold = v;
                }, { coalesce: 'snap-t' })
              }
            />
            <Toggle
              label={t('settings.safeMargins')}
              checked={settings.safeMargins}
              onChange={(v) =>
                mutate((p) => {
                  p.settings.safeMargins = v;
                })
              }
            />
            <Toggle
              label={t('settings.grid')}
              checked={settings.showGrid}
              onChange={(v) =>
                mutate((p) => {
                  p.settings.showGrid = v;
                })
              }
            />
            <Toggle
              label={t('settings.ripple')}
              checked={settings.ripple}
              hint={t('timeline.hint.ripple')}
              onChange={(v) =>
                mutate((p) => {
                  p.settings.ripple = v;
                })
              }
            />
          </section>
        ) : null}

        <div className="settings-col">
          <section className="settings-block">
            <h3>{t('settings.appearance')}</h3>
            <p className="settings-copy">{t('settings.appearanceDesc')}</p>
            <ThemeToggle />
          </section>

          <section className="settings-block">
            <h3>{t('settings.language')}</h3>
            <p className="settings-copy">{t('settings.languageDesc')}</p>
            <LanguageSwitcher />
          </section>

          <section className="settings-block">
            <h3>{t('settings.storage')}</h3>
            <p className="settings-copy">{t('settings.storageDesc')}</p>
            {storage.supported ? (
              <>
                <div className="storage-bar">
                  <span style={{ width: `${Math.max(1.5, usagePct)}%` }} />
                </div>
                <p className="settings-copy mono">
                  {t('settings.usageValue', { used: formatBytes(storage.usage), quota: formatBytes(storage.quota) })}
                </p>
              </>
            ) : (
              <p className="settings-copy muted">{t('settings.usageUnavailable')}</p>
            )}
            <div className="btn-row">
              <Button
                size="sm"
                icon="shield"
                variant="secondary"
                onClick={async () => {
                  const ok = await requestPersistent();
                  setPersisted(ok);
                }}
              >
                {t('cap.permission.3')}
              </Button>
            </div>
            {persisted !== null ? (
              <Note kind={persisted ? 'success' : 'warn'}>
                {persisted ? t('common.success') : t('common.notSupported')}
              </Note>
            ) : null}
          </section>

          <section className="settings-block">
            <h3>{t('settings.backup')}</h3>
            <p className="settings-copy">{t('settings.backupDesc')}</p>
            <div className="btn-row wrap">
              <Button
                size="sm"
                icon="download"
                variant="secondary"
                disabled={!project}
                onClick={() => project && void downloadBackup()}
              >
                {t('export.saveOnly')}
              </Button>
              <label className="btn btn-secondary btn-sm file-btn">
                <span className="btn-label">{t('settings.restore')}</span>
                <input
                  type="file"
                  accept=".editez,.json,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void restoreBackup(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <Note kind="cap" title={t('cap.storage.title')}>
              {t('cap.storage.desc')}
            </Note>
          </section>

          <section className="settings-block">
            <h3>{t('settings.about')}</h3>
            <p className="settings-copy">{t('settings.aboutDesc')}</p>
            <dl className="about-list">
              <div>
                <dt>{t('settings.version')}</dt>
                <dd className="mono">1.0.0</dd>
              </div>
              <div>
                <dt>{t('common.language')}</dt>
                <dd>EN / AR</dd>
              </div>
            </dl>
            <div className="btn-row wrap">
              <Button size="sm" icon="keyboard" variant="ghost" onClick={() => openDialog('shortcuts')}>
                {t('settings.shortcuts')}
              </Button>
              <Button size="sm" icon="help" variant="ghost" onClick={() => openDialog('onboard')}>
                {t('settings.replayGuide')}
              </Button>
              <Button size="sm" icon="shield" variant="ghost" onClick={() => openDialog('capabilities')}>
                {t('settings.capabilities')}
              </Button>
            </div>
          </section>

          <section className="settings-block settings-danger">
            <h3>{t('settings.dangerZone')}</h3>
            <p className="settings-copy">{t('settings.clearAllDesc')}</p>
            <Button
              size="sm"
              variant="danger"
              icon="trash"
              onClick={() =>
                confirm({
                  title: t('settings.clearAll'),
                  description: t('settings.clearAllConfirm'),
                  confirmLabel: t('common.delete'),
                  danger: true,
                  onConfirm: () => void clearAllData(),
                })
              }
            >
              {t('settings.clearAll')}
            </Button>
          </section>
        </div>
      </div>
    </Modal>
  );
}

function StrokeDivider() {
  return <div className="divider" />;
}
