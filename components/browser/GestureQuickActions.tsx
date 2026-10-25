import { Ionicons } from '@expo/vector-icons';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

import { BrowserTheme } from '@/constants/BrowserColors';
import {
  parseQuickActionMessage,
  type QuickAction,
  type QuickActionZone,
} from '@/lib/quickActions';

export type { QuickAction };

type Selection = QuickAction | null;

interface QuickActionsOptions {
  canGoBack: boolean;
  canGoForward: boolean;
  onAction: (action: QuickAction) => void;
}

export interface QuickActionsController {
  armed: boolean;
  selection: Selection;
  anim: Animated.Value;
  pulse: Animated.Value;
  /** Feed raw WebView onMessage payloads; returns true when consumed. */
  handleMessage: (data: string) => boolean;
}

/**
 * State side of the page-driven quick actions gesture (see lib/quickActions.ts
 * for the injected page observer). The page reports raw zones; validity
 * (canGoBack / canGoForward) is enforced here, on the RN side.
 */
export function useQuickActions({ canGoBack, canGoForward, onAction }: QuickActionsOptions): QuickActionsController {
  const [armed, setArmed] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);

  const armedRef = useRef(false);
  const selectionRef = useRef<Selection>(null);
  const canGoBackRef = useRef(canGoBack);
  const canGoForwardRef = useRef(canGoForward);
  const onActionRef = useRef(onAction);
  canGoBackRef.current = canGoBack;
  canGoForwardRef.current = canGoForward;
  onActionRef.current = onAction;

  const anim = useRef(new Animated.Value(0)).current; // 0 hidden, 1 shown
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (armed) {
      Animated.parallel([
        Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.spring(pulse, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }),
      ]).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else {
      Animated.timing(anim, { toValue: 0, duration: 120, useNativeDriver: true }).start();
      selectionRef.current = null;
      setSelection(null);
    }
  }, [armed, anim, pulse]);

  const select = useCallback((s: Selection) => {
    if (selectionRef.current === s) return;
    selectionRef.current = s;
    setSelection(s);
    if (s) Haptics.selectionAsync().catch(() => {});
  }, []);

  const handleMessage = useCallback((data: string): boolean => {
    const msg = parseQuickActionMessage(data);
    if (!msg) return false;
    switch (msg.__qa) {
      case 'arm': {
        if (!armedRef.current) {
          armedRef.current = true;
          selectionRef.current = null;
          setSelection(null);
          setArmed(true);
        }
        break;
      }
      case 'select': {
        const zone: QuickActionZone = msg.zone;
        const valid =
          zone === 'refresh' ||
          (zone === 'back' && canGoBackRef.current) ||
          (zone === 'forward' && canGoForwardRef.current);
        select(valid ? zone : null);
        break;
      }
      case 'end': {
        const wasArmed = armedRef.current;
        const sel = selectionRef.current;
        armedRef.current = false;
        setArmed(false);
        if (wasArmed && sel && (msg.dy ?? 0) > 8) {
          onActionRef.current(sel);
        }
        break;
      }
    }
    return true;
  }, [select]);

  return { armed, selection, anim, pulse, handleMessage };
}

interface QuickActionsOverlayProps {
  colors: BrowserTheme;
  armed: boolean;
  selection: Selection;
  anim: Animated.Value;
  pulse: Animated.Value;
  canGoBack: boolean;
  canGoForward: boolean;
}

/**
 * Pure visual pill for the quick actions gesture. pointerEvents="none" keeps
 * it invisible to touches so it can float above the WebView safely.
 */
export const QuickActionsOverlay = memo(function QuickActionsOverlay({
  colors,
  armed,
  selection,
  anim,
  pulse,
  canGoBack,
  canGoForward,
}: QuickActionsOverlayProps) {
  if (!armed) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.pillWrap, { opacity: anim, transform: [{ scale: pulse }] }]}>
      <View style={[styles.pill, { backgroundColor: colors.chrome, borderColor: colors.border }]}>
        <ActionIcon
          colors={colors}
          icon="arrow-back"
          label="Back"
          active={selection === 'back'}
          disabled={!canGoBack}
        />
        <ActionIcon colors={colors} icon="refresh" label="Refresh" active={selection === 'refresh'} />
        <ActionIcon
          colors={colors}
          icon="arrow-forward"
          label="Forward"
          active={selection === 'forward'}
          disabled={!canGoForward}
        />
      </View>
      <Text style={[styles.hint, { color: colors.secondaryText }]}>
        Release to open {selection ? labelOf(selection) : '· drag to an action'}
      </Text>
    </Animated.View>
  );
});

function labelOf(action: QuickAction): string {
  return action === 'back' ? 'Back' : action === 'forward' ? 'Forward' : 'Refresh';
}

interface ActionIconProps {
  colors: BrowserTheme;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  disabled?: boolean;
}

function ActionIcon({ colors, icon, label, active, disabled }: ActionIconProps) {
  const tint = disabled ? colors.secondaryText : active ? '#FFFFFF' : colors.icon;
  const bg = active ? (disabled ? colors.secondaryText : colors.accent) : 'transparent';
  return (
    <View style={styles.slot}>
      <View style={[styles.circle, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <Text style={[styles.slotLabel, { color: active ? colors.text : colors.secondaryText }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pillWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    elevation: 30,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 40,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 14,
  },
  slot: {
    alignItems: 'center',
    gap: 4,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  hint: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: '500',
  },
});
