import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { Icon } from './Icons';
import { formatBytes } from '../lib/format';
import { Button } from './ui';

export function SyncChip({ compact }: { compact?: boolean }) {
  const t = useT();
  const session = useStore((s) => s.session);
  const status = useStore((s) => s.cloudStatus);
  const syncNow = useStore((s) => s.syncNow);

  if (!session) {
    return (
      <span className="sync-chip is-local" title={t('cloud.local')}>
        <Icon name="cloudOff" size={13} />
        {compact ? null : <span>{t('cloud.local')}</span>}
      </span>
    );
  }
  const label =
    status === 'syncing'
      ? t('cloud.syncing')
      : status === 'error'
        ? t('cloud.error')
        : status === 'synced'
          ? t('cloud.synced')
          : t('cloud.badge');
  return (
    <button
      type="button"
      className={`sync-chip st-${status}`}
      onClick={() => void syncNow()}
      title={`${label} — ${t('account.syncNow')}`}
    >
      <Icon name={status === 'syncing' ? 'refresh' : status === 'error' ? 'cloudOff' : 'cloud'} size={13} className={status === 'syncing' ? 'spin' : undefined} />
      {compact ? null : <span>{label}</span>}
    </button>
  );
}

export function AccountMenu() {
  const t = useT();
  const session = useStore((s) => s.session);
  const cloudInfo = useStore((s) => s.cloudInfo);
  const lastCloudSync = useStore((s) => s.lastCloudSync);
  const goAuth = useStore((s) => s.goAuth);
  const openDialog = useStore((s) => s.openDialog);
  const signOutUser = useStore((s) => s.signOutUser);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const initials = session
    ? session.name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
    : '';

  return (
    <div className="account-menu" ref={ref}>
      {session ? (
        <button
          type="button"
          className={`account-btn ${open ? 'is-open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('account.title')}
        >
          <span className="account-avatar">{initials || <Icon name="user" size={14} />}</span>
          <span className="account-name">{session.name}</span>
          <Icon name="chevronDown" size={13} />
        </button>
      ) : (
        <div className="account-guest">
          <Button variant="ghost" size="sm" onClick={() => goAuth('signin')}>
            {t('auth.signIn')}
          </Button>
          <Button variant="primary" size="sm" icon="user" onClick={() => goAuth('signup')}>
            {t('auth.signUp')}
          </Button>
        </div>
      )}
      {open ? (
        <div className="menu-pop account-pop" role="menu">
          <div className="account-pop-head">
            <span className="account-avatar is-lg">{initials || <Icon name="user" size={16} />}</span>
            <div className="account-pop-id">
              <strong>{session?.name}</strong>
              <span>{session?.email}</span>
            </div>
          </div>
          <div className="account-pop-stats">
            <span>
              <Icon name="cloud" size={12} /> {t('account.projects')}: <b>{cloudInfo?.projects ?? 0}</b>
            </span>
            <span>
              <Icon name="database" size={12} /> {formatBytes(cloudInfo?.bytes ?? 0)}
            </span>
          </div>
          <div className="menu-sep" />
          <button role="menuitem" className="menu-item" onClick={() => { setOpen(false); openDialog('account'); }}>
            <Icon name="user" size={15} />
            <span className="menu-label">{t('account.title')}</span>
          </button>
          <button role="menuitem" className="menu-item" onClick={() => { setOpen(false); openDialog('settings'); }}>
            <Icon name="settings" size={15} />
            <span className="menu-label">{t('common.settings')}</span>
          </button>
          <button role="menuitem" className="menu-item" onClick={() => { setOpen(false); openDialog('shortcuts'); }}>
            <Icon name="keyboard" size={15} />
            <span className="menu-label">{t('common.shortcuts')}</span>
          </button>
          <div className="menu-sep" />
          <button
            role="menuitem"
            className="menu-item is-danger"
            onClick={() => {
              setOpen(false);
              void signOutUser();
            }}
          >
            <Icon name="logOut" size={15} />
            <span className="menu-label">{t('account.signOut')}</span>
            {lastCloudSync ? <span className="menu-hint">{t('cloud.synced')}</span> : null}
          </button>
        </div>
      ) : null}
    </div>
  );
}
