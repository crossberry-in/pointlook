import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { memo } from 'react';

import { BrowserTheme } from '@/constants/BrowserColors';
import { Tab } from '@/lib/browser';
import { StartPage } from '@/components/browser/StartPage';
import {
  QuickActionsOverlay,
  useQuickActions,
  type QuickAction,
} from './GestureQuickActions';
import { QUICK_ACTIONS_JS } from '@/lib/quickActions';
import { deliverBridgeMessage, pushConsole } from '@/lib/pageBridge';

interface WebPaneProps {
  colors: BrowserTheme;
  tab: Tab;
  active: boolean;
  /** Resolved user agent for this tab (undefined = WebView default). */
  userAgent?: string;
  /** Search engine name + template for the start page. */
  engineName?: string;
  searchTemplate: string;
  incognito?: boolean;
  setRef: (tabId: string, instance: WebView | null) => void;
  onNavState: (tabId: string, nav: { url: string; title: string; canGoBack: boolean; canGoForward: boolean; loading: boolean }) => void;
  onProgress: (tabId: string, progress: number) => void;
  onError: (tabId: string, description: string) => void;
  onRetry: (tabId: string) => void;
  onOpenFromStart: (tabId: string, url: string) => void;
  onFileDownload: (url: string, mime: string) => void;
  onQuickAction: (action: QuickAction) => void;
}

/**
 * One browser tab content pane. Inactive tabs stay mounted (display: none)
 * so their page state survives tab switches, like real browser tabs.
 * Start-page tabs render the internal StartPage instead of a WebView.
 */
export const WebPane = memo(function WebPane({
  colors,
  tab,
  active,
  userAgent,
  engineName,
  searchTemplate,
  incognito,
  setRef,
  onNavState,
  onProgress,
  onError,
  onRetry,
  onOpenFromStart,
  onFileDownload,
  onQuickAction,
}: WebPaneProps) {
  const isStart = tab.url === null;
  const canGoBack = !!tab.nav.canGoBack && tab.url !== null;
  const canGoForward = !!tab.nav.canGoForward;

  // Quick actions are detected INSIDE the page by a passive injected
  // observer (lib/quickActions.ts) — never by intercepting native touches,
  // which would make the WebView untouchable.
  const qa = useQuickActions({ canGoBack, canGoForward, onAction: onQuickAction });

  return (
    <View style={[styles.pane, active ? styles.active : styles.hidden]}>
      {isStart ? (
        <StartPage
          colors={colors}
          onOpen={(url) => onOpenFromStart(tab.id, url)}
          engineName={engineName}
          searchTemplate={searchTemplate}
          incognito={incognito}
        />
      ) : (
        <>
          <WebView
            ref={(instance) => setRef(tab.id, instance)}
            source={{ uri: tab.url ?? 'about:blank' }}
            key={`${tab.id}-${tab.desktop ? 'desktop' : 'mobile'}-${userAgent ?? 'default'}`}
            style={[styles.webview, { backgroundColor: colors.page }]}
            userAgent={userAgent}
            javaScriptEnabled
            domStorageEnabled
            allowsBackForwardNavigationGestures
            pullToRefreshEnabled
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
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
            onShouldStartLoadWithRequest={(req) => !/^(intent|market):/i.test(req.url)}
            // Download manager: let the native download listener feed our queue
            onFileDownload={(e) => onFileDownload(e.nativeEvent.downloadUrl, '')}
            // Developer tools: capture console output + bridge replies
            onConsoleMessage={(e: { nativeEvent: { level: string; message: string; lineNumber?: number } }) => {
              const n = e.nativeEvent;
              pushConsole(n.level, `[${n.lineNumber ?? '?'}] ${n.message}`);
            }}
            onMessage={(e) => {
              const data: string = e.nativeEvent.data ?? '';
              if (qa.handleMessage(data)) return;
              if (!deliverBridgeMessage(data)) {
                pushConsole('log', data.slice(0, 2000));
              }
            }}
            // Passive in-page observer for the long-press quick actions.
            injectedJavaScript={QUICK_ACTIONS_JS}
          />
          {active ? (
            <QuickActionsOverlay
              colors={colors}
              armed={qa.armed}
              selection={qa.selection}
              anim={qa.anim}
              pulse={qa.pulse}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
            />
          ) : null}
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
});

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
