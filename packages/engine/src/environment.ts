// What the planet gains: an ESTIMATE of greenhouse-gas emissions avoided when an item is recycled
// (or composted) as the engine recommends, instead of being landfilled with virgin material made
// in its place. Using the app is not verified recycling, so every figure is "if recycled correctly".
//
// Source: UK Government (DESNZ) GHG Conversion Factors for Company Reporting, 2025, condensed set:
//   "Material use"  : primary material production vs closed-loop source (kg CO2e / tonne)
//   "Waste disposal": landfill vs closed-loop recycling / composting (kg CO2e / tonne)
//   "Passenger vehicles": average car, unknown fuel, 0.16725 kg CO2e / km
// https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025
import { te } from './l10n';
import type { CategoryId, L10n } from './types';

export const IMPACT_SOURCE = {
  name: 'UK DESNZ GHG Conversion Factors 2025 (condensed set)',
  url: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025',
} as const;

/** kg CO2e per km, average car, unknown fuel (DESNZ 2025). */
export const CAR_KG_PER_KM = 0.16725;

/** kg CO2e avoided per kg: (primary − closed-loop material) + (landfill − recycling/composting disposal). */
export const AVOIDED_KG_PER_KG = {
  pet: (3863.90131 - 2213.90131 + (8.98311 - 4.68568)) / 1000, // 1.654
  glass: (1402.76667 - 823.18954 + (8.98311 - 4.68568)) / 1000, // 0.584
  board: (1199.72542 - 1098.11442 + (1164.4894 - 4.68568)) / 1000, // 1.261
  aluminium: (9115.90131 - 995.0779 + (8.98311 - 4.68568)) / 1000, // 8.125
  foodCompost: (700.30886 - 8.98311) / 1000, // 0.691 (composting instead of landfill)
} as const;

type Material = keyof typeof AVOIDED_KG_PER_KG;

/** Typical item weights: assumptions, stated to the user. */
const ITEMS: Record<string, { material: Material; kg: number; what: L10n; recycledIn: CategoryId }> = {
  'plastic-bottle': { material: 'pet', kg: 0.025, what: te('ένα πλαστικό μπουκάλι 25 γρ.', 'a 25 g plastic bottle'), recycledIn: 'packaging' },
  'glass-bottle': { material: 'glass', kg: 0.35, what: te('ένα γυάλινο μπουκάλι 350 γρ.', 'a 350 g glass bottle'), recycledIn: 'packaging' },
  can: { material: 'aluminium', kg: 0.015, what: te('ένα κουτάκι αλουμινίου 15 γρ.', 'a 15 g aluminium can'), recycledIn: 'packaging' },
  'cardboard-box': { material: 'board', kg: 0.3, what: te('ένα χαρτόκουτο 300 γρ.', 'a 300 g cardboard box'), recycledIn: 'packaging' },
  'pizza-box': { material: 'board', kg: 0.2, what: te('ένα καθαρό κουτί πίτσας 200 γρ.', 'a clean 200 g pizza box'), recycledIn: 'packaging' },
  'food-scraps': { material: 'foodCompost', kg: 0.5, what: te('μισό κιλό υπολείμματα τροφών', 'half a kilo of food scraps'), recycledIn: 'organic' },
};

export interface Impact {
  /** Grams of CO2e avoided, or null when no official factor applies. */
  grams: number | null;
  /** Equivalent car distance in km (one decimal), when grams is known. */
  carKm: number | null;
  /** True when this decision actually sends the item to recycling/composting. */
  counts: boolean;
  headline: L10n;
  detail: L10n;
}

const fmtG = (g: number, lang: 'el' | 'en') =>
  g >= 1000 ? `${(g / 1000).toFixed(1).replace('.', lang === 'el' ? ',' : '.')} ${lang === 'el' ? 'κιλά' : 'kg'}` : `${Math.round(g)} ${lang === 'el' ? 'γρ.' : 'g'}`;
const fmtKm = (km: number, lang: 'el' | 'en') => `${km < 1 ? (km * 1000).toFixed(0) + (lang === 'el' ? ' μέτρα' : ' m') : km.toFixed(1).replace('.', lang === 'el' ? ',' : '.') + (lang === 'el' ? ' χλμ.' : ' km')}`;

/** Grams of CO2e avoided by one correctly recycled item of this kind, if an official factor applies. */
export function itemGrams(objectId: string): number | null {
  const it = ITEMS[objectId];
  return it ? it.kg * AVOIDED_KG_PER_KG[it.material] * 1000 : null;
}

/** The planet-gain message for a decision. */
export function impactFor(objectId: string, category: CategoryId, uncertain = false): Impact {
  const it = ITEMS[objectId];
  if (uncertain)
    return { grams: null, carKm: null, counts: false, headline: te('Μάθε πρώτα τι είναι', 'Find out what it is first'), detail: te('Όταν ξέρουμε το αντικείμενο, σου λέμε τι κερδίζει το περιβάλλον.', 'Once we know the item, we tell you what the planet gains.') };
  if (it) {
    const g = it.kg * AVOIDED_KG_PER_KG[it.material] * 1000;
    const km = g / 1000 / CAR_KG_PER_KM;
    const counts = category === it.recycledIn;
    return {
      grams: Math.round(g),
      carKm: Math.round(km * 10) / 10,
      counts,
      headline: counts
        ? te(`Γλιτώνεις ~${fmtG(g, 'el')} CO₂e`, `You save ~${fmtG(g, 'en')} CO₂e`)
        : te(`Θα γλίτωνε ~${fmtG(g, 'el')} CO₂e αν ανακυκλωνόταν`, `It would save ~${fmtG(g, 'en')} CO₂e if recycled`),
      detail: counts
        ? te(
            `Σαν να μη διανύσει ένα αυτοκίνητο ${fmtKm(km, 'el')}. Εκτίμηση για ${it.what.el}, αν ανακυκλωθεί σωστά, σε σύγκριση με ταφή και νέα πρώτη ύλη.`,
            `Like a car not driving ${fmtKm(km, 'en')}. Estimate for ${it.what.en}, if recycled correctly, compared with landfill and new raw material.`,
          )
        : te(
            `Σε αυτή την κατάσταση δεν ανακυκλώνεται. Την επόμενη φορά, καθαρό, μετράει.`,
            `In this state it can't be recycled. Next time, clean, it counts.`,
          ),
    };
  }
  if (category === 'packaging')
    return { grams: null, carKm: null, counts: true, headline: te('Γίνεται ξανά πρώτη ύλη', 'It becomes raw material again'), detail: te('Στον μπλε κάδο το υλικό ξαναμπαίνει στην παραγωγή αντί να καταλήξει σε χωματερή.', 'In the blue bin the material goes back into production instead of landfill.') };
  if (objectId === 'clothes')
    return { grams: null, carKm: null, counts: true, headline: te('Ξαναφοριούνται ή γίνονται νέες ίνες', 'Worn again or made into new fibres'), detail: te('Στον κάδο ρούχων τα υφάσματα πάνε για επαναχρησιμοποίηση ή ανακύκλωση αντί για χωματερή.', 'In the clothing bin, textiles go to reuse or recycling instead of landfill.') };
  if (category === 'special')
    return { grams: null, carKm: null, counts: true, headline: te('Ανακτώνται πολύτιμα μέταλλα', 'Valuable metals are recovered'), detail: te('Στο σημείο συλλογής ανακτώνται μέταλλα και οι επικίνδυνες ουσίες δεν καταλήγουν στο έδαφος και στο νερό.', 'At the collection point metals are recovered and hazardous substances stay out of soil and water.') };
  if (category === 'bulky')
    return { grams: null, carKm: null, counts: true, headline: te('Ένα αντικείμενο λιγότερο στο πεζοδρόμιο', 'One less item on the pavement'), detail: te('Με ραντεβού τα ογκώδη πάνε για επαναχρησιμοποίηση ή ανάκτηση, όχι στον δρόμο.', 'With a booked pickup, bulky items go to reuse or recovery, not the street.') };
  return { grams: null, carKm: null, counts: false, headline: te('Σωστή επιλογή για τα σύμμεικτα', 'The right choice for general waste'), detail: te('Δεν λερώνεις την ανακύκλωση, ώστε τα υπόλοιπα υλικά να ανακυκλωθούν κανονικά.', 'You keep recycling clean so everything else can be recycled.') };
}

/** Total estimated kg CO2e avoided by a set of decisions, counting only those that go to recycling/composting. */
export function totalAvoidedKg(rows: readonly { objectId: string; category: CategoryId; n: number }[]): number {
  let g = 0;
  for (const r of rows) {
    const it = ITEMS[r.objectId];
    if (it && r.category === it.recycledIn) g += r.n * it.kg * AVOIDED_KG_PER_KG[it.material] * 1000;
  }
  return g / 1000;
}
