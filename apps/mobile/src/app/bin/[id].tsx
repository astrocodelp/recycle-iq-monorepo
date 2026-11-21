import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, QrCode, ScanLine, TriangleAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { BackButton } from '@/components/back-button';
import { Screen } from '@/components/screen';
import { Button, Card, DemoBadge, T } from '@/components/ui';
import { api, type Point } from '@/lib/api';
import { enter } from '@/lib/motion';
import { useApp } from '@/lib/store';
import { categoryColors, colors } from '@/lib/theme';

/**
 * Opened from the QR sticker on a bin (recycleiq://bin/<id> or https://<web>/b/<id>).
 * The bin tells us the neighbourhood, so no GPS is needed at all.
 */
export default function Bin() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, setDistrictId, districts } = useApp();
  const [point, setPoint] = useState<(Point & { kind: string; districtId: string | null }) | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.point(id).then(
      (r) => {
        setPoint(r.point);
        if (r.point.districtId) setDistrictId(r.point.districtId);
      },
      () => setFailed(true),
    );
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const district = districts.find((d) => d.id === point?.districtId);
  const cat = point?.categories[0] ?? 'packaging';

  return (
    <Screen>
      <BackButton />
      {!point ? (
        failed ? <T v="bodyLg">{t('Δεν βρέθηκε ο κάδος.', 'Bin not found.')}</T> : <ActivityIndicator color={colors['forest-700']} />
      ) : (
        <>
          <Animated.View entering={enter(0)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <QrCode size={18} color={colors['forest-700']} />
            <T v="caption" color={colors['forest-700']}>{t('Σκάναρες τον κάδο', 'You scanned the bin')}</T>
          </Animated.View>
          <Animated.View entering={enter(1)}>
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 13, backgroundColor: categoryColors[cat].solid, alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <T v="h2">{t(point.name)}</T>
                  {point.street && <T v="caption" color={colors.muted}>{t(point.street)}</T>}
                </View>
              </View>
              {district && <T v="body">{t(`Γειτονιά: ${district.name.el}`, `Neighbourhood: ${district.name.en}`)}</T>}
            </Card>
          </Animated.View>
          <Animated.View entering={enter(2)} style={{ gap: 10 }}>
            <Button label={t('Τι θέλεις να πετάξεις;', 'What do you want to throw away?')} icon={<ScanLine size={18} color="#fff" />} onPress={() => router.replace('/scan')} />
            <Button label={t('Ο κάδος είναι γεμάτος', 'This bin is full')} variant="secondary" icon={<TriangleAlert size={18} color={colors.ink} />} onPress={() => router.push({ pathname: '/report', params: { bin: point.id } })} />
          </Animated.View>
          {point.id.startsWith('osm-') ? (
            <T v="caption" color={colors.muted}>{t('Κάδος από το OpenStreetMap · © OpenStreetMap contributors (ODbL)', 'Bin from OpenStreetMap · © OpenStreetMap contributors (ODbL)')}</T>
          ) : (
            <DemoBadge label={t('Ενδεικτικά σημεία — όχι επίσημα δημοτικά δεδομένα', 'Illustrative points — not official data')} />
          )}
        </>
      )}
    </Screen>
  );
}
