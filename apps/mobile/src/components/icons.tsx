import type { CategoryId } from '@recycleiq/engine';
import {
  Apple,
  Battery,
  CircleHelp,
  Coffee,
  Container,
  CupSoda,
  Leaf,
  Newspaper,
  Package,
  Pizza,
  Shirt,
  Sofa,
  Trash2,
  Wine,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';
import { categoryColors, colors } from '@/lib/theme';

const OBJECT_ICONS: Record<string, LucideIcon> = { Container, CupSoda, Newspaper, Package, Pizza, Shirt, Apple, Battery, Sofa, Wine, Coffee, HelpCircle: CircleHelp };
const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = { packaging: Container, organic: Leaf, general: Trash2, special: Zap, bulky: Sofa };

export function ObjectIcon({ name, size = 20, color = colors.ink }: { name: string; size?: number; color?: string }) {
  const Icon = OBJECT_ICONS[name] ?? CircleHelp;
  return <Icon size={size} color={color} strokeWidth={2} />;
}

/** Rounded-square tile in the category colour with a white glyph (never a circle). */
export function CategoryTile({ category, size = 44, variant = 'solid' }: { category: CategoryId; size?: number; variant?: 'solid' | 'soft' }) {
  const Icon = CATEGORY_ICONS[category];
  const c = categoryColors[category];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.27,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: variant === 'solid' ? c.solid : c.soft,
      }}
    >
      <Icon size={size * 0.48} color={variant === 'solid' ? '#fff' : c.solid} strokeWidth={2.3} />
    </View>
  );
}
