import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Badge, Button, IconButton, Note, Select, Slider, Toggle } from '../ui';
import { Icon } from '../Icons';
import { VoiceRecorder, listMicrophones, resumeAudio } from '../../lib/audio';
import { assetFromBlob } from '../../lib/media';
import { MUSIC_LIBRARY, SFX_LIBRARY, generateMusic, generateSfx } from '../../lib/samples';
import { findClip } from '../../lib/edits';
import { defaultAudioFx } from '../../types';
import type { AudioFx } from '../../types';
import { formatSeconds } from '../../lib/format';

export function AudioPanel() {
  const t = useT();
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const mutate = useStore((s) => s.mutate);
  const addGeneratedAsset = useStore((s) => s.addGeneratedAsset);
  const addAssetToTimeline = useStore((s) => s.addAssetToTimeline);
  const toast = useStore((s) => s.toast);
  const playhead = useStore((s) => s.playhead);

  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const recordStartRef = useRef(0);

  const clip = useMemo(() => {
    if (!project || selection.length !== 1) return null;
    return findClip(project, selection[0])?.clip ?? null;
  }, [project, selection]);

  const isAudio = clip?.type === 'audio';
  const isVideoWithAudio = clip?.type === 'video';

  useEffect(() => {
    void (async () => {
      const devices = await listMicrophones();
      setMics(devices);
    })();
  }, []);

  const refreshMics = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => stream.getTracks().forEach((tr) => tr.stop()));
    } catch {
      /* permission may be denied — devices will still be listed without labels */
    }
    setMics(await listMicrophones());
  };

  useEffect(() => {
    const focus = () => {
      const el = document.querySelector('[data-voiceover-target]') as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('is-flash');
      // restart the highlight animation
      void el.offsetWidth;
      el.classList.add('is-flash');
      const btn = el.querySelector('.rec-btn') as HTMLElement | null;
      btn?.focus({ preventScroll: true });
    };
    window.addEventListener('editez:focus-voiceover', focus);
    return () => window.removeEventListener('editez:focus-voiceover', focus);
  }, []);

  const startRecording = async () => {
    setMicError(null);
    await resumeAudio();
    const rec = new VoiceRecorder();
    try {
      await rec.start(deviceId || undefined);
      recorderRef.current = rec;
      recordStartRef.current = useStore.getState().playhead;
      rec.onLevel = (v) => setLevel(v);
      rec.onTime = (v) => setElapsed(v);
      setRecording(true);
      toast('info', t('toast.recordingStarted'));
      if (!mics.length) void refreshMics();
    } catch (e) {
      const name = (e as Error)?.name ?? '';
      const message =
        name === 'NotAllowedError' || name === 'SecurityError'
          ? t('audio.micDenied')
          : name === 'NotFoundError'
            ? t('audio.micNotFound')
            : t('audio.micUnsupported');
      setMicError(message);
      toast('error', t('toast.micDenied'));
      recorderRef.current = null;
    }
  };

  const stopRecording = async () => {
    const rec = recorderRef.current;
    setRecording(false);
    setLevel(0);
    if (!rec) return;
    const result = await rec.stop();
    recorderRef.current = null;
    setElapsed(0);
    if (!result || result.blob.size < 400) {
      toast('warn', t('toast.recordingEmpty'));
      return;
    }
    try {
      const count = Object.values(useStore.getState().assets).filter((a) => a.source === 'record').length + 1;
      const name = `${t('media.recorded')} ${count}`;
      const { asset } = await assetFromBlob(result.blob, name, 'audio', {
        duration: result.duration,
        license: 'user',
        source: 'record',
      });
      useStore.getState().setPlayhead(recordStartRef.current);
      await addGeneratedAsset(asset, result.blob, { addToTimeline: true });
      toast('success', t('toast.recordingSaved'));
    } catch {
      toast('error', t('toast.recordingEmpty'));
    }
  };

  useEffect(
    () => () => {
      recorderRef.current?.cancel();
    },
    []
  );

  const patchAudio = (fn: (a: AudioFx) => void, coalesce?: string) => {
    if (!clip) return;
    mutate(
      (p) => {
        for (const track of p.tracks) {
          const c = track.clips.find((x) => x.id === clip.id);
          if (!c) continue;
          if (!c.audio) c.audio = defaultAudioFx();
          fn(c.audio);
        }
      },
      { coalesce }
    );
  };

  const generate = async (kind: 'music' | 'sfx', id: string, name: string) => {
    setGenerating(id);
    try {
      const blob = kind === 'music' ? await generateMusic(id as never, MUSIC_LIBRARY.find((m) => m.id === id)?.seconds ?? 16) : await generateSfx(id as never);
      const meta = MUSIC_LIBRARY.find((m) => m.id === id);
      const { asset } = await assetFromBlob(blob, `${name}.wav`, kind, {
        duration: meta?.seconds,
        license: 'demo-generated',
        source: 'generated',
      });
      await addGeneratedAsset(asset, blob);
      addAssetToTimeline(asset.id);
      toast('success', t('toast.audioAdded'));
    } catch {
      toast('error', t('toast.generated'));
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="panel-body">
      <div className="panel-head">
        <div>
          <h2>{t('audio.title')}</h2>
          <p className="panel-sub">{clip ? clip.name : t('audio.separateNote')}</p>
        </div>
        <Badge tone={recording ? 'danger' : 'neutral'} icon={recording ? 'mic' : undefined}>
          {recording ? t('audio.recording') : t('audio.voiceover')}
        </Badge>
      </div>

      <div className="panel-scroll">
        <section className="panel-section voice-section" id="voice-section" data-voiceover-target>
          <div className="panel-section-head">
            <h3>{t('audio.voiceover')}</h3>
          </div>
          {!VoiceRecorder.supported() ? (
            <Note kind="warn">{t('audio.micUnsupported')}</Note>
          ) : (
            <>
              <div className="mic-row">
                <Select
                  label={t('audio.mic')}
                  value={deviceId}
                  onChange={setDeviceId}
                  compact
                >
                  <option value="">{t('audio.micDefault')}</option>
                  {mics.map((mic, i) => (
                    <option key={mic.deviceId || i} value={mic.deviceId}>
                      {mic.label || `${t('audio.mic')} ${i + 1}`}
                    </option>
                  ))}
                </Select>
                <IconButton icon="refresh" label={t('audio.micRefresh')} size="sm" onClick={() => void refreshMics()} />
              </div>

              <div className={`recorder ${recording ? 'is-recording' : ''}`}>
                <button
                  type="button"
                  className={`rec-btn ${recording ? 'is-recording' : ''}`}
                  onClick={() => void (recording ? stopRecording() : startRecording())}
                  aria-label={recording ? t('audio.stop') : t('audio.record')}
                >
                  <Icon name={recording ? 'stop' : 'mic'} size={20} />
                </button>
                <div className="rec-info">
                  <p className="mono rec-time">{formatSeconds(elapsed, 1)}</p>
                  <div className="meter" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, level * 140)}%` }} />
                  </div>
                  <p className="rec-hint">{recording ? t('audio.recording') : t('audio.record')}</p>
                </div>
              </div>

              {micError ? <Note kind="error">{micError}</Note> : null}
              {recording ? <Note kind="info">{t('audio.monitorWarn')}</Note> : null}
              {!mics.length && !recording ? <Note kind="info">{t('audio.micPermission')}</Note> : null}
            </>
          )}
          <p className="field-hint">{t('audio.syncHint')}</p>
        </section>

        <section className="panel-section">
          <div className="panel-section-head">
            <h3>{t('lib.title')}</h3>
          </div>
          <div className="lib-list">
            {MUSIC_LIBRARY.slice(0, 2).map((item) => (
              <div className="lib-item" key={item.id}>
                <span className="lib-glyph">
                  <Icon name="music" size={14} />
                </span>
                <div className="lib-info">
                  <p>{item.name}</p>
                  <span className="mono">{item.bpm} BPM</span>
                </div>
                <Button size="sm" variant="ghost" icon="plus" loading={generating === item.id} onClick={() => void generate('music', item.id, item.name)}>
                  {t('lib.add')}
                </Button>
              </div>
            ))}
            {SFX_LIBRARY.slice(0, 2).map((item) => (
              <div className="lib-item" key={item.id}>
                <span className="lib-glyph">
                  <Icon name="waveform" size={14} />
                </span>
                <div className="lib-info">
                  <p>{item.name}</p>
                  <span className="mono">SFX</span>
                </div>
                <Button size="sm" variant="ghost" icon="plus" loading={generating === item.id} onClick={() => void generate('sfx', item.id, item.name)}>
                  {t('lib.add')}
                </Button>
              </div>
            ))}
          </div>
          <Note kind="cap">{t('audio.licenseInfo')}</Note>
        </section>

        {clip && (isAudio || isVideoWithAudio) ? (
          <section className="panel-section">
            <div className="panel-section-head">
              <h3>{t('props.section.audio')}</h3>
              <Badge tone="accent">{clip.name.slice(0, 16)}</Badge>
            </div>
            <Toggle label={t('audio.mute')} checked={clip.muted} onChange={(v) => mutate((p) => {
              for (const tr of p.tracks) {
                const c = tr.clips.find((x) => x.id === clip.id);
                if (c) c.muted = v;
              }
            })} />
            <Slider
              label={t('audio.clipVolume')}
              min={0}
              max={2}
              step={0.01}
              value={clip.audio?.gain ?? 1}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => patchAudio((a) => { a.gain = v; }, 'gain')}
            />
            <Slider
              label={t('audio.fadeIn')}
              min={0}
              max={Math.min(4, clip.duration)}
              step={0.05}
              value={clip.audio?.fadeIn ?? 0}
              format={(v) => `${v.toFixed(2)}s`}
              onChange={(v) => patchAudio((a) => { a.fadeIn = v; }, 'fin')}
            />
            <Slider
              label={t('audio.fadeOut')}
              min={0}
              max={Math.min(4, clip.duration)}
              step={0.05}
              value={clip.audio?.fadeOut ?? 0}
              format={(v) => `${v.toFixed(2)}s`}
              onChange={(v) => patchAudio((a) => { a.fadeOut = v; }, 'fout')}
            />
            <Toggle label={t('audio.loop')} checked={clip.audio?.loop ?? false} onChange={(v) => patchAudio((a) => { a.loop = v; })} />
            <Toggle
              label={t('audio.duck')}
              checked={clip.audio?.duck ?? false}
              hint={t('audio.duckHint')}
              onChange={(v) => patchAudio((a) => { a.duck = v; })}
            />
            {clip.audio?.duck ? (
              <Slider label={t('audio.duckAmount')} min={0} max={1} step={0.01} value={clip.audio?.duckAmount ?? 0.6} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patchAudio((a) => { a.duckAmount = v; }, 'duck')} />
            ) : null}

            <div className="panel-section-head">
              <h3>{t('audio.eq')}</h3>
            </div>
            <Slider label={t('effects.param.low')} min={-12} max={12} step={0.5} value={clip.audio?.eq.low ?? 0} unit="dB" onChange={(v) => patchAudio((a) => { a.eq.low = v; }, 'eql')} />
            <Slider label={t('effects.param.mid')} min={-12} max={12} step={0.5} value={clip.audio?.eq.mid ?? 0} unit="dB" onChange={(v) => patchAudio((a) => { a.eq.mid = v; }, 'eqm')} />
            <Slider label={t('effects.param.high')} min={-12} max={12} step={0.5} value={clip.audio?.eq.high ?? 0} unit="dB" onChange={(v) => patchAudio((a) => { a.eq.high = v; }, 'eqh')} />
            <Slider
              label={t('audio.noise')}
              min={0}
              max={1}
              step={0.01}
              value={clip.audio?.noiseReduction ?? 0}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => patchAudio((a) => { a.noiseReduction = v; }, 'nr')}
            />
            <Note kind="cap">{t('audio.noiseHint')}</Note>
          </section>
        ) : (
          <Note kind="info">{t('audio.separateNote')}</Note>
        )}
      </div>
    </div>
  );
}
