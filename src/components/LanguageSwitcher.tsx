import { useLang, useT } from '../i18n';
import { useStore } from '../store';
import { Icon } from './Icons';
import type { Lang } from '../types';

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const lang = useLang();
  const setLang = useStore((s) => s.setLang);
  const t = useT();

  const options: { id: Lang; label: string; short: string }[] = [
    { id: 'en', label: t('lang.en'), short: 'EN' },
    { id: 'ar', label: t('lang.ar'), short: 'ع' },
  ];

  return (
    <div className={`lang-switch ${compact ? 'lang-switch-compact' : ''}`} role="group" aria-label={t('lang.switch')}>
      <Icon name="globe" size={compact ? 14 : 15} className="lang-globe" />
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          lang={opt.id}
          className={`lang-option ${lang === opt.id ? 'is-active' : ''}`}
          onClick={() => setLang(opt.id)}
          aria-pressed={lang === opt.id}
          aria-label={opt.label}
          title={opt.label}
        >
          {compact ? opt.short : opt.label}
        </button>
      ))}
    </div>
  );
}
