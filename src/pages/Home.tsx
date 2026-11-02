import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeToggle } from '../components/ThemeToggle';
import { AccountMenu, SyncChip } from '../components/AccountMenu';
import { Badge, Button, EmptyState, Modal, Note, SearchInput, TextInput, useConfirm } from '../components/ui';
import { Icon, Logo } from '../components/Icons';
import { TEMPLATES, DEMO_ID } from '../lib/templates';
import { formatBytes, formatRelative, formatTimeShort } from '../lib/format';
import type { ProjectMeta } from '../types';

function ProjectCard({ meta }: { meta: ProjectMeta }) {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const session = useStore((s) => s.session);
  const openProject = useStore((s) => s.openProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const duplicateProject = useStore((s) => s.duplicateProject);
  const downloadBackup = useStore((s) => s.downloadBackup);
  const syncNow = useStore((s) => s.syncNow);
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

  const rename = () => {
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
  };

  return (
    <>
      <article className="project-card">
        <div
          className="project-thumb"
          role="button"
          tabIndex={0}
          onClick={() => void openProject(meta.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              void openProject(meta.id);
            }
          }}
          aria-label={`${t('common.open')} ${meta.name}`}
          style={meta.thumb ? { backgroundImage: `url(${meta.thumb})`, backgroundSize: 'cover' } : undefined}
        >
          {!meta.thumb ? (
            <span className="project-thumb-art" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          ) : null}
          <span className="project-play">
            <Icon name="play" size={10} /> {formatTimeShort(meta.duration || 0)}
          </span>
          <span className={`project-cloud ${session ? '' : 'is-local'}`} title={session ? t('cloud.synced') : t('cloud.local')}>
            <Icon name={session ? 'cloud' : 'cloudOff'} size={12} />
          </span>
          <button
            type="button"
            className={`project-more ${menu ? 'is-open' : ''}`}
            aria-label={t('common.more')}
            aria-expanded={menu}
            onClick={(e) => {
              e.stopPropagation();
              setMenu((m) => !m);
            }}
          >
            <Icon name="more" size={15} />
          </button>
        </div>

        <div className="project-card-body">
          <div className="pcard-title">
            <span>{meta.name}</span>
          </div>
          <div className="project-meta">
            <span>{formatRelative(meta.updatedAt, lang, t)}</span>
            <span className="dot" />
            <span>{t('home.clipCount', { n: meta.clipCount ?? 0 })}</span>
          </div>
          <div className="project-card-actions">
            <Button size="sm" variant="primary" icon="play" onClick={() => void openProject(meta.id)}>
              {t('home.open')}
            </Button>
            <Button size="sm" variant="ghost" icon="download" onClick={() => void downloadBackup(meta.id)} aria-label={t('settings.backup')} />
          </div>
        </div>

        <div ref={menuRef}>
          {menu ? (
            <div className="menu-pop" role="menu">
              <button role="menuitem" className="menu-item" onClick={() => { setMenu(false); void openProject(meta.id); }}>
                <Icon name="folder" size={15} />
                <span className="menu-label">{t('common.open')}</span>
              </button>
              <button role="menuitem" className="menu-item" onClick={() => { setMenu(false); setName(meta.name); setRenaming(true); }}>
                <Icon name="edit" size={15} />
                <span className="menu-label">{t('common.rename')}</span>
              </button>
              <button role="menuitem" className="menu-item" onClick={() => { setMenu(false); void duplicateProject(meta.id); }}>
                <Icon name="duplicate" size={15} />
                <span className="menu-label">{t('common.duplicate')}</span>
              </button>
              <button role="menuitem" className="menu-item" onClick={() => { setMenu(false); void downloadBackup(meta.id); }}>
                <Icon name="download" size={15} />
                <span className="menu-label">{t('settings.backup')}</span>
              </button>
              {session ? (
                <button role="menuitem" className="menu-item" onClick={() => { setMenu(false); void syncNow(); }}>
                  <Icon name="refresh" size={15} />
                  <span className="menu-label">{t('account.syncNow')}</span>
                </button>
              ) : null}
              <div className="menu-sep" />
              <button
                role="menuitem"
                className="menu-item is-danger"
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
                <span className="menu-label">{t('common.delete')}</span>
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
                  rename();
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
    <div className="project-skeleton" aria-hidden="true">
      <div className="skel skel-thumb" />
      <div className="skel-body">
        <div className="skel" style={{ height: 12, width: '70%' }} />
        <div className="skel" style={{ height: 10, width: '45%' }} />
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: (typeof TEMPLATES)[number] }) {
  const t = useT();
  const openTemplate = useStore((s) => s.openTemplate);
  const busy = useStore((s) => s.busy);
  const [starting, setStarting] = useState(false);
  return (
    <article className="tpl-card">
      <button
        type="button"
        className="tpl-art"
        style={{ background: template.art }}
        onClick={() => {
          setStarting(true);
          void openTemplate(template.id).finally(() => setStarting(false));
        }}
        disabled={!!busy}
        aria-label={`${t('home.useTemplate')} — ${t(template.name)}`}
      >
        <span className="tpl-art-inner">
          <span className="tpl-glyph" aria-hidden="true">
            <Icon name={template.h === template.w ? 'grid' : template.h > template.w ? 'film' : 'monitor'} size={22} />
          </span>
          <span className="tpl-aspect mono">
            {template.w}×{template.h}
          </span>
        </span>
        <span className="tpl-hover">
          {starting ? <Icon name="refresh" size={15} className="spin" /> : <Icon name="plus" size={15} />}
          {starting ? t('demo.loading') : t('home.useTemplate')}
        </span>
      </button>
      <div className="tpl-body">
        <h3>{t(template.name)}</h3>
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
  const session = useStore((s) => s.session);
  const cloudInfo = useStore((s) => s.cloudInfo);
  const storage = useStore((s) => s.storage);
  const busy = useStore((s) => s.busy);
  const openDialog = useStore((s) => s.openDialog);
  const openTemplate = useStore((s) => s.openTemplate);
  const openProject = useStore((s) => s.openProject);
  const goAuth = useStore((s) => s.goAuth);
  const refreshProjects = useStore((s) => s.refreshProjects);
  const importFiles = useStore((s) => s.importFiles);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string>('all');
  const fileRef = useRef<HTMLInputElement>(null);

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
  const totalClips = projects.reduce((n, p) => n + (p.clipCount ?? 0), 0);

  return (
    <div className="home">
      <header className="home-top">
        <button type="button" className="brand" onClick={() => void refreshProjects()}>
          <span className="brand-mark">
            <Logo size={22} />
          </span>
          <span className="brand-text">
            <span className="brand-name">editEZ</span>
            <span className="brand-tag">{t('app.tagline')}</span>
          </span>
        </button>

        <nav className="home-nav" aria-label={t('home.recent')}>
          <button type="button" className="is-active">
            {t('nav.home')}
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('templates-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            {t('nav.templates')}
          </button>
        </nav>

        <div className="home-top-actions">
          <ThemeToggle compact />
          <SyncChip />
          <LanguageSwitcher compact />
          <Button variant="primary" size="sm" icon="plus" onClick={() => openDialog('new')}>
            {t('home.newProject')}
          </Button>
          <AccountMenu />
        </div>
      </header>

      <main className="home-body">
        {!session ? (
          <div className="home-guest-banner">
            <Icon name="cloudOff" size={16} />
            <span>{t('home.guestBanner')}</span>
            <Button size="sm" variant="secondary" icon="user" onClick={() => goAuth('signup')}>
              {t('home.guestBannerCta')}
            </Button>
          </div>
        ) : null}

        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="badge badge-accent">
              <Icon name="sparkles" size={12} />
              {session ? t('cloud.synced') : t('home.badge')}
            </span>
            <h1>
              {t('home.title1')} <em>{t('home.titleAccent')}</em>
            </h1>
            <p>{t('home.subtitle')}</p>
            <div className="home-hero-actions">
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
            <div className="home-hero-stats">
              <div className="home-hero-stat">
                <strong>{projects.length}</strong>
                <span>{t('home.stats.projects')}</span>
              </div>
              <div className="home-hero-stat">
                <strong>{totalClips}</strong>
                <span>{t('home.stats.clips')}</span>
              </div>
              <div className="home-hero-stat">
                <strong>{cloudInfo?.projects ?? 0}</strong>
                <span>{t('home.stats.cloud')}</span>
              </div>
            </div>
          </div>
          <div className="home-hero-art" aria-hidden="true">
            <div className="hero-mock">
              <div className="hero-mock-screen">
                <Icon name="play" size={26} />
              </div>
              <div className="hero-mock-lanes">
                <span className="hero-mock-lane" />
                <span className="hero-mock-lane l2" />
                <span className="hero-mock-lane l3" />
              </div>
            </div>
          </div>
        </section>

        <section className="home-section" aria-label={t('home.quickTitle')}>
          <div className="quick-grid">
            <button type="button" className="quick-card" onClick={() => openDialog('new')}>
              <span className="quick-icon">
                <Icon name="plus" size={18} />
              </span>
              <span className="quick-copy">
                <span className="quick-title">{t('home.quickNew')}</span>
                <span className="quick-sub">{t('home.quickNewSub')}</span>
              </span>
            </button>
            <button type="button" className="quick-card is-alt" onClick={() => void openTemplate(DEMO_ID)}>
              <span className="quick-icon">
                <Icon name="sparkles" size={18} />
              </span>
              <span className="quick-copy">
                <span className="quick-title">{t('home.quickDemo')}</span>
                <span className="quick-sub">{t('home.quickDemoSub')}</span>
              </span>
            </button>
            <button type="button" className="quick-card" onClick={() => fileRef.current?.click()}>
              <span className="quick-icon">
                <Icon name="upload" size={18} />
              </span>
              <span className="quick-copy">
                <span className="quick-title">{t('home.quickImport')}</span>
                <span className="quick-sub">{t('home.quickImportSub')}</span>
              </span>
            </button>
            <button
              type="button"
              className="quick-card is-alt"
              onClick={() => (session ? openDialog('account') : goAuth('signup'))}
            >
              <span className="quick-icon">
                <Icon name={session ? 'cloud' : 'user'} size={18} />
              </span>
              <span className="quick-copy">
                <span className="quick-title">{session ? t('home.quickCloud') : t('auth.signUp')}</span>
                <span className="quick-sub">{session ? t('home.quickCloudSub') : t('home.cloudCardDesc')}</span>
              </span>
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="video/*,audio/*,image/*"
            hidden
            onChange={(e) => {
              if (e.target.files?.length) void importFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </section>

        <section className="home-steps" aria-labelledby="steps-heading">
          <div className="home-section-head">
            <h2 id="steps-heading">{t('home.stepsTitle')}</h2>
            <span className="count">{t('home.stepsSub')}</span>
          </div>
          <div className="steps-grid">
            {[
              { n: '1', icon: 'plus' as const, title: 'home.step1', desc: 'home.step1Desc', action: () => openDialog('new') },
              { n: '2', icon: 'upload' as const, title: 'home.step2', desc: 'home.step2Desc', action: () => fileRef.current?.click() },
              { n: '3', icon: 'download' as const, title: 'home.step3', desc: 'home.step3Desc', action: () => (projects[0] ? void openProject(projects[0].id) : openDialog('new')) },
            ].map((step) => (
              <button type="button" className="step-card" key={step.n} onClick={step.action}>
                <span className="step-num">{step.n}</span>
                <span className="step-icon">
                  <Icon name={step.icon} size={17} />
                </span>
                <span className="step-copy">
                  <span className="step-title">{t(step.title)}</span>
                  <span className="step-desc">{t(step.desc)}</span>
                </span>
                <Icon name="chevronRight" size={15} className="step-arrow" />
              </button>
            ))}
          </div>
        </section>

        <section className="home-section" aria-labelledby="recent-heading">
          <div className="home-section-head">
            <h2 id="recent-heading">{t('home.recent')}</h2>
            <span className="count">{filtered.length}</span>
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

          <div className="project-grid">
            {loading ? (
              <>
                <ProjectSkeleton />
                <ProjectSkeleton />
                <ProjectSkeleton />
              </>
            ) : filtered.length ? (
              filtered.map((meta) => <ProjectCard key={meta.id} meta={meta} />)
            ) : projects.length && query ? (
              <div className="project-empty">
                <EmptyState icon="search" title={t('home.searchEmpty', { q: query })} compact />
              </div>
            ) : !projects.length && !error ? (
              <div className="project-empty">
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
          </div>
        </section>

        <section className="home-section" aria-labelledby="templates-heading">
          <div className="home-section-head">
            <h2 id="templates-heading">{t('home.templates')}</h2>
            <div className="chip-row chip-row-scroll section-tools" role="tablist" aria-label={t('media.filters')}>
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
          <div className="tpl-grid">
            {shownTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </section>

        <section className="home-panels">
          <div className="panel-card">
            <div className="panel-card-head">
              <span className="panel-card-icon">
                <Icon name="database" size={17} />
              </span>
              <div>
                <h2>{t('home.storageCard')}</h2>
                <p>{t('home.storageCardDesc')}</p>
              </div>
            </div>
            {storage.supported ? (
              <>
                <div className="meter">
                  <span style={{ width: `${Math.max(1.5, storagePct)}%` }} />
                </div>
                <p className="meter-line">
                  {t('home.storageUsage', { used: formatBytes(storage.usage), total: formatBytes(storage.quota) })}
                </p>
              </>
            ) : (
              <p className="meter-line muted">{t('home.storageUnknown')}</p>
            )}
            <div className="panel-card-actions">
              <Button size="sm" variant="secondary" icon="settings" onClick={() => openDialog('settings')}>
                {t('home.manage')}
              </Button>
              <Button size="sm" variant="ghost" icon="shield" onClick={() => openDialog('capabilities')}>
                {t('common.capability')}
              </Button>
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-card-head">
              <span className="panel-card-icon is-alt">
                <Icon name={session ? 'cloud' : 'cloudOff'} size={17} />
              </span>
              <div>
                <h2>{t('home.cloudCardTitle')}</h2>
                <p>{t('home.cloudCardDesc')}</p>
              </div>
            </div>
            <div className="cloud-facts">
              <span>
                <b>{cloudInfo?.projects ?? 0}</b> {t('account.projects')}
              </span>
              <span>
                <b>{formatBytes(cloudInfo?.bytes ?? 0)}</b> {t('account.bytes')}
              </span>
            </div>
            <div className="panel-card-actions">
              {session ? (
                <Button size="sm" variant="primary" icon="user" onClick={() => openDialog('account')}>
                  {t('account.title')}
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="primary" icon="user" onClick={() => goAuth('signup')}>
                    {t('auth.signUp')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => goAuth('signin')}>
                    {t('auth.signIn')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        <footer className="home-foot">
          <p>{t('home.footer')}</p>
          <div className="home-foot-meta">
            <span>{lang === 'ar' ? 'يعمل محليًا أولًا' : 'Local-first'}</span>
            <span className="dot" />
            <span>{t('app.demo')}</span>
          </div>
        </footer>

        <div className="home-copyright">
          <span className="copyright-mark">©</span>
          <span className="copyright-year">{new Date().getFullYear()}</span>
          <span className="copyright-name">Youssef Mosbeh</span>
          <span className="dot" />
          <span>{t('brand.rights')}</span>
          <span className="copyright-brand">editEZ</span>
        </div>
      </main>
    </div>
  );
}
