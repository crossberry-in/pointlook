import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { WebView } from 'react-native-webview';

import {
  DEFAULT_SETTINGS,
  effectiveTemplate,
  type Settings,
} from '@/lib/browser';
import { loadSettings, saveSettings } from '@/lib/storage';

interface SettingsContextValue {
  settings: Settings;
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
  /** 'light' | 'dark' after applying the theme mode override. */
  scheme: 'light' | 'dark';
  /** Effective search URL template for the current engine config. */
  searchTemplate: string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const systemScheme = useSystemColorScheme();

  // Load persisted settings once.
  useEffect(() => {
    let alive = true;
    loadSettings(DEFAULT_SETTINGS)
      .then((loaded) => {
        if (!alive) return;
        setSettings(loaded);
        setReady(true);
      })
      .catch(() => setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // Persist on change (after initial load).
  useEffect(() => {
    if (!ready) return;
    saveSettings(settings).catch(() => {});
  }, [settings, ready]);

  // Apply the remote debugging flag whenever it changes.
  useEffect(() => {
    const wv = WebView as unknown as {
      setWebContentsDebuggingEnabled?: (enabled: boolean) => void;
    };
    try {
      wv.setWebContentsDebuggingEnabled?.(settings.remoteDebugging);
    } catch {
      // not supported on this platform
    }
  }, [settings.remoteDebugging]);

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const value = useMemo<SettingsContextValue>(() => {
    const scheme: 'light' | 'dark' =
      settings.themeMode === 'system'
        ? (systemScheme ?? 'light')
        : settings.themeMode === 'dark'
          ? 'dark'
          : 'light';
    return {
      settings,
      ready,
      update,
      scheme,
      searchTemplate: effectiveTemplate(
        settings.engineId,
        settings.searxngUrl,
        settings.customEngineUrl,
      ),
    };
  }, [settings, ready, systemScheme]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
