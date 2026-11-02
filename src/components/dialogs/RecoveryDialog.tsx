import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Button, Modal, Note } from '../ui';

export function RecoveryDialog() {
  const t = useT();
  const recovery = useStore((s) => s.recovery);
  const applyRecovery = useStore((s) => s.applyRecovery);
  const dismissRecovery = useStore((s) => s.dismissRecovery);

  if (!recovery) return null;
  const clips = recovery.doc.tracks.reduce((n, tr) => n + tr.clips.length, 0);

  return (
    <Modal
      title={t('editor.recoveryTitle')}
      subtitle={recovery.doc.name}
      onClose={dismissRecovery}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={dismissRecovery}>
            {t('editor.recoveryDiscard')}
          </Button>
          <Button variant="primary" icon="refresh" onClick={() => void applyRecovery()}>
            {t('editor.recoveryUse')}
          </Button>
        </>
      }
    >
      <Note kind="warn" title={t('editor.recovered')}>
        {t('editor.recoveryDesc', { name: recovery.doc.name })}
      </Note>
      <p className="confirm-desc">
        {t('home.clipCount', { n: clips })} · {t('settings.storageDesc')}
      </p>
    </Modal>
  );
}
