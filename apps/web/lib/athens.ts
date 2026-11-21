import 'server-only';
import { and, binReports, eq, getDb, inArray, isNull, lt, or, serviceRequests } from '@recycleiq/db';

/**
 * AthensGov citizen requests (Αιτήματα πολιτών): full-bin reports and bulky-item pickups are also filed
 * in the city's own request system, so crews see them where they already work.
 *
 * Server-side only: the API key never reaches the app. Without ATHENS_API_KEY everything here is a
 * no-op and RecycleIQ works on its own. A failing city API never fails our own report.
 * Docs: https://athensgov.cityofathens.gr/sandbox/docs (100 requests/min per key).
 */
const BASE = (process.env.ATHENS_API_BASE || 'https://athensgov.cityofathens.gr/sandbox').replace(/\/$/, '');

export type CityStatus = 'submitted' | 'received' | 'in_progress' | 'resolved' | 'rejected';
export interface CityRequest {
  id: string;
  status: CityStatus;
  updated_at?: string;
  upvotes?: number;
  history?: { status?: string; note?: string; at?: string }[];
}

export const athensEnabled = () => !!process.env.ATHENS_API_KEY;

/** The 7 municipal communities k1..k7 are the city's districts 1..7. */
export function cityDistrict(communityId: string | null | undefined): number | null {
  const n = Number(/^k([1-7])$/.exec(communityId ?? '')?.[1]);
  return n >= 1 && n <= 7 ? n : null;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'X-API-Key': process.env.ATHENS_API_KEY ?? '', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`AthensGov ${init.method ?? 'GET'} ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

/** Runs a city call; returns null (and logs) if the city API is off or fails. */
export async function tryCity<T>(fn: () => Promise<T>): Promise<T | null> {
  if (!athensEnabled()) return null;
  try {
    return await fn();
  } catch (e) {
    console.warn(String(e));
    return null;
  }
}

export const createCityRequest = (body: {
  category: 'garbage' | 'bulky_waste';
  title: string;
  description: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  district?: number | null;
}) => call<CityRequest>('/v1/requests?lang=el', { method: 'POST', body: JSON.stringify(body) });

export const getCityRequest = (id: string) => call<CityRequest>(`/v1/requests/${encodeURIComponent(id)}?lang=el`);

export const upvoteCityRequest = (id: string) =>
  call<CityRequest>(`/v1/requests/${encodeURIComponent(id)}/upvote?lang=el`, { method: 'POST' });

export const updateCityRequest = (id: string, status: CityStatus, note: string) =>
  call<CityRequest>(`/v1/requests/${encodeURIComponent(id)}?lang=el`, { method: 'PATCH', body: JSON.stringify({ status, note }) });

export const CITY_STATUS_LABEL: Record<CityStatus, { el: string; en: string }> = {
  submitted: { el: 'Υποβλήθηκε', en: 'Submitted' },
  received: { el: 'Παραλήφθηκε', en: 'Received' },
  in_progress: { el: 'Σε εξέλιξη', en: 'In progress' },
  resolved: { el: 'Επιλύθηκε', en: 'Resolved' },
  rejected: { el: 'Απορρίφθηκε', en: 'Rejected' },
};

/**
 * Refresh the city status of the given requests (those not refreshed in the last minute), at most
 * `max` per call to stay well under the 100 requests/min limit. Best effort: failures are skipped.
 */
export async function syncCityStatuses(ids: string[], max = 25): Promise<void> {
  if (!athensEnabled() || !ids.length) return;
  const db = getDb();
  const fresh = new Date(Date.now() - 60_000);
  const stale = (t: typeof binReports | typeof serviceRequests) =>
    db
      .select({ id: t.cityRequestId })
      .from(t)
      .where(and(inArray(t.cityRequestId, ids), or(isNull(t.citySyncedAt), lt(t.citySyncedAt, fresh))));
  const rows = [...(await stale(binReports)), ...(await stale(serviceRequests))];
  const unique = [...new Set(rows.map((r) => r.id).filter((x): x is string => !!x))].slice(0, max);
  await Promise.all(
    unique.map(async (id) => {
      const r = await tryCity(() => getCityRequest(id));
      if (!r) return;
      const now = new Date();
      await db.update(binReports).set({ cityStatus: r.status, citySyncedAt: now }).where(eq(binReports.cityRequestId, id));
      await db.update(serviceRequests).set({ cityStatus: r.status, citySyncedAt: now }).where(eq(serviceRequests.cityRequestId, id));
    }),
  );
}
