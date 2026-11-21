import { te } from './l10n';
import type { L10n } from './types';

/** Φύλλα (Leaves): the reward currency. Indicatively 100 Φύλλα ≈ 1 euro. */
export const LEAVES_PER_EURO = 100;

export const REWARD_RULES = {
  base: 20,
  matchBonus: 10,
  streakPerDay: 5,
  streakCap: 30,
  specialDropOff: 40,
} as const;

export interface CheckinInput {
  /** Consecutive days with a check-in before today. */
  streakBefore: number;
  /** The bin selfie matches an item the user just scanned (and the decision was not uncertain). */
  matchesScan: boolean;
  /** The item went to a special-collection point. */
  specialDropOff: boolean;
}

export interface CheckinReward {
  earned: number;
  breakdown: { label: L10n; amount: number }[];
}

export function checkinReward(input: CheckinInput): CheckinReward {
  const streak = Math.min(REWARD_RULES.streakCap, REWARD_RULES.streakPerDay * input.streakBefore);
  const breakdown: CheckinReward['breakdown'] = [
    { label: te('Βασική επιβεβαίωση', 'Base check-in'), amount: REWARD_RULES.base },
  ];
  if (input.matchesScan)
    breakdown.push({
      label: te('Ταιριάζει με το αντικείμενό σου', 'Matches your item'),
      amount: REWARD_RULES.matchBonus,
    });
  if (streak > 0) {
    const days = input.streakBefore + 1;
    breakdown.push({ label: te(`Σερί ${days} ημερών`, `${days}-day streak`), amount: streak });
  }
  if (input.specialDropOff)
    breakdown.push({
      label: te('Παράδοση σε σημείο ειδικής συλλογής', 'Special-collection drop-off'),
      amount: REWARD_RULES.specialDropOff,
    });
  return { earned: breakdown.reduce((s, b) => s + b.amount, 0), breakdown };
}

export const leavesToEuro = (leaves: number) => leaves / LEAVES_PER_EURO;
