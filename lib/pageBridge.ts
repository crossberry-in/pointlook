/**
 * Bridge between the browser screen (which owns WebView refs) and the other
 * screens (Developer tools). Module-level singleton: simple and synchronous.
 *
 * - Console messages from every WebView are buffered here.
 * - `runJs` posts a script into the active page and resolves its result via
 *   the WebView `onMessage` channel.
 */

import type { WebView } from 'react-native-webview';

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface ConsoleMessage {
  id: number;
  level: ConsoleLevel;
  text: string;
  ts: number;
}

const CONSOLE_LIMIT = 300;

let consoleSeq = 0;
let consoleBuffer: ConsoleMessage[] = [];
const consoleListeners = new Set<(list: ConsoleMessage[]) => void>();

export function pushConsole(level: string, text: string): void {
  const normalized: ConsoleLevel =
    level === 'warning' ? 'warn' : (level as ConsoleLevel) || 'log';
  const entry: ConsoleMessage = {
    id: ++consoleSeq,
    level: normalized,
    text: text.length > 4000 ? `${text.slice(0, 4000)}…` : text,
    ts: Date.now(),
  };
  consoleBuffer = [entry, ...consoleBuffer].slice(0, CONSOLE_LIMIT);
  for (const fn of consoleListeners) fn(consoleBuffer);
}

export function getConsole(): ConsoleMessage[] {
  return consoleBuffer;
}

export function clearConsole(): void {
  consoleBuffer = [];
  for (const fn of consoleListeners) fn(consoleBuffer);
}

export function subscribeConsole(fn: (list: ConsoleMessage[]) => void): () => void {
  consoleListeners.add(fn);
  return () => consoleListeners.delete(fn);
}

// ------------------------------------------------------------- web registry

let webRefs = new Map<string, WebView>();
let activeTabId: string | null = null;
let messageSeq = 0;
const pending = new Map<string, (data: string) => void>();

export function registerWeb(tabId: string, ref: WebView | null): void {
  if (ref) webRefs.set(tabId, ref);
  else webRefs.delete(tabId);
}

export function setActiveTabId(tabId: string | null): void {
  activeTabId = tabId;
}

export function getActiveWeb(): WebView | null {
  if (!activeTabId) return null;
  return webRefs.get(activeTabId) ?? null;
}

/**
 * Deliver a message posted from a page via
 * `window.ReactNativeWebView.postMessage(JSON.stringify({ bridge: {...} }))`.
 * Returns true when a pending request consumed the message.
 */
export function deliverBridgeMessage(data: string): boolean {
  try {
    const parsed = JSON.parse(data) as { bridge?: { reqId?: string; payload?: string } };
    const bridge = parsed?.bridge;
    const reqId = bridge?.reqId;
    if (!reqId) return false;
    const resolve = pending.get(reqId);
    if (!resolve) return false;
    pending.delete(reqId);
    resolve(bridge.payload ?? '');
    return true;
  } catch {
    return false;
  }
}

/** Evaluate a script in the active page and resolve with its string result. */
export function runJs(script: string): Promise<string> {
  const web = getActiveWeb();
  if (!web) return Promise.reject(new Error('No active web page. Open a site first.'));
  const reqId = `req-${++messageSeq}`;
  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(reqId);
      reject(new Error('Timed out waiting for the page (needs a normal http(s) page).'));
    }, 8000);
    pending.set(reqId, (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
    const escaped = script.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
    web.injectJavaScript(`
      (function() {
        var out = '';
        try { out = String(eval('${escaped}')); } catch (e) { out = 'Error: ' + e.message; }
        window.ReactNativeWebView.postMessage(JSON.stringify({
          bridge: { reqId: '${reqId}', payload: out.slice(0, 1200000) }
        }));
      })();
      true;
    `);
  });
}

/** Convenience: full HTML source of the active page. */
export function pageSource(): Promise<string> {
  return runJs('document.documentElement.outerHTML');
}

/** Convenience: page diagnostics (title, UA, cookies, viewport). */
export function pageDiagnostics(): Promise<string> {
  return runJs(
    `JSON.stringify({title: document.title, ua: navigator.userAgent, ` +
      `cookies: navigator.cookieEnabled, viewport: window.innerWidth + 'x' + window.innerHeight, ` +
      `lang: navigator.language})`,
  );
}
