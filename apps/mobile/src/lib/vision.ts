/**
 * On-device recognition with SigLIP 2 (see docs/VISION.md).
 *
 * This file is the web / fallback build: there is no on-device model there, so `recognize` returns
 * null and the scan screen shows the normal pick list. The real implementation is vision.native.ts.
 */

export interface Recognition {
  /** Catalogue object ids, most likely first, with the calibrated SigLIP probability. */
  ranked: { id: string; p: number }[];
  /** A non-catalogue label (a person, a street, a can, ...) scored highest. */
  otherWon: boolean;
  /** Probability of the top catalogue object. */
  topP: number;
  /** Clear enough to suggest the first item ("looks like ..."), not to decide on its own. */
  sure: boolean;
}

export interface RecognizeOptions {
  /** First run only: model download progress, 0..1. */
  onDownload?: (fraction: number) => void;
  /** Cancels the download / recognition; recognize then resolves to null. */
  signal?: AbortSignal;
}

/** Whether this build can run the model at all. */
export const visionSupported = false;

/** Whether the model file is already on the phone (no download needed). */
export function isModelDownloaded(): boolean {
  return false;
}

export async function recognize(_photoUri: string, _options: RecognizeOptions = {}): Promise<Recognition | null> {
  return null;
}
