import { Ionicons } from '@expo/vector-icons';
import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shareAsync as shareFileAsync, isAvailableAsync as sharingAvailable } from 'expo-sharing';

import { BrowserColors } from '@/constants/BrowserColors';
import { useSettings } from '@/hooks/useSettings';
import { useDownloads } from '@/hooks/useDownloads';
import { displayUrl, domainOf, formatBytes } from '@/lib/browser';
import type { DownloadRecord } from '@/lib/browser';

/**
 * Download manager: lists everything downloaded with pointlook, lets the user
 * share (save to Files / send to apps) or delete entries.
 */
export default function DownloadsScreen() {
  const { scheme } = useSettings();
  const colors = BrowserColors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { downloads, busyCount, removeDownload, clearDownloads } = useDownloads();
  const [sharingId, setSharingId] = useState<string | null>(null);

  const shareFile = useCallback(async (record: DownloadRecord) => {
    if (!(await sharingAvailable())) {
      Share.share({ message: record.url }).catch(() => {});
      return;
    }
    setSharingId(record.id);
    try {
      await shareFileAsync(record.fileUri, {
        mimeType: record.mime || 'application/octet-stream',
        dialogTitle: `Save or share ${record.filename}`,
        UTI: 'public.data',
      });
    } catch {
      // user cancelled
    } finally {
      setSharingId(null);
    }
  }, []);

  const confirmClear = () => {
    Alert.alert('Clear all downloads?', 'Downloaded files will be removed from app storage.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearDownloads },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.page, paddingTop: insets.top }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      <View style={[styles.header, { backgroundColor: colors.chrome, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.icon} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Downloads</Text>
          {(downloads.length > 0 || busyCount > 0) && (
            <Text style={[styles.headerSub, { color: colors.secondaryText }]}>
              {busyCount > 0 ? `${busyCount} downloading… · ` : ''}
              {downloads.length} file{downloads.length === 1 ? '' : 's'}
            </Text>
          )}
        </View>
        {downloads.length > 0 ? (
          <TouchableOpacity style={styles.headerBtn} onPress={confirmClear} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {downloads.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="file-tray-outline" size={64} color={colors.secondaryText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No downloads yet</Text>
          <Text style={[styles.emptySub, { color: colors.secondaryText }]}>
            Files you download from websites appear here. Tap one to share or save it
            to your device.
          </Text>
        </View>
      ) : (
        <View style={[styles.listWrap, { paddingBottom: insets.bottom + 16 }]}>
          {downloads.map((d) => (
            <View key={d.id} style={[styles.item, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={[styles.fileBadge, { backgroundColor: colors.pill }]}>
                <Ionicons name="document-attach-outline" size={22} color={colors.accent} />
              </View>
              <View style={styles.itemText}>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                  {d.filename}
                </Text>
                <Text style={[styles.itemSub, { color: colors.secondaryText }]} numberOfLines={1}>
                  {formatBytes(d.bytes)} · {domainOf(d.url)} · {new Date(d.ts).toLocaleDateString()}
                </Text>
                <Text style={[styles.itemUrl, { color: colors.secondaryText }]} numberOfLines={1}>
                  {displayUrl(d.url)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.itemBtn}
                disabled={sharingId === d.id}
                onPress={() => shareFile(d)}
                hitSlop={6}>
                <Ionicons
                  name="share-social-outline"
                  size={21}
                  color={sharingId === d.id ? colors.secondaryText : colors.accent}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.itemBtn}
                onPress={() => removeDownload(d.id)}
                hitSlop={6}>
                <Ionicons name="close" size={21} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>
          ))}
          <Text style={[styles.note, { color: colors.secondaryText }]}>
            Tip: tap the share icon and choose “Save to Files” (or any app) to
            copy the file out of the pointlook app storage.
          </Text>
        </View>
      )}
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
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerSub: { fontSize: 12, marginTop: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13.5, textAlign: 'center', lineHeight: 20 },
  listWrap: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 10,
  },
  fileBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1, gap: 1 },
  itemName: { fontSize: 14.5, fontWeight: '600' },
  itemSub: { fontSize: 11.5 },
  itemUrl: { fontSize: 11 },
  itemBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 12, textAlign: 'center', marginTop: 8, paddingHorizontal: 12, lineHeight: 18 },
});
