import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrowserTheme } from '@/constants/BrowserColors';

interface BrowserMenuProps {
  colors: BrowserTheme;
  visible: boolean;
  desktop: boolean;
  incognito: boolean;
  onNewTab: () => void;
  onShare: () => void;
  onReload: () => void;
  onToggleDesktop: () => void;
  onToggleIncognito: () => void;
  onDownloads: () => void;
  onSettings: () => void;
  onDevTools: () => void;
  onClearData: () => void;
  onCloseTab: () => void;
  onDismiss: () => void;
}

/**
 * Chrome-style overflow (⋮) menu rendered as a translucent modal anchored
 * above the bottom-right toolbar.
 */
export function BrowserMenu({
  colors,
  visible,
  desktop,
  incognito,
  onNewTab,
  onShare,
  onReload,
  onToggleDesktop,
  onToggleIncognito,
  onDownloads,
  onSettings,
  onDevTools,
  onClearData,
  onCloseTab,
  onDismiss,
}: BrowserMenuProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <TouchableOpacity
        style={[styles.backdrop, { paddingTop: insets.top }]}
        activeOpacity={1}
        onPress={onDismiss}>
        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.chrome,
              marginBottom: insets.bottom + 60,
            },
          ]}>
          <MenuRow
            colors={colors}
            icon="add-outline"
            label="New tab"
            onPress={() => {
              onDismiss();
              onNewTab();
            }}
          />
          <ToggleRow
            colors={colors}
            icon="eye-off-outline"
            label="Incognito mode"
            value={incognito}
            onToggle={() => {
              onDismiss();
              onToggleIncognito();
            }}
          />
          <MenuRow
            colors={colors}
            icon="download-outline"
            label="Downloads"
            onPress={() => {
              onDismiss();
              onDownloads();
            }}
          />
          <MenuRow
            colors={colors}
            icon="settings-outline"
            label="Settings"
            onPress={() => {
              onDismiss();
              onSettings();
            }}
          />
          <MenuRow
            colors={colors}
            icon="code-slash-outline"
            label="Developer tools"
            onPress={() => {
              onDismiss();
              onDevTools();
            }}
          />
          <View style={[styles.divider, { borderTopColor: colors.border }]} />
          <MenuRow
            colors={colors}
            icon="refresh"
            label="Reload"
            onPress={() => {
              onDismiss();
              onReload();
            }}
          />
          <MenuRow
            colors={colors}
            icon="share-social-outline"
            label="Share"
            onPress={() => {
              onDismiss();
              onShare();
            }}
          />
          <ToggleRow
            colors={colors}
            icon="desktop-outline"
            label="Desktop site"
            value={desktop}
            onToggle={() => {
              onDismiss();
              onToggleDesktop();
            }}
          />
          <MenuRow
            colors={colors}
            icon="trash-outline"
            label="Clear cookies & cache"
            onPress={() => {
              onDismiss();
              onClearData();
            }}
          />
          <View style={[styles.divider, { borderTopColor: colors.border }]} />
          <MenuRow
            colors={colors}
            icon="close-outline"
            label="Close this tab"
            danger
            onPress={() => {
              onDismiss();
              onCloseTab();
            }}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

interface MenuRowProps {
  colors: BrowserTheme;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function MenuRow({ colors, icon, label, danger, disabled, onPress }: MenuRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      disabled={disabled}
      activeOpacity={disabled ? 1 : 0.6}
      onPress={onPress}>
      <Ionicons
        name={icon}
        size={21}
        color={danger ? colors.danger : colors.icon}
      />
      <Text style={[styles.label, { color: danger ? colors.danger : colors.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface ToggleRowProps {
  colors: BrowserTheme;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onToggle: () => void;
}

function ToggleRow({ colors, icon, label, value, onToggle }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={21} color={colors.icon} />
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
  },
  panel: {
    minWidth: 250,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 18,
    height: 48,
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 15.5,
  },
});
