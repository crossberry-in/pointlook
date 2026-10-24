import * as Haptics from 'expo-haptics';
import { BackHandler, Share, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { BrowserColors } from '@/constants/BrowserColors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useBrowserTabs } from '@/hooks/useBrowserTabs';
import { domainOf, resolveInput } from '@/lib/browser';
import { BrowserMenu } from '@/components/browser/BrowserMenu';
import { Omnibox } from '@/components/browser/Omnibox';
import { TabSwitcher } from '@/components/browser/TabSwitcher';
import { Toolbar } from '@/components/browser/Toolbar';
import { WebPane } from '@/components/browser/WebPane';

/**
 * pointlook — a Chrome-like mobile browser built on react-native-webview.
 *
 * Layout mirrors Chrome for Android: omnibox on top with a loading progress
 * bar, web content in the middle, bottom toolbar (back / forward / home /
 * tab counter / menu), plus a full-screen tab grid and an overflow menu.
 */
export default function BrowserScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = BrowserColors[scheme];
  const insets = useSafeAreaInsets();

  const browser = useBrowserTabs();
  const { activeTab } = browser;

  const webRefs = useRef(new Map<string, WebView>());
  const setWebRef = useCallback((id: string, instance: WebView | null) => {
    if (instance) webRefs.current.set(id, instance);
    else webRefs.current.delete(id);
  }, []);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  const loading = !!activeTab?.nav.loading || (progress > 0 && progress < 1);

  const haptic = () => {
    Haptics.selectionAsync().catch(() => {});
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
      const url = resolveInput(text);
      setEditing(false);
      if (!url) return;
      if (url === activeTab.nav.url) return;
      haptic();
      setProgress(0.05);
      browser.navigate(activeTab.id, url);
    },
    [activeTab, browser],
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
    await wv.clearCookiesAsync?.().catch(() => {});
  }, []);

  const toggleDesktop = useCallback(() => {
    if (!activeTab) return;
    haptic();
    browser.toggleDesktop(activeTab.id);
  }, [activeTab, browser]);

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

      <View style={[styles.content, { backgroundColor: colors.page }]}>
        {browser.tabs.map((tab) => (
          <WebPane
            key={tab.id}
            colors={colors}
            tab={tab}
            active={tab.id === browser.activeId}
            setRef={setWebRef}
            onNavState={handleNavState}
            onProgress={handleProgress}
            onError={handleError}
            onRetry={handleRetry}
            onOpenFromStart={openFromStart}
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
        onNewTab={openNewTab}
        onShare={share}
        onReload={reloadOrStop}
        onToggleDesktop={toggleDesktop}
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
});
