import { router, useFocusEffect } from 'expo-router';
import { BookOpen, CalendarDays, Landmark, Lock, MapPin, ScanLine, Sparkles } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Screen } from '@/components/screen';
import { Button, Card, DemoBadge, T } from '@/components/ui';
import { api, type Stories, type StoryCard } from '@/lib/api';
import { EASE_OUT, enter } from '@/lib/motion';
import { useApp } from '@/lib/store';
import { colors, font, r, shadow } from '@/lib/theme';

const ICON = { numbers: Sparkles, history: BookOpen, landmark: Landmark, event: CalendarDays } as const;

/** The reward for scanning: stories about your neighbourhood, unlocked as you scan there. */
export default function Neighbourhood() {
  const { t, deviceId, district, binSource } = useApp();
  const [data, setData] = useState<Stories | null>(null);
  const [failed, setFailed] = useState(false);
  const reduce = useReducedMotion();
  const progress = useSharedValue(0);
  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  useFocusEffect(
    useCallback(() => {
      if (!district || !deviceId) return;
      setFailed(false);
      api.stories(district.id, deviceId, binSource).then(
        (d) => {
          setData(d);
          const target = d.next ? d.scans / d.next.threshold : 1;
          progress.value = withTiming(Math.min(1, target), { duration: reduce ? 0 : 800, easing: EASE_OUT });
        },
        () => setFailed(true),
      );
    }, [district, deviceId, binSource, reduce, progress]),
  );

  if (!district)
    return (
      <Screen>
        <T v="h1">{t('Η γειτονιά σου', 'Your neighbourhood')}</T>
        <Card style={{ gap: 12, alignItems: 'flex-start' }}>
          <MapPin size={28} color={colors['forest-700']} />
          <T v="bodyLg">{t('Διάλεξε τη γειτονιά σου για να ξεκλειδώνεις τις ιστορίες της όσο σκανάρεις.', 'Pick your neighbourhood to unlock its stories as you scan.')}</T>
          <Button label={t('Διάλεξε γειτονιά', 'Pick a neighbourhood')} onPress={() => router.push('/district')} />
        </Card>
      </Screen>
    );

  return (
    <Screen>
      <Animated.View entering={enter(0)}>
        <T v="eyebrow" color={colors['forest-700']}>{t('Η γειτονιά σου', 'Your neighbourhood')}</T>
        <T v="h1">{t(district.name)}</T>
        <T v="body" color={colors.muted}>{t('Κάθε σάρωση εδώ ξεκλειδώνει την ιστορία της.', 'Every scan here unlocks its story.')}</T>
      </Animated.View>

      {!data ? (
        failed ? <T v="body" color={colors.muted}>{t('Δεν υπάρχει σύνδεση.', 'No connection.')}</T> : <ActivityIndicator color={colors['forest-700']} />
      ) : (
        <>
          <Animated.View entering={enter(1)} style={{ borderRadius: r.sheet, padding: 20, backgroundColor: colors['forest-800'], gap: 12, ...shadow.pop }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <T v="numLg" color="#fff" style={{ fontSize: 44, lineHeight: 48 }}>{data.scans}</T>
              <T v="body" color="rgba(255,255,255,0.75)">{t('σαρώσεις εδώ', 'scans here')}</T>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
              <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: colors.lime }, bar]} />
            </View>
            <T v="body" color={colors.lime} style={{ fontFamily: font.semibold }}>
              {data.next
                ? t(`Ακόμη ${data.next.remaining} ${data.next.remaining === 1 ? 'σάρωση' : 'σαρώσεις'} για την επόμενη ιστορία`, `${data.next.remaining} more ${data.next.remaining === 1 ? 'scan' : 'scans'} to the next story`)
                : t('Ξεκλείδωσες όλες τις ιστορίες!', 'You unlocked every story!')}
            </T>
            {data.scans === 0 && (
              <Button label={t('Σάρωσε κάτι', 'Scan something')} variant="lime" icon={<ScanLine size={18} color={colors['forest-800']} />} onPress={() => router.push('/scan')} />
            )}
          </Animated.View>

          {data.stories.map((s, i) => (
            <Animated.View key={s.id} entering={enter(i + 2)}>
              <StoryView story={s} />
            </Animated.View>
          ))}
          {data.stories.length <= 1 && (
            <Card style={{ gap: 6, backgroundColor: colors['surface-2'], borderColor: colors.line }}>
              <T v="h3">{t('Περισσότερες ιστορίες έρχονται', 'More stories are coming')}</T>
              <T v="body" color={colors.muted}>{t('Ο Δήμος γράφει την ιστορία κάθε γειτονιάς. Συνέχισε να σκανάρεις.', 'The municipality is writing every neighbourhood’s story. Keep scanning.')}</T>
            </Card>
          )}
          <DemoBadge label={t(data.note)} />
        </>
      )}
    </Screen>
  );
}

function StoryView({ story: s }: { story: StoryCard }) {
  const { t } = useApp();
  const Icon = ICON[s.kind] ?? BookOpen;
  if (!s.unlocked)
    return (
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors['surface-2'], borderColor: colors.line }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={18} color={colors.muted} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="h3" color={colors.muted}>{t(s.title)}</T>
          <T v="caption" color={colors.muted}>{t(`Ξεκλειδώνει στις ${s.threshold} σαρώσεις`, `Unlocks at ${s.threshold} scans`)}</T>
        </View>
      </Card>
    );
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={colors['forest-900']} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="h3">{t(s.title)}</T>
          {s.year != null && <T v="caption" color={colors['forest-700']}>{s.year}</T>}
        </View>
      </View>
      {s.body && <T v="bodyLg">{t(s.body)}</T>}
    </Card>
  );
}
