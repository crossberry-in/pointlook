import * as Haptics from 'expo-haptics';
import { BackHandler, Share, StyleSheet, Text, ToastAndroid, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { BrowserColors } from '@/constants/BrowserColors';
import { useSettings } from '@/hooks/useSettings';
import { useDownloads } from '@/hooks/useDownloads';
import { useBrowserTabs } from '@/hooks/useBrowserTabs';
import { domainOf, engineById, resolveInput, userAgentFor } from '@/lib/browser';
import { registerWeb, setActiveTabId } from '@/lib/pageBridge';
import { BrowserMenu } from '@/components/browser/BrowserMenu';
import { Omnibox } from '@/components/browser/Omnibox';
import { TabSwitcher } from '@/components/browser/TabSwitcher';
import { Toolbar } from '@/components/browser/Toolbar';
import { WebPane } from '@/components/browser/WebPane';
import type { QuickAction } from '@/components/browser/GestureQuickActions';

/**
 * pointlook — a Chrome-like mobile browser built on react-native-webview.
 *
 * Layout mirrors Chrome for Android: omnibox on top with a loading progress
 * bar, web content in the middle, bottom toolbar (back / forward / home /
 * tab counter / menu), plus a full-screen tab grid, downloads, settings,
 * developer tools, and long-press-drag quick actions.
 */
export default function BrowserScreen() {
  const { settings, scheme, searchTemplate, update } = useSettings();
  const colors = BrowserColors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const browser = useBrowserTabs(settings.incognito);
  const downloads = useDownloads();
  const { activeTab } = browser;

  const webRefs = useRef(new Map<string, WebView>());
  const setWebRef = useCallback((id: string, instance: WebView | null) => {
    if (instance) webRefs.current.set(id, instance);
    else webRefs.current.delete(id);
    registerWeb(id, instance);
  }, []);

  useEffect(() => {
    setActiveTabId(browser.activeId);
  }, [browser.activeId]);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  const loading = !!activeTab?.nav.loading || (progress > 0 && progress < 1);
  const engineName = engineById(settings.engineId).name;
  const ua = userAgentFor(settings.uaMode, settings.customUa, !!activeTab?.desktop);

  const haptic = () => {
    Haptics.selectionAsync().catch(() => {});
  };

  const toast = (msg: string) => {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  };

  // ---------------------------------------------------------------- actions

  const startEditing = useCallback(() => {
    if (!activeTab) return;
    haptic();
    setDraft(activeTab.nav.url ?? '');
    setEditing(true);
  }, [activeTab]);

  const go = useCallback(
    (text: string) => {
      if (!activeTab) return;
      const url = resolveInput(text, searchTemplate);
      setEditing(false);
      if (!url) return;
      if (url === activeTab.nav.url) return;
      haptic();
      setProgress(0.05);
      browser.navigate(activeTab.id, url);
    },
    [activeTab, browser, searchTemplate],
  );

  const reloadOrStop = useCallback(() => {
    if (!activeTab) return;
    haptic();
    const web = webRefs.current.get(activeTab.id);
    if (activeTab.nav.loading) web?.stopLoading();
    else {
      setProgress(0.05);
      browser.setError(activeTab.id, '');
      if (activeTab.url === null) return;
      if (web) web.reload();
      else browser.navigate(activeTab.id, activeTab.url);
    }
  }, [activeTab, browser]);

  const goBack = useCallback(() => {
    if (!activeTab) return;
    webRefs.current.get(activeTab.id)?.goBack();
  }, [activeTab]);

  const goForward = useCallback(() => {
    if (!activeTab) return;
    webRefs.current.get(activeTab.id)?.goForward();
  }, [activeTab]);

  const goHome = useCallback(() => {
    if (!activeTab) return;
    haptic();
    browser.navigate(activeTab.id, null);
    setProgress(0);
  }, [activeTab, browser]);

  const openNewTab = useCallback(() => {
    if (browser.newTab()) haptic();
    setSwitcherOpen(false);
    setProgress(0);
  }, [browser]);

  const closeTab = useCallback(
    (id: string) => {
      haptic();
      webRefs.current.delete(id);
      browser.closeTab(id);
    },
    [browser],
  );

  const selectTab = useCallback(
    (id: string) => {
      if (id !== browser.activeId) haptic();
      browser.selectTab(id);
      setSwitcherOpen(false);
      setProgress(0);
    },
    [browser],
  );

  const share = useCallback(async () => {
    const url = activeTab?.nav.url ?? activeTab?.url;
    if (!url) return;
    Share.share({ message: url }).catch(() => {});
  }, [activeTab]);

  const clearData = useCallback(async () => {
    const wv = WebView as unknown as { clearCookiesAsync?: () => Promise<boolean> };
    try {
      await wv.clearCookiesAsync?.();
    } catch {}
    webRefs.current.forEach((web) => {
      try {
        web.clearCache?.(true);
      } catch {}
    });
    toast('Cookies & cache cleared');
  }, []);

  const toggleDesktop = useCallback(() => {
    if (!activeTab) return;
    haptic();
    browser.toggleDesktop(activeTab.id);
  }, [activeTab, browser]);

  const toggleIncognito = useCallback(() => {
    const next = !settings.incognito;
    update({ incognito: next });
    if (!next) {
      // Leaving incognito: wipe any private cookies/cache from the session.
      const wv = WebView as unknown as { clearCookiesAsync?: () => Promise<boolean> };
      wv.clearCookiesAsync?.().catch(() => {});
      webRefs.current.forEach((web) => {
        try {
          web.clearCache?.(true);
        } catch {}
      });
    }
    toast(next ? 'Incognito on — history off' : 'Incognito off — data cleared');
    haptic();
  }, [settings.incognito, update]);

  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      haptic();
      if (action === 'back') goBack();
      else if (action === 'forward') goForward();
      else reloadOrStop();
    },
    [goBack, goForward, reloadOrStop],
  );

  // ------------------------------------------------------- incognito effect

  // When incognito turns on, drop the session history already recorded.
  useEffect(() => {
    if (settings.incognito) browser.clearHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.incognito]);

  // ------------------------------------------------------- webview plumbing

  const handleNavState = useCallback(
    (tabId: string, nav: { url: string; title: string; canGoBack: boolean; canGoForward: boolean; loading: boolean }) => {
      browser.syncNavState(tabId, {
        url: nav.url,
        title: nav.title || domainOf(nav.url),
        canGoBack: nav.canGoBack,
        canGoForward: nav.canGoForward,
        loading: nav.loading,
      });
      if (!nav.loading && /^https?:/i.test(nav.url)) {
        browser.pushHistory(nav.url, nav.title);
      }
    },
    [browser],
  );

  const handleProgress = useCallback(
    (tabId: string, p: number) => {
      if (tabId === browser.activeId) setProgress(p);
    },
    [browser.activeId],
  );

  const handleError = useCallback(
    (tabId: string, description: string) => {
      browser.setError(tabId, description);
    },
    [browser],
  );

  const handleRetry = useCallback(
    (tabId: string) => {
      browser.setError(tabId, '');
      setProgress(0.05);
      webRefs.current.get(tabId)?.reload();
    },
    [browser],
  );

  const openFromStart = useCallback(
    (tabId: string, url: string) => {
      setProgress(0.05);
      browser.navigate(tabId, url);
    },
    [browser],
  );

  const handleFileDownload = useCallback(
    (url: string, mime: string) => {
      downloads.startDownload(url, mime);
    },
    [downloads],
  );

  // ------------------------------------------------------- hardware back key

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (switcherOpen) {
        setSwitcherOpen(false);
        return true;
      }
      if (menuOpen) {
        setMenuOpen(false);
        return true;
      }
      if (editing) {
        setEditing(false);
        return true;
      }
      if (!activeTab) return false;
      if (activeTab.nav.canGoBack && activeTab.url !== null) {
        webRefs.current.get(activeTab.id)?.goBack();
        return true;
      }
      if (activeTab.url !== null) {
        goHome();
        return true;
      }
      return false; // on the start page: let the app exit
    });
    return sub.remove;
  }, [switcherOpen, menuOpen, editing, activeTab, goHome]);

  // ------------------------------------------------------------------- render

  const showProgress = loading && progress > 0 && progress < 1;

  return (
    <View style={[styles.root, { backgroundColor: colors.chrome, paddingTop: insets.top }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      <Omnibox
        colors={colors}
        url={activeTab?.nav.url ?? null}
        loading={loading}
        editing={editing}
        draft={draft}
        history={browser.history}
        engineName={engineName}
        onChangeDraft={setDraft}
        onStartEditing={startEditing}
        onSubmit={go}
        onReloadOrStop={reloadOrStop}
      />

      <View style={[styles.progressTrack, { backgroundColor: colors.chrome }]}>
        {showProgress ? (
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.progress, width: `${Math.max(progress * 100, 4)}%` },
            ]}
          />
        ) : null}
      </View>

      {settings.incognito ? (
        <View style={[styles.incognitoBar, { backgroundColor: colors.pill }]}>
          <View style={[styles.incognitoDot, { backgroundColor: colors.accent }]} />
          <View style={styles.incognitoTextWrap}>
            <Text style={[styles.incognitoText, { color: colors.text }]}>
              Incognito · history & cookies off
            </Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.content, { backgroundColor: colors.page }]}>
        {browser.tabs.map((tab) => (
          <WebPane
            key={tab.id}
            colors={colors}
            tab={tab}
            active={tab.id === browser.activeId}
            userAgent={ua}
            engineName={engineName}
            searchTemplate={searchTemplate}
            incognito={settings.incognito}
            setRef={setWebRef}
            onNavState={handleNavState}
            onProgress={handleProgress}
            onError={handleError}
            onRetry={handleRetry}
            onOpenFromStart={openFromStart}
            onFileDownload={handleFileDownload}
            onQuickAction={handleQuickAction}
          />
        ))}
      </View>

      {switcherOpen ? (
        <TabSwitcher
          colors={colors}
          tabs={browser.tabs}
          activeId={browser.activeId}
          onSelect={selectTab}
          onClose={closeTab}
          onNew={openNewTab}
          onDismiss={() => setSwitcherOpen(false)}
        />
      ) : null}

      <BrowserMenu
        colors={colors}
        visible={menuOpen}
        desktop={!!activeTab?.desktop}
        incognito={settings.incognito}
        onNewTab={openNewTab}
        onShare={share}
        onReload={reloadOrStop}
        onToggleDesktop={toggleDesktop}
        onToggleIncognito={toggleIncognito}
        onDownloads={() => router.push('/downloads')}
        onSettings={() => router.push('/settings')}
        onDevTools={() => router.push('/devtools')}
        onClearData={clearData}
        onCloseTab={() => activeTab && closeTab(activeTab.id)}
        onDismiss={() => setMenuOpen(false)}
      />

      <Toolbar
        colors={colors}
        canGoBack={!!activeTab?.nav.canGoBack && activeTab.url !== null}
        canGoForward={!!activeTab?.nav.canGoForward}
        tabCount={browser.tabs.length}
        onBack={goBack}
        onForward={goForward}
        onHome={goHome}
        onTabs={() => {
          haptic();
          setSwitcherOpen(true);
        }}
        onMenu={() => {
          haptic();
          setMenuOpen(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  progressTrack: {
    height: 2,
    width: '100%',
  },
  progressFill: {
    height: 2,
  },
  incognitoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  incognitoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  incognitoTextWrap: {
    flex: 1,
  },
  incognitoText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});
