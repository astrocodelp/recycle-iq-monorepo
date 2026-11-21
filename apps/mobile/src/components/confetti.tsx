import { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { colors } from '@/lib/theme';

const PALETTE = [colors.lime, colors['forest-500'], colors['cat-packaging'], colors['cat-special'], colors['lime-300'], colors['forest-700']];

/** A one-shot burst of confetti from the top. Respects the OS reduce-motion setting. */
export function Confetti({ run, count = 70 }: { run: number; count?: number }) {
  const { width, height } = Dimensions.get('window');
  const progress = useRef(new Animated.Value(0)).current;
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        drift: (Math.random() - 0.5) * 160,
        delay: Math.random() * 0.25,
        size: 6 + Math.random() * 7,
        round: i % 3 === 0,
        spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
        color: PALETTE[i % PALETTE.length]!,
      })),
    // New pieces per burst.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, count, width],
  );

  useEffect(() => {
    if (!run) return;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [run, progress]);

  if (!run) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const t = progress.interpolate({ inputRange: [p.delay, 1], outputRange: [0, 1], extrapolate: 'clamp' });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: -20,
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              borderRadius: p.round ? p.size : 2,
              backgroundColor: p.color,
              opacity: t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.85] }) },
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
                { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
