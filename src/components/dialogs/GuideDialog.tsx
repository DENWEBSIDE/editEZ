import { useMemo, useState } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Button, Modal, SearchInput } from '../ui';
import { Icon, type IconName } from '../Icons';

type Section = { id: string; icon: IconName; steps: number; tag?: 'new' };

const SECTIONS: Section[] = [
  { id: 'start', icon: 'upload', steps: 4 },
  { id: 'timeline', icon: 'layers', steps: 4 },
  { id: 'keyframe', icon: 'keyframe', steps: 4, tag: 'new' },
  { id: 'fx', icon: 'sparkles', steps: 4, tag: 'new' },
  { id: 'looks', icon: 'palette', steps: 3 },
  { id: 'text', icon: 'text', steps: 4, tag: 'new' },
  { id: 'audio', icon: 'mic', steps: 4 },
  { id: 'export', icon: 'download', steps: 5 },
];

export function GuideDialog() {
  const t = useT();
  const openDialog = useStore((s) => s.openDialog);
  const [active, setActive] = useState('start');
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter((s) => {
      const hay = [
        t(`guide.${s.id}.title`),
        t(`guide.${s.id}.intro`),
        ...Array.from({ length: s.steps }, (_, i) => t(`guide.${s.id}.s${i + 1}`)),
        t(`guide.${s.id}.tip`),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, t]);

  const current = sections.find((s) => s.id === active) ?? sections[0];

  return (
    <Modal
      title={t('guide.title')}
      subtitle={t('guide.sub')}
      onClose={() => openDialog(null)}
      size="lg"
      footer={
        <>
          <Button variant="ghost" icon="keyboard" onClick={() => openDialog('shortcuts')}>
            {t('shortcuts.title')}
          </Button>
          <Button variant="ghost" icon="sparkles" onClick={() => openDialog('capabilities')}>
            {t('cap.title')}
          </Button>
          <div className="spacer" />
          <Button variant="primary" icon="check" onClick={() => openDialog(null)}>
            {t('guide.close')}
          </Button>
        </>
      }
    >
      <div className="guide">
        <aside className="guide-nav">
          <SearchInput value={query} onChange={setQuery} placeholder={t('guide.search')} />
          <div className="guide-nav-list" role="tablist" aria-label={t('guide.title')}>
            {sections.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={current?.id === s.id}
                className={`guide-nav-item ${current?.id === s.id ? 'is-active' : ''}`}
                onClick={() => setActive(s.id)}
              >
                <span className="guide-nav-icon">
                  <Icon name={s.icon} size={15} />
                </span>
                <span className="guide-nav-text">{t(`guide.${s.id}.title`)}</span>
                {s.tag === 'new' ? <span className="guide-nav-tag">{t('guide.new')}</span> : null}
                <span className="guide-nav-num mono">{String(i + 1).padStart(2, '0')}</span>
              </button>
            ))}
            {!sections.length ? <p className="guide-empty">{t('guide.noResults')}</p> : null}
          </div>
        </aside>

        <div className="guide-body">
          {current ? (
            <>
              <header className="guide-head">
                <span className="guide-head-icon">
                  <Icon name={current.icon} size={22} />
                </span>
                <div>
                  <h3>{t(`guide.${current.id}.title`)}</h3>
                  <p>{t(`guide.${current.id}.intro`)}</p>
                </div>
              </header>
              <ol className="guide-steps">
                {Array.from({ length: current.steps }, (_, i) => (
                  <li key={i}>
                    <span className="guide-step-num mono">{i + 1}</span>
                    <span>{t(`guide.${current.id}.s${i + 1}`)}</span>
                  </li>
                ))}
              </ol>
              <div className="guide-tip">
                <Icon name="sparkles" size={14} />
                <span>{t(`guide.${current.id}.tip`)}</span>
              </div>
              {current.id === 'export' ? (
                <div className="guide-actions">
                  <Button size="sm" variant="secondary" icon="download" onClick={() => openDialog('export')}>
                    {t('editor.export')}
                  </Button>
                  <Button size="sm" variant="ghost" icon="keyboard" onClick={() => openDialog('shortcuts')}>
                    {t('shortcuts.title')}
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
