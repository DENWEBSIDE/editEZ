import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icons';
import { useT } from '../i18n';

/* --------------------------------- tooltip ------------------------------ */

export function Tip({
  label,
  shortcut,
  children,
  side = 'top',
  inline,
}: {
  label: ReactNode;
  shortcut?: string;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'start' | 'end';
  inline?: boolean;
}) {
  const text = typeof label === 'string' ? label : '';
  return (
    <span className={`tip tip-${side} ${inline ? 'tip-inline' : ''}`}>
      {children}
      <span className="tip-bubble" role="tooltip" aria-label={text}>
        {label}
        {shortcut ? <kbd className="kbd tip-kbd">{shortcut}</kbd> : null}
      </span>
    </span>
  );
}

/* --------------------------------- button ------------------------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconEnd?: IconName;
  loading?: boolean;
  full?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconEnd,
  loading,
  full,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${full ? 'btn-full' : ''} ${loading ? 'is-loading' : ''} ${className}`}
      {...rest}
      aria-busy={loading || undefined}
    >
      {loading ? <Spinner size={size === 'sm' ? 13 : 15} /> : icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} /> : null}
      {children ? <span className="btn-label">{children}</span> : null}
      {iconEnd ? <Icon name={iconEnd} size={size === 'sm' ? 15 : 17} /> : null}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  shortcut?: string;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'danger' | 'accent';
  solid?: boolean;
}

export function IconButton({
  icon,
  label,
  shortcut,
  active,
  size = 'md',
  tone = 'default',
  solid,
  className = '',
  ...rest
}: IconButtonProps) {
  const btn = (
    <button
      type="button"
      className={`icon-btn icon-btn-${size} ${active ? 'is-active' : ''} ${solid ? 'is-solid' : ''} tone-${tone} ${className}`}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      {...rest}
    >
      <Icon name={icon} size={size === 'sm' ? 15 : size === 'lg' ? 21 : 18} />
    </button>
  );
  return (
    <Tip label={label} shortcut={shortcut}>
      {btn}
    </Tip>
  );
}

/* -------------------------------- spinner ------------------------------- */

export function Spinner({ size = 16 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} role="status" aria-label="loading" />;
}

/* --------------------------------- slider ------------------------------- */

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  onCommit,
  unit,
  format,
  disabled,
  hint,
  valueWidth = 58,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  onCommit?: () => void;
  unit?: string;
  format?: (v: number) => string;
  disabled?: boolean;
  hint?: string;
  valueWidth?: number;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={`slider ${disabled ? 'is-disabled' : ''}`} title={hint}>
      <div className="slider-head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="slider-value" style={{ minWidth: valueWidth }}>
          {format ? format(value) : `${Math.round(value * 1000) / 1000}${unit ? ` ${unit}` : ''}`}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        style={{ ['--pct' as string]: `${Math.max(0, Math.min(100, pct))}%` }}
        className="range"
      />
    </div>
  );
}

/* --------------------------------- number ------------------------------- */

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  unit,
  suffix,
  disabled,
  id: idProp,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  suffix?: string;
  disabled?: boolean;
  id?: string;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(Math.round(value * 1000) / 1000)), [value]);
  const commit = () => {
    const parsed = parseFloat(text);
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed));
      onChange(clamped);
      setText(String(clamped));
    } else {
      setText(String(value));
    }
  };
  return (
    <div className="field">
      {label ? (
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div className="number-wrap">
        <input
          id={id}
          type="number"
          className="input input-number"
          value={text}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            const parsed = parseFloat(e.target.value);
            if (Number.isFinite(parsed)) onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed)));
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
        />
        {unit || suffix ? <span className="number-unit">{unit ?? suffix}</span> : null}
      </div>
    </div>
  );
}

/* -------------------------------- select -------------------------------- */

export function Select({
  label,
  value,
  onChange,
  children,
  disabled,
  id: idProp,
  compact,
}: {
  label?: string;
  value: string | number;
  onChange: (v: string) => void;
  children: ReactNode;
  disabled?: boolean;
  id?: string;
  compact?: boolean;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className={`field ${compact ? 'field-compact' : ''}`}>
      {label ? (
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div className="select-wrap">
        <select
          id={id}
          className="input select"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
        <Icon name="chevronDown" size={14} className="select-chevron" />
      </div>
    </div>
  );
}

/* -------------------------------- toggle -------------------------------- */

export function Toggle({
  label,
  checked,
  onChange,
  hint,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`toggle-row ${disabled ? 'is-disabled' : ''}`} title={hint}>
      <span className="toggle-label">
        {label}
        {hint ? <span className="sr-only"> — {hint}</span> : null}
      </span>
      <span className={`switch ${checked ? 'is-on' : ''}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label}
        />
        <span className="switch-track">
          <span className="switch-thumb" />
        </span>
      </span>
    </label>
  );
}

/* -------------------------------- colors -------------------------------- */

export function ColorField({
  label,
  value,
  onChange,
  onPick,
  pickActive,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPick?: () => void;
  pickActive?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="color-wrap">
        <span className="color-swatch" style={{ background: value }} />
        <input
          id={id}
          className="input color-input"
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="color-hex mono">{value.toUpperCase()}</span>
        {onPick ? (
          <button
            type="button"
            className={`icon-btn icon-btn-sm ${pickActive ? 'is-active' : ''}`}
            onClick={onPick}
            aria-label="eyedropper"
            aria-pressed={pickActive}
          >
            <Icon name="eyedropper" size={15} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------ segmented ------------------------------- */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: IconName }[];
  label?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={`segmented segmented-${size}`} role="group" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`segment ${value === opt.value ? 'is-active' : ''}`}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon ? <Icon name={opt.icon} size={14} /> : null}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- modal -------------------------------- */

export function Modal({
  title,
  subtitle,
  children,
  footer,
  onClose,
  size = 'md',
  labelledBy,
  dismissable = true,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  labelledBy?: string;
  dismissable?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const t = useT();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusable = node?.querySelector<HTMLElement>(
      'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && node) {
        const items = Array.from(
          node.querySelectorAll<HTMLElement>('input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])')
        ).filter((el) => !el.hasAttribute('disabled'));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [onClose, dismissable]);

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && dismissable && onClose()}>
      <div
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? titleId}
        ref={ref}
      >
        <header className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <p className="modal-sub">{subtitle}</p> : null}
          </div>
          {dismissable ? (
            <IconButton icon="close" label={t('common.close')} onClick={onClose} size="sm" />
          ) : null}
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body
  );
}

/* -------------------------------- fieldset ------------------------------ */

export function Field({ label, hint, children, id }: { label?: string; hint?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <div className="field">
      {label ? (
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      {children}
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function Section({
  title,
  children,
  actions,
  open: openProp,
  dense,
  icon,
}: {
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  open?: boolean;
  dense?: boolean;
  icon?: IconName;
}) {
  const [open, setOpen] = useState(openProp ?? true);
  return (
    <section className={`sec ${open ? 'is-open' : ''} ${dense ? 'sec-dense' : ''}`}>
      <div className="sec-head">
        <button type="button" className="sec-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
          <Icon name="chevronRight" size={14} className="sec-chevron" />
          {icon ? <Icon name={icon} size={15} /> : null}
          <span>{title}</span>
        </button>
        {actions ? <div className="sec-actions">{actions}</div> : null}
      </div>
      {open ? <div className="sec-body">{children}</div> : null}
    </section>
  );
}

/* ------------------------------- empty state ---------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact,
}: {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`empty ${compact ? 'empty-compact' : ''}`}>
      <div className="empty-icon">
        <Icon name={icon} size={compact ? 20 : 26} />
      </div>
      <p className="empty-title">{title}</p>
      {description ? <p className="empty-desc">{description}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

/* --------------------------------- note --------------------------------- */

export function Note({
  kind = 'info',
  title,
  children,
  icon,
}: {
  kind?: 'info' | 'warn' | 'error' | 'success' | 'cap';
  title?: ReactNode;
  children?: ReactNode;
  icon?: IconName;
}) {
  const fallback: IconName = kind === 'warn' ? 'alert' : kind === 'error' ? 'alert' : kind === 'success' ? 'check' : 'info';
  return (
    <div className={`note note-${kind}`}>
      <Icon name={icon ?? fallback} size={15} />
      <div>
        {title ? <p className="note-title">{title}</p> : null}
        {children ? <div className="note-body">{children}</div> : null}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warn' | 'danger' | 'info';
  icon?: IconName;
}) {
  return (
    <span className={`badge badge-${tone}`}>
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

/* ---------------------------- confirm dialog ---------------------------- */

interface ConfirmState {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

const ConfirmContext = createContext<(state: ConfirmState) => void>(() => {});

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const t = useT();
  const open = useCallback((next: ConfirmState) => setState(next), []);
  const value = useMemo(() => open, [open]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        state.onConfirm();
        setState(null);
      }
      if (e.key === 'Escape') setState(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [state]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state ? (
        <Modal
          title={state.title}
          onClose={() => setState(null)}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setState(null)}>
                {state.cancelLabel ?? t('common.cancel')}
              </Button>
              <Button
                variant={state.danger ? 'danger' : 'primary'}
                onClick={() => {
                  state.onConfirm();
                  setState(null);
                }}
              >
                {state.confirmLabel ?? t('common.confirm')}
              </Button>
            </>
          }
        >
          {state.description ? <p className="confirm-desc">{state.description}</p> : null}
        </Modal>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

/* ------------------------------- misc bits ------------------------------ */

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  label,
  type = 'text',
  icon,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  type?: string;
  icon?: IconName;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div className="input-with-icon">
      {icon ? <Icon name={icon} size={15} /> : null}
      <input
        className="input"
        type={type}
        value={value}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="search">
      <Icon name="search" size={15} />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button type="button" className="search-clear" aria-label="clear" onClick={() => onChange('')}>
          <Icon name="close" size={13} />
        </button>
      ) : null}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
}: {
  tabs: { value: T; label: string; icon?: IconName; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={value === tab.value}
          className={`tab ${value === tab.value ? 'is-active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.icon ? <Icon name={tab.icon} size={14} /> : null}
          <span>{tab.label}</span>
          {tab.count !== undefined ? <span className="tab-count">{tab.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export { type SelectHTMLAttributes };
