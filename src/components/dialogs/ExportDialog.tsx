import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Button, Modal, Note, ProgressBar, Select, Toggle } from '../ui';
import { EXPORT_PRESETS, QUALITIES, FPS_OPTIONS } from '../../lib/presets';
import { contentEnd } from '../../lib/edits';
import { formatBytes, formatTimecode } from '../../lib/format';
import { exportVideo, formatFilename, mediaRecorderSupported, supportedFormats, ExportCancelled } from '../../lib/export';
import { copyText, isEmbeddedFrame, openBlobInTab, saveBlob } from '../../lib/download';
import { Icon } from '../Icons';
import type { TKey } from '../../i18n/en';

type Phase = 'config' | 'rendering' | 'done' | 'error';

export function ExportDialog() {
  const t = useT();
  const openDialog = useStore((s) => s.openDialog);
  const project = useStore((s) => s.project);
  const assets = useStore((s) => s.assets);
  const luts = useStore((s) => s.luts);
  const opts = useStore((s) => s.exportOptions);
  const setOpts = useStore((s) => s.setExportOptions);
  const setExporting = useStore((s) => s.setExporting);
  const toast = useStore((s) => s.toast);
  const downloadBackup = useStore((s) => s.downloadBackup);
  const saveNow = useStore((s) => s.saveNow);

  const [phase, setPhase] = useState<Phase>('config');
  const [progress, setProgress] = useState({ percent: 0, time: 0, total: 0 });
  const [result, setResult] = useState<{ url: string; blob: Blob; ext: string; size: number; duration: number } | null>(null);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveHint, setSaveHint] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);
  const lastPct = useRef(-1);

  const formats = useMemo(() => supportedFormats(), []);
  const hasWebm = formats.some((f) => f.kind === 'webm');
  const hasMp4 = formats.some((f) => f.kind === 'mp4');
  const duration = project ? contentEnd(project) : 0;
  const frames = Math.round(duration * opts.fps);
  const estBytes = useMemo(() => {
    const quality = QUALITIES.find((q) => q.id === opts.quality)?.factor ?? 1;
    const video = (opts.bitrate * quality * duration) / 8;
    const audio = opts.includeAudio ? (128_000 * duration) / 8 : 0;
    return Math.max(0, video + audio);
  }, [opts.bitrate, opts.quality, opts.includeAudio, duration]);

  const ext = opts.format === 'mp4' ? 'mp4' : opts.format === 'webm' ? 'webm' : formats[0]?.ext ?? 'webm';

  useEffect(() => {
    if (phase !== 'rendering') return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);

  useEffect(
    () => () => {
      if (result?.url) URL.revokeObjectURL(result.url);
    },
    [result]
  );

  const close = () => {
    if (phase === 'rendering') abortRef.current?.abort();
    setExporting(false);
    if (result?.url) URL.revokeObjectURL(result.url);
    openDialog(null);
  };

  const applyPreset = (id: string) => {
    const preset = EXPORT_PRESETS.find((p) => p.id === id);
    if (!preset) {
      setOpts({ presetId: 'custom' });
      return;
    }
    const base = (project?.name ?? 'editez-export').replace(/[^\w\u0600-\u06FF-]+/g, '-').toLowerCase();
    setOpts({
      presetId: id,
      width: preset.w,
      height: preset.h,
      fps: preset.fps,
      bitrate: preset.bitrate,
      filename: `${base}-${id}`,
    });
  };

  const start = async () => {
    if (!project) return;
    if (!mediaRecorderSupported()) {
      setError(t('error.unsupportedBrowser'));
      setPhase('error');
      return;
    }
    if (!duration) {
      toast('warn', t('export.noMedia'));
      return;
    }
    setPhase('rendering');
    setProgress({ percent: 0, time: 0, total: duration });
    lastPct.current = -1;
    setExporting(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const quality = QUALITIES.find((q) => q.id === opts.quality)?.factor ?? 1;
      const res = await exportVideo({
        project,
        assets,
        luts,
        width: opts.width,
        height: opts.height,
        fps: opts.fps,
        bitrate: opts.bitrate * quality,
        includeAudio: opts.includeAudio,
        format: opts.format === 'auto' ? 'auto' : (opts.format as 'webm' | 'mp4'),
        signal: controller.signal,
        onProgress: (p) => {
          const rounded = Math.floor(p.percent);
          if (rounded !== lastPct.current) {
            lastPct.current = rounded;
            setProgress(p);
          }
        },
      });
      setResult({ url: res.url, blob: res.blob, ext: res.ext, size: res.blob.size, duration: res.duration });
      setPhase('done');
      setExporting(false);
      toast('success', t('toast.exportDone'));
    } catch (e) {
      setExporting(false);
      if (e instanceof ExportCancelled) {
        setPhase('config');
        toast('info', t('export.cancelled'));
      } else {
        setError(e instanceof Error ? e.message : String(e));
        setPhase('error');
      }
    } finally {
      abortRef.current = null;
    }
  };

  const filename = formatFilename(opts.filename, result?.ext ?? ext);

  const save = async () => {
    if (!result) return;
    setSaving(true);
    setSaveHint('');
    try {
      const method = await saveBlob(result.blob, filename);
      if (method === 'cancelled') {
        setSaveHint(t('export.save.cancelled'));
      } else if (method === 'picker') {
        setSaveHint(t('export.save.saved'));
        toast('success', t('export.save.saved'));
      } else {
        setSaveHint(t('export.save.started'));
        setTimeout(() => {
          setSaveHint((prev) => (prev === t('export.save.started') ? t('export.save.ifNothing') : prev));
        }, 1600);
      }
    } catch {
      setSaveHint(t('export.save.blocked'));
    } finally {
      setSaving(false);
    }
  };

  const retryLighter = () => {
    setOpts({ width: 1280, height: 720, fps: 24, includeAudio: false, format: 'webm', quality: 'medium' });
    setError('');
    setPhase('config');
    toast('info', t('export.lighterReady'));
  };

  const errorHints: Record<string, string> = {
    unsupported: t('export.hint.unsupported'),
    'format-unsupported': t('export.hint.unsupported'),
    'empty-project': t('export.hint.empty'),
    'empty-recording': t('export.hint.emptyRecording'),
    'recorder-error': t('export.hint.recorder'),
  };

  if (!project) return null;

  const notes: { kind: 'warn' | 'info' | 'cap'; text: string }[] = [];
  if (!hasMp4) notes.push({ kind: 'warn', text: t('export.note.mp4Unavailable') });
  if (hasMp4) notes.push({ kind: 'info', text: t('export.note.mp4') });
  notes.push({ kind: 'info', text: t('export.note.realtime') });
  notes.push({ kind: 'cap', text: t('export.note.background') });
  if (opts.width >= 2560) notes.push({ kind: 'warn', text: t('export.note.storage') });
  if (!hasWebm && !hasMp4) notes.unshift({ kind: 'warn', text: t('error.unsupportedBrowserDesc') });

  return (
    <Modal
      title={phase === 'done' ? t('export.complete') : t('export.title')}
      subtitle={phase === 'done' ? t('export.completeDesc') : t('export.sub')}
      onClose={close}
      size="lg"
      dismissable={phase !== 'rendering'}
      footer={
        phase === 'config' ? (
          <>
            <Button variant="ghost" icon="save" onClick={() => void downloadBackup()}>
              {t('export.saveOnly')}
            </Button>
            <div className="spacer" />
            <Button variant="ghost" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" icon="download" onClick={() => void start()} disabled={!duration || !mediaRecorderSupported()}>
              {t('export.render')}
            </Button>
          </>
        ) : phase === 'rendering' ? (
          <>
            <div className="spacer" />
            <Button variant="danger" icon="close" onClick={() => abortRef.current?.abort()}>
              {t('export.cancel')}
            </Button>
          </>
        ) : phase === 'done' ? (
          <>
            <Button variant="ghost" icon="arrowLeft" onClick={close}>
              {t('export.backToEditor')}
            </Button>
            <div className="spacer" />
            <Button variant="secondary" icon="refresh" onClick={() => setPhase('config')}>
              {t('export.newExport')}
            </Button>
            <Button variant="primary" icon="download" loading={saving} onClick={() => void save()}>
              {t('export.download')}
            </Button>
          </>
        ) : (
          <>
            <div className="spacer" />
            <Button variant="secondary" onClick={close}>
              {t('common.close')}
            </Button>
            <Button variant="primary" icon="refresh" onClick={() => setPhase('config')}>
              {t('common.retry')}
            </Button>
          </>
        )
      }
    >
      {phase === 'config' ? (
        <div className="export-grid">
          <div className="export-main">
            <div className="field">
              <span className="field-label">{t('export.preset')}</span>
              <div className="chip-row">
                {EXPORT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`chip ${opts.presetId === preset.id ? 'is-active' : ''}`}
                    onClick={() => applyPreset(preset.id)}
                  >
                    {t(preset.label as TKey)}
                    {preset.heavy ? <span className="chip-note">{t('export.quality.max')}</span> : null}
                  </button>
                ))}
                <button
                  type="button"
                  className={`chip ${opts.presetId === 'custom' ? 'is-active' : ''}`}
                  onClick={() => setOpts({ presetId: 'custom' })}
                >
                  {t('export.preset.custom')}
                </button>
              </div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label className="field-label" htmlFor="ex-w">
                  {t('export.size')}
                </label>
                <div className="size-row">
                  <input
                    id="ex-w"
                    className="input"
                    type="number"
                    min={128}
                    max={3840}
                    step={2}
                    value={opts.width}
                    onChange={(e) =>
                      setOpts({ width: Math.max(128, Math.min(3840, parseInt(e.target.value, 10) || 1920)), presetId: 'custom' })
                    }
                  />
                  <span className="times">×</span>
                  <input
                    className="input"
                    type="number"
                    min={128}
                    max={3840}
                    step={2}
                    aria-label={t('aspect.height')}
                    value={opts.height}
                    onChange={(e) =>
                      setOpts({ height: Math.max(128, Math.min(3840, parseInt(e.target.value, 10) || 1080)), presetId: 'custom' })
                    }
                  />
                </div>
              </div>
              <Select label={t('export.fps')} value={String(opts.fps)} onChange={(v) => setOpts({ fps: parseInt(v, 10) })}>
                {FPS_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f} fps
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid-2">
              <Select label={t('export.quality')} value={opts.quality} onChange={(v) => setOpts({ quality: v })}>
                {QUALITIES.map((q) => (
                  <option key={q.id} value={q.id}>
                    {t(q.label)}
                  </option>
                ))}
              </Select>
              <Select
                label={t('export.format')}
                value={opts.format}
                onChange={(v) => setOpts({ format: v })}
              >
                <option value="auto">
                  {t('common.auto')} ({formats[0]?.label ?? '—'})
                </option>
                {hasWebm ? <option value="webm">WebM · VP9</option> : null}
                {hasMp4 ? <option value="mp4">MP4 · H.264</option> : null}
              </Select>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="ex-name">
                {t('export.filename')}
              </label>
              <div className="filename-row">
                <input
                  id="ex-name"
                  className="input"
                  value={opts.filename}
                  onChange={(e) => setOpts({ filename: e.target.value })}
                />
                <span className="filename-ext mono">.{ext}</span>
              </div>
            </div>

            <Toggle
              label={t('export.includeAudio')}
              checked={opts.includeAudio}
              hint={t('export.includeAudioDesc')}
              onChange={(v) => setOpts({ includeAudio: v })}
            />

            <div className="export-summary">
              <div>
                <span>{t('common.duration')}</span>
                <strong className="mono">{formatTimecode(duration, opts.fps, true)}</strong>
              </div>
              <div>
                <span>{t('unit.frames')}</span>
                <strong className="mono">{frames}</strong>
              </div>
              <div>
                <span>{t('export.estimate')}</span>
                <strong className="mono">{formatBytes(estBytes)}</strong>
              </div>
              <div>
                <span>{t('export.aspect')}</span>
                <strong className="mono">
                  {opts.width}×{opts.height}
                </strong>
              </div>
            </div>
          </div>

          <aside className="export-side">
            <div className="export-notes">
              {notes.map((note, i) => (
                <Note key={i} kind={note.kind}>
                  {note.text}
                </Note>
              ))}
            </div>
            <div className="export-support">
              <p className="field-label">{t('export.formatSupport')}</p>
              {formats.length ? (
                <ul className="support-list">
                  {formats.map((f) => (
                    <li key={f.mime}>
                      <Icon name="check" size={13} />
                      <span>{f.codec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Note kind="error">{t('error.unsupportedBrowser')}</Note>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {phase === 'rendering' ? (
        <div className="export-progress">
          <div className="export-progress-head">
            <div className="pulse-dot" />
            <p>{t('export.progress', { pct: Math.round(progress.percent), frame: Math.round((progress.time * opts.fps) | 0), total: frames })}</p>
          </div>
          <ProgressBar value={progress.percent} label={t('export.title')} />
          <div className="export-progress-meta">
            <span className="mono">
              {formatTimecode(progress.time, opts.fps, true)} / {formatTimecode(progress.total, opts.fps, true)}
            </span>
            <span>
              {opts.width}×{opts.height} · {opts.fps} fps · {ext.toUpperCase()}
            </span>
          </div>
          <Note kind="warn">{t('export.note.background')}</Note>
        </div>
      ) : null}

      {phase === 'done' && result ? (
        <div className="export-done">
          <video src={result.url} controls className="export-video" />
          <div className="export-done-meta">
            <div>
              <span>{t('common.name')}</span>
              <strong className="mono">{`${opts.filename}.${result.ext}`}</strong>
            </div>
            <div>
              <span>{t('common.size')}</span>
              <strong className="mono">{formatBytes(result.size)}</strong>
            </div>
            <div>
              <span>{t('common.duration')}</span>
              <strong className="mono">{formatTimecode(result.duration, opts.fps, true)}</strong>
            </div>
          </div>
          <div className="export-done-actions">
            <Button variant="primary" icon="download" loading={saving} onClick={() => void save()}>
              {t('export.download')}
            </Button>
            <Button
              variant="secondary"
              icon="external"
              onClick={() => {
                const win = openBlobInTab(result.blob);
                if (!win) setSaveHint(t('export.save.popupBlocked'));
              }}
            >
              {t('export.openAfter')}
            </Button>
            <Button variant="ghost" icon="share" onClick={() => void copyText(result.url).then((ok) => setSaveHint(ok ? t('export.save.copied') : t('export.save.blocked')))}>
              {t('export.copyLink')}
            </Button>
            <Button variant="ghost" icon="folder" onClick={() => void saveNow()}>
              {t('export.saveProject')}
            </Button>
          </div>
          {saveHint ? <Note kind="info">{saveHint}</Note> : null}
          {isEmbeddedFrame() ? <Note kind="warn">{t('export.save.embedded')}</Note> : null}
          <p className="export-filename mono">{filename}</p>
          <Note kind="cap" title={t('export.share')}>
            {t('export.shareNote')}
          </Note>
        </div>
      ) : null}

      {phase === 'error' ? (
        <div className="export-error">
          <Note kind="error" title={t('export.error')}>
            {t('export.errorDesc')}
            {errorHints[error] ? <p className="export-hint">{errorHints[error]}</p> : null}
            <div className="note-actions">
              <Button size="sm" variant="primary" icon="refresh" onClick={retryLighter}>
                {t('export.retryLighter')}
              </Button>
              <Button size="sm" variant="secondary" icon="save" onClick={() => void downloadBackup()}>
                {t('export.saveOnly')}
              </Button>
            </div>
            <details>
              <summary>{t('error.details')}</summary>
              <pre>{error}</pre>
            </details>
          </Note>
        </div>
      ) : null}
    </Modal>
  );
}
