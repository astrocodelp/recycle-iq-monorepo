import { categoryColors, colors, radius } from '@recycleiq/tokens';
import { Platform } from 'react-native';

export { categoryColors, colors };

const px = (v: string) => Number.parseFloat(v);

export const r = {
  control: px(radius.control),
  card: px(radius.card),
  sheet: px(radius.sheet),
  hero: px(radius.hero),
  pill: 999,
};

// Plus Jakarta Sans has no Greek glyphs: phones fall back to the system sans per glyph,
// browsers need an explicit sans stack or they fall back to serif.
const sans = (f: string) => (Platform.OS === 'web' ? `${f}, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif` : f);
const mono = (f: string) => (Platform.OS === 'web' ? `${f}, ui-monospace, Menlo, monospace` : f);

export const font = {
  regular: sans('PlusJakartaSans_400Regular'),
  medium: sans('PlusJakartaSans_500Medium'),
  semibold: sans('PlusJakartaSans_600SemiBold'),
  bold: sans('PlusJakartaSans_700Bold'),
  extrabold: sans('PlusJakartaSans_800ExtraBold'),
  mono: mono('JetBrainsMono_500Medium'),
  monoBold: mono('JetBrainsMono_700Bold'),
};

/** Soft, ink-tinted elevation (never pure black). */
export const shadow = {
  soft: {
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  pop: {
    shadowColor: colors.ink,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
};
