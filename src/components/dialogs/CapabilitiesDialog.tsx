import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Badge, Modal, Note } from '../ui';
import { Icon, type IconName } from '../Icons';

export function CapabilitiesDialog() {
  const t = useT();
  const openDialog = useStore((s) => s.openDialog);

  const works: string[] = [
    'cap.works.1',
    'cap.works.2',
    'cap.works.3',
    'cap.works.4',
    'cap.works.5',
    'cap.works.6',
    'cap.works.7',
  ];
  const server: string[] = ['cap.server.1', 'cap.server.2', 'cap.server.3', 'cap.server.4'];
  const permission: string[] = ['cap.permission.1', 'cap.permission.2', 'cap.permission.3'];
  const paid: string[] = ['cap.paid.1', 'cap.paid.2', 'cap.paid.3'];

  return (
    <Modal title={t('cap.title')} subtitle={t('cap.intro')} onClose={() => openDialog(null)} size="lg">
      <div className="cap-strip">
        <span className="cap-pill cap-browser">
          <Icon name="monitor" size={14} /> {t('cap.browser')}
        </span>
        <span className="cap-pill cap-server">
          <Icon name="server" size={14} /> {t('cap.server')}
        </span>
        <span className="cap-pill cap-perm">
          <Icon name="permission" size={14} /> {t('cap.permission')}
        </span>
        <span className="cap-pill cap-paid">
          <Icon name="key" size={14} /> {t('cap.paid')}
        </span>
      </div>

      <section className="cap-section">
        <h3>
          <Badge tone="success" icon="check">
            {t('cap.works.title')}
          </Badge>
        </h3>
        <ul className="cap-list">
          {works.map((k) => (
            <li key={k}>
              <Icon name="check" size={14} className="cap-ok" />
              <span>{t(k)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="cap-section">
        <h3>
          <Badge tone="warn" icon="server">
            {t('cap.server.title')}
          </Badge>
        </h3>
        <ul className="cap-list">
          {server.map((k) => (
            <li key={k}>
              <Icon name="alert" size={14} className="cap-warn" />
              <span>{t(k)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid-2">
        <section className="cap-section">
          <h3>
            <Badge tone="info" icon="permission">
              {t('cap.permission.title')}
            </Badge>
          </h3>
          <ul className="cap-list">
            {permission.map((k) => (
              <li key={k}>
                <Icon name="info" size={14} className="cap-info" />
                <span>{t(k)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="cap-section">
          <h3>
            <Badge tone="danger" icon="key">
              {t('cap.paid.title')}
            </Badge>
          </h3>
          <ul className="cap-list">
            {paid.map((k) => (
              <li key={k}>
                <Icon name="close" size={14} className="cap-no" />
                <span>{t(k)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Note kind="cap" title={t('cap.formats.title')}>
        {t('cap.formats.desc')}
      </Note>
      <Note kind="cap" title={t('cap.perf.title')}>
        {t('cap.perf.desc')}
      </Note>
      <Note kind="cap" title={t('cap.storage.title')}>
        {t('cap.storage.desc')}
      </Note>
    </Modal>
  );
}
