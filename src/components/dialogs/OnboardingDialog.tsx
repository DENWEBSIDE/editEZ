import { useState } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Button, Modal } from '../ui';
import { Icon, type IconName } from '../Icons';

const STEPS: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'upload', title: 'onboard.step1.title', desc: 'onboard.step1.desc' },
  { icon: 'layers', title: 'onboard.step2.title', desc: 'onboard.step2.desc' },
  { icon: 'palette', title: 'onboard.step3.title', desc: 'onboard.step3.desc' },
  { icon: 'mic', title: 'onboard.step4.title', desc: 'onboard.step4.desc' },
  { icon: 'download', title: 'onboard.step5.title', desc: 'onboard.step5.desc' },
];

export function OnboardingDialog() {
  const t = useT();
  const openDialog = useStore((s) => s.openDialog);
  const markSeen = useStore((s) => s.markOnboardingSeen);
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const close = () => {
    markSeen();
    openDialog(null);
  };

  return (
    <Modal
      title={t('onboard.title')}
      subtitle={t('onboard.sub')}
      onClose={close}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            {t('onboard.skip')}
          </Button>
          <div className="spacer" />
          <span className="onboard-step mono">{t('onboard.step', { n: step + 1, total: STEPS.length })}</span>
          {step > 0 ? (
            <Button variant="secondary" icon="chevronLeft" onClick={() => setStep(step - 1)}>
              {t('onboard.back')}
            </Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button variant="primary" iconEnd="chevronRight" onClick={() => setStep(step + 1)}>
              {t('onboard.next')}
            </Button>
          ) : (
            <Button variant="primary" icon="check" onClick={close}>
              {t('onboard.finish')}
            </Button>
          )}
        </>
      }
    >
      <div className="onboard">
        <div className={`onboard-art onboard-art-${step}`} aria-hidden="true">
          <span className="onboard-glyph">
            <Icon name={current.icon} size={30} />
          </span>
          <span className="onboard-ring" />
          <span className="onboard-ring ring-2" />
        </div>
        <div className="onboard-copy">
          <h3>{t(current.title)}</h3>
          <p>{t(current.desc)}</p>
          <div className="onboard-dots" role="presentation">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                className={`onboard-dot ${i === step ? 'is-active' : ''}`}
                aria-label={t('onboard.step', { n: i + 1, total: STEPS.length })}
                onClick={() => setStep(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
