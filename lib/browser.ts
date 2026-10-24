/**
 * Core browser types and URL helpers shared across the browser UI.
 */

export interface TabNavState {
  /** The URL currently rendered inside the WebView (may drift from requested url). */
  url: string | null;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  loading: boolean;
}

export interface TabError {
  description: string;
}

export interface Tab {
  id: string;
  /** URL the user asked for. `null` means the internal start page. */
  url: string | null;
  /** Desktop-mode user agent flag. */
  desktop: boolean;
  error: TabError | null;
  nav: TabNavState;
}

export interface HistoryEntry {
  url: string;
  title: string;
  ts: number;
}

export function createTab(url: string | null = null): Tab {
  return {
    id: `tab-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    url,
    desktop: false,
    error: null,
    nav: { url, title: '', canGoBack: false, canGoForward: false, loading: false },
  };
}

/**
 * Chrome-like "search or type URL" resolution:
 * - things that look like URLs get an https:// scheme,
 * - everything else is sent to Google Search.
 */
export function looksLikeUrl(input: string): boolean {
  const t = input.trim();
  if (!t || /\s/.test(t)) return false;
  if (/^(https?|file|about|data):/i.test(t)) return true;
  if (/^localhost(:\d+)?(\/.*)?$/i.test(t)) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(t)) return true;
  // loose domain check: label(.label)+ with optional port/path
  return /^[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)+(:\d+)?([/?#].*)?$/i.test(t);
}

export function resolveInput(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  if (looksLikeUrl(t)) {
    return /^https?:\/\//i.test(t) ? t : `https://${t}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(t)}`;
}

/** URL shown in the omnibox (scheme stripped, like Chrome). */
export function displayUrl(url: string | null): string {
  if (!url) return '';
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

export function domainOf(url: string | null): string {
  if (!url) return 'New tab';
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

export function isSecure(url: string | null): boolean {
  return !!url && /^https:/i.test(url);
}

export const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0.0.0 Safari/537.36';

export interface QuickLink {
  name: string;
  url: string;
}

export const QUICK_LINKS: QuickLink[] = [
  { name: 'Google', url: 'https://www.google.com' },
  { name: 'YouTube', url: 'https://www.youtube.com' },
  { name: 'GitHub', url: 'https://github.com' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
  { name: 'X', url: 'https://x.com' },
  { name: 'Instagram', url: 'https://www.instagram.com' },
  { name: 'Reddit', url: 'https://www.reddit.com' },
  { name: 'Amazon', url: 'https://www.amazon.com' },
];

/** First letter used for letter avatars. */
export function avatarLetter(title: string, url: string | null): string {
  const source = title.trim() || domainOf(url);
  const char = source.trim().charAt(0);
  return char ? char.toUpperCase() : '?';
}
