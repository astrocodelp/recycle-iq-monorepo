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

export interface StoryCard {
  id: string;
  kind: 'numbers' | 'history' | 'landmark' | 'event';
  title: L10n;
  body?: L10n;
  year?: number;
  threshold: number;
  unlocked?: boolean;
}

export interface DecisionResponse {
  id: string | null;
  decision: Decision;
  nearby: Point[];
  /** A neighbourhood story this scan unlocked. */
  unlockedStory?: StoryCard | null;
}

export interface Stories {
  district: string;
  scans: number;
  next: { index: number; threshold: number; remaining: number } | null;
  stories: StoryCard[];
  note: L10n;
}

export interface Leaderboard {
  period: 'week' | 'month';
  dailyCap: number;
  players: number;
  top: { rank: number; nickname: string; score: number; isMe: boolean }[];
  me: { rank: number | null; nickname: string; score: number } | null;
  neighbourhoods: { id: string; name: L10n; scans: number; people: number }[];
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
  leaderboard: (p: { period: 'week' | 'month'; district?: string | null; deviceId: string; lang: 'el' | 'en' }) => {
    const qs = new URLSearchParams({ period: p.period, deviceId: p.deviceId, lang: p.lang });
    if (p.district) qs.set('district', p.district);
    return request<Leaderboard>(`/api/v1/leaderboard?${qs}`);
  },
  stories: (district: string, deviceId: string) =>
    request<Stories>(`/api/v1/stories?district=${encodeURIComponent(district)}&deviceId=${encodeURIComponent(deviceId)}`),
  profile: (deviceId: string, lang: 'el' | 'en') =>
    request<{ nickname: string; custom: boolean }>(`/api/v1/profile?deviceId=${encodeURIComponent(deviceId)}&lang=${lang}`),
  setNickname: (deviceId: string, nickname: string) =>
    request<{ nickname: string; custom: boolean }>('/api/v1/profile', { method: 'POST', body: JSON.stringify({ deviceId, nickname }) }),
  reportBin: (body: { pointId: string; kind: 'full' | 'overflowing' | 'damaged'; deviceId: string }) =>
    request<{ report: { id: string }; openForBin: number }>('/api/v1/bin-reports', { method: 'POST', body: JSON.stringify(body) }),
  requestBrownBin: (body: { districtId: string; deviceId: string }) =>
    request<unknown>('/api/v1/service-requests', { method: 'POST', body: JSON.stringify(body) }),
};
