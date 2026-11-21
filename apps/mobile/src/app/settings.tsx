import { router } from 'expo-router';
import { Check, ChevronRight, Globe, MapPin, ShieldCheck, Smartphone } from 'lucide-react-native';
import { View } from 'react-native';
import { BackButton } from '@/components/back-button';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Card, T } from '@/components/ui';
import { deviceLang, useApp, type LangPref } from '@/lib/store';
import { colors, font } from '@/lib/theme';

export default function Settings() {
  const { t, langPref, setLangPref, district } = useApp();
  const device = deviceLang();
  const options: { value: LangPref; label: string; sub?: string }[] = [
    {
      value: 'auto',
      label: t('Αυτόματα (γλώσσα κινητού)', 'Automatic (phone language)'),
      sub: device === 'el' ? 'Ελληνικά' : 'English',
    },
    { value: 'el', label: 'Ελληνικά' },
    { value: 'en', label: 'English' },
  ];

  return (
    <Screen>
      <BackButton close />
      <T v="h1">{t('Ρυθμίσεις', 'Settings')}</T>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Globe size={16} color={colors.muted} />
          <T v="eyebrow" color={colors.muted}>{t('Γλώσσα', 'Language')}</T>
        </View>
        <Card style={{ padding: 4 }}>
          {options.map((o, i) => (
            <PressableScale
              key={o.value}
              onPress={() => setLangPref(o.value)}
              scaleTo={0.99}
              accessibilityRole="radio"
              accessibilityState={{ selected: langPref === o.value }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                {o.value === 'auto' ? <Smartphone size={18} color={colors.muted} /> : <View style={{ width: 18 }} />}
                <View style={{ flex: 1 }}>
                  <T v="bodyLg" style={{ fontFamily: font.semibold }}>{o.label}</T>
                  {o.sub && <T v="caption" color={colors.muted}>{o.sub}</T>}
                </View>
                {langPref === o.value && <Check size={20} color={colors['forest-700']} />}
              </View>
            </PressableScale>
          ))}
        </Card>
      </View>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MapPin size={16} color={colors.muted} />
          <T v="eyebrow" color={colors.muted}>{t('Γειτονιά', 'Neighbourhood')}</T>
        </View>
        <Card onPress={() => router.push('/district')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <T v="bodyLg" style={{ flex: 1, fontFamily: font.semibold }}>{district ? t(district.name) : t('Όλη η πόλη', 'Whole city')}</T>
          <ChevronRight size={20} color={colors.muted} />
        </Card>
      </View>

      <Card style={{ gap: 8, backgroundColor: colors['forest-50'], borderColor: colors['forest-100'] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color={colors['forest-700']} />
          <T v="h3">{t('Ιδιωτικότητα', 'Privacy')}</T>
        </View>
        <T v="body">{t('Κρατάμε μόνο τη γειτονιά σου, ποτέ τη διεύθυνση. Οι φωτογραφίες μένουν στο κινητό. Δεν χρειάζεται λογαριασμός.', 'We keep only your neighbourhood, never your address. Photos stay on your phone. No account needed.')}</T>
      </Card>
      <T v="caption" color={colors.muted}>RecycleIQ 0.1.0 · Apps4Athens 2026</T>
    </Screen>
  );
}
