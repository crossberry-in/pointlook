import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { memo, useRef } from 'react';

import { BrowserTheme } from '@/constants/BrowserColors';
import {
  displayUrl,
  domainOf,
  HistoryEntry,
  isSecure,
} from '@/lib/browser';

interface OmniboxProps {
  colors: BrowserTheme;
  url: string | null;
  loading: boolean;
  editing: boolean;
  draft: string;
  history: HistoryEntry[];
  /** Name of the active search engine (for the placeholder + suggestions). */
  engineName?: string;
  onChangeDraft: (text: string) => void;
  onStartEditing: () => void;
  onSubmit: (text: string) => void;
  onReloadOrStop: () => void;
}

interface Suggestion {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  value: string;
}

/**
 * Chrome-style top address bar: pill with lock icon + URL, reload/stop button,
 * and a suggestions dropdown (Google search + history matches) while editing.
 */
export const Omnibox = memo(function Omnibox({
  colors,
  url,
  loading,
  editing,
  draft,
  history,
  engineName,
  onChangeDraft,
  onStartEditing,
  onSubmit,
  onReloadOrStop,
}: OmniboxProps) {
  const inputRef = useRef<TextInput>(null);
  const placeholder = `Search ${engineName ?? 'Google'} or type a URL`;

  const commit = (text: string) => {
    onSubmit(text);
    inputRef.current?.blur();
  };

  const suggestions = buildSuggestions(draft, history, engineName);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.row, { backgroundColor: colors.chrome }]}>
        {editing ? (
          <View
            style={[
              styles.pill,
              {
                backgroundColor: colors.pillEditing,
                borderColor: colors.accent,
                borderWidth: 2,
              },
            ]}>
            <Ionicons name="search" size={18} color={colors.secondaryText} />
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.text }]}
              value={draft}
              onChangeText={onChangeDraft}
              placeholder={placeholder}
              placeholderTextColor={colors.secondaryText}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="go"
              onSubmitEditing={() => commit(draft)}
              autoFocus
            />
            {draft.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  onChangeDraft('');
                  inputRef.current?.focus();
                }}
                hitSlop={10}>
                <Ionicons name="close-circle" size={20} color={colors.secondaryText} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.pill, { backgroundColor: colors.pill }]}
            activeOpacity={0.85}
            onPress={onStartEditing}>
            <Ionicons
              name={isSecure(url) ? 'lock-closed' : 'information-circle-outline'}
              size={16}
              color={colors.secondaryText}
            />
            <Text
              style={[styles.urlText, { color: url ? colors.text : colors.secondaryText }]}
              numberOfLines={1}>
              {url ? displayUrl(url) : placeholder}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.roundBtn} onPress={onReloadOrStop} hitSlop={6}>
          <Ionicons name={loading ? 'close' : 'refresh'} size={22} color={colors.icon} />
        </TouchableOpacity>
      </View>

      {editing && suggestions.length > 0 && (
        <View style={[styles.suggestions, { backgroundColor: colors.chrome }]}>
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={styles.suggestionRow}
              onPress={() => commit(s.value)}>
              <View style={[styles.iconBox, { backgroundColor: colors.pill }]}>
                <Ionicons name={s.icon} size={16} color={colors.secondaryText} />
              </View>
              <View style={styles.suggestionText}>
                <Text
                  style={[styles.suggestionTitle, { color: colors.text }]}
                  numberOfLines={1}>
                  {s.title}
                </Text>
                {!!s.sub && (
                  <Text
                    style={[styles.suggestionSub, { color: colors.secondaryText }]}
                    numberOfLines={1}>
                    {s.sub}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

function buildSuggestions(draft: string, history: HistoryEntry[], engineName?: string): Suggestion[] {
  const q = draft.trim();
  if (!q) return [];
  const out: Suggestion[] = [];
  const isSearch = !/^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(q);
  out.push({
    key: 'primary',
    icon: isSearch ? 'search' : 'globe-outline',
    title: q,
    sub: isSearch ? `${engineName ?? 'Google'} Search` : 'Visit site',
    value: q,
  });
  const lq = q.toLowerCase();
  for (const entry of history) {
    if (out.length >= 6) break;
    const hitUrl = entry.url.toLowerCase().includes(lq);
    const hitTitle = (entry.title || '').toLowerCase().includes(lq);
    if (!hitUrl && !hitTitle) continue;
    if (entry.url === q) continue;
    out.push({
      key: entry.url,
      icon: 'globe-outline',
      title: entry.title || domainOf(entry.url),
      sub: displayUrl(entry.url),
      value: entry.url,
    });
  }
  return out;
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 20,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 4,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  urlText: {
    flex: 1,
    fontSize: 16,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestions: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 58,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    flex: 1,
    gap: 1,
  },
  suggestionTitle: {
    fontSize: 15,
  },
  suggestionSub: {
    fontSize: 12.5,
  },
});
