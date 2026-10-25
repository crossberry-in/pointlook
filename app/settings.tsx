import { Ionicons } from '@expo/vector-icons';
import { Linking, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrowserColors } from '@/constants/BrowserColors';
import { useSettings } from '@/hooks/useSettings';
import { ABOUT, SEARCH_ENGINES, engineById } from '@/lib/browser';
import type { BrowserTheme } from '@/constants/BrowserColors';
import type { ThemeMode, UaMode } from '@/lib/browser';

/**
 * Chrome-style settings: search engine (Google / Bing / DuckDuckGo / Brave /
 * SearXNG / custom), web client (Chrome / Firefox / custom UA), theme,
 * incognito, downloads, developer tools, and the About section.
 */
export default function SettingsScreen() {
  const { settings, scheme, update } = useSettings();
  const colors = BrowserColors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: colors.page, paddingTop: insets.top }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      <View style={[styles.header, { backgroundColor: colors.chrome, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}>
        {/* ------------------------------------------------ search engine */}
        <SectionTitle colors={colors} label="Search engine" />
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {SEARCH_ENGINES.map((engine) => {
            const selected = settings.engineId === engine.id;
            return (
              <TouchableOpacity
                key={engine.id}
                style={styles.row}
                activeOpacity={0.6}
                onPress={() => update({ engineId: engine.id })}>
                <View style={[styles.radio, { borderColor: selected ? colors.accent : colors.border }]}>
                  {selected ? <View style={[styles.radioDot, { backgroundColor: colors.accent }]} /> : null}
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{engine.name}</Text>
                  {engine.custom ? (
                    <Text style={[styles.rowSub, { color: colors.secondaryText }]}>
                      Your own URL template, e.g. https://my.engine/search?q=%s
                    </Text>
                  ) : engine.id === 'searxng' ? (
                    <Text style={[styles.rowSub, { color: colors.secondaryText }]}>
                      Open-source metasearch. Default: searx.be — set your own instance below.
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}

          {settings.engineId === 'searxng' ? (
            <LabeledInput
              colors={colors}
              label="SearXNG instance URL"
              placeholder="https://searx.example.com"
              value={settings.searxngUrl}
              onChangeText={(v) => update({ searxngUrl: v })}
            />
          ) : null}
          {settings.engineId === 'custom' ? (
            <LabeledInput
              colors={colors}
              label="Custom search URL (%s = query)"
              placeholder="https://lite.duckduckgo.com/lite/?q=%s"
              value={settings.customEngineUrl}
              onChangeText={(v) => update({ customEngineUrl: v })}
            />
          ) : null}
        </View>

        {/* --------------------------------------------------- web client */}
        <SectionTitle colors={colors} label="Web client (user agent)" />
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {(
            [
              { id: 'chrome', title: 'Chrome (recommended)', sub: 'Default Android WebView identity' },
              { id: 'firefox', title: 'Firefox', sub: 'Mozilla Gecko web client, mobile + desktop' },
              { id: 'custom', title: 'Custom string', sub: 'Set any user agent you like' },
            ] as { id: UaMode; title: string; sub: string }[]
          ).map((mode) => {
            const selected = settings.uaMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                style={styles.row}
                activeOpacity={0.6}
                onPress={() => update({ uaMode: mode.id })}>
                <View style={[styles.radio, { borderColor: selected ? colors.accent : colors.border }]}>
                  {selected ? <View style={[styles.radioDot, { backgroundColor: colors.accent }]} /> : null}
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{mode.title}</Text>
                  <Text style={[styles.rowSub, { color: colors.secondaryText }]}>{mode.sub}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {settings.uaMode === 'custom' ? (
            <LabeledInput
              colors={colors}
              label="Custom user agent"
              placeholder="Mozilla/5.0 …"
              value={settings.customUa}
              onChangeText={(v) => update({ customUa: v })}
              multiline
            />
          ) : null}
        </View>

        {/* ------------------------------------------------------- theme */}
        <SectionTitle colors={colors} label="Appearance" />
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {(
            [
              { id: 'system', title: 'System default' },
              { id: 'light', title: 'Light' },
              { id: 'dark', title: 'Dark' },
            ] as { id: ThemeMode; title: string }[]
          ).map((mode) => {
            const selected = settings.themeMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                style={styles.row}
                activeOpacity={0.6}
                onPress={() => update({ themeMode: mode.id })}>
                <View style={[styles.radio, { borderColor: selected ? colors.accent : colors.border }]}>
                  {selected ? <View style={[styles.radioDot, { backgroundColor: colors.accent }]} /> : null}
                </View>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{mode.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ----------------------------------------------------- privacy */}
        <SectionTitle colors={colors} label="Privacy" />
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={[styles.row, styles.rowFixedHeight]}>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Incognito mode</Text>
              <Text style={[styles.rowSub, { color: colors.secondaryText }]}>
                No history is recorded. Cookies and cache are cleared when you turn it off.
              </Text>
            </View>
            <Switch
              value={settings.incognito}
              onValueChange={(v) => update({ incognito: v })}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* --------------------------------------------------- downloads */}
        <SectionTitle colors={colors} label="Downloads" />
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <NavigateRow
            colors={colors}
            icon="download-outline"
            title="Manage downloads"
            sub="Files you download with pointlook"
            onPress={() => router.push('/downloads')}
          />
        </View>

        {/* ------------------------------------------------- developer */}
        <SectionTitle colors={colors} label="Developer" />
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <NavigateRow
            colors={colors}
            icon="code-slash-outline"
            title="Developer tools"
            sub="JS console, view source, page diagnostics"
            onPress={() => router.push('/devtools')}
          />
          <View style={[styles.row, styles.rowFixedHeight, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Remote debugging</Text>
              <Text style={[styles.rowSub, { color: colors.secondaryText }]}>
                Inspect WebViews from desktop Chrome via chrome://inspect.
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

        {/* ------------------------------------------------------- about */}
        <SectionTitle colors={colors} label="About" />
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.aboutRow}>
            <View style={[styles.logoBadge, { backgroundColor: colors.accent }]}>
              <Ionicons name="compass-outline" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.aboutTitle, { color: colors.text }]}>
                {ABOUT.app} for Android
              </Text>
              <Text style={[styles.rowSub, { color: colors.secondaryText }]}>
                Version 1.2.0 (versionCode 4)
              </Text>
            </View>
          </View>
          <AboutRow
            colors={colors}
            icon="heart-outline"
            title={`Made in ${ABOUT.maker}`}
            sub={ABOUT.tagline}
            onPress={() => Linking.openURL(ABOUT.website).catch(() => {})}
          />
          <AboutRow
            colors={colors}
            icon="globe-outline"
            title={ABOUT.website.replace('https://', '')}
            sub="Visit the Crossberry website"
            onPress={() => Linking.openURL(ABOUT.website).catch(() => {})}
          />
          <AboutRow
            colors={colors}
            icon="mail-outline"
            title={ABOUT.email}
            sub="Contact us by email"
            onPress={() => Linking.openURL(`mailto:${ABOUT.email}`).catch(() => {})}
          />
        </View>

        <Text style={[styles.engineNote, { color: colors.secondaryText }]}>
          Current engine: {engineById(settings.engineId).name}
        </Text>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ colors, label }: { colors: BrowserTheme; label: string }) {
  return <Text style={[styles.section, { color: colors.accent }]}>{label}</Text>;
}

interface LabeledInputProps {
  colors: BrowserTheme;
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
}

function LabeledInput({ colors, label, placeholder, value, onChangeText, multiline }: LabeledInputProps) {
  const [open, setOpen] = useState(false);
  if (!open && !value) {
    return (
      <TouchableOpacity
        style={[styles.row, styles.customRow]}
        onPress={() => setOpen(true)}>
        <Ionicons name="create-outline" size={18} color={colors.icon} />
        <Text style={[styles.rowSub, { color: colors.accent }]}>Set {label.toLowerCase()}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.customRow}>
      <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.page },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryText}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={multiline}
      />
    </View>
  );
}

interface NavigateRowProps {
  colors: BrowserTheme;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub?: string;
  onPress: () => void;
}

function NavigateRow({ colors, icon, title, sub, onPress }: NavigateRowProps) {
  return (
    <TouchableOpacity style={[styles.row, styles.rowFixedHeight]} activeOpacity={0.6} onPress={onPress}>
      <Ionicons name={icon} size={21} color={colors.icon} />
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        {sub ? <Text style={[styles.rowSub, { color: colors.secondaryText }]} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
    </TouchableOpacity>
  );
}

interface AboutRowProps {
  colors: BrowserTheme;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub?: string;
  onPress: () => void;
}

function AboutRow({ colors, icon, title, sub, onPress }: AboutRowProps) {
  return (
    <TouchableOpacity
      style={[styles.row, styles.rowFixedHeight, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
      activeOpacity={0.6}
      onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.icon} />
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={[styles.rowSub, { color: colors.secondaryText }]} numberOfLines={1}>{sub}</Text> : null}
      </View>
    </TouchableOpacity>
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
  body: { paddingHorizontal: 14, paddingTop: 8 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowFixedHeight: { minHeight: 54 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  rowTextWrap: { flex: 1 },
  rowTitle: { fontSize: 15.5 },
  rowSub: { fontSize: 12.5, marginTop: 2 },
  customRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.25)',
  },
  inputLabel: { fontSize: 11.5, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  logoBadge: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  aboutTitle: { fontSize: 16, fontWeight: '700' },
  engineNote: { marginTop: 18, fontSize: 12, textAlign: 'center' },
});
