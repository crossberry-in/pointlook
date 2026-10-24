/**
 * Browser palette modelled on Google Chrome for Android (Material You era).
 * Light: white chrome, gray pill, Google blue #0B57D0.
 * Dark: #202124 chrome, #3C4043 pill, Google blue #8AB4F8.
 */

export const BrowserColors = {
  light: {
    chrome: '#FFFFFF',
    pill: '#F1F3F4',
    pillEditing: '#FFFFFF',
    page: '#FFFFFF',
    text: '#202124',
    secondaryText: '#5F6368',
    icon: '#444746',
    accent: '#0B57D0',
    progress: '#0B57D0',
    border: '#DADCE0',
    overlay: 'rgba(32,33,36,0.55)',
    switcherBg: '#F1F3F4',
    cardBg: '#FFFFFF',
    danger: '#D93025',
    suggestionStripe: '#F8F9FA',
  },
  dark: {
    chrome: '#202124',
    pill: '#3C4043',
    pillEditing: '#303134',
    page: '#202124',
    text: '#E8EAED',
    secondaryText: '#9AA0A6',
    icon: '#C4C7C5',
    accent: '#8AB4F8',
    progress: '#8AB4F8',
    border: '#3C4043',
    overlay: 'rgba(0,0,0,0.65)',
    switcherBg: '#111114',
    cardBg: '#303134',
    danger: '#F28B82',
    suggestionStripe: '#292A2D',
  },
} as const;

export type BrowserTheme = (typeof BrowserColors)['light' | 'dark'];

/** Google brand colors cycled for shortcut/letter avatars. */
export const AVATAR_COLORS = [
  '#1A73E8',
  '#EA4335',
  '#FBBC04',
  '#34A853',
  '#9334E6',
  '#F9AB00',
  '#12B5CB',
  '#FF6D01',
  '#E8710A',
  '#46B1A9',
] as const;

export function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
