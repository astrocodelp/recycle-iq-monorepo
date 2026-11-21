import type {
  CatalogObject,
  CategoryMeta,
  CategoryId,
  Decision,
  L10n,
  OrganicService,
  RankedPoint,
} from '@recycleiq/engine';

/**
 * Base URL of the RecycleIQ web app (apps/web), which serves the public API.
 * Set EXPO_PUBLIC_API_URL to your Vercel deployment, or to your computer's LAN address in development
 * (a phone cannot reach "localhost" on your computer).
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export interface Point extends RankedPoint {
  street: L10n | null;
  hours: { label: L10n } | null;
}

export interface District {
  id: string;
  name: L10n;
  communityId: string;
  organicService: OrganicService;
  lng: number;
  lat: number;
  /** Outline for on-device neighbourhood lookup. */
  svgPath: string;
}

export interface Catalog {
  objects: CatalogObject[];
  unknown: CatalogObject;
  categories: Record<CategoryId, CategoryMeta>;
}

export interface DecisionResponse {
  id: string | null;
  decision: Decision;
  nearby: Point[];
}

export interface Wallet {
  balance: number;
  checkins: number;
  couponsPerEuro: number;
  history: { id: string; createdAt: string; earned: number; breakdown: { label: L10n; amount: number }[] }[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      // Only POSTs carry a JSON body; plain GETs then need no CORS preflight on the web build.
      headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, 'network');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error ?? res.statusText, body.details);
  return body as T;
}

export const api = {
  catalog: () => request<Catalog>('/api/v1/catalog'),
  search: (q: string) =>
    request<{ results: { id: string; name: L10n; icon: string; score: number }[] }>(
      `/api/v1/search?q=${encodeURIComponent(q)}`,
    ),
  districts: () => request<{ districts: District[] }>('/api/v1/districts'),
  /** Never sends coordinates: optionally a neighbourhood to sort by. Ranking by GPS happens on the device. */
  points: (params: { category?: CategoryId; near?: string | null; limit?: number }) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v != null) qs.set(k, String(v));
    return request<{ points: (Point & { distance: number })[] }>(`/api/v1/points?${qs}`);
  },
  point: (id: string) => request<{ point: Point & { kind: string; districtId: string | null } }>(`/api/v1/points/${encodeURIComponent(id)}`),
  decide: (body: {
    objectId: string;
    answers: Record<string, string>;
    districtId?: string | null;
    deviceId: string;
    via: 'search' | 'scan';
  }) => request<DecisionResponse>('/api/v1/decisions', { method: 'POST', body: JSON.stringify(body) }),
  decision: (id: string) => request<{ id: string; decision: Decision }>(`/api/v1/decisions/${id}`),
  checkin: (body: { deviceId: string; decisionId?: string; districtId?: string | null }) =>
    request<{ reward: { earned: number; breakdown: { label: L10n; amount: number }[] }; streak: number }>(
      '/api/v1/checkins',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  wallet: (deviceId: string) => request<Wallet>(`/api/v1/wallet?deviceId=${encodeURIComponent(deviceId)}`),
  reportBin: (body: { pointId: string; kind: 'full' | 'overflowing' | 'damaged'; deviceId: string }) =>
    request<{ report: { id: string }; openForBin: number }>('/api/v1/bin-reports', { method: 'POST', body: JSON.stringify(body) }),
  requestBrownBin: (body: { districtId: string; deviceId: string }) =>
    request<unknown>('/api/v1/service-requests', { method: 'POST', body: JSON.stringify(body) }),
};
