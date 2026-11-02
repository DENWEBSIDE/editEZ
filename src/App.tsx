import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { useStore } from './store';
import { useDocumentLang, useT } from './i18n';
import { Home } from './pages/Home';
import { Auth } from './pages/Auth';
import { Editor } from './pages/Editor';
import { Toasts } from './components/Toasts';
import { NewProjectDialog } from './components/dialogs/NewProjectDialog';
import { SettingsDialog } from './components/dialogs/SettingsDialog';
import { ShortcutsDialog } from './components/dialogs/ShortcutsDialog';
import { OnboardingDialog } from './components/dialogs/OnboardingDialog';
import { GuideDialog } from './components/dialogs/GuideDialog';
import { CapabilitiesDialog } from './components/dialogs/CapabilitiesDialog';
import { RecoveryDialog } from './components/dialogs/RecoveryDialog';
import { ExportDialog } from './components/dialogs/ExportDialog';
import { SubsExportDialog } from './components/dialogs/SubsExportDialog';
import { AccountDialog } from './components/dialogs/AccountDialog';
import { ConfirmProvider } from './components/ui';
import { Icon, Logo } from './components/Icons';
import { Button } from './components/ui';

class ErrorBoundary extends Component<{ children: ReactNode; fallbackTitle: string; fallbackDesc: string; reload: string; details: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('editEZ error boundary', error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash">
        <div className="crash-card">
          <div className="crash-icon">
            <Icon name="alert" size={26} />
          </div>
          <h1>{this.props.fallbackTitle}</h1>
          <p>{this.props.fallbackDesc}</p>
          <details>
            <summary>{this.props.details}</summary>
            <pre>{String(this.state.error?.stack ?? this.state.error?.message ?? '')}</pre>
          </details>
          <Button variant="primary" icon="refresh" onClick={() => location.reload()}>
            {this.props.reload}
          </Button>
        </div>
      </div>
    );
  }
}

function Shell() {
  const boot = useStore((s) => s.boot);
  const booted = useStore((s) => s.booted);
  const view = useStore((s) => s.view);
  const dialog = useStore((s) => s.dialog);
  const project = useStore((s) => s.project);
  const openProject = useStore((s) => s.openProject);
  const t = useT();
  useDocumentLang();

  useEffect(() => {
    void (async () => {
      await boot();
      const match = location.hash.match(/^#\/editor\/([\w-]+)/);
      if (match) {
        const existing = useStore.getState().project;
        if (!existing || existing.id !== match[1]) await openProject(match[1]);
      } else {
        const state = useStore.getState();
        if (!state.onboardingSeen) state.openDialog('onboard');
      }
    })();
  }, [boot, openProject]);

  useEffect(() => {
    const onHash = () => {
      const match = location.hash.match(/^#\/editor\/([\w-]+)/);
      const state = useStore.getState();
      if (match) {
        if (state.project?.id !== match[1]) void state.openProject(match[1]);
      } else if (state.view === 'editor' && !state.exporting) {
        useStore.setState({ view: 'home', playing: false });
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (!booted) {
    return (
      <div className="splash" role="status" aria-live="polite">
        <div className="splash-logo">
          <Logo size={46} />
        </div>
        <p className="splash-title">editEZ</p>
        <p className="splash-sub">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <>
      {view === 'editor' && project ? <Editor /> : view === 'auth' ? <Auth /> : <Home />}
      {dialog === 'new' ? <NewProjectDialog /> : null}
      {dialog === 'settings' ? <SettingsDialog /> : null}
      {dialog === 'shortcuts' ? <ShortcutsDialog /> : null}
      {dialog === 'onboard' ? <OnboardingDialog /> : null}
      {dialog === 'capabilities' ? <CapabilitiesDialog /> : null}
      {dialog === 'guide' ? <GuideDialog /> : null}
      {dialog === 'recover' ? <RecoveryDialog /> : null}
      {dialog === 'export' && project ? <ExportDialog /> : null}
      {dialog === 'subsExport' ? <SubsExportDialog /> : null}
      {dialog === 'account' ? <AccountDialog /> : null}
      <Toasts />
    </>
  );
}

export default function App() {
  const t = useT();
  return (
    <ErrorBoundary
      fallbackTitle={t('error.title')}
      fallbackDesc={t('error.desc')}
      reload={t('error.reload')}
      details={t('error.details')}
    >
      <ConfirmProvider>
        <Shell />
      </ConfirmProvider>
    </ErrorBoundary>
  );
}
