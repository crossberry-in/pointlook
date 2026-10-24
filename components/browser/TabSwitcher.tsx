import { Ionicons } from '@expo/vector-icons';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { avatarColorFor, BrowserTheme } from '@/constants/BrowserColors';
import { avatarLetter, domainOf, Tab } from '@/lib/browser';

interface TabSwitcherProps {
  colors: BrowserTheme;
  tabs: Tab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  onDismiss: () => void;
}

/**
 * Chrome-style tab grid: full-screen overlay with 2-column tab cards,
 * a header with the tab count, and a floating "+" action button.
 */
export function TabSwitcher({
  colors,
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
  onDismiss,
}: TabSwitcherProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.switcherBg }]}>
      <View style={[styles.header, { backgroundColor: colors.chrome, paddingTop: insets.top + 4 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'}
        </Text>
        <View style={styles.headerBtn}>
          <Ionicons name="search" size={22} color={colors.secondaryText} />
        </View>
      </View>

      <FlatList
        data={tabs}
        keyExtractor={(t) => t.id}
        numColumns={2}
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: insets.bottom + 88 },
        ]}
        columnWrapperStyle={styles.column}
        renderItem={({ item }) => (
          <TabCard
            colors={colors}
            tab={item}
            active={item.id === activeId}
            onSelect={() => onSelect(item.id)}
            onClose={() => onClose(item.id)}
          />
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.secondaryText }]}>No open tabs</Text>
        }
      />

      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.accent, bottom: insets.bottom + 20 },
        ]}
        onPress={onNew}>
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

interface TabCardProps {
  colors: BrowserTheme;
  tab: Tab;
  active: boolean;
  onSelect: () => void;
  onClose: () => void;
}

function TabCard({ colors, tab, active, onSelect, onClose }: TabCardProps) {
  const domain = domainOf(tab.nav.url ?? tab.url);
  const letter = avatarLetter(tab.nav.title, tab.nav.url ?? tab.url);
  const bg = avatarColorFor(domain);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.cardBg },
        active ? { borderWidth: 2.5, borderColor: colors.accent } : null,
      ]}
      activeOpacity={0.9}
      onPress={onSelect}>
      <View style={styles.cardStrip}>
        <View style={[styles.avatar, { backgroundColor: bg }]}>
          <Text style={styles.avatarLetter}>{letter}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {tab.nav.title || domain}
          </Text>
          <Text style={[styles.cardDomain, { color: colors.secondaryText }]} numberOfLines={1}>
            {tab.url === null && tab.nav.url === null ? 'Start page' : domain}
          </Text>
        </View>
        <TouchableOpacity style={styles.cardClose} onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={18} color={colors.icon} />
        </TouchableOpacity>
      </View>

      <View style={styles.preview}>
        {tab.url === null && tab.nav.url === null ? (
          <Ionicons name="sparkles-outline" size={40} color={colors.border} />
        ) : (
          <Text style={[styles.previewLetter, { color: `${bg}33` }]}>{letter}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  grid: {
    paddingHorizontal: 10,
    gap: 10,
  },
  column: {
    gap: 10,
  },
  card: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  cardStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cardMeta: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardDomain: {
    fontSize: 11,
  },
  cardClose: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  preview: {
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLetter: {
    fontSize: 84,
    fontWeight: '800',
  },
  empty: {
    textAlign: 'center',
    marginTop: 48,
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    left: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
