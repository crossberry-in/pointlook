import { Ionicons } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrowserColors } from '@/constants/BrowserColors';
import { useSettings } from '@/hooks/useSettings';
import { clearConsole, getConsole, pageDiagnostics, pageSource, runJs, subscribeConsole, type ConsoleMessage } from '@/lib/pageBridge';

const LEVEL_ICONS = {
  log: 'terminal-outline',
  info: 'information-circle-outline',
  warn: 'warning-outline',
  error: 'close-circle-outline',
  debug: 'bug-outline',
} as const;

const LEVEL_COLORS = {
  log: '#9AA0A6',
  info: '#8AB4F8',
  warn: '#FBBC05',
  error: '#F28B82',
  debug: '#81C995',
} as const;

/**
 * Developer tools: JS console (page logs + run JS), view page source,
 * page diagnostics, and the remote-debugging switch.
 */
export default function DevToolsScreen() {
  const { settings, scheme, update } = useSettings();
  const colors = BrowserColors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [logs, setLogs] = useState<ConsoleMessage[]>(getConsole());
  const [script, setScript] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [diag, setDiag] = useState<string | null>(null);

  useEffect(() => subscribeConsole(setLogs), []);

  const exec = useCallback(async (code: string) => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const out = await runJs(code);
      setResult({ ok: true, text: out || '(no return value)' });
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const loadSource = useCallback(async () => {
    setBusy(true);
    try {
      setSource(await pageSource());
    } catch (e) {
      setSource(`Could not fetch source: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }, []);

  const loadDiag = useCallback(async () => {
    try {
      const raw = await pageDiagnostics();
      const parsed = JSON.parse(raw) as Record<string, string>;
      setDiag(
        Object.entries(parsed)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n'),
      );
    } catch (e) {
      setDiag(`Could not read page diagnostics: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.page, paddingTop: insets.top }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      <View style={[styles.header, { backgroundColor: colors.chrome, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Developer tools</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={clearConsole} hitSlop={8}>
          <Ionicons name="trash-outline" size={19} color={colors.icon} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
        {/* ------------------------------------------------------ console */}
        <Text style={[styles.section, { color: colors.accent }]}>Console</Text>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {logs.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              Page console output shows up here (console.log, warnings, errors).
            </Text>
          ) : (
            <View style={styles.logList}>
              {logs.slice(0, 60).map((l) => (
                <View key={l.id} style={styles.logRow}>
                  <Ionicons
                    name={LEVEL_ICONS[l.level] ?? 'terminal-outline'}
                    size={14}
                    color={LEVEL_COLORS[l.level] ?? colors.secondaryText}
                  />
                  <Text style={[styles.logText, { color: colors.text }]}>{l.text}</Text>
                </View>
              ))}
              {logs.length > 60 ? (
                <Text style={[styles.logMore, { color: colors.secondaryText }]}>
                  + {logs.length - 60} older messages
                </Text>
              ) : null}
            </View>
          )}

          <View style={[styles.runRow, { borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.runInput, { color: colors.text, backgroundColor: colors.page, borderColor: colors.border }]}
              value={script}
              onChangeText={setScript}
              placeholder="Run JavaScript in the page…  e.g. document.title"
              placeholderTextColor={colors.secondaryText}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <TouchableOpacity
              style={[styles.runBtn, { backgroundColor: busy ? colors.secondaryText : colors.accent }]}
              disabled={busy}
              onPress={() => exec(script)}>
              <Ionicons name="play" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {result ? (
            <Text
              style={[
                styles.result,
                { color: result.ok ? LEVEL_COLORS.debug : LEVEL_COLORS.error },
              ]}
              selectable>
              {result.text}
            </Text>
          ) : null}
        </View>

        {/* -------------------------------------------------- page tools */}
        <Text style={[styles.section, { color: colors.accent }]}>Page</Text>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.toolRow} onPress={loadSource} disabled={busy}>
            <Ionicons name="document-text-outline" size={20} color={colors.icon} />
            <Text style={[styles.toolText, { color: colors.text }]}>View page source</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
            onPress={loadDiag}
            disabled={busy}>
            <Ionicons name="pulse-outline" size={20} color={colors.icon} />
            <Text style={[styles.toolText, { color: colors.text }]}>Page diagnostics</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
          </TouchableOpacity>
          {diag ? (
            <Text style={[styles.diag, { color: colors.secondaryText }]} selectable>
              {diag}
            </Text>
          ) : null}
        </View>

        {/* -------------------------------------------------------- flags */}
        <Text style={[styles.section, { color: colors.accent }]}>Flags</Text>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={[styles.toolRow, styles.flagRow]}>
            <View style={styles.flagTextWrap}>
              <Text style={[styles.toolText, { color: colors.text }]}>Remote debugging</Text>
              <Text style={[styles.flagSub, { color: colors.secondaryText }]}>
                Inspect pages from desktop Chrome at chrome://inspect while the phone is
                connected. Also available in Settings.
              </Text>
            </View>
            <Switch
              value={settings.remoteDebugging}
              onValueChange={(v) => update({ remoteDebugging: v })}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <Text style={[styles.note, { color: colors.secondaryText }]}>
          Console and source need a normal http(s) page — open a website first. The
          internal start page has nothing to inspect.
        </Text>
      </ScrollView>

      {/* ------------------------------------------------- source viewer */}
      <Modal visible={source !== null} animationType="slide" onRequestClose={() => setSource(null)}>
        <View style={[styles.sourceRoot, { backgroundColor: colors.page, paddingTop: insets.top }]}>
          <View style={[styles.header, { backgroundColor: colors.chrome, borderBottomColor: colors.border }]}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => setSource(null)} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.icon} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Page source</Text>
            <View style={styles.headerBtn} />
          </View>
          <ScrollView contentContainerStyle={styles.sourceBody}>
            <Text style={[styles.sourceText, { color: colors.text }]} selectable>
              {source?.slice(0, 400000)}
            </Text>
            {source && source.length > 400000 ? (
              <Text style={[styles.note, { color: colors.secondaryText }]}>… truncated (400 KB)</Text>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', flex: 1 },
  body: { paddingHorizontal: 14, paddingTop: 10 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  emptyText: { fontSize: 13, padding: 14, lineHeight: 19 },
  logList: { paddingVertical: 6, maxHeight: 300 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  logText: { flex: 1, fontSize: 11.5, fontFamily: 'monospace' },
  logMore: { fontSize: 11, paddingHorizontal: 12, paddingTop: 4 },
  runRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  runInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    minHeight: 40,
    maxHeight: 110,
  },
  runBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  result: {
    fontSize: 12,
    fontFamily: 'monospace',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.25)',
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  toolText: { flex: 1, fontSize: 15 },
  flagRow: { alignItems: 'center' },
  flagTextWrap: { flex: 1 },
  flagSub: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  diag: {
    fontSize: 12,
    fontFamily: 'monospace',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.25)',
  },
  note: { marginTop: 16, fontSize: 12, textAlign: 'center', paddingHorizontal: 16, lineHeight: 18 },
  sourceRoot: { flex: 1 },
  sourceBody: { padding: 14, paddingBottom: 40 },
  sourceText: { fontSize: 11, fontFamily: 'monospace', lineHeight: 15 },
});
