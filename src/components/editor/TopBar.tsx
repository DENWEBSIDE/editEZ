import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Button, IconButton, Kbd, Tip } from '../ui';
import { Icon } from '../Icons';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { AccountMenu, SyncChip } from '../AccountMenu';
import { ThemeToggle } from '../ThemeToggle';
import { modKey } from '../../lib/format';

interface MenuItem {
  label: string;
  shortcut?: string;
  onSelect?: () => void;
  divider?: boolean;
  disabled?: boolean;
  checked?: boolean;
}

interface Menu {
  id: string;
  label: string;
  items: MenuItem[];
}

export function TopBar() {
  const t = useT();
  const project = useStore((s) => s.project);
  const renameProject = useStore((s) => s.renameProject);
  const saveStatus = useStore((s) => s.saveStatus);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const past = useStore((s) => s.past.length);
  const future = useStore((s) => s.future.length);
  const goHome = useStore((s) => s.goHome);
  const saveNow = useStore((s) => s.saveNow);
  const openDialog = useStore((s) => s.openDialog);
  const downloadBackup = useStore((s) => s.downloadBackup);
  const setPanel = useStore((s) => s.setPanel);
  const mutate = useStore((s) => s.mutate);

  const [open, setOpen] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [draftName, setDraftName] = useState(project?.name ?? '');

  useEffect(() => {
    setDraftName(project?.name ?? '');
  }, [project?.id]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!project) return null;

  const mod = modKey();
  const toggleSetting = (key: 'showGrid' | 'safeMargins' | 'snapping' | 'ripple') => {
    mutate((p) => {
      p.settings[key] = !p.settings[key];
    });
  };

  const menus: Menu[] = [
    {
      id: 'file',
      label: t('menu.file'),
      items: [
        { label: t('menu.newProject'), shortcut: `${mod} N`, onSelect: () => openDialog('new') },
        { label: t('menu.openProject'), shortcut: `${mod} O`, onSelect: goHome },
        { divider: true, label: '' },
        { label: t('menu.saveNow'), shortcut: `${mod} S`, onSelect: () => void saveNow() },
        { label: t('menu.backup'), onSelect: () => void downloadBackup(project.id) },
        { divider: true, label: '' },
        { label: t('menu.media'), onSelect: () => setPanel('media') },
        { label: t('menu.export'), shortcut: `${mod} E`, onSelect: () => openDialog('export') },
        { divider: true, label: '' },
        { label: t('menu.projectSettings'), onSelect: () => openDialog('settings') },
      ],
    },
    {
      id: 'edit',
      label: t('menu.edit'),
      items: [
        { label: t('common.undo'), shortcut: `${mod} Z`, onSelect: undo, disabled: past === 0 },
        { label: t('common.redo'), shortcut: `${mod} ⇧ Z`, onSelect: redo, disabled: future === 0 },
        { divider: true, label: '' },
        { label: t('menu.copy'), shortcut: `${mod} C`, onSelect: () => useStore.getState().copySelection() },
        { label: t('menu.paste'), shortcut: `${mod} V`, onSelect: () => useStore.getState().pasteClipboard() },
        { label: t('common.duplicate'), shortcut: `${mod} D`, onSelect: () => useStore.getState().duplicateSelection() },
        { label: t('menu.delete'), shortcut: 'Del', onSelect: () => useStore.getState().deleteSelection() },
        { label: t('menu.deleteRipple'), shortcut: '⇧ Del', onSelect: () => useStore.getState().deleteSelection(true) },
        { divider: true, label: '' },
        { label: t('timeline.splitAt'), shortcut: `${mod} B`, onSelect: () => useStore.getState().splitAtPlayhead() },
        { label: t('timeline.group'), shortcut: `${mod} G`, onSelect: () => useStore.getState().groupSelection() },
        { label: t('timeline.ungroup'), shortcut: `${mod} ⇧ G`, onSelect: () => useStore.getState().ungroupSelection() },
        { divider: true, label: '' },
        { label: t('menu.addMarker'), shortcut: 'M', onSelect: () => useStore.getState().addMarker() },
      ],
    },
    {
      id: 'view',
      label: t('menu.view'),
      items: [
        { label: t('menu.grid'), checked: project.settings.showGrid, onSelect: () => toggleSetting('showGrid') },
        { label: t('menu.safe'), checked: project.settings.safeMargins, onSelect: () => toggleSetting('safeMargins') },
        { label: t('menu.snapping'), checked: project.settings.snapping, onSelect: () => toggleSetting('snapping') },
        { label: t('menu.ripple'), checked: project.settings.ripple, onSelect: () => toggleSetting('ripple') },
        { divider: true, label: '' },
        { label: t('menu.centerPlayhead'), onSelect: () => window.dispatchEvent(new CustomEvent('editez:center-playhead')) },
        { label: t('menu.fitTimeline'), shortcut: 'F', onSelect: () => window.dispatchEvent(new CustomEvent('editez:fit-timeline')) },
        { label: t('menu.addTrack', { kind: t('track.video') }), onSelect: () => useStore.getState().addTrack('video') },
        { label: t('menu.addTrack', { kind: t('track.audio') }), onSelect: () => useStore.getState().addTrack('audio') },
      ],
    },
    {
      id: 'help',
      label: t('menu.help'),
      items: [
        { label: t('guide.title'), shortcut: '?', onSelect: () => openDialog('guide') },
        { label: t('shortcuts.title'), onSelect: () => openDialog('shortcuts') },
        { label: t('cap.title'), onSelect: () => openDialog('capabilities') },
        { label: t('menu.tour'), onSelect: () => openDialog('onboard') },
        { divider: true, label: '' },
        { label: t('menu.about'), onSelect: () => openDialog('capabilities') },
      ],
    },
  ];

  return (
    <header className="topbar" ref={barRef}>
      <div className="topbar-left">
        <Tip label={t('editor.back')}>
          <IconButton icon="arrowLeft" label={t('editor.back')} onClick={goHome} size="sm" />
        </Tip>
        <span className="logo-mark logo-mark-sm" aria-hidden="true">
          EZ
        </span>
        <div className="project-title">
          <input
            ref={nameRef}
            className="project-name"
            value={draftName}
            aria-label={t('project.name')}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => {
              const next = draftName.trim();
              if (next && next !== project.name) renameProject(next);
              else setDraftName(project.name);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') nameRef.current?.blur();
              if (e.key === 'Escape') {
                setDraftName(project.name);
                nameRef.current?.blur();
              }
            }}
          />
          <span className={`save-chip save-${saveStatus}`}>
            <span className="save-dot" aria-hidden="true" />
            {t(`editor.${saveStatus === 'dirty' ? 'unsaved' : saveStatus === 'saving' ? 'saving' : saveStatus === 'error' ? 'saveError' : 'saved'}`)}
          </span>
        </div>
      </div>

      <nav className="menubar" aria-label={t('menu.file')}>
        {menus.map((menu) => (
          <div className={`menu ${open === menu.id ? 'is-open' : ''}`} key={menu.id}>
            <button
              type="button"
              className="menu-btn"
              aria-haspopup="true"
              aria-expanded={open === menu.id}
              onClick={() => setOpen(open === menu.id ? null : menu.id)}
              onPointerEnter={() => open && setOpen(menu.id)}
            >
              {menu.label}
            </button>
            {open === menu.id ? (
              <div className="menu-pop" role="menu">
                {menu.items.map((item, i) =>
                  item.divider ? (
                    <div className="menu-sep" key={`sep-${i}`} />
                  ) : (
                    <button
                      key={`${menu.id}-${i}`}
                      type="button"
                      role="menuitem"
                      className="menu-item"
                      disabled={item.disabled}
                      onClick={() => {
                        setOpen(null);
                        item.onSelect?.();
                      }}
                    >
                      <span className="menu-check">{item.checked ? <Icon name="check" size={12} /> : null}</span>
                      <span className="menu-label">{item.label}</span>
                      {item.shortcut ? <Kbd>{item.shortcut}</Kbd> : null}
                    </button>
                  )
                )}
              </div>
            ) : null}
          </div>
        ))}
      </nav>

      <div className="topbar-right">
        <div className="topbar-group">
          <Tip label={`${t('common.undo')} · ${mod} Z`}>
            <IconButton icon="undo" label={t('common.undo')} size="sm" disabled={past === 0} onClick={undo} />
          </Tip>
          <Tip label={`${t('common.redo')} · ${mod} ⇧ Z`}>
            <IconButton icon="redo" label={t('common.redo')} size="sm" disabled={future === 0} onClick={redo} />
          </Tip>
        </div>
        <div className="topbar-group topbar-tools">
          <Tip label={t('timeline.splitAt')}>
            <IconButton icon="scissors" label={t('timeline.splitAt')} size="sm" onClick={() => useStore.getState().splitAtPlayhead()} />
          </Tip>
          <Tip label={t('common.duplicate')}>
            <IconButton icon="duplicate" label={t('common.duplicate')} size="sm" onClick={() => useStore.getState().duplicateSelection()} />
          </Tip>
          <Tip label={t('common.delete')}>
            <IconButton icon="trash" label={t('common.delete')} size="sm" onClick={() => useStore.getState().deleteSelection()} />
          </Tip>
          <Tip label={t('editor.voiceover')}>
            <IconButton
              icon="mic"
              label={t('editor.voiceover')}
              size="sm"
              className="voiceover-btn"
              onClick={() => {
                if (!navigator.mediaDevices?.getUserMedia) {
                  useStore.getState().toast('warn', t('editor.voiceoverUnavailable'));
                  return;
                }
                useStore.getState().setPanel('audio');
                window.setTimeout(() => window.dispatchEvent(new CustomEvent('editez:focus-voiceover')), 60);
              }}
            />
          </Tip>
        </div>
        <ThemeToggle compact />
        <SyncChip compact />
        <LanguageSwitcher compact />
        <Tip label={t('guide.title')}>
          <IconButton icon="help" label={t('guide.title')} size="sm" onClick={() => openDialog('guide')} />
        </Tip>
        <Button
          size="sm"
          variant="primary"
          icon="download"
          onClick={() => openDialog('export')}
          className="export-btn"
        >
          {t('editor.export')}
        </Button>
        <AccountMenu />
      </div>
    </header>
  );
}
