import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { getObject, type CategoryId, type L10n, type Lang } from '@recycleiq/engine';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, type Catalog, type DecisionResponse, type District } from './api';

export interface HistoryEntry {
  id: string;
  objectId: string;
  name: L10n;
  category: CategoryId;
  destination: L10n;
  confidence: number;
  uncertain: boolean;
  at: string;
}

interface AppState {
  ready: boolean;
  /** The language in use: the device's unless the user picked one in Settings. */
  lang: Lang;
  /** 'auto' follows the phone's language (Greek phones: Greek; anything else: English). */
  langPref: LangPref;
  setLangPref: (p: LangPref) => void;
  /** Which bins the app shows: synthetic demo points (default) or real bins from OpenStreetMap. */
  binSource: BinSource;
  setBinSource: (s: BinSource) => void;
  /** t('Ελληνικά', 'English') or t({ el, en }). */
  t: (el: string | L10n, en?: string) => string;
  deviceId: string;
  districtId: string | null;
  setDistrictId: (id: string | null) => void;
  districts: District[];
  district: District | null;
  catalog: Catalog | null;
  catalogError: boolean;
  reloadCatalog: () => void;
  history: HistoryEntry[];
  /** Last GPS fix, memory only: never persisted or sent. */
  coords: { lng: number; lat: number } | null;
  setCoords: (c: { lng: number; lat: number } | null) => void;
  /** Decisions fetched this session, by id (avoids a refetch when opening a result). */
  remember: (r: DecisionResponse) => void;
  recall: (id: string) => DecisionResponse | undefined;
}

export type BinSource = 'synthetic' | 'osm';
export type LangPref = 'auto' | Lang;

/** Greek if the phone's preferred language is Greek, otherwise English. */
export function deviceLang(): Lang {
  try {
    return getLocales()[0]?.languageCode === 'el' ? 'el' : 'en';
  } catch {
    return 'el';
  }
}

const Ctx = createContext<AppState | null>(null);
const KEY = { lang: 'riq.lang', device: 'riq.device', district: 'riq.district', history: 'riq.history', bins: 'riq.bins' };

function newDeviceId() {
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `app-${Date.now().toString(36)}-${rand()}${rand()}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [langPref, setLangPrefState] = useState<LangPref>('auto');
  const [binSource, setBinSourceState] = useState<BinSource>('synthetic');
  const lang: Lang = langPref === 'auto' ? deviceLang() : langPref;
  const [deviceId, setDeviceId] = useState('');
  const [districtId, setDistrictState] = useState<string | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const cache = useRef(new Map<string, DecisionResponse>());
  const [coords, setCoords] = useState<{ lng: number; lat: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [l, d, dist, h, bins] = await Promise.all(
          [KEY.lang, KEY.device, KEY.district, KEY.history, KEY.bins].map((k) => AsyncStorage.getItem(k)),
        );
        if (l === 'en' || l === 'el' || l === 'auto') setLangPrefState(l);
        if (bins === 'osm') setBinSourceState('osm');
        let id = d;
        if (!id) {
          id = newDeviceId();
          await AsyncStorage.setItem(KEY.device, id);
        }
        setDeviceId(id);
        setDistrictState(dist || null);
        if (h) {
          try {
            setHistory(JSON.parse(h));
          } catch {}
        }
      } catch {
        // Storage unavailable: run with defaults for this session rather than stay on the splash.
        setDeviceId((cur) => cur || newDeviceId());
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const loadRemote = useCallback(() => {
    setCatalogError(false);
    api.catalog().then(setCatalog, () => setCatalogError(true));
    api.districts().then((r) => setDistricts(r.districts), () => {});
  }, []);
  useEffect(loadRemote, [loadRemote]);

  const value = useMemo<AppState>(() => {
    const t = (el: string | L10n, en?: string) =>
      typeof el === 'string' ? (lang === 'el' ? el : (en ?? el)) : el[lang];
    return {
      ready,
      lang,
      langPref,
      setLangPref: (p) => {
        setLangPrefState(p);
        AsyncStorage.setItem(KEY.lang, p);
      },
      binSource,
      setBinSource: (b) => {
        setBinSourceState(b);
        AsyncStorage.setItem(KEY.bins, b).catch(() => {});
      },
      t,
      deviceId,
      districtId,
      setDistrictId: (id) => {
        setDistrictState(id);
        if (id) AsyncStorage.setItem(KEY.district, id);
        else AsyncStorage.removeItem(KEY.district);
      },
      districts,
      district: districts.find((d) => d.id === districtId) ?? null,
      catalog,
      catalogError,
      reloadCatalog: loadRemote,
      history,
      remember: (r) => {
        if (!r.id) return;
        cache.current.set(r.id, r);
        const obj = getObject(r.decision.objectId);
        const entry: HistoryEntry = {
          id: r.id,
          objectId: r.decision.objectId,
          name: obj?.name ?? { el: r.decision.objectId, en: r.decision.objectId },
          category: r.decision.category,
          destination: r.decision.destination,
          confidence: r.decision.confidence,
          uncertain: r.decision.uncertain,
          at: new Date().toISOString(),
        };
        setHistory((prev) => {
          const next = [entry, ...prev].slice(0, 50);
          AsyncStorage.setItem(KEY.history, JSON.stringify(next));
          return next;
        });
      },
      recall: (id) => cache.current.get(id),
      coords,
      setCoords,
    };
  }, [ready, lang, langPref, binSource, deviceId, districtId, districts, catalog, catalogError, loadRemote, history, coords]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}
