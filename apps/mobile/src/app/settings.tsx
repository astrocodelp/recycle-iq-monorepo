import { router } from 'expo-router';
import { Check, ChevronRight, Database, Globe, MapPin, ShieldCheck, Smartphone, Trophy } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { BackButton } from '@/components/back-button';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { api } from '@/lib/api';
import { deviceLang, useApp, type BinSource, type LangPref } from '@/lib/store';
import { colors, font } from '@/lib/theme';

export default function Settings() {
  const { t, lang, langPref, setLangPref, district, deviceId, binSource, setBinSource } = useApp();
  const [nickname, setNickname] = useState('');
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'invalid'>('idle');
  useEffect(() => {
    if (deviceId) api.profile(deviceId, lang).then((p) => setNickname(p.nickname), () => {});
  }, [deviceId, lang]);
  const save = async () => {
    setSaved('saving');
    try {
      const p = await api.setNickname(deviceId, nickname);
      setNickname(p.nickname);
      setSaved('saved');
    } catch {
      setSaved('invalid');
    }
  };
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
  const binOptions: { value: BinSource; label: string; sub: string }[] = [
    {
      value: 'synthetic',
      label: t('Συνθετικά (επίδειξη)', 'Synthetic (demo)'),
      sub: t('Ενδεικτικά σημεία για την παρουσίαση', 'Illustrative points for the demo'),
    },
    {
      value: 'osm',
      label: t('Πραγματικοί κάδοι (OpenStreetMap)', 'Real bins (OpenStreetMap)'),
      sub: t('1.167 κάδοι στην Αθήνα · © OpenStreetMap contributors', '1,167 bins in Athens · © OpenStreetMap contributors'),
    },
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
          <Database size={16} color={colors.muted} />
          <T v="eyebrow" color={colors.muted}>{t('Δεδομένα κάδων', 'Bin data')}</T>
        </View>
        <Card style={{ padding: 4 }}>
          {binOptions.map((o, i) => (
            <PressableScale
              key={o.value}
              onPress={() => setBinSource(o.value)}
              scaleTo={0.99}
              accessibilityRole="radio"
              accessibilityState={{ selected: binSource === o.value }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                <View style={{ flex: 1 }}>
                  <T v="bodyLg" style={{ fontFamily: font.semibold }}>{o.label}</T>
                  <T v="caption" color={colors.muted}>{o.sub}</T>
                </View>
                {binSource === o.value && <Check size={20} color={colors['forest-700']} />}
              </View>
            </PressableScale>
          ))}
        </Card>
      </View>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Trophy size={16} color={colors.muted} />
          <T v="eyebrow" color={colors.muted}>{t('Ψευδώνυμο στην κατάταξη', 'Leaderboard nickname')}</T>
        </View>
        <Card style={{ gap: 10 }}>
          <TextInput
            value={nickname}
            onChangeText={(v) => {
              setNickname(v);
              setSaved('idle');
            }}
            maxLength={24}
            placeholder={t('Ψευδώνυμο', 'Nickname')}
            placeholderTextColor={colors.faint}
            accessibilityLabel={t('Ψευδώνυμο στην κατάταξη', 'Leaderboard nickname')}
            style={{ fontFamily: font.semibold, fontSize: 16, color: colors.ink, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, height: 46 }}
          />
          <T v="caption" color={saved === 'invalid' ? colors.danger : colors.muted}>
            {saved === 'invalid'
              ? t('2–24 γράμματα, αριθμοί ή κενά.', '2–24 letters, digits or spaces.')
              : t('Μόνο αυτό φαίνεται στους άλλους. Όχι το πραγματικό σου όνομα.', 'Only this is shown to others. Not your real name.')}
          </T>
          <Button label={saved === 'saved' ? t('Αποθηκεύτηκε', 'Saved') : t('Αποθήκευση', 'Save')} variant={saved === 'saved' ? 'secondary' : 'primary'} loading={saved === 'saving'} onPress={save} />
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
