# editEZ — video editing, made easy

A CapCut-style video editor that runs in your browser. Multi-track timeline, colour
grading, chroma key, motion keyframes, voiceover recording, subtitles, one-click export
presets — plus an optional account that keeps a synced cloud copy of every project.
White-and-light-blue studio UI in English and Arabic.

Built with **React 18 + TypeScript + Vite + Zustand**, HTML canvas compositing and
IndexedDB storage.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # serve the production build on :4173
```

## What works today

**Projects** — create with a canvas preset (16:9, 9:16, 1:1, 4:5, 4:3, 21:9 or custom),
rename, duplicate, delete, search, download/restore a `.editez` backup, autosave with a
visible save status, crash recovery from the autosave journal, and a guided tour on first run.

**Media** — import video, audio, images and `.srt`/`.vtt` files (drag onto the panel or onto a
timeline lane), preview any asset, see dimensions/duration/licence, remove assets, and add
generated demo music/SFX. Everything is stored locally in IndexedDB.

**Timeline** — multi-track (video, overlay, text, subtitle, audio), drag to move across tracks,
trim either edge, split with the razor tool or `⌘/Ctrl + B`, ripple delete, duplicate, copy/paste,
snapping with a live snap line, markers (double-click the ruler), zoom, fit-to-window, track
lock/mute/hide/rename, grouping, and per-clip context menus.

**Preview** — canvas compositor shared with export, play/pause, frame stepping, volume,
quality/proxy preview, grid + safe margins, hold-to-compare before/after, and an eyedropper
that samples the composed frame.

**Visuals** — transform (position, scale, rotation, flip, fit, crop), opacity, blend modes,
masks (rect, ellipse, linear, split) with feathering, transitions (fade, dissolve, wipe,
slide, zoom, blur in, out), speed, reverse, freeze frame, keyframes for position/scale/
rotation/opacity, and a searchable effects library (blur, sharpen, vignette, grain, glow,
wave, posterize, duotone, bleach, sepia, noise, threshold, chromatic shift, mirror, Ken Burns)
with per-effect parameters, favourites and reset.

**Colour** — exposure, brightness, contrast, saturation, temperature, tint, highlights,
shadows, whites, blacks, curve black/mid/white/gamma, LUT import (`.cube`) with amount, and
six look presets.

**Chroma key** — eyedropper or colour picker, green/blue presets, similarity, smoothness,
spill suppression, edge cleanup, transparency, plus a replacement layer (another asset, a flat
colour, or fully transparent) with blur/scale.

**Text & subtitles** — title/lower-third/caption/end-card templates, font, size, weight,
colour, alignment, outline, shadow, background, spacing, position and eight animated entrances.
Subtitle tracks support editable timing and styling per cue, SRT/VTT import and SRT/VTT export.

**Audio** — waveform display, per-clip gain, fades, mute, loop, three-band EQ, noise reduction,
ducking under voice, voiceover recording with device selection and a live level meter (added to
its own voice track at the record position), and a generated CC0-style music/SFX library.

**Export** — YouTube, TikTok, Reels, Shorts, Instagram and square presets (plus custom size,
frame rate, quality, bitrate, format and filename), real-time progress with cancel, an
in-browser preview of the result and a download link. WebM (VP9) via `MediaRecorder`; MP4 only
when the browser exposes an H.264 recorder. The export tab must stay open while rendering.

**Accounts & cloud** — email + password sign-up/sign-in (PBKDF2-SHA256 salted hashes, stored
locally), a profile and storage panel, automatic mirroring of every save to a per-account cloud
copy, a *Sync now* action that pulls newer copies back into IndexedDB, and a pluggable sync
endpoint (Settings → Account) so a Supabase/Firebase/pocketbase REST function can take over.
Guest mode stays fully usable; projects are simply local-only.

**Look & feel** — a CapCut-style studio with two skins: **white + light blue** (default) and a
**dark cinema** mode. Both are toggled from the home header, the editor top bar or Settings →
Appearance, and remembered per browser. Filmstrip clips, always-visible track lock/eye/mute
controls, a draggable preview/timeline split, flat blue tool buttons and rounded cards in both
skins. The preview stage stays dark, like CapCut's player.

**One-tap looks & animation presets** — twelve graded filters (Cinematic, Golden hour, Neon,
Vintage film, Noir, Dreamy, Pop, Faded, Infrared, VHS, Comic, Frost) that apply a grade plus an
effect stack in one click, seven new effects (invert, solarize, colour tint, pixelate, emboss,
scanlines, light leak) on top of the existing library, and seven ready-made animated titles
(neon, pop-bold, typewriter, quote card, name sticker, end-card CTA, glitch).

**Bilingual** — complete English and Arabic UI with a full right-to-left layout (`dir="rtl"`,
logical CSS properties, Arabic-capable fonts), persisted per browser.

## Honest limits

- **The account and its cloud copy live in this browser by default.** Sign-up, sign-in, hashed
  passwords and the mirrored project copies are all stored in the same IndexedDB database, so a
  new device or a cleared profile starts empty. Real cross-device sync needs a backend: paste its
  REST endpoint in *Account → Sync endpoint* and the same push/pull calls go over `fetch()`
  instead (`GET /projects`, `PUT /projects`, `DELETE /projects/:id` with a bearer token). Nothing
  is uploaded until you configure an endpoint.
- **Locally stored passwords are a convenience, not hardened identity.** They are salted and
  PBKDF2-derived, but anyone with access to the browser profile can read the database. Do not
  reuse an important password.
- **Storage lives in the browser.** Projects and media are in IndexedDB for this browser/profile.
  Clearing site data removes them — use *Download backup* for anything you want to keep.
  *Request persistent storage* asks the browser to keep the data.
- **No server-side AI, collaboration or publishing.** Transcription, AI effects and share links
  are not included; exports are downloaded files.
- **Automatic speech-to-text is not included.** It needs a paid API or a large on-device model;
  import an SRT/VTT instead (or type cues directly). The subtitle panel says so.
- **The export codec depends on the browser.** Only formats the browser's `MediaRecorder`
  reports are offered; MP4 is unavailable in most Firefox/Linux builds today. Export speed is
  roughly real time because frames are rendered on the main thread.
- **Microphone access needs permission** and a user gesture; recordings are mono WAV from the
  selected input. Noise reduction is a gentle gate, not a full restoration suite.
- **Branding is built in.** The home footer, the editor status chip and the status bar carry
  “© Youssef Mosbeh”. It is a credit line, not a licence manager — remove it in `Home.tsx`,
  `Editor.tsx` and `StatusBar.tsx` if you fork the project.
- **Demo media is generated at runtime** (canvas-rendered scenes and synthesised audio) so the
  editor can be explored without uploading anything. It is clearly marked as demo content.

## Layout

```
src/
  types.ts             document model + defaults
  store.ts             Zustand store: project state, actions, autosave
  i18n/                en.ts, ar.ts, runtime helpers (t, RTL)
  lib/
    render.ts          canvas compositor, media pool, grade/LUT/chroma maths
    export.ts          MediaRecorder pipeline over the compositor
    edits.ts           pure timeline mutations (split, ripple, group…)
    media.ts           probe/import/thumbnail helpers
    audio.ts           AudioContext engine, peaks, WAV, voice recorder
    subtitles.ts       SRT/VTT parse + serialise
    lut.ts             .cube parser
    samples.ts         generated demo scenes, music, SFX
    templates.ts       demo project + template gallery
    presets.ts         aspects, export presets, fonts, effects, text presets
    db.ts              IndexedDB with in-memory fallback
    cloud.ts           accounts, password hashing, cloud push/pull adapter
    theme.ts           light/dark theme application + system preference
  components/ui.tsx    buttons, fields, sliders, modal, toasts, tips…
  components/editor/   preview, timeline, panels, inspector, top bar
  components/AccountMenu.tsx   avatar menu + sync chip
  components/dialogs/  new project, export, settings, account, onboarding…
  pages/               Home, Editor, Auth
  styles.css           light design system + RTL + responsive layout + dark-theme addenda
  styles-dark.css      dark skin: the original CapCut-dark build scoped to [data-theme='dark']
```
