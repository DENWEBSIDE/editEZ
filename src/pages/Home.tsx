import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Badge, Button, EmptyState, IconButton, Modal, Note, SearchInput, TextInput, useConfirm } from '../components/ui';
import { Icon, Logo } from '../components/Icons';
import { TEMPLATES, DEMO_ID } from '../lib/templates';
import { formatBytes, formatRelative, formatTimeShort } from '../lib/format';
import type { ProjectMeta } from '../types';

function ProjectCard({ meta }: { meta: ProjectMeta }) {
  const t = useT();
  const openProject = useStore((s) => s.openProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const duplicateProject = useStore((s) => s.duplicateProject);
  const downloadBackup = useStore((s) => s.downloadBackup);
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(meta.name);
  const confirm = useConfirm();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  return (
    <>
      <article className="pcard">
        <button type="button" className="pcard-open" onClick={() => void openProject(meta.id)} aria-label={`${t('common.open')} ${meta.name}`}>
          <span className="pcard-thumb" style={{ backgroundImage: meta.thumb ? `url(${meta.thumb})` : undefined }}>
            {!meta.thumb ? (
              <span className="pcard-thumb-fallback">
                <Logo size={34} />
              </span>
            ) : null}
            <span className="pcard-duration mono">{formatTimeShort(meta.duration || 0)}</span>
          </span>
          <span className="pcard-info">
            <span className="pcard-name">{meta.name}</span>
            <span className="pcard-meta">
              {formatRelative(meta.updatedAt, useStore.getState().lang, t)} · {t('home.clipCount', { n: meta.clipCount ?? 0 })}
            </span>
          </span>
        </button>
        <div className="pcard-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="pcard-menu-btn"
            aria-label={t('common.more')}
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
          >
            <Icon name="more" size={16} />
          </button>
          {menu ? (
            <div className="menu" role="menu">
              <button role="menuitem" onClick={() => { setMenu(false); void openProject(meta.id); }}>
                <Icon name="folder" size={15} />
                {t('common.open')}
              </button>
              <button role="menuitem" onClick={() => { setMenu(false); setName(meta.name); setRenaming(true); }}>
                <Icon name="edit" size={15} />
                {t('common.rename')}
              </button>
              <button role="menuitem" onClick={() => { setMenu(false); void duplicateProject(meta.id); }}>
                <Icon name="duplicate" size={15} />
                {t('common.duplicate')}
              </button>
              <button role="menuitem" onClick={() => { setMenu(false); void downloadBackup(meta.id); }}>
                <Icon name="download" size={15} />
                {t('settings.backup')}
              </button>
              <div className="menu-sep" />
              <button
                role="menuitem"
                className="is-danger"
                onClick={() => {
                  setMenu(false);
                  confirm({
                    title: t('home.deleteTitle'),
                    description: t('home.deleteDesc', { name: meta.name }),
                    confirmLabel: t('common.delete'),
                    danger: true,
                    onConfirm: () => void deleteProject(meta.id),
                  });
                }}
              >
                <Icon name="trash" size={15} />
                {t('common.delete')}
              </button>
            </div>
          ) : null}
        </div>
      </article>
      {renaming ? (
        <Modal
          title={t('common.rename')}
          onClose={() => setRenaming(false)}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setRenaming(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const project = useStore.getState().project;
                  if (project?.id === meta.id) {
                    useStore.getState().renameProject(name);
                  } else {
                    void (async () => {
                      const db = await import('../lib/db');
                      const stored = await db.getProject(meta.id);
                      if (stored) {
                        await db.saveProject({ ...stored.doc, name: name.trim() || stored.name });
                        await useStore.getState().refreshProjects();
                      }
                    })();
                  }
                  setRenaming(false);
                }}
              >
                {t('common.save')}
              </Button>
            </>
          }
        >
          <TextInput label={t('new.name')} value={name} onChange={setName} autoFocus />
        </Modal>
      ) : null}
    </>
  );
}

function ProjectSkeleton() {
  return (
    <div className="pcard pcard-skeleton" aria-hidden="true">
      <div className="skel skel-thumb" />
      <div className="skel skel-line" />
      <div className="skel skel-line short" />
    </div>
  );
}

function TemplateCard({ template }: { template: (typeof TEMPLATES)[number] }) {
  const t = useT();
  const openTemplate = useStore((s) => s.openTemplate);
  const busy = useStore((s) => s.busy);
  const [starting, setStarting] = useState(false);
  return (
    <article className="tcard">
      <button
        type="button"
        className="tcard-art"
        style={{ background: template.art }}
        onClick={() => {
          setStarting(true);
          void openTemplate(template.id).finally(() => setStarting(false));
        }}
        disabled={!!busy}
        aria-label={`${t('home.useTemplate')} — ${t(template.name)}`}
      >
        <span className="tcard-art-inner">
          <span className="tcard-glyph" aria-hidden="true">
            <Icon name={template.h === template.w ? 'grid' : template.h > template.w ? 'film' : 'monitor'} size={22} />
          </span>
          <span className="tcard-aspect mono">
            {template.w}×{template.h}
          </span>
        </span>
        <span className="tcard-hover">
          {starting ? <Icon name="refresh" size={16} className="spin" /> : <Icon name="plus" size={16} />}
          {starting ? t('demo.loading') : t('home.useTemplate')}
        </span>
      </button>
      <div className="tcard-body">
        <div className="tcard-head">
          <h3>{t(template.name)}</h3>
          <Badge tone="neutral">{t(template.tag)}</Badge>
        </div>
        <p>{t(template.desc)}</p>
      </div>
    </article>
  );
}

export function Home() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const projects = useStore((s) => s.projects);
  const loading = useStore((s) => s.projectsLoading);
  const error = useStore((s) => s.projectsError);
  const openDialog = useStore((s) => s.openDialog);
  const openTemplate = useStore((s) => s.openTemplate);
  const storage = useStore((s) => s.storage);
  const busy = useStore((s) => s.busy);
  const refreshProjects = useStore((s) => s.refreshProjects);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, query]);

  const tags = useMemo(() => {
    const set = new Set(TEMPLATES.map((tp) => tp.tag));
    return ['all', ...set];
  }, []);

  const shownTemplates = tag === 'all' ? TEMPLATES : TEMPLATES.filter((tp) => tp.tag === tag);

  const storagePct = storage.quota > 0 ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;

  return (
    <div className="home">
      <header className="home-top">
        <div className="home-brand">
          <Logo size={30} />
          <div>
            <p className="home-brand-name">editEZ</p>
            <p className="home-brand-sub">{t('app.tagline')}</p>
          </div>
        </div>
        <div className="home-top-actions">
          <button type="button" className="link-btn" onClick={() => openDialog('capabilities')}>
            <Icon name="shield" size={15} />
            <span>{t('home.learnMoreCap')}</span>
          </button>
          <button type="button" className="link-btn" onClick={() => openDialog('onboard')}>
            <Icon name="help" size={15} />
            <span>{t('common.help')}</span>
          </button>
          <LanguageSwitcher />
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-glow" aria-hidden="true" />
          <div className="hero-grid-bg" aria-hidden="true" />
          <div className="hero-content">
            <span className="hero-badge">
              <span className="dot" />
              {t('home.badge')}
            </span>
            <h1 className="hero-title">
              {t('home.title1')} <span className="hero-accent">{t('home.titleAccent')}</span>
            </h1>
            <p className="hero-sub">{t('home.subtitle')}</p>
            <div className="hero-cta">
              <Button variant="primary" size="lg" icon="plus" onClick={() => openDialog('new')}>
                {t('home.newProject')}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                icon="sparkles"
                loading={busy === t('demo.loading')}
                onClick={() => void openTemplate(DEMO_ID)}
              >
                {t('home.tryDemo')}
              </Button>
            </div>
            <ul className="hero-chips">
              <li>
                <Icon name="shield" size={14} /> {t('home.feature.privacy')}
              </li>
              <li>
                <Icon name="film" size={14} /> {t('home.feature.timeline')}
              </li>
              <li>
                <Icon name="download" size={14} /> {t('home.feature.export')}
              </li>
            </ul>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="mock">
              <div className="mock-top">
                <span className="mock-dot" />
                <span className="mock-dot" />
                <span className="mock-dot" />
                <span className="mock-pill">{t('preview.title')}</span>
              </div>
              <div className="mock-stage">
                <div className="mock-frame">
                  <span className="mock-play">
                    <Icon name="play" size={18} />
                  </span>
                </div>
              </div>
              <div className="mock-timeline">
                {[
                  ['#ffb245', 26],
                  ['#5b6cff', 44],
                  ['#a06bff', 18],
                  ['#22c9a0', 34],
                ].map(([color, size], i) => (
                  <div className="mock-row" key={i}>
                    <span className="mock-clip" style={{ background: color as string, width: `${size as number}%` }} />
                    <span className="mock-clip" style={{ background: color as string, width: `${100 - (size as number) - 10}%`, opacity: 0.55 }} />
                  </div>
                ))}
                <div className="mock-playhead" />
              </div>
            </div>
          </div>
        </section>

        <section className="home-section" aria-labelledby="recent-heading">
          <div className="section-head-row">
            <div>
              <h2 id="recent-heading">{t('home.recent')}</h2>
              <p className="section-sub">{t('home.recentSub')}</p>
            </div>
            <div className="section-tools">
              <SearchInput value={query} onChange={setQuery} placeholder={t('home.search')} />
              <Button variant="secondary" icon="plus" onClick={() => openDialog('new')}>
                {t('home.newProject')}
              </Button>
            </div>
          </div>

          {error ? (
            <Note kind="error" title={t('error.storage')}>
              {t('error.storageDesc')}
              <div className="note-actions">
                <Button size="sm" icon="refresh" onClick={() => void refreshProjects()}>
                  {t('common.retry')}
                </Button>
              </div>
            </Note>
          ) : null}

          <div className="projects-grid">
            {loading ? (
              <>
                <ProjectSkeleton />
                <ProjectSkeleton />
                <ProjectSkeleton />
              </>
            ) : filtered.length ? (
              filtered.map((meta) => <ProjectCard key={meta.id} meta={meta} />)
            ) : projects.length && query ? (
              <EmptyState icon="search" title={t('home.searchEmpty', { q: query })} compact />
            ) : null}
          </div>

          {!loading && !projects.length && !error ? (
            <div className="home-empty">
              <EmptyState
                icon="film"
                title={t('home.emptyTitle')}
                description={t('home.emptyDesc')}
                action={
                  <>
                    <Button variant="primary" icon="plus" onClick={() => openDialog('new')}>
                      {t('home.emptyCta')}
                    </Button>
                    <Button variant="ghost" icon="sparkles" onClick={() => void openTemplate(DEMO_ID)}>
                      {t('home.tryDemo')}
                    </Button>
                  </>
                }
              />
            </div>
          ) : null}
        </section>

        <section className="home-section" aria-labelledby="templates-heading">
          <div className="section-head-row">
            <div>
              <h2 id="templates-heading">{t('home.templates')}</h2>
              <p className="section-sub">{t('home.templatesSub')}</p>
            </div>
            <div className="chip-row" role="tablist" aria-label={t('media.filters')}>
              {tags.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={tag === item}
                  className={`chip ${tag === item ? 'is-active' : ''}`}
                  onClick={() => setTag(item)}
                >
                  {item === 'all' ? t('common.all') : t(item)}
                </button>
              ))}
            </div>
          </div>
          <div className="templates-grid">
            {shownTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </section>

        <section className="home-section">
          <h2>{t('home.featuresTitle')}</h2>
          <div className="feature-grid">
            {[
              { icon: 'layers', title: 'home.feature.timeline', desc: 'home.feature.timelineDesc' },
              { icon: 'palette', title: 'home.feature.color', desc: 'home.feature.colorDesc' },
              { icon: 'text', title: 'home.feature.text', desc: 'home.feature.textDesc' },
              { icon: 'waveform', title: 'home.feature.audio', desc: 'home.feature.audioDesc' },
              { icon: 'download', title: 'home.feature.export', desc: 'home.feature.exportDesc' },
              { icon: 'shield', title: 'home.feature.privacy', desc: 'home.feature.privacyDesc' },
            ].map((feature) => (
              <div className="feature-card" key={feature.title}>
                <span className="feature-icon">
                  <Icon name={feature.icon as never} size={18} />
                </span>
                <h3>{t(feature.title)}</h3>
                <p>{t(feature.desc)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="home-section storage-card">
          <div className="storage-copy">
            <h2>{t('home.storage')}</h2>
            <p>{t('home.storageDesc')}</p>
            {storage.supported ? (
              <div className="storage-usage">
                <div className="storage-bar">
                  <span style={{ width: `${Math.max(1.5, storagePct)}%` }} />
                </div>
                <p className="storage-line">
                  {t('home.storageUsage', { used: formatBytes(storage.usage), total: formatBytes(storage.quota) })}
                </p>
              </div>
            ) : (
              <p className="storage-line muted">{t('home.storageUnknown')}</p>
            )}
          </div>
          <div className="storage-actions">
            <Button variant="secondary" icon="settings" onClick={() => openDialog('settings')}>
              {t('settings.storage')}
            </Button>
            <Button variant="ghost" icon="shield" onClick={() => openDialog('capabilities')}>
              {t('common.capability')}
            </Button>
          </div>
        </section>
      </main>

      <footer className="home-foot">
        <p>{t('home.footerNote')}</p>
        <p className="home-foot-meta">
          editEZ · {t('app.demo')} · {lang === 'ar' ? 'يعمل محليًا' : 'Local-first'}
        </p>
      </footer>
    </div>
  );
}
