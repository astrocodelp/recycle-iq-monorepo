import { upper, type CategoryId } from '@recycleiq/engine';
import { Info } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Text as RNText,
  StyleSheet,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { categoryColors, colors, font, r, shadow } from '@/lib/theme';
import { PressableScale } from './pressable-scale';

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyLg' | 'caption' | 'micro' | 'eyebrow' | 'num' | 'numLg';

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: font.extrabold, fontSize: 27, lineHeight: 30, letterSpacing: -0.5 },
  h1: { fontFamily: font.extrabold, fontSize: 24, lineHeight: 29, letterSpacing: -0.5 },
  h2: { fontFamily: font.bold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
  h3: { fontFamily: font.bold, fontSize: 14.5, lineHeight: 18, letterSpacing: -0.2 },
  bodyLg: { fontFamily: font.medium, fontSize: 15, lineHeight: 22 },
  body: { fontFamily: font.medium, fontSize: 13.5, lineHeight: 19.5 },
  caption: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: font.bold, fontSize: 10.5, lineHeight: 13 },
  // Uppercased in T() with upper(): Greek capitals take no tonos, which textTransform cannot guarantee.
  eyebrow: { fontFamily: font.bold, fontSize: 11, lineHeight: 13, letterSpacing: 1.3 },
  num: { fontFamily: font.monoBold, fontSize: 14, letterSpacing: -0.3 },
  numLg: { fontFamily: font.monoBold, fontSize: 40, lineHeight: 44, letterSpacing: -1 },
};

export function T({
  v = 'body',
  color = colors.ink,
  style,
  children,
  ...rest
}: TextProps & { v?: Variant; color?: string; style?: StyleProp<TextStyle> }) {
  const text = v === 'eyebrow' && typeof children === 'string' ? upper(children) : children;
  return (
    <RNText {...rest} style={[variants[v], { color }, style]}>
      {text}
    </RNText>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const body = <View style={[styles.card, style]}>{children}</View>;
  return onPress ? (
    <PressableScale onPress={onPress} accessibilityRole="button" scaleTo={0.98}>
      {body}
    </PressableScale>
  ) : (
    body
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'lime' | 'secondary' | 'ghost' | 'dark';
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = { primary: colors['forest-700'], lime: colors.lime, secondary: colors['surface-2'], ghost: 'transparent', dark: colors.ink }[variant];
  const fg = { primary: '#fff', lime: colors['forest-800'], secondary: colors.ink, ghost: colors['forest-700'], dark: '#fff' }[variant];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.button, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }, variant === 'primary' && shadow.soft, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon}
      <T v="bodyLg" color={fg} style={{ fontFamily: font.semibold }}>
        {label}
      </T>
    </PressableScale>
  );
}

export function Chip({ label, icon, selected, onPress }: { label: string; icon?: ReactNode; selected?: boolean; onPress?: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && { backgroundColor: colors.ink, borderColor: colors.ink }]}
    >
      {icon}
      <T v="body" color={selected ? '#fff' : colors.ink} style={{ fontFamily: font.semibold }}>
        {label}
      </T>
    </PressableScale>
  );
}

/** Honesty label: synthetic, illustrative or indicative data is always marked. */
export function DemoBadge({ label }: { label: string }) {
  return (
    <View style={styles.demo}>
      <Info size={12} color={colors['demo-fg']} strokeWidth={2.4} />
      <T v="micro" color={colors['demo-fg']}>
        {label}
      </T>
    </View>
  );
}

export function CategoryPill({ category, label }: { category: CategoryId; label: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: categoryColors[category].soft }]}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: categoryColors[category].solid }} />
      <T v="micro" color={colors.ink}>
        {label}
      </T>
    </View>
  );
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: r.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    ...shadow.soft,
  },
  button: {
    height: 52,
    borderRadius: r.card,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: r.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: r.pill,
    borderWidth: 1,
    borderColor: colors['demo-line'],
    backgroundColor: colors['demo-bg'],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: r.pill,
  },
});
