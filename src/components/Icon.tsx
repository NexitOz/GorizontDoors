import type { CSSProperties } from 'react';
const paths = {
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  chevron: 'm9 5 7 7-7 7',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  sound: 'm11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  mute: 'm11 4-6 5H2v6h3l6 5V4Zm5 5 5 6m0-6-5 6',
  close: 'm5 5 14 14M19 5 5 19',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  door: 'M4 21V3h13v18M17 3l4 3v13l-4 2M13 12h1M2 21h18',
  play: 'm8 4 13 8-13 8V4Z',
  pause: 'M7 4v16M17 4v16',
  phone: 'M7 3H3c-1 11 7 19 18 18v-4l-5-2-2 2-7-7 2-2-2-5Z',
  mail: 'M3 5h18v14H3V5Zm0 1 9 7 9-7',
  pin: 'M12 22s8-8 8-14A8 8 0 0 0 4 8c0 6 8 14 8 14Zm0-17a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  shield: 'M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6l-9-4Zm-4 9 3 3 5-5',
  layers: 'm12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5',
  ruler: 'M6 2h12v20H6V2Zm0 5h5m-5 5h3m-3 5h5',
  factory: 'M3 21V3h4v10l5-3v3l6-3v11H3Zm4-4h1m4 0h1m4 0h1',
  lock: 'M5 10h14v11H5V10Zm3 0V6a4 4 0 0 1 8 0v4m-4 4v3',
  reset: 'M3 10a9 9 0 1 1 2 9M3 3v7h7',
  sun: 'M12 3V1m0 22v-2M3 12H1m22 0h-2M5 5 3 3m18 18-2-2M5 19l-2 2M21 3l-2 2M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10',
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name, size = 20, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>;
}
