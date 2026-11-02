import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Badge, Button, Field, Modal, Note, ProgressBar, useConfirm } from '../ui';
import { Icon } from '../Icons';
import { formatBytes, formatRelative } from '../../lib/format';

export function AccountDialog() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const session = useStore((s) => s.session);
  const cloudInfo = useStore((s) => s.cloudInfo);
  const cloudStatus = useStore((s) => s.cloudStatus);
  const lastCloudSync = useStore((s) => s.lastCloudSync);
  const storage = useStore((s) => s.storage);
  const openDialog = useStore((s) => s.openDialog);
  const goAuth = useStore((s) => s.goAuth);
  const syncNow = useStore((s) => s.syncNow);
  const refreshCloud = useStore((s) => s.refreshCloud);
  const updateAccountName = useStore((s) => s.updateAccountName);
  const setCloudEndpoint = useStore((s) => s.setCloudEndpoint);
  const removeAccount = useStore((s) => s.removeAccount);
  const signOutUser = useStore((s) => s.signOutUser);
  const confirm = useConfirm();

  const [name, setName] = useState(session?.name ?? '');
  const [endpoint, setEndpoint] = useState(cloudInfo?.endpoint ?? '');
  const [password, setPassword] = useState('');

  useEffect(() => {
    void refreshCloud();
  }, [refreshCloud]);

  useEffect(() => {
    setEndpoint(cloudInfo?.endpoint ?? '');
  }, [cloudInfo?.endpoint]);

  const close = () => openDialog(null);
  const storagePct = storage.quota > 0 ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;

  if (!session) {
    return (
      <Modal
        title={t('account.guestTitle')}
        subtitle={t('account.guestDesc')}
        onClose={close}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" icon="user" onClick={() => goAuth('signup')}>
              {t('auth.signUp')}
            </Button>
          </>
        }
      >
        <Note kind="info" title={t('auth.demoNote')}>
          {t('account.localNote')}
        </Note>
      </Modal>
    );
  }

  const initials = session.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <Modal
      title={t('account.title')}
      subtitle={t('account.subtitle')}
      onClose={close}
      size="md"
      footer={
        <>
          <span className="modal-hint">
            {cloudStatus === 'syncing' ? t('account.syncing') : lastCloudSync ? `${t('account.lastSync')}: ${formatRelative(lastCloudSync, lang, t)}` : t('account.never')}
          </span>
          <Button variant="ghost" onClick={close}>
            {t('common.close')}
          </Button>
        </>
      }
    >
      <div className="account-hero">
        <span className="account-avatar is-xl">{initials || <Icon name="user" size={20} />}</span>
        <div className="account-hero-copy">
          <strong>{session.name}</strong>
          <span>{session.email}</span>
          <small>{t('account.memberSince', { when: new Date(session.createdAt).toLocaleDateString(lang === 'ar' ? 'ar' : 'en') })}</small>
        </div>
        <Badge tone={cloudStatus === 'error' ? 'danger' : cloudStatus === 'synced' ? 'success' : 'info'}>
          {cloudStatus === 'error' ? t('cloud.error') : cloudStatus === 'synced' ? t('cloud.synced') : t('cloud.badge')}
        </Badge>
      </div>

      <section className="account-block">
        <h3>{t('account.profile')}</h3>
        <Field label={t('account.name')}>
          <div className="account-inline">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            <Button variant="secondary" icon="save" disabled={!name.trim() || name === session.name} onClick={() => void updateAccountName(name)}>
              {t('account.save')}
            </Button>
          </div>
        </Field>
        <Field label={t('account.email')}>
          <input className="input" value={session.email} dir="ltr" readOnly />
        </Field>
      </section>

      <section className="account-block">
        <div className="account-block-head">
          <h3>{t('account.cloud')}</h3>
          <Button size="sm" icon="refresh" loading={cloudStatus === 'syncing'} onClick={() => void syncNow()}>
            {t('account.syncNow')}
          </Button>
        </div>
        <div className="account-meters">
          <div className="account-meter">
            <span className="account-meter-label">
              <Icon name="cloud" size={14} /> {t('account.projects')}
            </span>
            <strong>{cloudInfo?.projects ?? 0}</strong>
          </div>
          <div className="account-meter">
            <span className="account-meter-label">
              <Icon name="database" size={14} /> {t('account.bytes')}
            </span>
            <strong>{formatBytes(cloudInfo?.bytes ?? 0)}</strong>
          </div>
          <div className="account-meter">
            <span className="account-meter-label">
              <Icon name="clock" size={14} /> {t('account.lastSync')}
            </span>
            <strong>{lastCloudSync ? formatRelative(lastCloudSync, lang, t) : t('account.never')}</strong>
          </div>
        </div>
        <p className="field-hint">{t('account.cloudDesc')}</p>
        {cloudInfo?.endpoint ? null : <Note kind="info">{t('account.localNote')}</Note>}
        <Field label={t('account.endpoint')} hint={t('account.endpointHint')}>
          <div className="account-inline">
            <input
              className="input"
              dir="ltr"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder={t('account.endpointPlaceholder')}
            />
            <Button variant="secondary" icon="server" onClick={() => void setCloudEndpoint(endpoint)}>
              {t('account.endpointSave')}
            </Button>
          </div>
        </Field>
      </section>

      <section className="account-block">
        <h3>{t('account.storage')}</h3>
        <p className="field-hint">{t('account.storageDesc')}</p>
        {storage.supported ? (
          <>
            <ProgressBar value={storagePct} />
            <p className="account-storage-line">
              {t('home.storageUsage', { used: formatBytes(storage.usage), total: formatBytes(storage.quota) })}
            </p>
          </>
        ) : (
          <p className="field-hint">{t('home.storageUnknown')}</p>
        )}
      </section>

      <section className="account-block is-danger">
        <h3>{t('account.danger')}</h3>
        <p className="field-hint">{t('account.deleteAccountDesc')}</p>
        <input
          className="input"
          type="password"
          dir="ltr"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('account.deletePassword')}
        />
        <div className="btn-row">
          <Button variant="secondary" icon="logOut" onClick={() => void signOutUser()}>
            {t('account.signOut')}
          </Button>
          <Button
            variant="danger"
            icon="trash"
            disabled={!password}
            onClick={() =>
              confirm({
                title: t('account.deleteAccount'),
                description: t('account.deleteAccountDesc'),
                confirmLabel: t('account.deleteAccount'),
                danger: true,
                onConfirm: () => void removeAccount(password),
              })
            }
          >
            {t('account.deleteAccount')}
          </Button>
        </div>
      </section>
    </Modal>
  );
}
