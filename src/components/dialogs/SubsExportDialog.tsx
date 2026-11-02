import { useState } from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { Button, Modal, Note, Select } from '../ui';
import { downloadText, toSrt, toVtt, type Cue } from '../../lib/subtitles';

export function SubsExportDialog() {
  const t = useT();
  const openDialog = useStore((s) => s.openDialog);
  const project = useStore((s) => s.project);
  const toast = useStore((s) => s.toast);
  const [format, setFormat] = useState<'srt' | 'vtt'>('srt');

  const cues: Cue[] = (project?.tracks.find((tr) => tr.kind === 'subtitle')?.clips ?? [])
    .map((clip) => ({ start: clip.start, end: clip.start + clip.duration, text: clip.text?.content ?? '' }))
    .filter((c) => c.text.trim().length > 0)
    .sort((a, b) => a.start - b.start);

  const download = () => {
    if (!cues.length) {
      toast('warn', t('subs.noSubs'));
      return;
    }
    const text = format === 'srt' ? toSrt(cues) : toVtt(cues);
    const base = (project?.name ?? 'subtitles').replace(/[^\w\u0600-\u06FF-]+/g, '-').toLowerCase();
    downloadText(`${base}.${format}`, text, format === 'srt' ? 'application/x-subrip' : 'text/vtt');
    toast('success', t('subs.exported'));
    openDialog(null);
  };

  return (
    <Modal
      title={t('subs.export')}
      subtitle={t('subs.count', { n: cues.length })}
      onClose={() => openDialog(null)}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => openDialog(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" icon="download" onClick={download}>
            {t('common.download')}
          </Button>
        </>
      }
    >
      <Select label={t('subs.exportFormat')} value={format} onChange={(v) => setFormat(v as 'srt' | 'vtt')}>
        <option value="srt">{t('subs.formatSrt')}</option>
        <option value="vtt">{t('subs.formatVtt')}</option>
      </Select>
      {cues.length ? (
        <div className="cue-preview">
          {cues.slice(0, 6).map((cue, i) => (
            <div key={i} className="cue-row">
              <span className="cue-time mono">
                {cue.start.toFixed(2)} → {cue.end.toFixed(2)}
              </span>
              <span className="cue-text">{cue.text}</span>
            </div>
          ))}
          {cues.length > 6 ? <p className="muted small">+{cues.length - 6}</p> : null}
        </div>
      ) : (
        <Note kind="warn">{t('subs.noSubs')}</Note>
      )}
    </Modal>
  );
}
