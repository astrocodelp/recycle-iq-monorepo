import type { Recognition } from './vision';

/**
 * Sure enough to answer on the phone without asking the server. Bench (docs/VISION.md, 150 held-out
 * TrashNet photos): top ≥ 0.03 and ≥ 4× the runner-up → 98% right on about a third of photos.
 */
export function confidentOnDevice(r: Recognition): boolean {
  return !r.otherWon && r.topP >= 0.03 && r.topP >= 4 * (r.ranked[1]?.p ?? 0);
}
