import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { memo } from 'react';

import { BrowserTheme } from '@/constants/BrowserColors';

interface ToolbarProps {
  colors: BrowserTheme;
  canGoBack: boolean;
  canGoForward: boolean;
  tabCount: number;
  onBack: () => void;
  onForward: () => void;
  onHome: () => void;
  onTabs: () => void;
  onMenu: () => void;
}

const ICON_SIZE = 23;

/**
 * Chrome-like bottom toolbar: back, forward, home, tab counter (number in a
 * rounded square), and the overflow menu.
 */
export const Toolbar = memo(function Toolbar({
  colors,
  canGoBack,
  canGoForward,
  tabCount,
  onBack,
  onForward,
  onHome,
  onTabs,
  onMenu,
}: ToolbarProps) {
  const disabled = colors.secondaryText;
  const enabled = colors.icon;

  return (
    <View style={[styles.root, { backgroundColor: colors.chrome, borderTopColor: colors.border }]}>
      <ToolButton
        name="arrow-back"
        color={canGoBack ? enabled : disabled}
        disabled={!canGoBack}
        onPress={onBack}
      />
      <ToolButton
        name="arrow-forward"
        color={canGoForward ? enabled : disabled}
        disabled={!canGoForward}
        onPress={onForward}
      />
      <ToolButton name="home-outline" color={enabled} onPress={onHome} />

      <TouchableOpacity style={styles.btn} onPress={onTabs} hitSlop={6}>
        <View style={[styles.tabCounter, { borderColor: enabled }]}>
          <Text style={[styles.tabCount, { color: enabled }]}>
            {tabCount > 99 ? '∞' : tabCount}
          </Text>
        </View>
      </TouchableOpacity>

      <ToolButton name="ellipsis-vertical" color={enabled} onPress={onMenu} />
    </View>
  );
});

interface ToolButtonProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  disabled?: boolean;
  onPress: () => void;
}

function ToolButton({ name, color, disabled, onPress }: ToolButtonProps) {
  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      activeOpacity={disabled ? 1 : 0.6}>
      <Ionicons name={name} size={ICON_SIZE} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 52,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    width: 52,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCounter: {
    width: 19,
    height: 19,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCount: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});
