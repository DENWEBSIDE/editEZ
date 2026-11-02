import { useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Badge, Button, EmptyState, Note, SearchInput, useConfirm } from '../ui';
import { Icon, type IconName } from '../Icons';
import { formatBytes, formatTimeShort } from '../../lib/format';
import { fileAccept } from '../../lib/media';
import { MUSIC_LIBRARY, SFX_LIBRARY, generateMusic, generateSfx } from '../../lib/samples';
import { assetFromBlob } from '../../lib/media';
import type { Asset, AssetKind } from '../../types';

type Filter = 'all' | 'video' | 'audio' | 'image' | 'music' | 'sfx' | 'subtitle';

const KIND_ICON: Record<AssetKind, IconName> = {
  video: 'video',
  audio: 'audio',
  image: 'image',
  music: 'music',
  sfx: 'waveform',
  subtitle: 'subtitle',
};

export function MediaPanel() {
  const t = useT();
  const assets = useStore((s) => s.assets);
  const project = useStore((s) => s.project);
  const importFiles = useStore((s) => s.importFiles);
  const addToTimeline = useStore((s) => s.addAssetToTimeline);
  const removeAsset = useStore((s) => s.removeAsset);
  const addGeneratedAsset = useStore((s) => s.addGeneratedAsset);
  const busy = useStore((s) => s.busy);
  const toast = useStore((s) => s.toast);
  const confirm = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<'new' | 'name' | 'duration'>('new');
  const [dragging, setDragging] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const usedCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const track of project?.tracks ?? []) for (const clip of track.clips) if (clip.assetId) counts[clip.assetId] = (counts[clip.assetId] ?? 0) + 1;
    return counts;
  }, [project]);

  const list = useMemo(() => {
    let items = Object.values(assets);
    if (filter !== 'all') items = items.filter((a) => a.kind === filter);
    const q = query.trim().toLowerCase();
    if (q) items = items.filter((a) => a.name.toLowerCase().includes(q));
    items = [...items].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'duration') return b.duration - a.duration;
      return b.createdAt - a.createdAt;
    });
    return items;
  }, [assets, filter, query, sort]);

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: t('media.all') },
    { id: 'video', label: t('media.video') },
    { id: 'image', label: t('media.image') },
    { id: 'audio', label: t('media.audio') },
    { id: 'music', label: t('media.music') },
    { id: 'sfx', label: t('media.sfx') },
    { id: 'subtitle', label: t('media.subtitle') },
  ];

  const handleGenerate = async (kind: 'music' | 'sfx', id: string, name: string) => {
    setGenerating(`${kind}:${id}`);
    try {
      if (kind === 'music') {
        const meta = MUSIC_LIBRARY.find((m) => m.id === id);
        const blob = await generateMusic(id as never, meta?.seconds ?? 16);
        const { asset } = await assetFromBlob(blob, `${name}.wav`, 'music', {
          license: 'demo-generated',
          source: 'generated',
          duration: meta?.seconds,
        });
        await addGeneratedAsset(asset, blob);
        toast('success', t('lib.generated'));
      } else {
        const blob = await generateSfx(id as never);
        const { asset } = await assetFromBlob(blob, `${name}.wav`, 'sfx', { license: 'demo-generated', source: 'generated' });
        await addGeneratedAsset(asset, blob);
        toast('success', t('lib.generated'));
      }
    } catch {
      toast('error', t('toast.generated'));
    } finally {
      setGenerating(null);
    }
  };

  const onDropFiles = (files: FileList | null) => {
    if (files?.length) void importFiles(files);
  };

  return (
    <div
      className={`panel-body media-panel ${dragging ? 'is-dragover' : ''}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragging(false);
          onDropFiles(e.dataTransfer.files);
        }
      }}
    >
      <div className="panel-head">
        <div>
          <h2>{t('media.title')}</h2>
          <p className="panel-sub">{t('media.total', { n: Object.keys(assets).length })}</p>
        </div>
        <Button variant="primary" size="sm" icon="upload" onClick={() => inputRef.current?.click()}>
          {t('media.import')}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept={fileAccept()}
          onChange={(e) => {
            onDropFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <div className="panel-scroll">
        {busy ? (
          <div className="panel-busy">
            <span className="spinner" />
            <span>{busy}</span>
          </div>
        ) : null}

        <div className="media-tools">
          <SearchInput value={query} onChange={setQuery} placeholder={t('media.search')} />
          <select
            className="input select select-sm"
            value={sort}
            aria-label={t('media.filters')}
            onChange={(e) => setSort(e.target.value as never)}
          >
            <option value="new">{t('media.sortNew')}</option>
            <option value="name">{t('media.sortName')}</option>
            <option value="duration">{t('media.sortDuration')}</option>
          </select>
        </div>
        <div className="chip-row chip-row-scroll">
          {filters.map((f) => (
            <button key={f.id} type="button" className={`chip ${filter === f.id ? 'is-active' : ''}`} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        {dragging ? (
          <div className="drop-zone is-active">
            <Icon name="upload" size={22} />
            <p>{t('media.dropTitle')}</p>
            <span>{t('media.dropDesc')}</span>
          </div>
        ) : null}

        {list.length ? (
          <div className="asset-grid">
            {list.map((asset) => (
              <div className="asset" key={asset.id} draggable onDragStart={(e) => {
                e.dataTransfer.setData('application/x-editez-asset', asset.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}>
                <div className={`asset-thumb kind-${asset.kind}`}>
                  {asset.missing ? (
                    <Icon name="alert" size={20} />
                  ) : asset.thumb ? (
                    <img src={asset.thumb} alt="" loading="lazy" />
                  ) : (
                    <Icon name={KIND_ICON[asset.kind]} size={20} />
                  )}
                  <span className="asset-kind">
                    <Icon name={KIND_ICON[asset.kind]} size={11} />
                  </span>
                  {asset.kind !== 'image' && asset.kind !== 'subtitle' ? (
                    <span className="asset-dur mono">{formatTimeShort(asset.duration)}</span>
                  ) : null}
                  <button
                    type="button"
                    className="asset-play"
                    aria-label={t('media.preview')}
                    title={t('media.preview')}
                    onClick={() => window.dispatchEvent(new CustomEvent('editez:preview-asset', { detail: asset.id }))}
                  >
                    <Icon name="play" size={13} />
                  </button>
                  <button
                    type="button"
                    className="asset-add"
                    aria-label={t('media.addToTimeline')}
                    title={t('media.addToTimeline')}
                    onClick={() => addToTimeline(asset.id)}
                  >
                    <Icon name="plus" size={14} />
                  </button>
                  <button
                    type="button"
                    className="asset-menu-btn"
                    aria-label={t('common.more')}
                    onClick={() => setMenuFor(menuFor === asset.id ? null : asset.id)}
                  >
                    <Icon name="more" size={13} />
                  </button>
                  {menuFor === asset.id ? (
                    <div className="menu asset-menu" role="menu">
                      <button role="menuitem" onClick={() => { addToTimeline(asset.id); setMenuFor(null); }}>
                        <Icon name="plus" size={14} /> {t('media.addToTimeline')}
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => {
                          setMenuFor(null);
                          window.dispatchEvent(new CustomEvent('editez:preview-asset', { detail: asset.id }));
                        }}
                      >
                        <Icon name="play" size={14} /> {t('media.preview')}
                      </button>
                      <button
                        role="menuitem"
                        className="is-danger"
                        onClick={() => {
                          setMenuFor(null);
                          confirm({
                            title: t('media.removeTitle'),
                            description: `${t('media.removeDesc', { name: asset.name })} ${
                              usedCount[asset.id] ? t('media.removeUsed', { n: usedCount[asset.id] }) : ''
                            }`,
                            confirmLabel: t('common.remove'),
                            danger: true,
                            onConfirm: () => void removeAsset(asset.id),
                          });
                        }}
                      >
                        <Icon name="trash" size={14} /> {t('media.remove')}
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="asset-info">
                  <p className="asset-name" title={asset.name}>
                    {asset.name}
                  </p>
                  <p className="asset-meta">
                    {formatBytes(asset.size)}
                    {usedCount[asset.id] ? <span className="asset-used"> · {t('media.inUse')}</span> : null}
                  </p>
                </div>
                {asset.missing ? <Badge tone="danger">{t('media.missing')}</Badge> : null}
                {asset.source === 'generated' ? <Badge tone="info">{t('media.generated')}</Badge> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="drop-zone" onClick={() => inputRef.current?.click()} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}>
            <Icon name="upload" size={22} />
            <p>{t('media.dropTitle')}</p>
            <span>{t('media.dropDesc')}</span>
            <em>{t('media.dropNote')}</em>
          </div>
        )}

        {!list.length && Object.keys(assets).length ? (
          <EmptyState icon="search" title={t('media.noResults')} compact />
        ) : null}

        {!Object.keys(assets).length ? (
          <div className="media-hint">
            <Note kind="info" title={t('media.hint')}>
              {t('media.importHint')}
            </Note>
          </div>
        ) : null}

        <section className="lib-section">
          <div className="lib-head">
            <h3>{t('lib.title')}</h3>
            <Badge tone="success" icon="shield">
              CC0
            </Badge>
          </div>
          <p className="panel-sub">{t('lib.desc')}</p>

          <p className="lib-label">{t('lib.music')}</p>
          <div className="lib-list">
            {MUSIC_LIBRARY.map((item) => (
              <div className="lib-item" key={item.id}>
                <span className="lib-glyph">
                  <Icon name="music" size={14} />
                </span>
                <div className="lib-info">
                  <p>{item.name}</p>
                  <span className="mono">
                    {item.bpm} BPM · {item.seconds}s
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="plus"
                  loading={generating === `music:${item.id}`}
                  onClick={() => void handleGenerate('music', item.id, item.name)}
                >
                  {t('lib.add')}
                </Button>
              </div>
            ))}
          </div>

          <p className="lib-label">{t('lib.sfx')}</p>
          <div className="lib-list">
            {SFX_LIBRARY.map((item) => (
              <div className="lib-item" key={item.id}>
                <span className="lib-glyph">
                  <Icon name="waveform" size={14} />
                </span>
                <div className="lib-info">
                  <p>{item.name}</p>
                  <span className="mono">SFX</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="plus"
                  loading={generating === `sfx:${item.id}`}
                  onClick={() => void handleGenerate('sfx', item.id, item.name)}
                >
                  {t('lib.add')}
                </Button>
              </div>
            ))}
          </div>
          <Note kind="cap">{t('lib.licenseNote')}</Note>
        </section>

        <Note kind="cap" title={t('cap.formats.title')}>
          {t('media.dropNote')}
        </Note>
      </div>
    </div>
  );
}
