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

// ------------------------------------------------------------------ search

export interface SearchEngine {
  id: string;
  name: string;
  /** URL template containing `%s` (or `{query}`) replaced by the encoded query. */
  template: string;
  /** Optional user-provided instance/template override. */
  custom?: boolean;
}

export const SEARCH_ENGINES: SearchEngine[] = [
  { id: 'google', name: 'Google', template: 'https://www.google.com/search?q=%s' },
  { id: 'bing', name: 'Bing', template: 'https://www.bing.com/search?q=%s' },
  { id: 'duckduckgo', name: 'DuckDuckGo', template: 'https://duckduckgo.com/?q=%s' },
  { id: 'brave', name: 'Brave Search', template: 'https://search.brave.com/search?q=%s' },
  { id: 'searxng', name: 'SearXNG', template: 'https://searx.be/search?q=%s' },
  { id: 'custom', name: 'Custom…', template: '', custom: true },
];

export function engineById(id: string): SearchEngine {
  return SEARCH_ENGINES.find((e) => e.id === id) ?? SEARCH_ENGINES[0];
}

/** Effective search URL template, honouring SearXNG instance + custom overrides. */
export function effectiveTemplate(
  engineId: string,
  searxngUrl: string,
  customUrl: string,
): string {
  if (engineId === 'searxng' && searxngUrl.trim()) {
    const base = searxngUrl.trim();
    return /%s|\{query\}/.test(base) ? base : `${base.replace(/\/+$/, '')}/search?q=%s`;
  }
  if (engineId === 'custom') return customUrl.trim();
  return engineById(engineId).template;
}

export function buildSearchUrl(template: string, query: string): string | null {
  const t = template.trim();
  if (!t) return null;
  const q = encodeURIComponent(query.trim());
  if (/%s/.test(t)) return t.replace('%s', q);
  if (/\{query\}/.test(t)) return t.replace(/\{query\}/g, q);
  return `${t}${t.includes('?') ? '&' : '?'}q=${q}`;
}

/**
 * Chrome-like "search or type URL" resolution:
 * - things that look like URLs get an https:// scheme,
 * - everything else goes to the selected search engine.
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

export function resolveInput(input: string, searchTemplate: string): string | null {
  const t = input.trim();
  if (!t) return null;
  if (looksLikeUrl(t)) {
    return /^https?:\/\//i.test(t) ? t : `https://${t}`;
  }
  return buildSearchUrl(searchTemplate, t);
}

// ------------------------------------------------------------- user agents

export type UaMode = 'chrome' | 'firefox' | 'custom';

/** Firefox (Gecko) mobile web client — "Mozilla web client" option. */
export const FIREFOX_MOBILE_UA =
  'Mozilla/5.0 (Android 15; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0';

export const FIREFOX_DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0';

export const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0.0.0 Safari/537.36';

/** Resolve the user agent for a tab from the global UA mode + desktop flag. */
export function userAgentFor(
  mode: UaMode,
  customUa: string,
  desktop: boolean,
): string | undefined {
  if (mode === 'custom' && customUa.trim()) return customUa.trim();
  if (mode === 'firefox') return desktop ? FIREFOX_DESKTOP_UA : FIREFOX_MOBILE_UA;
  return desktop ? DESKTOP_USER_AGENT : undefined;
}

// ---------------------------------------------------------------- settings

export type UaModeSetting = UaMode;
export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  /** Selected search engine id (see SEARCH_ENGINES). */
  engineId: string;
  /** Optional SearXNG instance URL (overrides the default public instance). */
  searxngUrl: string;
  /** URL template for the custom engine (contains %s or {query}). */
  customEngineUrl: string;
  /** Web client / user agent mode: Chrome (default), Firefox, or custom string. */
  uaMode: UaMode;
  customUa: string;
  themeMode: ThemeMode;
  /** Incognito: no history recorded; cookies/cache cleared when turned off. */
  incognito: boolean;
  /** Allow Chrome DevTools (chrome://inspect) to debug WebViews. */
  remoteDebugging: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  engineId: 'google',
  searxngUrl: '',
  customEngineUrl: '',
  uaMode: 'chrome',
  customUa: '',
  themeMode: 'system',
  incognito: false,
  remoteDebugging: false,
};

// ------------------------------------------------------------------- misc

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

// ------------------------------------------------------------- downloads

export interface DownloadRecord {
  id: string;
  url: string;
  /** Local file URI of the finished download. */
  fileUri: string;
  filename: string;
  mime: string;
  bytes: number;
  ts: number;
}

/** Guess a filename from a download URL. */
export function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const last = decodeURIComponent(path.split('/').filter(Boolean).pop() ?? '');
    if (last && /\.[a-z0-9]{1,8}$/i.test(last)) return last.replace(/[?#].*$/, '');
  } catch {
    // fall through
  }
  return `download-${Date.now().toString(36)}`;
}

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf', apk: 'application/vnd.android.package-archive',
  zip: 'application/zip', txt: 'text/plain', csv: 'text/csv',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', mp3: 'audio/mpeg', mp4: 'video/mp4',
  webm: 'video/webm', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  json: 'application/json', html: 'text/html',
};

export function mimeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

// ------------------------------------------------------------------ about

export const ABOUT = {
  app: 'pointlook',
  maker: 'Crossberry',
  website: 'https://crossberry.vercel.app',
  email: 'crossberryweb@gmail.com',
  tagline: 'A fast, private, Chrome-style browser.',
};
