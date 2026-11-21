import { CATEGORIES, CATEGORY_IDS, DEFAULT_LOCATION, formatDistance, haversine, matchesQuery, walkingMinutes, type CategoryId } from '@recycleiq/engine';
import { router, useFocusEffect } from 'expo-router';
import { LocateFixed, MapPin } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Screen } from '@/components/screen';
import { Button, Card, Chip, DemoBadge, T } from '@/components/ui';
import { api, type Point } from '@/lib/api';
import { locateNeighbourhood } from '@/lib/location';
import { enter } from '@/lib/motion';
import { useApp } from '@/lib/store';
import { categoryColors, colors } from '@/lib/theme';

export default function Points() {
  const { t, lang, coords, setCoords, district, districts, setDistrictId, binSource } = useApp();
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const [points, setPoints] = useState<Point[] | null>(null);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setPoints(null);
      api.points({ source: binSource, limit: 2000 }).then((r) => setPoints(r.points), () => setPoints([]));
    }, [binSource]),
  );

  const from = coords ?? (district ? { lng: district.lng, lat: district.lat } : DEFAULT_LOCATION);
  const list = useMemo(
    () =>
      (points ?? [])
        .filter((p) => category === 'all' || matchesQuery(p, { category }))
        .map((p) => ({ ...p, distance: haversine(p, from) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 30),
    [points, category, from],
  );

  const locate = async () => {
    setLocating(true);
    const r = await locateNeighbourhood(districts);
    setLocating(false);
    if (r.ok) {
      setCoords(r.coords);
      setDistrictId(r.districtId);
      setNote(null);
    } else setNote(r.reason === 'outside' ? t('Είσαι εκτός Δήμου Αθηναίων.', 'You are outside the City of Athens.') : t('Δεν δόθηκε άδεια τοποθεσίας.', 'Location permission not granted.'));
  };

  return (
    <Screen>
      <Animated.View entering={enter(0)}>
        <T v="h1">{t('Σημεία συλλογής', 'Collection points')}</T>
        <T v="body" color={colors.muted}>
          {coords ? t('Ταξινόμηση από τη θέση σου (μένει στο κινητό).', 'Sorted from your position (stays on your phone).') : t(`Από το κέντρο: ${district ? district.name.el : 'Αθήνα'}`, `From the centre of ${district ? district.name.en : 'Athens'}`)}
        </T>
      </Animated.View>
      {!coords && (
        <Animated.View entering={enter(1)} style={{ gap: 6 }}>
          <Button label={t('Βρες τα κοντινότερα σε μένα', 'Find the nearest to me')} variant="secondary" loading={locating} icon={<LocateFixed size={18} color={colors.ink} />} onPress={locate} />
          <T v="caption" color={colors.muted}>{note ?? t('Η τοποθεσία μετατρέπεται σε γειτονιά στο κινητό σου. Δεν στέλνουμε τη διεύθυνσή σου.', 'Your location becomes a neighbourhood on your phone. We never send your address.')}</T>
        </Animated.View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 18 }} style={{ marginRight: -18 }}>
        <Chip label={t('Όλα', 'All')} selected={category === 'all'} onPress={() => setCategory('all')} />
        {CATEGORY_IDS.filter((c) => c !== 'general' || binSource === 'osm').map((c) => (
          <Chip key={c} label={t(CATEGORIES[c].short)} selected={category === c} onPress={() => setCategory(c)} icon={<View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: categoryColors[c].solid }} />} />
        ))}
      </ScrollView>
      {points === null ? (
        <ActivityIndicator color={colors['forest-700']} />
      ) : (
        list.map((p, i) => (
          <Animated.View key={p.id} entering={enter(i)}>
            <Card onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: categoryColors[p.categories[0] ?? 'packaging'].soft, alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={19} color={categoryColors[p.categories[0] ?? 'packaging'].solid} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="h3" numberOfLines={1}>{t(p.name)}</T>
                <T v="caption" color={colors.muted} numberOfLines={1}>
                  {p.street ? `${t(p.street)} · ` : ''}{formatDistance(p.distance, lang)} · {walkingMinutes(p.distance)}′
                </T>
              </View>
              {p.status !== 'available' && (
                <T v="micro" color={p.status === 'full' ? colors.warn : colors.danger}>{p.status === 'full' ? t('ΓΕΜΑΤΟΣ', 'FULL') : t('ΕΚΤΟΣ', 'CLOSED')}</T>
              )}
            </Card>
          </Animated.View>
        ))
      )}
      {binSource === 'osm' ? (
        <T v="caption" color={colors.muted}>
          {t('Πραγματικοί κάδοι από το OpenStreetMap · © OpenStreetMap contributors (ODbL). Αλλαγή από τις Ρυθμίσεις.', 'Real bins from OpenStreetMap · © OpenStreetMap contributors (ODbL). Change in Settings.')}
        </T>
      ) : (
        <DemoBadge label={t('Ενδεικτικά σημεία — όχι επίσημα δημοτικά δεδομένα', 'Illustrative points — not official data')} />
      )}
      <Button label={t('Άλλαξε γειτονιά', 'Change neighbourhood')} variant="ghost" onPress={() => router.push('/district')} />
    </Screen>
  );
}
