import { locateDistrict } from '@recycleiq/engine';
import * as Location from 'expo-location';
import type { District } from './api';

export type LocateResult =
  | { ok: true; districtId: string; coords: { lng: number; lat: number } }
  | { ok: false; reason: 'denied' | 'outside' | 'error' };

/**
 * Privacy by design: the GPS fix is turned into a neighbourhood here, on the device.
 * Only the district id is stored or sent to the server; coordinates stay in memory for
 * ranking nearby bins locally and are never transmitted.
 */
export async function locateNeighbourhood(districts: District[]): Promise<LocateResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { ok: false, reason: 'denied' };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const coords = { lng: pos.coords.longitude, lat: pos.coords.latitude };
    const districtId = locateDistrict(coords.lng, coords.lat, districts);
    return districtId ? { ok: true, districtId, coords } : { ok: false, reason: 'outside' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
