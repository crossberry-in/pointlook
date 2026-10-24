import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { BrowserTheme } from '@/constants/BrowserColors';
import { DESKTOP_USER_AGENT, Tab } from '@/lib/browser';
import { StartPage } from '@/components/browser/StartPage';

interface WebPaneProps {
  colors: BrowserTheme;
  tab: Tab;
  active: boolean;
  setRef: (tabId: string, instance: WebView | null) => void;
  onNavState: (tabId: string, nav: { url: string; title: string; canGoBack: boolean; canGoForward: boolean; loading: boolean }) => void;
  onProgress: (tabId: string, progress: number) => void;
  onError: (tabId: string, description: string) => void;
  onRetry: (tabId: string) => void;
  onOpenFromStart: (tabId: string, url: string) => void;
}

/**
 * One browser tab content pane. Inactive tabs stay mounted (display: none)
 * so their page state survives tab switches, like real browser tabs.
 * Start-page tabs render the internal StartPage instead of a WebView.
 */
export function WebPane({
  colors,
  tab,
  active,
  setRef,
  onNavState,
  onProgress,
  onError,
  onRetry,
  onOpenFromStart,
}: WebPaneProps) {
  const isStart = tab.url === null;

  return (
    <View style={[styles.pane, active ? styles.active : styles.hidden]}>
      {isStart ? (
        <StartPage colors={colors} onOpen={(url) => onOpenFromStart(tab.id, url)} />
      ) : (
        <>
          <WebView
            ref={(instance) => setRef(tab.id, instance)}
            source={{ uri: tab.url ?? 'about:blank' }}
            key={`${tab.id}-${tab.desktop ? 'desktop' : 'mobile'}`}
            style={[styles.webview, { backgroundColor: colors.page }]}
            userAgent={tab.desktop ? DESKTOP_USER_AGENT : undefined}
            javaScriptEnabled
            domStorageEnabled
            allowsBackForwardNavigationGestures
            pullToRefreshEnabled
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            onNavigationStateChange={(nav) =>
              onNavState(tab.id, {
                url: nav.url,
                title: nav.title,
                canGoBack: nav.canGoBack,
                canGoForward: nav.canGoForward,
                loading: nav.loading,
              })
            }
            onLoaded={(nav: WebViewNavigation) =>
              onNavState(tab.id, {
                url: nav.url,
                title: nav.title,
                canGoBack: nav.canGoBack,
                canGoForward: nav.canGoForward,
                loading: nav.loading,
              })
            }
            onLoadProgress={(e) => onProgress(tab.id, e.nativeEvent.progress)}
            onError={(e) => onError(tab.id, e.nativeEvent.description || 'Failed to load')}
            onRenderProcessGone={() => onRetry(tab.id)}
            onShouldStartLoadWithRequest={(req) => !/^intent:/i.test(req.url)}
          />
          {tab.error ? (
            <View style={[styles.errorOverlay, { backgroundColor: colors.page }]}>
              <Ionicons name="cloud-offline-outline" size={56} color={colors.secondaryText} />
              <Text style={[styles.errorTitle, { color: colors.text }]}>
                {"This site can't be reached"}
              </Text>
              <Text style={[styles.errorUrl, { color: colors.accent }]} numberOfLines={2}>
                {tab.nav.url ?? tab.url}
              </Text>
              {!!tab.error.description && (
                <Text
                  style={[styles.errorDetail, { color: colors.secondaryText }]}
                  numberOfLines={3}>
                  {tab.error.description}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.accent }]}
                onPress={() => onRetry(tab.id)}>
                <Text style={styles.retryText}>Reload</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pane: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  active: {
    zIndex: 1,
  },
  hidden: {
    display: 'none',
  },
  webview: {
    flex: 1,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorUrl: {
    fontSize: 13,
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: 12.5,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 22,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
