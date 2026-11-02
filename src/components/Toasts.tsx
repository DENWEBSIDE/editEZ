import { useStore } from '../store';
import { Icon } from './Icons';
import { useT } from '../i18n';

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  const t = useT();

  return (
    <div className="toasts" role="region" aria-live="polite" aria-label={t('common.info')}>
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.kind}`} role="status">
          <span className="toast-icon">
            <Icon
              name={
                toast.kind === 'error'
                  ? 'alert'
                  : toast.kind === 'success'
                    ? 'check'
                    : toast.kind === 'warn'
                      ? 'alert'
                      : 'info'
              }
              size={16}
            />
          </span>
          <p className="toast-msg">{toast.message}</p>
          {toast.action && toast.actionLabel ? (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.action?.();
                dismiss(toast.id);
              }}
            >
              {toast.actionLabel}
            </button>
          ) : null}
          <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label={t('common.close')}>
            <Icon name="close" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
