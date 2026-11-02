import { useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Badge, Button, Modal, Note, useConfirm } from '../ui';
import { Icon } from '../Icons';
import { formatBytes, formatTimeShort } from '../../lib/format';
import type { Asset } from '../../types';

function Waveform({ asset }: { asset: Asset }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || 520;
    const h = 96;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const peaks = asset.peaks ?? [];
    ctx.fillStyle = 'rgba(124, 92, 255, 0.25)';
    ctx.fillRect(0, h / 2 - 1, w, 2);
    if (!peaks.length) return;
    const bar = Math.max(2, w / peaks.length);
    for (let i = 0; i < peaks.length; i += 1) {
      const v = Math.max(0.02, peaks[i]);
      const height = v * (h * 0.86);
      const x = i * bar;
      const grad = ctx.createLinearGradient(0, h / 2 - height / 2, 0, h / 2 + height / 2);
      grad.addColorStop(0, '#8b7dff');
      grad.addColorStop(0.5, '#5eead4');
      grad.addColorStop(1, '#8b7dff');
      ctx.fillStyle = grad;
      ctx.fillRect(x, h / 2 - height / 2, Math.max(1, bar - 1), height);
    }
  }, [asset]);
  return <canvas ref={ref} className="preview-wave" aria-hidden="true" />;
}

export function MediaPreviewModal({ assetId, onClose }: { assetId: string | null; onClose: () => void }) {
  const t = useT();
  const assets = useStore((s) => s.assets);
  const addToTimeline = useStore((s) => s.addAssetToTimeline);
  const removeAsset = useStore((s) => s.removeAsset);
  const confirm = useConfirm();
  const asset = assetId ? assets[assetId] : undefined;

  if (!asset) return null;

  const licenseText =
    asset.license === 'user'
      ? t('media.licenseUser')
      : asset.source === 'record'
        ? t('media.licenseRecorded')
        : t('media.licenseGenerated');

  return (
    <Modal
      title={asset.name}
      subtitle={`${asset.kind.toUpperCase()} · ${formatTimeShort(asset.duration)}${asset.width ? ` · ${asset.width}×${asset.height}` : ''}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.close')}
          </Button>
          <Button
            variant="danger"
            icon="trash"
            onClick={() =>
              confirm({
                title: t('media.removeTitle'),
                description: t('media.removeDesc', { name: asset.name }),
                confirmLabel: t('common.remove'),
                danger: true,
                onConfirm: () => {
                  void removeAsset(asset.id);
                  onClose();
                },
              })
            }
          >
            {t('media.remove')}
          </Button>
          <Button
            variant="primary"
            icon="plus"
            onClick={() => {
              addToTimeline(asset.id);
              onClose();
            }}
          >
            {t('media.addToTimeline')}
          </Button>
        </>
      }
    >
      {asset.missing ? (
        <Note kind="error" title={t('media.missing')}>
          {t('media.missingDesc')}
        </Note>
      ) : (
        <div className="media-preview-body">
          {asset.kind === 'video' ? (
            <video src={asset.url} controls autoPlay className="media-preview-el" />
          ) : asset.kind === 'audio' ? (
            <div className="media-preview-audio">
              <Waveform asset={asset} />
              <audio src={asset.url} controls className="media-preview-audio-el" />
            </div>
          ) : asset.kind === 'image' ? (
            <img src={asset.url} alt={asset.name} className="media-preview-el is-image" />
          ) : (
            <div className="media-preview-sub">
              <Icon name="subtitle" size={28} />
              <p>{t('media.subtitlePreview')}</p>
            </div>
          )}

          <div className="meta-grid">
            <div>
              <span>{t('media.size')}</span>
              <strong className="mono">{formatBytes(asset.size)}</strong>
            </div>
            <div>
              <span>{t('common.duration')}</span>
              <strong className="mono">{formatTimeShort(asset.duration)}</strong>
            </div>
            <div>
              <span>{t('media.format')}</span>
              <strong className="mono">{asset.mime || asset.kind}</strong>
            </div>
            <div>
              <span>{t('media.license')}</span>
              <strong>{licenseText}</strong>
            </div>
          </div>
          {asset.hasAudio && asset.kind === 'video' ? (
            <p className="preview-note">
              <Badge tone="success" icon="volume">
                {t('media.hasAudio')}
              </Badge>
            </p>
          ) : null}
          <Note kind="cap">{t('media.licenseHint')}</Note>
        </div>
      )}
    </Modal>
  );
}
