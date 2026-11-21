import { router } from 'expo-router';
import { useState } from 'react';
import { api, ApiError } from './api';
import { useApp } from './store';

/** Ask the API for a decision, remember it, open the result. */
export function useDecide() {
  const { deviceId, districtId, remember, binSource } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'network' | 'server' | null>(null);
  const decide = async (objectId: string, answers: Record<string, string>, via: 'search' | 'scan') => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.decide({ objectId, answers, districtId, deviceId, via, binSource });
      remember(res);
      if (res.id) router.replace({ pathname: '/result/[id]', params: { id: res.id } });
    } catch (e) {
      setError(e instanceof ApiError && e.status === 0 ? 'network' : 'server');
    } finally {
      setBusy(false);
    }
  };
  return { decide, busy, error };
}
