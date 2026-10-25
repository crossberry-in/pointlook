import { Ionicons } from '@expo/vector-icons';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { BrowserTheme } from '@/constants/BrowserColors';

export type QuickAction = 'back' | 'refresh' | 'forward';

type Selection = QuickAction | null;

const LONG_PRESS_MS = 420; // finger must rest this long before a drag can arm the pill
const ARM_DISTANCE = 26; // px of downward drag needed to reveal the pill
const SELECT_DISTANCE = 56; // px of horizontal drag needed to pick a side icon
const EARLY_MOVE_PX = 12; // moving this far before the long press = ordinary scroll

interface QuickActionsOptions {
  canGoBack: boolean;
  canGoForward: boolean;
  onAction: (action: QuickAction) => void;
}

/**
 * Chrome-style quick actions: long-press on the page, drag DOWN to reveal a
 * floating pill with [back] [refresh] [forward], drag toward an icon, release
 * to activate it.
 *
 * IMPORTANT: the detector returned here must WRAP the WebView
 * (`<GestureDetector gesture={gesture}><WebView/></GestureDetector>`), never
 * sit on top of it as a sibling overlay. A full-screen view over the WebView
 * swallows every touch and the page becomes untouchable. Wrapping the WebView
 * keeps the touch stream flowing into the page until the gesture actually
 * activates:
 *
 *  - any movement >12px before the long-press window elapses FAILS the
 *    handler, so normal scrolling, swiping and flings are never intercepted;
 *  - taps and plain long-presses never activate it either, so links, buttons
 *    and text selection all keep working;
 *  - only rest-then-drag-down activates, which (and only then) cancels the
 *    touch stream to the WebView while the pill is up.
 */
export function useQuickActionsGesture({ canGoBack, canGoForward, onAction }: QuickActionsOptions) {
  const [armed, setArmed] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);

  const armedRef = useRef(false);
  const selectionRef = useRef<Selection>(null);
  const downAtRef = useRef(0);
  const firstMoveAtRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dxRef = useRef(0);
  const dyRef = useRef(0);

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

  const gesture = Gesture.Pan()
    .manualActivation(true) // we decide when to take over from the WebView
    .maxPointers(1)
    .shouldCancelWhenOutside(false)
    .runOnJS(true) // plain JS callbacks (RN Animated + React state, no worklets)
    .onTouchesDown((e) => {
      if (armedRef.current) return; // keep the original anchor while the pill is up
      const t = e.allTouches[0];
      startXRef.current = t?.absoluteX ?? 0;
      startYRef.current = t?.absoluteY ?? 0;
      downAtRef.current = Date.now();
      firstMoveAtRef.current = null;
      dxRef.current = 0;
      dyRef.current = 0;
    })
    .onTouchesMove((e, stateManager) => {
      const t = e.allTouches[0];
      if (!t) return;
      const dx = t.absoluteX - startXRef.current;
      const dy = t.absoluteY - startYRef.current;
      dxRef.current = dx;
      dyRef.current = dy;

      if (!armedRef.current) {
        if (firstMoveAtRef.current === null && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
          firstMoveAtRef.current = Date.now();
        }
        // "rested" = the finger stayed still for the whole long-press window,
        // i.e. this really is a long-press, not a (possibly slow) scroll.
        const rested =
          firstMoveAtRef.current === null ||
          firstMoveAtRef.current - downAtRef.current >= LONG_PRESS_MS;
        if (!rested && (Math.abs(dx) > EARLY_MOVE_PX || Math.abs(dy) > EARLY_MOVE_PX)) {
          stateManager.fail(); // ordinary scroll/swipe: hand the stream back to the WebView
          return;
        }
        if (rested && dy > ARM_DISTANCE && Math.abs(dx) < dy * 1.4) {
          armedRef.current = true;
          select(null);
          setArmed(true);
          stateManager.activate(); // only now the WebView receives a touch cancel
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
    .onFinalize(() => {
      const wasArmed = armedRef.current;
      const sel = selectionRef.current;
      const dy = dyRef.current;
      armedRef.current = false;
      if (wasArmed) {
        setArmed(false);
        if (sel && dy > 8) onAction(sel);
      }
    });

  return { gesture, armed, selection, anim, pulse };
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
