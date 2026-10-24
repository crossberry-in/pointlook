import { Ionicons } from '@expo/vector-icons';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useState } from 'react';

import { avatarColorFor, BrowserTheme } from '@/constants/BrowserColors';
import { QUICK_LINKS, resolveInput } from '@/lib/browser';

interface StartPageProps {
  colors: BrowserTheme;
  onOpen: (url: string) => void;
}

const WORDMARK = 'pointlook';
const WORDMARK_COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#4285F4', '#34A853', '#EA4335', '#4285F4', '#FBBC05', '#34A853', '#4285F4'];

/**
 * Chrome-like new tab page: wordmark, search pill, and a shortcuts grid.
 */
export function StartPage({ colors, onOpen }: StartPageProps) {
  const [query, setQuery] = useState('');

  const submit = () => {
    const url = resolveInput(query);
    if (url) onOpen(url);
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.page }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={styles.wordmarkRow}>
        {WORDMARK.split('').map((ch, i) => (
          <Text key={`${ch}-${i}`} style={[styles.wordmarkChar, { color: WORDMARK_COLORS[i % WORDMARK_COLORS.length] }]}>
            {ch}
          </Text>
        ))}
      </View>

      <View style={[styles.searchPill, { backgroundColor: colors.pill }]}>
        <Ionicons name="search" size={20} color={colors.secondaryText} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          placeholder="Search Google or type a URL"
          placeholderTextColor={colors.secondaryText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Shortcuts</Text>
      </View>

      <View style={styles.grid}>
        {QUICK_LINKS.map((link) => (
          <TouchableOpacity
            key={link.url}
            style={styles.shortcut}
            activeOpacity={0.7}
            onPress={() => onOpen(link.url)}>
            <View style={[styles.avatar, { backgroundColor: avatarColorFor(link.name) }]}>
              <Text style={styles.avatarLetter}>{link.name.charAt(0)}</Text>
            </View>
            <Text style={[styles.shortcutLabel, { color: colors.text }]} numberOfLines={1}>
              {link.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.footer, { color: colors.secondaryText }]}>
        pointlook · built with Expo
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  wordmarkRow: {
    flexDirection: 'row',
    marginBottom: 28,
  },
  wordmarkChar: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15.5,
    padding: 0,
  },
  sectionRow: {
    width: '100%',
    marginTop: 36,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    gap: 18,
  },
  shortcut: {
    width: 64,
    alignItems: 'center',
    gap: 7,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  shortcutLabel: {
    fontSize: 12,
    maxWidth: 64,
  },
  footer: {
    marginTop: 44,
    fontSize: 12,
  },
});
