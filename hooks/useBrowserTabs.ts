import { useCallback, useMemo, useRef, useState } from 'react';

import {
  createTab,
  type HistoryEntry,
  type Tab,
  type TabNavState,
} from '@/lib/browser';

export const MAX_TABS = 10;
const HISTORY_LIMIT = 100;

interface BrowserState {
  tabs: Tab[];
  activeId: string;
}

function initialState(): BrowserState {
  const tab = createTab();
  return { tabs: [tab], activeId: tab.id };
}

/**
 * Tab manager for the browser: open/close/select tabs, sync WebView nav state,
 * and keep a session history used for omnibox suggestions.
 */
export function useBrowserTabs(incognito = false) {
  const [state, setState] = useState<BrowserState>(initialState);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const incognitoRef = useRef(incognito);
  incognitoRef.current = incognito;

  const activeTab = useMemo(
    () => state.tabs.find((t) => t.id === state.activeId) ?? state.tabs[0] ?? null,
    [state],
  );

  const patchTab = useCallback((id: string, patch: Partial<Tab>) => {
    setState((s) => ({
      ...s,
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  const newTab = useCallback((url: string | null = null): Tab | null => {
    let created: Tab | null = null;
    setState((s) => {
      if (s.tabs.length >= MAX_TABS) return s;
      const tab = createTab(url);
      created = tab;
      return { tabs: [...s.tabs, tab], activeId: tab.id };
    });
    return created;
  }, []);

  const closeTab = useCallback((id: string) => {
    setState((s) => {
      const idx = s.tabs.findIndex((t) => t.id === id);
      if (idx === -1) return s;
      const remaining = s.tabs.filter((t) => t.id !== id);
      if (remaining.length === 0) {
        const fresh = createTab();
        return { tabs: [fresh], activeId: fresh.id };
      }
      const wasActive = s.activeId === id;
      if (!wasActive) return { ...s, tabs: remaining };
      // Chrome activates the tab to the right, otherwise the one to the left.
      const nextActive = remaining[Math.min(idx, remaining.length - 1)];
      return { tabs: remaining, activeId: nextActive.id };
    });
  }, []);

  const selectTab = useCallback((id: string) => {
    setState((s) => (s.activeId === id ? s : { ...s, activeId: id }));
  }, []);

  /** Navigate a tab to a fully resolved URL, or back to the start page with null. */
  const navigate = useCallback(
    (id: string, url: string | null) => {
      patchTab(id, {
        url,
        error: null,
        nav: { url, title: '', canGoBack: false, canGoForward: false, loading: url != null },
      });
    },
    [patchTab],
  );

  /** Sync WebView navigation state into the tab (no reloads triggered). */
  const syncNavState = useCallback(
    (id: string, nav: TabNavState) => {
      setState((s) => ({
        ...s,
        tabs: s.tabs.map((t) => {
          if (t.id !== id) return t;
          const prev = t.nav;
          if (
            prev.url === nav.url &&
            prev.title === nav.title &&
            prev.canGoBack === nav.canGoBack &&
            prev.canGoForward === nav.canGoForward &&
            prev.loading === nav.loading
          ) {
            return t;
          }
          return { ...t, nav, error: null };
        }),
      }));
    },
    [],
  );

  const toggleDesktop = useCallback(
    (id: string) => {
      setState((s) => ({
        ...s,
        tabs: s.tabs.map((t) =>
          t.id === id ? { ...t, desktop: !t.desktop, error: null } : t,
        ),
      }));
    },
    [],
  );

  const pushHistory = useCallback((url: string, title: string) => {
    if (incognitoRef.current) return; // incognito: record nothing
    if (!/^https?:/i.test(url)) return;
    setHistory((h) => {
      const entry: HistoryEntry = { url, title: title || url, ts: Date.now() };
      const filtered = h.filter((e) => e.url !== url);
      return [entry, ...filtered].slice(0, HISTORY_LIMIT);
    });
  }, []);

  /** Drop the whole session history (used when entering incognito). */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  /** Record a load error; pass an empty description to clear it. */
  const setError = useCallback((id: string, description: string) => {
    patchTab(id, { error: description ? { description } : null });
  }, [patchTab]);

  return {
    tabs: state.tabs,
    activeId: state.activeId,
    activeTab,
    history,
    newTab,
    closeTab,
    selectTab,
    navigate,
    syncNavState,
    setError,
    toggleDesktop,
    pushHistory,
    clearHistory,
  };
}

export type BrowserTabsApi = ReturnType<typeof useBrowserTabs>;
