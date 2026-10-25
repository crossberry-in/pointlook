import { Ionicons } from '@expo/vector-icons';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { memo, useEffect, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { BrowserTheme } from '@/constants/BrowserColors';

export type QuickAction = 'back' | 'refresh' | 'forward';

interface GestureQuickActionsProps {
  colors: BrowserTheme;
  onAction: (action: QuickAction) => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

type Selection = QuickAction | null;

const ARM_DISTANCE = 26; // px of downward drag needed to reveal the pill
const SELECT_DISTANCE = 56; // px of horizontal drag needed to pick a side icon

/**
 * Chrome-style quick actions gesture: long-press on the page, then drag DOWN
 * to reveal a floating pill in the center with [back] [refresh] [forward].
 * Keep dragging toward an icon to highlight it, release to activate it.
 * A plain long-press (no drag) does nothing, so text selection still works.
 */
export const GestureQuickActions = memo(function GestureQuickActions({
  colors,
  onAction,
  canGoBack,
  canGoForward,
}: GestureQuickActionsProps) {
  const [armed, setArmed] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);

  const armedRef = useRef(false);
  const selectionRef = useRef<Selection>(null);
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

  const select = (s: Selection) => {
    if (selectionRef.current === s) return;
    selectionRef.current = s;
    setSelection(s);
    if (s) Haptics.selectionAsync().catch(() => {});
  };

  const gesture = Gesture.Pan()
    // Long-press arms the gesture; moving >10px before it fires FAILS the
    // handler so normal page scrolling and text selection stay untouched.
    .activateAfterLongPress(420)
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .runOnJS(true) // plain JS callbacks (we use RN Animated, not reanimated)
    .onUpdate((e) => {
      const dy = e.translationY;
      const dx = e.translationX;
      const downward = dy > ARM_DISTANCE && Math.abs(dx) < dy * 1.4;
      if (!armedRef.current) {
        if (downward) {
          armedRef.current = true;
          select(null);
          setArmed(true);
        }
        return;
      }
      if (dy < 8) {
        select(null); // dragged back up: deselect
        return;
      }
      if (dx < -SELECT_DISTANCE) select(canGoBack ? 'back' : null);
      else if (dx > SELECT_DISTANCE) select(canGoForward ? 'forward' : null);
      else select('refresh');
    })
    .onFinalize((e) => {
      const wasArmed = armedRef.current;
      const sel = selectionRef.current;
      const dy = e.translationY;
      armedRef.current = false;
      if (wasArmed) {
        setArmed(false);
        if (sel && dy > 8) onAction(sel);
      }
    });

  return (
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill}>
        {armed ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pillWrap,
              {
                opacity: anim,
                transform: [{ scale: pulse }],
              },
            ]}>
            <View style={[styles.pill, { backgroundColor: colors.chrome, borderColor: colors.border }]}>
              <ActionIcon
                colors={colors}
                icon="arrow-back"
                label="Back"
                active={selection === 'back'}
                disabled={!canGoBack}
              />
              <ActionIcon
                colors={colors}
                icon="refresh"
                label="Refresh"
                active={selection === 'refresh'}
              />
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
        ) : null}
      </View>
    </GestureDetector>
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
