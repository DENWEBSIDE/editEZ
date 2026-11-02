/* Procedurally generated demo media: artwork stills, music beds, sound effects.
 * Everything is produced on-device so the demo ships without third-party assets
 * and without any licensing questions. */
import { encodeWav, getAudioContext } from './audio';

export type SceneKind =
  | 'mountain'
  | 'ocean'
  | 'city'
  | 'studio'
  | 'greenscreen'
  | 'abstract'
  | 'product'
  | 'portrait';

export interface GeneratedImage {
  blob: Blob;
  thumb: string;
  width: number;
  height: number;
}

const rng = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};

const canvasToBlob = (canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.9) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality);
  });

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  return { canvas, ctx };
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount = 12, seed = 7) {
  const img = ctx.getImageData(0, 0, w, h);
  const rand = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.45) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export async function generateScene(kind: SceneKind, w = 1600, h = 900, seed = 42): Promise<GeneratedImage> {
  const { canvas, ctx } = makeCanvas(w, h);
  const rand = rng(seed);
  const H = h;

  if (kind === 'mountain') {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#101a3c');
    sky.addColorStop(0.45, '#3c4f8a');
    sky.addColorStop(0.72, '#b76e79');
    sky.addColorStop(1, '#f0a878');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, H);
    const sun = ctx.createRadialGradient(w * 0.7, H * 0.62, 0, w * 0.7, H * 0.62, H * 0.4);
    sun.addColorStop(0, 'rgba(255,214,170,0.95)');
    sun.addColorStop(0.4, 'rgba(255,170,120,0.35)');
    sun.addColorStop(1, 'rgba(255,170,120,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, H);
    for (let layer = 0; layer < 3; layer++) {
      ctx.beginPath();
      ctx.moveTo(0, H);
      const baseY = H * (0.55 + layer * 0.13);
      for (let x = 0; x <= w; x += w / 14) {
        const y = baseY - Math.abs(Math.sin((x / w) * (2 + layer) + layer * 2)) * H * (0.24 - layer * 0.05) - rand() * H * 0.03;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, H);
      ctx.closePath();
      ctx.fillStyle = ['#2a2f57', '#1d2140', '#11142a'][layer];
      ctx.fill();
    }
    vignette(ctx, w, h, 0.35);
    grain(ctx, w, h, 10, seed);
  } else if (kind === 'ocean') {
    const sea = ctx.createLinearGradient(0, 0, 0, H);
    sea.addColorStop(0, '#0a1633');
    sea.addColorStop(0.4, '#123a5e');
    sea.addColorStop(0.62, '#0f6b7a');
    sea.addColorStop(1, '#04222b');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, w, H);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 240; i++) {
      const y = H * 0.45 + rand() * H * 0.55;
      const x = rand() * w;
      const len = 20 + rand() * 120;
      ctx.fillRect(x, y, len, 1 + rand() * 2);
    }
    const glow = ctx.createRadialGradient(w * 0.32, H * 0.5, 0, w * 0.32, H * 0.5, H * 0.5);
    glow.addColorStop(0, 'rgba(120,255,235,0.5)');
    glow.addColorStop(1, 'rgba(120,255,235,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, H);
    vignette(ctx, w, h, 0.4);
    grain(ctx, w, h, 8, seed + 3);
  } else if (kind === 'city') {
    ctx.fillStyle = '#070a18';
    ctx.fillRect(0, 0, w, H);
    const glow = ctx.createLinearGradient(0, H * 0.2, 0, H);
    glow.addColorStop(0, 'rgba(90,70,220,0.45)');
    glow.addColorStop(1, 'rgba(255,120,90,0.25)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, H);
    for (let layer = 0; layer < 3; layer++) {
      let x = -40;
      const color = ['#0c1024', '#0a0d1c', '#05070f'][layer];
      while (x < w) {
        const bw = 40 + rand() * 120;
        const bh = H * (0.2 + rand() * (0.45 - layer * 0.1));
        const y = H - bh;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, bw, bh);
        if (layer === 2) {
          ctx.fillStyle = 'rgba(255,196,120,0.75)';
          for (let wy = y + 12; wy < H - 14; wy += 18) {
            for (let wx = x + 8; wx < x + bw - 8; wx += 16) {
              if (rand() > 0.62) ctx.fillRect(wx, wy, 5, 7);
            }
          }
        }
        x += bw + 8;
      }
    }
    vignette(ctx, w, h, 0.5);
    grain(ctx, w, h, 12, seed + 9);
  } else if (kind === 'studio') {
    ctx.fillStyle = '#0b0d17';
    ctx.fillRect(0, 0, w, H);
    const beam = ctx.createRadialGradient(w * 0.42, H * 0.28, 0, w * 0.42, H * 0.3, H * 0.9);
    beam.addColorStop(0, 'rgba(124,92,255,0.55)');
    beam.addColorStop(0.5, 'rgba(56,225,200,0.18)');
    beam.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = beam;
    ctx.fillRect(0, 0, w, H);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(rand() * w, rand() * H, 1 + rand() * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    vignette(ctx, w, h, 0.6);
  } else if (kind === 'greenscreen') {
    ctx.fillStyle = '#00b140';
    ctx.fillRect(0, 0, w, H);
    const light = ctx.createRadialGradient(w * 0.45, H * 0.4, 0, w * 0.45, H * 0.45, Math.max(w, h) * 0.7);
    light.addColorStop(0, 'rgba(120,255,170,0.35)');
    light.addColorStop(1, 'rgba(0,120,60,0.25)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, H);
    // subject: a stylised presenter silhouette with warm rim light
    const cx = w * 0.5;
    const baseY = H * 0.94;
    const bodyW = w * 0.2;
    const bodyH = H * 0.42;
    const body = ctx.createLinearGradient(cx - bodyW, baseY - bodyH, cx + bodyW, baseY);
    body.addColorStop(0, '#f7b45f');
    body.addColorStop(0.55, '#e0644a');
    body.addColorStop(1, '#7b2f7a');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(cx - bodyW * 0.85, baseY);
    ctx.quadraticCurveTo(cx - bodyW * 0.95, baseY - bodyH * 0.62, cx - bodyW * 0.34, baseY - bodyH * 0.8);
    ctx.lineTo(cx + bodyW * 0.34, baseY - bodyH * 0.8);
    ctx.quadraticCurveTo(cx + bodyW * 0.95, baseY - bodyH * 0.62, cx + bodyW * 0.85, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f6c9a4';
    ctx.beginPath();
    ctx.ellipse(cx, baseY - bodyH * 0.98, bodyW * 0.36, bodyH * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1b2e';
    ctx.beginPath();
    ctx.ellipse(cx, baseY - bodyH * 1.06, bodyW * 0.38, bodyH * 0.2, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // rim light
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx + bodyW * 0.34, baseY - bodyH * 0.79);
    ctx.quadraticCurveTo(cx + bodyW * 0.95, baseY - bodyH * 0.6, cx + bodyW * 0.84, baseY);
    ctx.stroke();
  } else if (kind === 'product') {
    ctx.fillStyle = '#0a0b14';
    ctx.fillRect(0, 0, w, H);
    const glow = ctx.createRadialGradient(w * 0.5, H * 0.55, 0, w * 0.5, H * 0.55, H * 0.7);
    glow.addColorStop(0, 'rgba(255,178,69,0.35)');
    glow.addColorStop(0.4, 'rgba(124,92,255,0.16)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, H);
    const bw = w * 0.16;
    const bh = H * 0.44;
    const bx = w / 2 - bw / 2;
    const by = H * 0.5 - bh / 2 + 30;
    const bottle = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    bottle.addColorStop(0, '#f7e7c9');
    bottle.addColorStop(0.5, '#d9b98b');
    bottle.addColorStop(1, '#8a6b4a');
    ctx.fillStyle = bottle;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bw * 0.42);
    ctx.fill();
    ctx.fillStyle = '#1b1626';
    ctx.fillRect(bx + bw * 0.2, by + bh * 0.35, bw * 0.6, bh * 0.2);
    ctx.fillStyle = '#ffb245';
    ctx.fillRect(bx + bw * 0.3, by + bh * 0.42, bw * 0.4, bh * 0.03);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(bx + bw * 0.3, by + bh * 0.15, bw * 0.06, bh * 0.18, -0.2, 0, Math.PI * 2);
    ctx.fill();
    vignette(ctx, w, h, 0.55);
    grain(ctx, w, h, 14, seed + 21);
  } else if (kind === 'portrait') {
    const bg = ctx.createLinearGradient(0, 0, w, H);
    bg.addColorStop(0, '#1c1a33');
    bg.addColorStop(0.5, '#3a2547');
    bg.addColorStop(1, '#141422');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, H);
    for (let i = 0; i < 26; i++) {
      const r = 20 + rand() * 140;
      const g = ctx.createRadialGradient(rand() * w, rand() * H, 0, rand() * w, rand() * H, r);
      g.addColorStop(0, `rgba(255,${150 + rand() * 80},${100 + rand() * 90},0.16)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, H);
    }
    ctx.fillStyle = '#f2c6a0';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, H * 0.46, H * 0.16, H * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#26182b';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, H * 0.86, H * 0.34, H * 0.28, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#33202f';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, H * 0.32, H * 0.19, H * 0.15, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    vignette(ctx, w, h, 0.5);
    grain(ctx, w, h, 10, seed + 4);
  } else {
    // abstract
    ctx.fillStyle = '#080a12';
    ctx.fillRect(0, 0, w, H);
    const colors = ['#7c5cff', '#38e1c8', '#ffb245', '#ff5f8f'];
    for (let i = 0; i < 7; i++) {
      const x = rand() * w;
      const y = rand() * H;
      const r = Math.min(w, h) * (0.2 + rand() * 0.5);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, colors[i % colors.length] + 'cc');
      g.addColorStop(1, colors[i % colors.length] + '00');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, H);
    }
    ctx.filter = 'blur(30px)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
    vignette(ctx, w, h, 0.55);
  }

  const blob = await canvasToBlob(canvas);
  const thumbCanvas = makeCanvas(360, Math.round((360 / w) * h));
  thumbCanvas.ctx.drawImage(canvas, 0, 0, thumbCanvas.canvas.width, thumbCanvas.canvas.height);
  return {
    blob,
    thumb: thumbCanvas.canvas.toDataURL('image/jpeg', 0.7),
    width: w,
    height: h,
  };
}

/* ------------------------------- music --------------------------------- */

export type MusicKind = 'upbeat' | 'ambient' | 'corporate' | 'lofi';

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

function schedulePad(ctx: OfflineAudioContext, master: AudioNode, when: number, dur: number, notes: number[], gain = 0.09) {
  for (const note of notes) {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc2.type = 'triangle';
    osc.frequency.value = midi(note);
    osc2.frequency.value = midi(note) * 1.005;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    filter.Q.value = 0.6;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.6);
    g.gain.linearRampToValueAtTime(gain * 0.8, when + dur - 0.8);
    g.gain.linearRampToValueAtTime(0, when + dur);
    osc.connect(g).connect(filter).connect(master);
    osc2.connect(g);
    osc.start(when);
    osc2.start(when);
    osc.stop(when + dur + 0.1);
    osc2.stop(when + dur + 0.1);
  }
}

function schedulePluck(ctx: OfflineAudioContext, master: AudioNode, when: number, note: number, gain = 0.16, decay = 0.45) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3200, when);
  filter.frequency.exponentialRampToValueAtTime(900, when + decay);
  osc.type = 'triangle';
  osc.frequency.value = midi(note);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0008, when + decay);
  osc.connect(g).connect(filter).connect(master);
  osc.start(when);
  osc.stop(when + decay + 0.05);
}

function scheduleKick(ctx: OfflineAudioContext, master: AudioNode, when: number, gain = 0.5) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, when);
  osc.frequency.exponentialRampToValueAtTime(46, when + 0.14);
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.32);
  osc.connect(g).connect(master);
  osc.start(when);
  osc.stop(when + 0.35);
}

function scheduleHat(ctx: OfflineAudioContext, buffer: AudioBuffer, master: AudioNode, when: number, gain = 0.08) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain();
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7000;
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.0005, when + 0.06);
  src.connect(hp).connect(g).connect(master);
  src.start(when, 0, 0.08);
}

export async function generateMusic(kind: MusicKind = 'upbeat', seconds = 16): Promise<Blob> {
  const Ctor = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!Ctor) throw new Error('OfflineAudioContext unavailable');
  const sampleRate = 32000;
  const ctx = new Ctor(1, Math.floor(sampleRate * seconds), sampleRate);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);

  const noise = ctx.createBuffer(1, sampleRate * 0.2, sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const chords: Record<MusicKind, number[][]> = {
    upbeat: [
      [57, 60, 64],
      [55, 59, 62],
      [53, 57, 60],
      [55, 60, 64],
    ],
    ambient: [
      [48, 55, 60],
      [53, 60, 65],
      [50, 57, 62],
      [48, 55, 64],
    ],
    corporate: [
      [60, 64, 67],
      [57, 60, 64],
      [53, 57, 60],
      [55, 59, 62],
    ],
    lofi: [
      [57, 60, 65],
      [55, 58, 63],
      [52, 57, 60],
      [50, 57, 62],
    ],
  };
  const bar = 4;
  const bars = Math.ceil(seconds / bar);
  const progression = chords[kind];
  const tempo = kind === 'ambient' ? 0.6 : 1;

  for (let b = 0; b < bars; b++) {
    const when = b * bar;
    const chord = progression[b % progression.length];
    schedulePad(ctx, master, when, bar * 1.02, chord, kind === 'ambient' ? 0.07 : 0.055);
    // bass
    const bassNote = chord[0] - 24;
    for (let beat = 0; beat < 4; beat++) {
      const t = when + beat * tempo;
      if (kind === 'upbeat' || kind === 'corporate') scheduleKick(ctx, master, t, beat % 2 === 0 ? 0.45 : 0.28);
      if (kind === 'upbeat' || kind === 'lofi') {
        scheduleHat(ctx, noise, master, t + 0.5 * tempo, 0.05);
        scheduleHat(ctx, noise, master, t + 0.25, 0.03);
      }
      schedulePluck(ctx, master, t, bassNote + (beat === 3 ? 7 : 0), 0.22, 0.5);
    }
    // arpeggio
    const steps = kind === 'ambient' ? 4 : 8;
    for (let i = 0; i < steps; i++) {
      const t = when + (i * bar) / steps;
      const note = chord[i % chord.length] + 12;
      schedulePluck(ctx, master, t, note, kind === 'ambient' ? 0.06 : 0.1, kind === 'ambient' ? 1.2 : 0.35);
      if (kind === 'lofi' && i % 4 === 2) schedulePluck(ctx, master, t + 0.08, note + 12, 0.04, 0.6);
    }
  }
  const buffer = await ctx.startRendering();
  return encodeWav(buffer);
}

export async function generateSfx(kind: 'whoosh' | 'click' | 'riser' | 'pop' | 'boom'): Promise<Blob> {
  const Ctor = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!Ctor) throw new Error('OfflineAudioContext unavailable');
  const sampleRate = 32000;
  const durations: Record<string, number> = { whoosh: 0.9, click: 0.18, riser: 1.8, pop: 0.35, boom: 1.1 };
  const seconds = durations[kind];
  const ctx = new Ctor(1, Math.floor(sampleRate * seconds), sampleRate);
  const master = ctx.createGain();
  master.gain.value = 0.85;
  master.connect(ctx.destination);

  if (kind === 'whoosh' || kind === 'riser') {
    const noise = ctx.createBuffer(1, Math.floor(sampleRate * seconds), sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    if (kind === 'whoosh') {
      bp.frequency.setValueAtTime(500, 0);
      bp.frequency.exponentialRampToValueAtTime(4200, seconds * 0.6);
      bp.frequency.exponentialRampToValueAtTime(700, seconds);
      g.gain.setValueAtTime(0.0001, 0);
      g.gain.linearRampToValueAtTime(0.7, seconds * 0.4);
      g.gain.exponentialRampToValueAtTime(0.001, seconds);
    } else {
      bp.frequency.setValueAtTime(300, 0);
      bp.frequency.exponentialRampToValueAtTime(9000, seconds);
      g.gain.setValueAtTime(0.0001, 0);
      g.gain.exponentialRampToValueAtTime(0.6, seconds);
      g.gain.exponentialRampToValueAtTime(0.001, seconds + 0.05);
    }
    src.connect(bp).connect(g).connect(master);
    src.start(0);
  } else if (kind === 'click') {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2200, 0);
    osc.frequency.exponentialRampToValueAtTime(600, 0.08);
    g.gain.setValueAtTime(0.35, 0);
    g.gain.exponentialRampToValueAtTime(0.001, 0.12);
    osc.connect(g).connect(master);
    osc.start(0);
    osc.stop(seconds);
  } else if (kind === 'pop') {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, 0);
    osc.frequency.exponentialRampToValueAtTime(900, 0.06);
    osc.frequency.exponentialRampToValueAtTime(220, 0.2);
    g.gain.setValueAtTime(0.5, 0);
    g.gain.exponentialRampToValueAtTime(0.001, 0.3);
    osc.connect(g).connect(master);
    osc.start(0);
    osc.stop(seconds);
  } else {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, 0);
    osc.frequency.exponentialRampToValueAtTime(38, 0.5);
    g.gain.setValueAtTime(0.7, 0);
    g.gain.exponentialRampToValueAtTime(0.001, seconds);
    osc.connect(g).connect(master);
    osc.start(0);
    osc.stop(seconds);
  }

  const buffer = await ctx.startRendering();
  return encodeWav(buffer);
}

export const MUSIC_LIBRARY: { id: MusicKind; name: string; bpm: number; seconds: number }[] = [
  { id: 'upbeat', name: 'Neon Drive', bpm: 120, seconds: 16 },
  { id: 'ambient', name: 'Slow Horizon', bpm: 72, seconds: 20 },
  { id: 'corporate', name: 'Bright Idea', bpm: 104, seconds: 16 },
  { id: 'lofi', name: 'Late Study', bpm: 88, seconds: 18 },
];

export const SFX_LIBRARY: { id: 'whoosh' | 'click' | 'riser' | 'pop' | 'boom'; name: string }[] = [
  { id: 'whoosh', name: 'Whoosh' },
  { id: 'riser', name: 'Riser' },
  { id: 'click', name: 'Click' },
  { id: 'pop', name: 'Pop' },
  { id: 'boom', name: 'Impact' },
];

export { getAudioContext };
