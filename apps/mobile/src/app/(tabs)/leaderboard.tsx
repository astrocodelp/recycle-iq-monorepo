import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, ScanLine, TrendingUp, Trophy } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Confetti } from '@/components/confetti';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Button, Card, Chip, T } from '@/components/ui';
import { api, type Leaderboard } from '@/lib/api';
import { enter, fade } from '@/lib/motion';
import { useApp } from '@/lib/store';
import { colors, font, r, shadow } from '@/lib/theme';

const MEDALS = ['#E0A82A', '#A7B0AA', '#B07A4A'];

export default function LeaderboardTab() {
  const { t, lang, deviceId, district } = useApp();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [local, setLocal] = useState(false);
  const [data, setData] = useState<Leaderboard | null>(null);
  const [failed, setFailed] = useState(false);
  const [climbed, setClimbed] = useState(0);
  const [burst, setBurst] = useState(0);
  const scope = local && district ? district.id : null;

  useFocusEffect(
    useCallback(() => {
      if (!deviceId) return;
      let alive = true;
      setFailed(false);
      api.leaderboard({ period, district: scope, deviceId, lang }).then(
        async (d) => {
          if (!alive) return;
          setData(d);
          // Celebrate moving up since the last visit (per period and scope).
          const key = `riq.rank.${period}.${scope ?? 'city'}`;
          const prev = Number(await AsyncStorage.getItem(key)) || 0;
          const now = d.me?.rank ?? 0;
          if (now) await AsyncStorage.setItem(key, String(now));
          if (prev && now && now < prev) {
            setClimbed(prev - now);
            setBurst((b) => b + 1);
          } else setClimbed(0);
        },
        () => alive && setFailed(true),
      );
      return () => {
        alive = false;
      };
    }, [deviceId, period, scope, lang]),
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Animated.View entering={enter(0)}>
          <T v="h1">{t('Κατάταξη', 'Leaderboard')}</T>
          <T v="body" color={colors.muted}>{t('Ποιος σκανάρει τα περισσότερα σκουπίδια.', 'Who scans the most waste.')}</T>
        </Animated.View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 18 }} style={{ marginRight: -18 }}>
          <Chip label={t('Εβδομάδα', 'Week')} selected={period === 'week'} onPress={() => setPeriod('week')} />
          <Chip label={t('Μήνας', 'Month')} selected={period === 'month'} onPress={() => setPeriod('month')} />
          <View style={{ width: 1, backgroundColor: colors.line, marginHorizontal: 4 }} />
          <Chip label={t('Όλη η πόλη', 'Whole city')} selected={!scope} onPress={() => setLocal(false)} />
          {district && <Chip label={t(district.name)} selected={!!scope} onPress={() => setLocal(true)} />}
        </ScrollView>

        {!data ? (
          failed ? (
            <T v="body" color={colors.muted}>{t('Δεν υπάρχει σύνδεση.', 'No connection.')}</T>
          ) : (
            <ActivityIndicator color={colors['forest-700']} />
          )
        ) : (
          <>
            <Animated.View entering={enter(1)} style={{ borderRadius: r.sheet, padding: 20, backgroundColor: colors['forest-800'], gap: 10, ...shadow.pop }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <T v="eyebrow" color="rgba(255,255,255,0.7)">{t('Η θέση σου', 'Your rank')}</T>
                <Trophy size={20} color={colors.lime} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                <T v="numLg" color="#fff" style={{ fontSize: 52, lineHeight: 56 }}>{data.me?.rank ? `#${data.me.rank}` : '—'}</T>
                <T v="body" color="rgba(255,255,255,0.75)">{t(`από ${data.players}`, `of ${data.players}`)}</T>
              </View>
              <T v="h2" color={colors.lime}>{data.me?.nickname}</T>
              <T v="body" color="rgba(255,255,255,0.85)">
                {t(`${data.me?.score ?? 0} σαρώσεις ${period === 'week' ? 'αυτή την εβδομάδα' : 'αυτόν τον μήνα'}`, `${data.me?.score ?? 0} scans this ${period}`)}
              </T>
              {climbed > 0 && (
                <Animated.View entering={fade(200)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(199,243,107,0.16)', borderRadius: r.control, padding: 10 }}>
                  <TrendingUp size={18} color={colors.lime} />
                  <T v="body" color={colors.lime} style={{ fontFamily: font.bold }}>
                    {t(`Ανέβηκες ${climbed} ${climbed === 1 ? 'θέση' : 'θέσεις'}!`, `You moved up ${climbed} ${climbed === 1 ? 'place' : 'places'}!`)}
                  </T>
                </Animated.View>
              )}
              {!data.me?.rank && (
                <Button label={t('Σάρωσε το πρώτο σου', 'Scan your first item')} variant="lime" icon={<ScanLine size={18} color={colors['forest-800']} />} onPress={() => router.push('/scan')} />
              )}
            </Animated.View>

            <Card style={{ padding: 6 }}>
              {data.top.length === 0 ? (
                <T v="body" color={colors.muted} style={{ padding: 12 }}>{t('Κανείς ακόμη. Γίνε ο πρώτος!', 'Nobody yet. Be the first!')}</T>
              ) : (
                data.top.map((p, i) => (
                  <Animated.View key={`${p.rank}-${p.nickname}`} entering={enter(i)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: r.control, backgroundColor: p.isMe ? colors['forest-50'] : 'transparent' }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: p.rank <= 3 ? MEDALS[p.rank - 1] : colors['surface-2'] }}>
                        <T v="num" color={p.rank <= 3 ? '#fff' : colors.muted} style={{ fontSize: 13 }}>{p.rank}</T>
                      </View>
                      <T v="bodyLg" numberOfLines={1} style={{ flex: 1, fontFamily: p.isMe ? font.bold : font.medium }}>
                        {p.nickname}{p.isMe ? t(' (εσύ)', ' (you)') : ''}
                      </T>
                      <T v="num" color={colors['forest-700']}>{p.score}</T>
                    </View>
                  </Animated.View>
                ))
              )}
            </Card>

            {!scope && data.neighbourhoods.length > 0 && (
              <View style={{ gap: 10 }}>
                <T v="eyebrow" color={colors.muted}>{t('Γειτονιές που σκανάρουν περισσότερο', 'Most active neighbourhoods')}</T>
                <Card style={{ gap: 10 }}>
                  {data.neighbourhoods.slice(0, 5).map((h, i) => {
                    const max = data.neighbourhoods[0]!.scans || 1;
                    return (
                      <View key={h.id} style={{ gap: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <T v="body">{i + 1}. {t(h.name)}</T>
                          <T v="num" color={colors.muted} style={{ fontSize: 13 }}>{h.scans}</T>
                        </View>
                        <View style={{ height: 8, borderRadius: 4, backgroundColor: colors['surface-2'] }}>
                          <View style={{ height: 8, borderRadius: 4, width: `${(h.scans / max) * 100}%`, backgroundColor: colors['forest-700'] }} />
                        </View>
                      </View>
                    );
                  })}
                </Card>
              </View>
            )}

            <PressableScale onPress={() => router.push('/settings')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', padding: 8 }}>
                <T v="caption" color={colors['forest-700']}>{t('Άλλαξε το ψευδώνυμό σου', 'Change your nickname')}</T>
                <ChevronRight size={14} color={colors['forest-700']} />
              </View>
            </PressableScale>
            <T v="caption" color={colors.muted} style={{ textAlign: 'center' }}>
              {t(`Μετράνε έως ${data.dailyCap} σαρώσεις την ημέρα. Φαίνεται μόνο το ψευδώνυμο.`, `Up to ${data.dailyCap} scans a day count. Only nicknames are shown.`)}
            </T>
          </>
        )}
      </Screen>
      <Confetti run={burst} />
    </View>
  );
}
