import { useMemo, useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { Icon, Logo } from '../components/Icons';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Spinner } from '../components/ui';
import { scorePassword } from '../lib/cloud';

export function Auth() {
  const t = useT();
  const mode = useStore((s) => s.authMode);
  const authBusy = useStore((s) => s.authBusy);
  const authError = useStore((s) => s.authError);
  const goAuth = useStore((s) => s.goAuth);
  const goHome = useStore((s) => s.goHome);
  const signInUser = useStore((s) => s.signInUser);
  const signUpUser = useStore((s) => s.signUpUser);
  const clearAuthError = useStore((s) => s.clearAuthError);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const isSignUp = mode === 'signup';
  const strength = useMemo(() => scorePassword(password), [password]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();
    if (isSignUp) {
      if (password !== confirm) {
        setLocalError(t('auth.mismatch'));
        return;
      }
      await signUpUser({ name, email, password });
    } else {
      await signInUser({ email, password });
    }
  };

  const error = localError ?? authError;

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-aside-inner">
          <button type="button" className="brand" onClick={goHome}>
            <span className="brand-mark">
              <Logo size={22} />
            </span>
            <span className="brand-text">
              <span className="brand-name">editEZ</span>
              <span className="brand-tag">Studio</span>
            </span>
          </button>

          <div style={{ marginTop: 34 }}>
            <span className="auth-badge">
              <Icon name="shield" size={12} /> {t('auth.demoNote')}
            </span>
            <h1 className="auth-headline" style={{ marginTop: 14 }}>
              {t('auth.asideTitle')}
            </h1>
            <p className="auth-sub">{t('auth.asideSub')}</p>
            <div className="auth-bullets">
              {[
                { icon: 'refresh' as const, key: 'auth.asideBullet1' },
                { icon: 'cloudOff' as const, key: 'auth.asideBullet2' },
                { icon: 'download' as const, key: 'auth.asideBullet3' },
              ].map((item) => (
                <div className="auth-bullet" key={item.key}>
                  <span className="auth-bullet-icon">
                    <Icon name={item.icon} size={15} />
                  </span>
                  {t(item.key)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="auth-preview" aria-hidden="true">
          <div className="auth-preview-bar">
            <span className="auth-preview-dot" />
            <span className="auth-preview-dot" />
            <span className="auth-preview-dot" />
          </div>
          <div className="auth-preview-lanes">
            <span className="auth-preview-lane" />
            <span className="auth-preview-lane l2" />
            <span className="auth-preview-lane l3" />
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-row">
            <span className="auth-lead" style={{ margin: 0 }}>
              {t('app.tagline')}
            </span>
            <LanguageSwitcher compact />
          </div>

          <div>
            <h1 className="auth-title">{isSignUp ? t('auth.titleSignUp') : t('auth.titleSignIn')}</h1>
            <p className="auth-lead" style={{ marginTop: 6 }}>
              {isSignUp ? t('auth.leadSignUp') : t('auth.leadSignIn')}
            </p>
          </div>

          {error ? (
            <div className="auth-error" role="alert">
              <Icon name="alert" size={15} />
              <span>{error}</span>
            </div>
          ) : null}

          <form className="auth-form" onSubmit={submit}>
            {isSignUp ? (
              <label className="field">
                <span className="field-label">{t('auth.name')}</span>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                  autoComplete="name"
                  required
                />
              </label>
            ) : null}

            <label className="field">
              <span className="field-label">{t('auth.email')}</span>
              <input
                className="input"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span className="field-label">{t('auth.password')}</span>
              <input
                className="input"
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                minLength={8}
                required
              />
              {isSignUp ? (
                <>
                  <span className={`auth-strength lvl-${strength.score}`} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="field-hint">
                    {t('auth.strength')}:{' '}
                    {strength.score >= 3 ? t('auth.strengthStrong') : strength.score === 2 ? t('auth.strengthOk') : t('auth.strengthWeak')}
                  </span>
                </>
              ) : null}
            </label>

            {isSignUp ? (
              <label className="field">
                <span className="field-label">{t('auth.confirm')}</span>
                <input
                  className="input"
                  type="password"
                  dir="ltr"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  autoComplete="new-password"
                  required
                />
              </label>
            ) : null}

            <button type="submit" className="btn btn-primary btn-lg btn-full auth-submit" disabled={authBusy}>
              {authBusy ? <Spinner size={16} /> : <Icon name={isSignUp ? 'user' : 'logOut'} size={17} />}
              <span className="btn-label">{authBusy ? t('auth.working') : isSignUp ? t('auth.submitSignUp') : t('auth.submitSignIn')}</span>
            </button>
          </form>

          <p className="auth-switch">
            {isSignUp ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
            <button type="button" onClick={() => goAuth(isSignUp ? 'signin' : 'signup')}>
              {isSignUp ? t('auth.signIn') : t('auth.signUp')}
            </button>
          </p>

          <div className="auth-divider">{t('common.or')}</div>

          <button type="button" className="btn btn-ghost btn-md btn-full" onClick={goHome}>
            <Icon name="arrowRight" size={16} />
            <span className="btn-label">{t('auth.guest')}</span>
          </button>

          <p className="auth-legal">{t('auth.legal')}</p>
        </div>
      </main>
    </div>
  );
}
