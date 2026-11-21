import { CATEGORIES, PICKABLE_OBJECTS, getObject, searchObjects } from '@recycleiq/engine';
import { router, useFocusEffect } from 'expo-router';
import { ArrowRight, Camera, ChevronDown, ChevronRight, Gift, MapPin, ScanLine, Search, Smile, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { CategoryTile, ObjectIcon } from '@/components/icons';
import { Logo } from '@/components/logo';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Card, Chip, DemoBadge, T } from '@/components/ui';
import { api } from '@/lib/api';
import { enter } from '@/lib/motion';
import { useApp } from '@/lib/store';
import { colors, font, r, shadow } from '@/lib/theme';

export default function Home() {
  const { t, district, deviceId, history, walletVersion } = useApp();
  const [q, setQ] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const hits = useMemo(() => searchObjects(q).slice(0, 5), [q]);
  const fact = useMemo(() => {
    const withFacts = PICKABLE_OBJECTS.filter((o) => o.fact);
    return withFacts[new Date().getDate() % withFacts.length]?.fact;
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!deviceId) return;
      api.wallet(deviceId).then((w) => setBalance(w.balance), () => setBalance(null));
    }, [deviceId, walletVersion]),
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('Καλημέρα', 'Good morning') : hour < 18 ? t('Καλό απόγευμα', 'Good afternoon') : t('Καλησπέρα', 'Good evening');
  const open = (id: string) => router.push({ pathname: '/item/[id]', params: { id, via: 'search' } });

  return (
    <Screen>
      <Animated.View entering={enter(0)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo />
        <PressableScale onPress={() => router.push('/district')} accessibilityLabel={t('Άλλαξε γειτονιά', 'Change neighbourhood')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: r.pill, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, height: 36 }}>
            <MapPin size={15} color={colors.ink} />
            <T v="caption" numberOfLines={1} style={{ maxWidth: 130 }}>
              {district ? t(district.name) : t('Αθήνα', 'Athens')}
            </T>
            <ChevronDown size={14} color={colors.muted} />
          </View>
        </PressableScale>
      </Animated.View>

      <Animated.View entering={enter(1)} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <T v="caption" color={colors.muted}>{greeting}</T>
          <T v="h1">{t('Δεν ξέρεις πού να το πετάξεις;', "Don't know where it goes?")}</T>
          <T v="body" color={colors.muted}>{t('Φωτογράφισέ το και μάθε αμέσως.', 'Snap it and find out instantly.')}</T>
        </View>
        <PressableScale onPress={() => router.push('/coupons')} accessibilityLabel={t('Τα κουπόνια μου', 'My coupons')}>
          <View style={{ alignItems: 'center', backgroundColor: colors.surface, borderRadius: r.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8, ...shadow.soft }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Gift size={14} color={colors['forest-700']} />
              <T v="num" style={{ fontSize: 16 }}>{balance ?? '—'}</T>
            </View>
            <T v="micro" color={colors.muted}>{t('ΚΟΥΠΟΝΙΑ', 'COUPONS')}</T>
          </View>
        </PressableScale>
      </Animated.View>

      <Animated.View entering={enter(2)}>
        <PressableScale onPress={() => router.push('/scan')} accessibilityRole="button" accessibilityLabel={t('Σάρωσε αντικείμενο', 'Scan an item')}>
          <View style={{ backgroundColor: colors.canvas, borderRadius: r.sheet, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16, ...shadow.pop }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', shadowColor: colors.lime, shadowOpacity: 0.8, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } }}>
              <Camera size={28} color={colors['forest-900']} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ScanLine size={16} color={colors.lime} />
                <T v="h2" color="#fff" style={{ fontSize: 19 }}>{t('Σάρωσε αντικείμενο', 'Scan an item')}</T>
              </View>
              <T v="caption" color="rgba(255,255,255,0.7)">{t('Αναγνώριση και κανόνες της γειτονιάς σου', 'Recognition and your neighbourhood rules')}</T>
            </View>
            <ArrowRight size={20} color={colors.lime} />
          </View>
        </PressableScale>
      </Animated.View>

      <Animated.View entering={enter(3)}>
        <Card onPress={() => router.push('/checkin')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}>
            <Smile size={24} color={colors['forest-900']} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="h3">{t('Selfie στον κάδο', 'Bin selfie')}</T>
            <T v="caption" color={colors.muted}>{t('Κέρδισε κουπόνια κάθε μέρα', 'Earn coupons every day')}</T>
          </View>
          <ChevronRight size={20} color={colors.muted} />
        </Card>
      </Animated.View>

      <Animated.View entering={enter(4)} style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: r.card, borderWidth: 1, borderColor: q ? colors['forest-700'] : colors.line, paddingHorizontal: 14, height: 52 }}>
          <Search size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t('Ή περίγραψέ το… π.χ. «κουτί πίτσας»', 'Or describe it… e.g. "pizza box"')}
            placeholderTextColor={colors.faint}
            returnKeyType="search"
            onSubmitEditing={() => hits[0] && open(hits[0].object.id)}
            style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink }}
            accessibilityLabel={t('Αναζήτηση αντικειμένου', 'Search for an item')}
          />
          {!!q && (
            <PressableScale onPress={() => setQ('')} accessibilityLabel={t('Καθαρισμός', 'Clear')}>
              <X size={18} color={colors.muted} />
            </PressableScale>
          )}
        </View>
        {q.length >= 2 && (
          <Card style={{ padding: 6 }}>
            {hits.length === 0 ? (
              <T v="body" color={colors.muted} style={{ padding: 10 }}>
                {t('Δεν βρήκαμε κάτι. Δοκίμασε άλλη λέξη ή σάρωσέ το.', 'Nothing found. Try another word or scan it.')}
              </T>
            ) : (
              hits.map((h, i) => (
                <Animated.View key={h.object.id} entering={enter(i)}>
                  <PressableScale onPress={() => open(h.object.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: h.object.thumbTone, alignItems: 'center', justifyContent: 'center' }}>
                      <ObjectIcon name={h.object.icon} size={18} />
                    </View>
                    <T v="bodyLg" style={{ flex: 1, fontFamily: font.semibold }}>{t(h.object.name)}</T>
                    <ChevronRight size={18} color={colors.faint} />
                  </PressableScale>
                </Animated.View>
              ))
            )}
          </Card>
        )}
      </Animated.View>

      <Animated.View entering={enter(5)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 18 }} style={{ marginRight: -18 }}>
          {PICKABLE_OBJECTS.map((o) => (
            <Chip key={o.id} label={t(o.name)} icon={<ObjectIcon name={o.icon} size={16} />} onPress={() => open(o.id)} />
          ))}
        </ScrollView>
      </Animated.View>

      {fact && (
        <Animated.View entering={enter(6)}>
          <Card style={{ gap: 6, backgroundColor: colors['forest-50'], borderColor: colors['forest-100'] }}>
            <T v="caption" color={colors['forest-700']}>{t('Ήξερες ότι…', 'Did you know…')}</T>
            <T v="body">{t(fact)}</T>
          </Card>
        </Animated.View>
      )}

      {history.length > 0 && (
        <Animated.View entering={enter(7)} style={{ gap: 10 }}>
          <T v="eyebrow" color={colors.muted}>{t('Πρόσφατα', 'Recent')}</T>
          {history.slice(0, 3).map((h) => (
            <Card key={h.id} onPress={() => router.push({ pathname: '/result/[id]', params: { id: h.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
              <CategoryTile category={h.category} size={36} />
              <View style={{ flex: 1 }}>
                <T v="h3">{t(getObject(h.objectId)?.name ?? h.name)}</T>
                <T v="caption" color={colors.muted}>{h.uncertain ? t('Αβέβαιο', 'Uncertain') : t(h.destination)}</T>
              </View>
              <T v="caption" color={colors.muted}>{t(CATEGORIES[h.category].short)}</T>
            </Card>
          ))}
        </Animated.View>
      )}

      <DemoBadge label={t('Συνθετικά δεδομένα · Ενδεικτικά σημεία', 'Synthetic data · Illustrative points')} />
    </Screen>
  );
}
