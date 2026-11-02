import { useEffect, useRef, useState } from 'react';
import { useStore, type PanelId } from '../store';
import { useT } from '../i18n';
import { TopBar } from '../components/editor/TopBar';
import { StatusBar } from '../components/editor/StatusBar';
import { Preview } from '../components/editor/Preview';
import { Timeline } from '../components/editor/Timeline';
import { MediaPanel } from '../components/editor/MediaPanel';
import { EffectsPanel } from '../components/editor/EffectsPanel';
import { TextPanel } from '../components/editor/TextPanel';
import { AudioPanel } from '../components/editor/AudioPanel';
import { SubtitlesPanel } from '../components/editor/SubtitlesPanel';
import { ColorPanel } from '../components/editor/ColorPanel';
import { ProjectPanel } from '../components/editor/ProjectPanel';
import { PropertiesPanel } from '../components/editor/PropertiesPanel';
import { MediaPreviewModal } from '../components/editor/MediaPreviewModal';
import { Icon, type IconName } from '../components/Icons';
import { Tip } from '../components/ui';
import type { TKey } from '../i18n/en';
import type { MobileTab } from '../store';

const PANELS: { id: PanelId; icon: IconName; label: TKey }[] = [
  { id: 'media', icon: 'film', label: 'panel.media' },
  { id: 'effects', icon: 'wand', label: 'panel.effects' },
  { id: 'text', icon: 'text', label: 'panel.text' },
  { id: 'audio', icon: 'audio', label: 'panel.audio' },
  { id: 'subtitles', icon: 'subtitle', label: 'panel.subtitles' },
  { id: 'color', icon: 'palette', label: 'panel.color' },
  { id: 'project', icon: 'settings', label: 'panel.settings' },
];

const MOBILE_TABS: { id: MobileTab; icon: IconName; label: TKey }[] = [
  { id: 'media', icon: 'film', label: 'panel.media' },
  { id: 'preview', icon: 'layers', label: 'mobile.edit' },
  { id: 'props', icon: 'sliders', label: 'mobile.props' },
];

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function Editor() {
  const t = useT();
  const panel = useStore((s) => s.panel);
  const setPanel = useStore((s) => s.setPanel);
  const mobileTab = useStore((s) => s.mobileTab);
  const setMobileTab = useStore((s) => s.setMobileTab);
  const projectName = useStore((s) => s.project?.name);
  const [previewAsset, setPreviewAsset] = useState<string | null>(null);
  const [split, setSplit] = useState(46);
  const splitRef = useRef<{ y: number; start: number } | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const origin = splitRef.current;
      if (!origin) return;
      const col = document.querySelector('.center-col');
      if (!col) return;
      const height = col.getBoundingClientRect().height || 600;
      const delta = ((origin.y - e.clientY) / height) * 100;
      setSplit(Math.max(26, Math.min(68, origin.start + delta)));
    };
    const onUp = () => {
      if (!splitRef.current) return;
      splitRef.current = null;
      document.body.classList.remove('is-resizing-tl');
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  useEffect(() => {
    const onPreview = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (typeof id === 'string') setPreviewAsset(id);
    };
    window.addEventListener('editez:preview-asset', onPreview);
    return () => window.removeEventListener('editez:preview-asset', onPreview);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const s = useStore.getState();
      if (s.dialog || s.exporting) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (key === ' ' || e.code === 'Space') {
        e.preventDefault();
        s.togglePlay();
        return;
      }
      if (!mod && key === 'arrowleft') {
        e.preventDefault();
        s.setPlayhead(Math.max(0, s.playhead - (e.shiftKey ? 1 : 1 / (s.project?.canvas.fps ?? 30))));
        return;
      }
      if (!mod && key === 'arrowright') {
        e.preventDefault();
        s.setPlayhead(s.playhead + (e.shiftKey ? 1 : 1 / (s.project?.canvas.fps ?? 30)));
        return;
      }
      if (!mod && key === 'home') {
        s.setPlayhead(0);
        return;
      }
      if (!mod && key === 'end') {
        s.setPlayhead(s.project?.duration ?? 0);
        return;
      }
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        s.redo();
        return;
      }
      if (mod && key === 's') {
        e.preventDefault();
        void s.saveNow();
        return;
      }
      if (mod && key === 'e') {
        e.preventDefault();
        s.openDialog('export');
        return;
      }
      if (mod && key === 'd') {
        e.preventDefault();
        s.duplicateSelection();
        return;
      }
      if (mod && key === 'c') {
        e.preventDefault();
        s.copySelection();
        return;
      }
      if (mod && key === 'v') {
        e.preventDefault();
        s.pasteClipboard();
        return;
      }
      if (mod && key === 'b') {
        e.preventDefault();
        s.splitAtPlayhead();
        return;
      }
      if (mod && key === 'g') {
        e.preventDefault();
        if (e.shiftKey) s.ungroupSelection();
        else s.groupSelection();
        return;
      }
      if (mod && key === 'a') {
        e.preventDefault();
        const ids = (s.project?.tracks ?? []).flatMap((tr) => tr.clips.map((c) => c.id));
        s.setSelection(ids);
        return;
      }
      if (mod && (key === '=' || key === '+')) {
        e.preventDefault();
        s.setZoom(Math.min(400, s.zoom * 1.3));
        return;
      }
      if (mod && key === '-') {
        e.preventDefault();
        s.setZoom(Math.max(8, s.zoom / 1.3));
        return;
      }
      if (key === 'delete' || key === 'backspace') {
        if (!s.selection.length) return;
        e.preventDefault();
        s.deleteSelection(e.shiftKey);
        return;
      }
      if (key === 'escape') {
        s.setSelection([]);
        s.setEyedropper(false);
        return;
      }
      if (key === '?' || (e.shiftKey && key === '/')) {
        s.openDialog('shortcuts');
        return;
      }
      if (key === 's' && !mod) {
        s.setTool('select');
        return;
      }
      if (key === 'c' && !mod) {
        s.setTool('razor');
        return;
      }
      if (key === 'm' && !mod) {
        s.addMarker();
        return;
      }
      if (key === 'f' && !mod) {
        window.dispatchEvent(new CustomEvent('editez:fit-timeline'));
        return;
      }
      if ((key === '=' || key === '+') && !mod) {
        s.setZoom(Math.min(400, s.zoom * 1.3));
        return;
      }
      if (key === '-' && !mod) {
        s.setZoom(Math.max(8, s.zoom / 1.3));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.title = projectName ? `${projectName} · editEZ` : 'editEZ';
  }, [projectName]);

  const PanelBody =
    panel === 'media'
      ? MediaPanel
      : panel === 'effects'
        ? EffectsPanel
        : panel === 'text'
          ? TextPanel
          : panel === 'audio'
            ? AudioPanel
            : panel === 'subtitles'
              ? SubtitlesPanel
              : panel === 'color'
                ? ColorPanel
                : ProjectPanel;

  return (
    <div className={`editor mobile-${mobileTab}`}>
      <TopBar />

      <div className="editor-main">
        <nav className="rail" aria-label={t('panel.aria')}>
          {PANELS.map((item) => (
            <Tip key={item.id} label={t(item.label)} side="end">
              <button
                type="button"
                className={`rail-btn ${panel === item.id ? 'is-active' : ''}`}
                aria-pressed={panel === item.id}
                onClick={() => {
                  setPanel(item.id);
                  setMobileTab('media');
                }}
              >
                <Icon name={item.icon} size={18} />
                <span>{t(item.label)}</span>
              </button>
            </Tip>
          ))}
        </nav>

        <section className="left-col" aria-label={t('panel.aria')}>
          <PanelBody />
        </section>

        <div className="center-col" style={{ ['--tl-split' as string]: `${split}%` } as React.CSSProperties}>
          <Preview />
          <div
            className="tl-resizer"
            role="separator"
            aria-orientation="horizontal"
            aria-label={t('timeline.resize')}
            onPointerDown={(e) => {
              e.preventDefault();
              splitRef.current = { y: e.clientY, start: split };
              document.body.classList.add('is-resizing-tl');
            }}
            onDoubleClick={() => setSplit(46)}
          >
            <span />
          </div>
          <Timeline />
        </div>

        <aside className="right-col" aria-label={t('props.title')}>
          <PropertiesPanel />
        </aside>
      </div>

      <nav className="mobile-tabs" aria-label={t('panel.aria')}>
        {MOBILE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`mobile-tab ${mobileTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setMobileTab(tab.id)}
            aria-current={mobileTab === tab.id}
          >
            <Icon name={tab.icon} size={18} />
            <span>{t(tab.label)}</span>
          </button>
        ))}
      </nav>

      <StatusBar />
      <div className="editor-credit" aria-hidden="true">
        <span>© {new Date().getFullYear()}</span> Youssef Mosbeh
      </div>
      <MediaPreviewModal assetId={previewAsset} onClose={() => setPreviewAsset(null)} />
    </div>
  );
}
