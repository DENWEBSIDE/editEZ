import { useStore } from '../store';
import { useT } from '../i18n';
import { Icon } from './Icons';
import { Tip } from './ui';

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const t = useT();
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const dark = theme === 'dark';
  const label = dark ? t('theme.switchToLight') : t('theme.switchToDark');

  if (compact) {
    return (
      <Tip label={label}>
        <button
          type="button"
          className="icon-btn icon-btn-sm theme-toggle"
          onClick={toggleTheme}
          aria-label={label}
          aria-pressed={dark}
        >
          <Icon name={dark ? 'sun' : 'moon'} size={16} />
        </button>
      </Tip>
    );
  }

  return (
    <Tip label={label}>
      <button
        type="button"
        className={`theme-toggle theme-toggle-wide ${dark ? 'is-dark' : ''}`}
        onClick={toggleTheme}
        aria-label={label}
        aria-pressed={dark}
      >
        <span className="theme-toggle-track" aria-hidden="true">
          <span className="theme-toggle-thumb">{dark ? <Icon name="moon" size={12} /> : <Icon name="sun" size={12} />}</span>
        </span>
        <span className="theme-toggle-label">{dark ? t('theme.dark') : t('theme.light')}</span>
      </button>
    </Tip>
  );
}
