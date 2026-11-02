import type { SVGProps } from 'react';

export type IconName =
  | 'play'
  | 'pause'
  | 'stop'
  | 'skipBack'
  | 'skipForward'
  | 'stepBack'
  | 'stepForward'
  | 'volume'
  | 'volumeOff'
  | 'fullscreen'
  | 'exitFullscreen'
  | 'undo'
  | 'redo'
  | 'scissors'
  | 'trash'
  | 'copy'
  | 'paste'
  | 'duplicate'
  | 'magnet'
  | 'marker'
  | 'plus'
  | 'minus'
  | 'chevronDown'
  | 'chevronRight'
  | 'chevronLeft'
  | 'search'
  | 'upload'
  | 'image'
  | 'video'
  | 'audio'
  | 'music'
  | 'text'
  | 'subtitle'
  | 'mic'
  | 'settings'
  | 'download'
  | 'share'
  | 'close'
  | 'check'
  | 'alert'
  | 'info'
  | 'lock'
  | 'unlock'
  | 'eye'
  | 'eyeOff'
  | 'layers'
  | 'wand'
  | 'palette'
  | 'keyframe'
  | 'crop'
  | 'rotate'
  | 'flipH'
  | 'flipV'
  | 'zoomIn'
  | 'zoomOut'
  | 'folder'
  | 'home'
  | 'globe'
  | 'keyboard'
  | 'help'
  | 'grid'
  | 'arrowLeft'
  | 'arrowRight'
  | 'sparkles'
  | 'more'
  | 'edit'
  | 'save'
  | 'clock'
  | 'monitor'
  | 'film'
  | 'sliders'
  | 'refresh'
  | 'eyedropper'
  | 'group'
  | 'ripple'
  | 'waveform'
  | 'shapes'
  | 'server'
  | 'shield'
  | 'permission'
  | 'key'
  | 'external'
  | 'align'
  | 'bold'
  | 'italic'
  | 'palette2'
  | 'layersOff'
  | 'cpu'
  | 'database'
  | 'cursor'
  | 'split'
  | 'user'
  | 'cloud'
  | 'cloudOff'
  | 'mail'
  | 'logOut';

const PATHS: Record<IconName, string> = {
  play: 'M8 5.5v13l11-6.5z',
  pause: 'M9 5v14M15 5v14',
  stop: 'M6 6h12v12H6z',
  skipBack: 'M18 5v14L8 12zM6 5v14',
  skipForward: 'M6 5v14l10-7zM18 5v14',
  stepBack: 'M15 6v12l-7-6zM8 6v12',
  stepForward: 'M9 6v12l7-6zM16 6v12',
  volume: 'M4 10v4h3l4 3V7L7 10H4zM16 8.5a5 5 0 010 7M18.5 6a8 8 0 010 12',
  volumeOff: 'M4 10v4h3l4 3V7L7 10H4zM16 9l5 6M21 9l-5 6',
  fullscreen: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  exitFullscreen: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  undo: 'M9 7L4 12l5 5M4 12h9a6 6 0 010 12',
  redo: 'M15 7l5 5-5 5M20 12h-9a6 6 0 000 12',
  scissors: 'M6 6l12 12M6 18L18 6M6 6a2.2 2.2 0 100-.01M6 18a2.2 2.2 0 100-.01',
  trash: 'M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6',
  copy: 'M9 9h11v11H9zM4 15V4h11',
  paste: 'M9 5h6M8 5H6a1 1 0 00-1 1v14a1 1 0 001 1h12a1 1 0 001-1V6a1 1 0 00-1-1h-2M9 3h6v4H9z',
  duplicate: 'M8 8h12v12H8zM4 12V4h8',
  magnet: 'M6 4v8a6 6 0 0012 0V4h-4v8a2 2 0 01-4 0V4zM6 8h4M14 8h4',
  marker: 'M6 3v18M6 5h10l-2 4 2 4H6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  search: 'M11 4a7 7 0 105.3 11.7L21 20M11 4a7 7 0 00-7 7',
  upload: 'M12 16V4M8 8l4-4 4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3',
  image: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5h.01',
  video: 'M3 6h12v12H3zM15 10l6-4v12l-6-4',
  audio: 'M4 12h2l2-4 2 8 2-10 2 12 2-8 2 4h2',
  music: 'M9 18V6l10-2v12M9 18a3 3 0 11-3-3M19 16a3 3 0 11-3-3',
  text: 'M6 6h12M12 6v13M9 19h6',
  subtitle: 'M3 6h18v12H3zM7 15h4M14 15h3M7 11h10',
  mic: 'M12 3a3 3 0 013 3v6a3 3 0 01-6 0V6a3 3 0 013-3zM6 11a6 6 0 0012 0M12 17v4M9 21h6',
  settings:
    'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2 2 2 0 11-4 0 1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 003 15a2 2 0 110-4 1.7 1.7 0 001.2-2.9l-.1-.1a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 0010 4.6a2 2 0 114 0 1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1A1.7 1.7 0 0021 11a2 2 0 110 4z',
  download: 'M12 4v11M8 11l4 4 4-4M4 19h16',
  share: 'M12 3v12M8 7l4-4 4 4M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 13l4 4L19 7',
  alert: 'M12 4l9 16H3zM12 10v4M12 17h.01',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01',
  lock: 'M6 11h12v9H6zM9 11V8a3 3 0 116 0v3',
  unlock: 'M6 11h12v9H6zM9 11V8a3 3 0 015.6-1.5',
  eye: 'M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6zM12 15a3 3 0 100-6 3 3 0 000 6z',
  eyeOff: 'M3 3l18 18M10.6 6.2A9.6 9.6 0 0112 6c6.4 0 10 6 10 6a17 17 0 01-3 3.6M6.3 7.7A16 16 0 002 12s3.6 6 10 6a9.4 9.4 0 003.5-.7',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  cursor: 'M6 3l13 8.5-5.6 1.3L11 19 6 3z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20a7.5 7.5 0 0115 0',
  cloud: 'M7.5 18.5h9.2a3.3 3.3 0 00.2-6.6 5.2 5.2 0 00-10-1.2A4 4 0 007.5 18.5z',
  cloudOff: 'M7.5 18.5h9.2a3.3 3.3 0 00.2-6.6 5.2 5.2 0 00-10-1.2A4 4 0 007.5 18.5zM4 4l16 16',
  mail: 'M3.5 6.5h17v11h-17zM3.5 7l8.5 6 8.5-6',
  logOut: 'M14 5H6a1 1 0 00-1 1v12a1 1 0 001 1h8M17 8l4 4-4 4M21 12H10',
  split: 'M4 5h7v14H4zM13 5h7v14h-7zM12 3v18',
  cpu: 'M6 6h12v12H6zM9 9h6v6H9zM9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3',
  database: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  layersOff: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5',
  wand: 'M14 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1zM4 20l9-9M17 14l3 1M19 19l-2-2',
  palette: 'M12 3a9 9 0 000 18h2a2 2 0 001.6-3.2 2 2 0 011.6-3.2H19a3 3 0 003-3c0-4.4-4.5-8-10-8zM7.5 9h.01M11 6.5h.01M16 7.5h.01M7 13h.01',
  palette2: 'M12 3a9 9 0 000 18h2a2 2 0 001.6-3.2 2 2 0 011.6-3.2H19a3 3 0 003-3c0-4.4-4.5-8-10-8z',
  keyframe: 'M12 4l5 8-5 8-5-8z',
  crop: 'M6 3v13a2 2 0 002 2h13M3 6h13a2 2 0 012 2v13',
  rotate: 'M20 11a8 8 0 10-3 6.2M20 5v6h-6',
  flipH: 'M12 4v16M9 7L4 12l5 5M15 7l5 5-5 5',
  flipV: 'M4 12h16M7 9l5-5 5 5M7 15l5 5 5-5',
  zoomIn: 'M11 4a7 7 0 105.3 11.7L21 20M8 11h6M11 8v6',
  zoomOut: 'M11 4a7 7 0 105.3 11.7L21 20M8 11h6',
  folder: 'M4 6h6l2 3h8v10H4z',
  home: 'M4 11l8-7 8 7v9a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1z',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.4 3.8 5.5 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.5-3.8-9S9.5 5.4 12 3z',
  keyboard: 'M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M17 11h.01M7 14h10',
  help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 115 0c0 1.7-2.5 2-2.5 4M12 17h.01',
  grid: 'M3 9h18M3 15h18M9 3v18M15 3v18',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  sparkles: 'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6zM18 15l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  edit: 'M4 20h4l10-10-4-4L4 16zM14 6l4 4',
  save: 'M5 4h11l3 3v13H5zM8 4v6h7V4M8 20v-6h8v6',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3.5 2',
  monitor: 'M3 5h18v11H3zM8 20h8M12 16v4',
  film: 'M3 5h18v14H3zM7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6',
  refresh: 'M20 12a8 8 0 11-2.3-5.6M20 4v5h-5',
  eyedropper: 'M15 4l5 5M13 6l5 5-8 8H5v-5zM17 8l-9 9',
  group: 'M4 4h6v6H4zM14 14h6v6h-6zM10 7h4v10M7 10v4',
  ripple: 'M3 12h6M15 12h6M9 7v10M15 7v10',
  waveform: 'M3 12h2l1-4 2 8 2-12 3 16 2-10 2 6 1-4h3',
  shapes: 'M4 4h7v7H4zM13.5 18a4.5 4.5 0 100-9 4.5 4.5 0 000 9z',
  server: 'M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  permission: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM12 9v4M12 16h.01',
  key: 'M14 4a4 4 0 11-2.8 6.8L4 18v2h3l1-1v-2h2v-2h2l1.2-1.2A4 4 0 0114 4z',
  external: 'M14 4h6v6M20 4l-9 9M9 5H5v14h14v-4',
  align: 'M4 6h16M4 12h10M4 18h13',
  bold: 'M7 5h6a4 4 0 010 8H7zM7 13h7a4 4 0 010 8H7z',
  italic: 'M10 5h8M8 19h8M14 5l-4 14',
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  filled?: boolean;
}

export function Icon({ name, size = 18, filled, strokeWidth = 1.7, ...rest }: IconProps) {
  const isFilledShape = name === 'play' || name === 'stop' || name === 'keyframe';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isFilledShape || filled ? 'currentColor' : 'none'}
      stroke={isFilledShape ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="editez-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="0.55" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#38e1c8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#editez-logo)" />
      <path
        d="M11 9.5v13M11 9.5h10M11 16h7M11 22.5h10"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.92"
      />
    </svg>
  );
}
