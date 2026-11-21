import { Platform } from 'react-native';
import { Easing, FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated';

// Layout animations target the native app; the web preview renders statically.
const NATIVE = Platform.OS !== 'web';

/** One strong ease-out for everything that enters (cubic-bezier(0.23, 1, 0.32, 1)). */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Springs for anything the finger drives: snappy, no wobble. */
export const SPRING = { damping: 30, stiffness: 420, mass: 0.8 } as const;

/**
 * Staggered entrance: fade + 10px rise, 35ms apart, capped at 8 items so long lists don't drag.
 * Never animates from scale(0); respects the OS reduce-motion setting.
 */
export const enter = (index = 0) =>
  !NATIVE
    ? undefined
    : FadeInDown.delay(Math.min(index, 8) * 35)
    .duration(320)
    .easing(EASE_OUT)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] })
    .reduceMotion(ReduceMotion.System);

export const fade = (delay = 0) =>
  !NATIVE ? undefined : FadeIn.delay(delay).duration(220).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
