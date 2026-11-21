import { te } from './l10n';
import type { CategoryId, L10n } from './types';

export interface CategoryMeta {
  id: CategoryId;
  label: L10n;
  short: L10n;
  /** Lucide icon name. */
  icon: string;
  binDescription: L10n;
}

/** The closed system of five disposal categories. Glass is packaging with its own destination. */
export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  packaging: {
    id: 'packaging',
    label: te('Μπλε κάδος', 'Blue recycling bin'),
    short: te('Μπλε κάδος', 'Recycling'),
    icon: 'Container',
    binDescription: te(
      'Άδειες συσκευασίες από πλαστικό, μέταλλο, χαρτί και γυαλί — χύμα, όχι σε δεμένη σακούλα.',
      'Plastic, metal, paper and glass packaging — clean and empty.',
    ),
  },
  organic: {
    id: 'organic',
    label: te('Καφέ κάδος', 'Brown organic bin'),
    short: te('Καφέ κάδος', 'Organic'),
    icon: 'Leaf',
    binDescription: te(
      'Υπολείμματα τροφών και κήπου, που γίνονται κομπόστ.',
      'Food and garden scraps that become compost.',
    ),
  },
  general: {
    id: 'general',
    label: te('Πράσινος κάδος', 'Green bin (general waste)'),
    short: te('Πράσινος κάδος', 'General'),
    icon: 'Trash2',
    binDescription: te(
      'Ό,τι δεν ανακυκλώνεται ούτε γίνεται κομπόστ.',
      'Everything that cannot be recycled or composted.',
    ),
  },
  special: {
    id: 'special',
    label: te('Ειδική συλλογή', 'Special collection'),
    short: te('Ειδικά', 'Special'),
    icon: 'Zap',
    binDescription: te(
      'Μπαταρίες, ηλεκτρικές συσκευές, λάμπες και επικίνδυνα απόβλητα — σε ειδικά σημεία.',
      'Batteries, electrical appliances, bulbs and hazardous waste — at dedicated points.',
    ),
  },
  bulky: {
    id: 'bulky',
    label: te('Ογκώδη', 'Bulky waste'),
    short: te('Ογκώδη', 'Bulky'),
    icon: 'Sofa',
    binDescription: te(
      'Έπιπλα και άλλα ογκώδη αντικείμενα — αποκομιδή κατόπιν ραντεβού.',
      'Furniture and large items — collected by appointment.',
    ),
  },
};

/** Where an item physically goes. */
export const DESTINATIONS = {
  blue: CATEGORIES.packaging.label,
  brown: CATEGORIES.organic.label,
  general: te('Πράσινος κάδος', 'General waste bin'),
  battery: te('Σημείο συλλογής μπαταριών', 'Battery collection point'),
  weee: te('Σημείο συλλογής ηλεκτρικών συσκευών', 'WEEE collection point'),
  bulky: te('Αποκομιδή ογκωδών κατόπιν ραντεβού', 'Bulky pickup by appointment'),
  glass: te('Καμπάνα γυαλιού', 'Glass bell'),
  textiles: te('Μωβ κάδος ρούχων', 'Purple clothing bin'),
} as const satisfies Record<string, L10n>;
