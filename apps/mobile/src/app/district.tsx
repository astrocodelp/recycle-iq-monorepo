import { router } from 'expo-router';
import { Check, LocateFixed, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { BackButton } from '@/components/back-button';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { locateNeighbourhood } from '@/lib/location';
import { useApp } from '@/lib/store';
import { colors, font } from '@/lib/theme';

export default function DistrictPicker() {
  const { t, districts, districtId, setDistrictId, setCoords, lang } = useApp();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const choose = (id: string | null) => {
    setDistrictId(id);
    router.back();
  };
  const sorted = [...districts].sort((a, b) => a.name[lang].localeCompare(b.name[lang], lang));
  const service = { full: t('καφέ κάδος', 'brown bin'), partial: t('μερικώς καφέ κάδος', 'partial brown bin'), none: '' };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackButton close />
      </View>
      <T v="h1">{t('Η γειτονιά σου', 'Your neighbourhood')}</T>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ShieldCheck size={18} color={colors['forest-700']} />
          <T v="body" style={{ flex: 1 }}>
            {t('Κρατάμε μόνο τη γειτονιά, ποτέ τη διεύθυνσή σου. Η θέση σου μετατρέπεται σε γειτονιά πάνω στο κινητό.', 'We keep only the neighbourhood, never your address. Your position becomes a neighbourhood on your phone.')}
          </T>
        </View>
        <Button
          label={t('Βρες τη γειτονιά μου', 'Find my neighbourhood')}
          loading={busy}
          icon={<LocateFixed size={18} color="#fff" />}
          onPress={async () => {
            setBusy(true);
            const r = await locateNeighbourhood(districts);
            setBusy(false);
            if (r.ok) {
              setCoords(r.coords);
              choose(r.districtId);
            } else setNote(r.reason === 'outside' ? t('Είσαι εκτός Δήμου Αθηναίων.', 'You are outside the City of Athens.') : t('Δεν δόθηκε άδεια τοποθεσίας. Διάλεξε από τη λίστα.', 'No location permission. Pick from the list.'));
          }}
        />
        {note && <T v="caption" color={colors.warn}>{note}</T>}
      </Card>
      <Card style={{ padding: 4 }}>
        {[{ id: null as string | null, label: t('Όλη η πόλη', 'Whole city'), sub: '' }, ...sorted.map((d) => ({ id: d.id as string | null, label: t(d.name), sub: service[d.organicService] }))].map((d) => (
          <PressableScale key={d.id ?? 'all'} onPress={() => choose(d.id)} scaleTo={0.99}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}>
              <View style={{ flex: 1 }}>
                <T v="bodyLg" style={{ fontFamily: font.semibold }}>{d.label}</T>
                {!!d.sub && <T v="caption" color={colors.muted}>{d.sub}</T>}
              </View>
              {districtId === d.id && <Check size={20} color={colors['forest-700']} />}
            </View>
          </PressableScale>
        ))}
      </Card>
    </Screen>
  );
}
