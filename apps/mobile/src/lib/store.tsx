import AsyncStorage from '@react-native-async-storage/async-storage';
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
  lang: Lang;
  setLang: (l: Lang) => void;
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
  /** Bump to refresh the wallet after earning coupons. */
  walletVersion: number;
  bumpWallet: () => void;
  /** Decisions fetched this session, by id (avoids a refetch when opening a result). */
  remember: (r: DecisionResponse) => void;
  recall: (id: string) => DecisionResponse | undefined;
}

const Ctx = createContext<AppState | null>(null);
const KEY = { lang: 'riq.lang', device: 'riq.device', district: 'riq.district', history: 'riq.history' };

function newDeviceId() {
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `app-${Date.now().toString(36)}-${rand()}${rand()}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<Lang>('el');
  const [deviceId, setDeviceId] = useState('');
  const [districtId, setDistrictState] = useState<string | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const cache = useRef(new Map<string, DecisionResponse>());
  const [coords, setCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [walletVersion, setWalletVersion] = useState(0);

  useEffect(() => {
    (async () => {
      const [l, d, dist, h] = await Promise.all(
        [KEY.lang, KEY.device, KEY.district, KEY.history].map((k) => AsyncStorage.getItem(k)),
      );
      if (l === 'en' || l === 'el') setLangState(l);
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
      setReady(true);
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
      setLang: (l) => {
        setLangState(l);
        AsyncStorage.setItem(KEY.lang, l);
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
      walletVersion,
      bumpWallet: () => setWalletVersion((v) => v + 1),
    };
  }, [ready, lang, deviceId, districtId, districts, catalog, catalogError, loadRemote, history, coords, walletVersion]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}
