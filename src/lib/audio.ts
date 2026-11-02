/* WebAudio plumbing: element routing, EQ, fades, ducking, WAV encoding. */

let sharedCtx: AudioContext | null = null;
let ctxFailed = false;

export function getAudioContext(): AudioContext | null {
  if (sharedCtx) return sharedCtx;
  if (ctxFailed || typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) {
    ctxFailed = true;
    return null;
  }
  try {
    sharedCtx = new Ctor({ latencyHint: 'interactive' });
    return sharedCtx;
  } catch {
    ctxFailed = true;
    return null;
  }
}

export async function resumeAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
}

interface Chain {
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  low: BiquadFilterNode;
  mid: BiquadFilterNode;
  high: BiquadFilterNode;
  hp: BiquadFilterNode;
}

/**
 * Routes <video>/<audio> elements through a small mixer so we can apply
 * per-clip volume, EQ, noise reduction and ducking, and capture the sum for export.
 */
export class AudioEngine {
  ctx: AudioContext | null;
  master: GainNode | null;
  private chains = new WeakMap<HTMLMediaElement, Chain>();
  private recordDest: MediaStreamAudioDestinationNode | null = null;
  private monitor = true;
  private volume = 1;

  constructor(opts: { monitor?: boolean } = {}) {
    this.ctx = getAudioContext();
    this.master = null;
    this.monitor = opts.monitor ?? true;
    if (this.ctx) {
      try {
        this.master = this.ctx.createGain();
        this.master.gain.value = opts.monitor ? 1 : 0;
        if (this.monitor) this.master.connect(this.ctx.destination);
      } catch {
        this.master = null;
      }
    }
  }

  get supported() {
    return !!this.ctx && !!this.master;
  }

  ensureChain(el: HTMLMediaElement): Chain | null {
    if (!this.ctx || !this.master) return null;
    const existing = this.chains.get(el);
    if (existing) return existing;
    try {
      const source = this.ctx.createMediaElementSource(el);
      const gain = this.ctx.createGain();
      const low = this.ctx.createBiquadFilter();
      low.type = 'lowshelf';
      low.frequency.value = 200;
      const mid = this.ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1200;
      mid.Q.value = 0.9;
      const high = this.ctx.createBiquadFilter();
      high.type = 'highshelf';
      high.frequency.value = 5000;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 20;
      source.connect(gain);
      gain.connect(low);
      low.connect(mid);
      mid.connect(high);
      high.connect(hp);
      hp.connect(this.master);
      const chain = { source, gain, low, mid, high, hp };
      this.chains.set(el, chain);
      return chain;
    } catch {
      return null;
    }
  }

  setGain(el: HTMLMediaElement, value: number) {
    const chain = this.ensureChain(el);
    if (!chain || !this.ctx) {
      // Fallback: no WebAudio — approximate with element volume.
      try {
        el.volume = Math.max(0, Math.min(1, value));
      } catch {
        /* ignore */
      }
      return;
    }
    const v = Math.max(0, Math.min(2, value));
    try {
      chain.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.012);
    } catch {
      chain.gain.gain.value = v;
    }
  }

  setEq(el: HTMLMediaElement, eq: { low: number; mid: number; high: number }) {
    const chain = this.ensureChain(el);
    if (!chain || !this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      chain.low.gain.setTargetAtTime(eq.low, t, 0.02);
      chain.mid.gain.setTargetAtTime(eq.mid, t, 0.02);
      chain.high.gain.setTargetAtTime(eq.high, t, 0.02);
    } catch {
      /* ignore */
    }
  }

  setNoiseReduction(el: HTMLMediaElement, amount: number) {
    const chain = this.ensureChain(el);
    if (!chain || !this.ctx) return;
    const freq = 20 + amount * 140;
    try {
      chain.hp.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
    } catch {
      /* ignore */
    }
  }

  setMasterVolume(v: number) {
    this.volume = v;
    this.applyRouting();
  }

  setMonitor(on: boolean) {
    this.monitor = on;
    this.applyRouting();
  }

  private applyRouting() {
    if (!this.master || !this.ctx) return;
    try {
      this.master.disconnect();
    } catch {
      /* already disconnected */
    }
    try {
      if (this.monitor) this.master.connect(this.ctx.destination);
      if (this.recordDest) this.master.connect(this.recordDest);
    } catch {
      /* ignore */
    }
    const target = Math.max(0, Math.min(1.5, this.volume));
    try {
      this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
    } catch {
      this.master.gain.value = target;
    }
  }

  /** Creates (once) an audio stream we can mux into an export. */
  createExportStream(): MediaStream | null {
    if (!this.ctx || !this.master) return null;
    try {
      if (!this.recordDest) this.recordDest = this.ctx.createMediaStreamDestination();
      this.applyRouting();
      return this.recordDest.stream;
    } catch {
      return null;
    }
  }

  releaseExportStream() {
    if (!this.recordDest || !this.master) return;
    try {
      this.master.disconnect(this.recordDest);
    } catch {
      /* ignore */
    }
  }
}

export function extractPeaks(buffer: AudioBuffer, count = 700): number[] {
  const channel = buffer.getChannelData(0);
  const block = Math.max(1, Math.floor(channel.length / count));
  const peaks: number[] = new Array(count);
  let max = 0.0001;
  for (let i = 0; i < count; i++) {
    let sum = 0;
    const start = i * block;
    const end = Math.min(channel.length, start + block);
    for (let j = start; j < end; j++) {
      const v = channel[j];
      sum += v * v;
    }
    const rms = Math.sqrt(sum / Math.max(1, end - start));
    peaks[i] = rms;
    if (rms > max) max = rms;
  }
  return peaks.map((p) => Math.round(Math.min(1, p / max) * 100) / 100);
}

export function peaksFromSamples(samples: Float32Array, count = 700): number[] {
  const block = Math.max(1, Math.floor(samples.length / count));
  const peaks: number[] = new Array(count);
  let max = 0.0001;
  for (let i = 0; i < count; i++) {
    let peak = 0;
    const start = i * block;
    const end = Math.min(samples.length, start + block);
    for (let j = start; j < end; j++) {
      const v = Math.abs(samples[j]);
      if (v > peak) peak = v;
    }
    peaks[i] = peak;
    if (peak > max) max = peak;
  }
  return peaks.map((p) => Math.round(Math.min(1, p / max) * 100) / 100);
}

/** Minimal 16-bit PCM WAV encoder (used for generated music / recordings). */
export function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = Math.min(2, buffer.numberOfChannels);
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2 + 44;
  const data = new ArrayBuffer(length);
  const view = new DataView(data);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, length - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length - 44, true);
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([data], { type: 'audio/wav' });
}

export function blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  if (!ctx) return Promise.reject(new Error('WebAudio unavailable'));
  return blob.arrayBuffer().then((buf) => ctx.decodeAudioData(buf));
}

/** Live microphone recorder used by the voiceover panel. */
export class VoiceRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  mimeType = '';
  onLevel: ((v: number) => void) | null = null;
  onTime: ((s: number) => void) | null = null;
  startedAt = 0;

  static supported(): boolean {
    return typeof MediaRecorder !== 'undefined' && !!(navigator.mediaDevices?.getUserMedia);
  }

  static async permissionState(): Promise<PermissionState | 'unknown'> {
    try {
      const status = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
      return status?.state ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async start(deviceId?: string): Promise<void> {
    if (!VoiceRecorder.supported()) throw new Error('unsupported');
    this.chunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    const mime = preferred.find((m) => {
      try {
        return MediaRecorder.isTypeSupported(m);
      } catch {
        return false;
      }
    });
    this.mimeType = mime ?? '';
    this.recorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) this.chunks.push(e.data);
    };
    this.recorder.start(200);
    this.startedAt = performance.now();

    const ctx = getAudioContext();
    if (ctx) {
      try {
        const src = ctx.createMediaStreamSource(this.stream);
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 1024;
        src.connect(this.analyser);
        const data = new Uint8Array(this.analyser.frequencyBinCount);
        const tick = () => {
          if (!this.analyser) return;
          this.analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128) / 128);
          this.onLevel?.(peak);
          this.onTime?.((performance.now() - this.startedAt) / 1000);
          this.raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        /* metering is optional */
      }
    }
  }

  async stop(): Promise<{ blob: Blob; duration: number } | null> {
    const rec = this.recorder;
    if (!rec) return null;
    const duration = (performance.now() - this.startedAt) / 1000;
    const done = new Promise<Blob | null>((resolve) => {
      rec.onstop = () => resolve(this.chunks.length ? new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' }) : null);
    });
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
    cancelAnimationFrame(this.raf);
    this.analyser = null;
    this.recorder = null;
    const blob = await done;
    this.stream?.getTracks().forEach((tr) => tr.stop());
    this.stream = null;
    if (!blob) return null;
    return { blob, duration: Math.max(0.2, duration) };
  }

  cancel() {
    try {
      this.recorder?.stop();
    } catch {
      /* ignore */
    }
    cancelAnimationFrame(this.raf);
    this.analyser = null;
    this.recorder = null;
    this.stream?.getTracks().forEach((tr) => tr.stop());
    this.stream = null;
  }
}

export async function listMicrophones(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'audioinput');
  } catch {
    return [];
  }
}
