import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { Component, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SettingsProvider } from '@/hooks/useSettings';

/**
 * Catches render errors that would otherwise leave a completely blank window
 * in release builds (no redboxes there). Shows the actual error text instead.
 */
class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const message =
        this.state.error?.message || String(this.state.error) || 'Unknown error';
      return (
        <View style={styles.errorRoot}>
          <Text style={styles.errorTitle}>pointlook hit an error</Text>
          <Text style={styles.errorMessage}>{message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SettingsProvider>
        <RootErrorBoundary>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="downloads" />
            <Stack.Screen name="devtools" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </RootErrorBoundary>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  errorRoot: {
    flex: 1,
    backgroundColor: '#202124',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    color: '#E8EAED',
    fontSize: 18,
    fontWeight: '700',
  },
  errorMessage: {
    color: '#9AA0A6',
    fontSize: 13,
    textAlign: 'center',
  },
});
