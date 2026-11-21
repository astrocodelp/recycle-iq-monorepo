import { REWARD_RULES } from '@recycleiq/engine';
import { router, useFocusEffect } from 'expo-router';
import { Coffee, Flame, Gift, Ticket, ShoppingBasket, Smile } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { CountUp } from '@/components/count-up';
import { Screen } from '@/components/screen';
import { Button, Card, DemoBadge, T } from '@/components/ui';
import { api, type Wallet } from '@/lib/api';
import { EASE_OUT, enter } from '@/lib/motion';
import { useApp } from '@/lib/store';
import { colors, r, shadow } from '@/lib/theme';

// Indicative partner rewards (concept): generic, never real brands.
const REWARDS = [
  { icon: Coffee, cost: 150, el: 'Καφές σε καφέ της γειτονιάς', en: 'Coffee at a neighbourhood café' },
  { icon: Ticket, cost: 120, el: 'Εισιτήριο συγκοινωνίας 90′', en: '90-minute transit ticket' },
  { icon: ShoppingBasket, cost: 500, el: 'Έκπτωση 5 € σε σούπερ μάρκετ', en: '€5 off at a supermarket' },
];

export default function Coupons() {
  const { t, deviceId, walletVersion } = useApp();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const prev = useRef(0);
  const reduce = useReducedMotion();
  const progress = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      if (!deviceId) return;
      api.wallet(deviceId).then(
        (w) => {
          setWallet((old) => {
            prev.current = old?.balance ?? 0;
            return w;
          });
          const next = REWARDS.map((x) => x.cost).find((c) => c > w.balance) ?? REWARDS[REWARDS.length - 1]!.cost;
          progress.value = withTiming(Math.min(1, w.balance / next), { duration: reduce ? 0 : 900, easing: EASE_OUT });
        },
        () => {},
      );
    }, [deviceId, walletVersion, reduce, progress]),
  );
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const balance = wallet?.balance ?? 0;
  const next = REWARDS.map((x) => x.cost).find((c) => c > balance);

  return (
    <Screen>
      <Animated.View entering={enter(0)}>
        <T v="h1">{t('Κουπόνια', 'Coupons')}</T>
        <T v="body" color={colors.muted}>{t('Ανακυκλώνεις σωστά, κερδίζεις.', 'Recycle right, get rewarded.')}</T>
      </Animated.View>

      <Animated.View entering={enter(1)} style={{ borderRadius: r.sheet, padding: 20, backgroundColor: colors['forest-800'], gap: 14, ...shadow.pop }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T v="eyebrow" color="rgba(255,255,255,0.7)">{t('Υπόλοιπο', 'Balance')}</T>
          <Gift size={20} color={colors.lime} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <CountUp from={prev.current} to={balance} color="#fff" style={{ fontSize: 52, lineHeight: 56 }} />
          <T v="h2" color={colors.lime}>{t('κουπόνια', 'coupons')}</T>
        </View>
        <T v="caption" color="rgba(255,255,255,0.75)">
          {t(`≈ ${(balance / (wallet?.couponsPerEuro ?? 100)).toFixed(2).replace('.', ',')} € (ενδεικτικά)`, `≈ €${(balance / (wallet?.couponsPerEuro ?? 100)).toFixed(2)} (indicative)`)}
        </T>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
          <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: colors.lime }, barStyle]} />
        </View>
        <T v="caption" color="rgba(255,255,255,0.75)">
          {next ? t(`Ακόμη ${next - balance} για την επόμενη ανταμοιβή`, `${next - balance} more for the next reward`) : t('Μπορείς να εξαργυρώσεις όλες τις ανταμοιβές', 'You can redeem every reward')}
        </T>
      </Animated.View>

      <Animated.View entering={enter(2)}>
        <Button label={t('Selfie στον κάδο', 'Bin selfie')} icon={<Smile size={18} color="#fff" />} onPress={() => router.push('/checkin')} />
      </Animated.View>

      <Animated.View entering={enter(3)} style={{ gap: 10 }}>
        <T v="eyebrow" color={colors.muted}>{t('Πώς κερδίζεις', 'How to earn')}</T>
        <Card style={{ gap: 10 }}>
          {[
            [t('Μία selfie στον κάδο κάθε 24 ώρες', 'One bin selfie every 24 hours'), `+${REWARD_RULES.base}`],
            [t('Ταιριάζει με αντικείμενο που σάρωσες', 'Matches an item you just scanned'), `+${REWARD_RULES.matchBonus}`],
            [t('Μπόνους σερί ανά ημέρα', 'Streak bonus per day'), t(`+${REWARD_RULES.streakPerDay}, έως +${REWARD_RULES.streakCap}`, `+${REWARD_RULES.streakPerDay}, up to +${REWARD_RULES.streakCap}`)],
            [t('Παράδοση σε σημείο ειδικής συλλογής', 'Special-collection drop-off'), `+${REWARD_RULES.specialDropOff}`],
          ].map(([a, b], i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                {i === 2 && <Flame size={16} color={colors['cat-special']} />}
                <T v="body" style={{ flex: 1 }}>{a}</T>
              </View>
              <T v="num" color={colors['forest-700']}>{b}</T>
            </View>
          ))}
        </Card>
      </Animated.View>

      <Animated.View entering={enter(4)} style={{ gap: 10 }}>
        <T v="eyebrow" color={colors.muted}>{t('Ανταμοιβές', 'Rewards')}</T>
        {REWARDS.map((rw, i) => {
          const can = balance >= rw.cost;
          return (
            <Card key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: can ? 1 : 0.75 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: can ? colors.lime : colors['surface-2'], alignItems: 'center', justifyContent: 'center' }}>
                <rw.icon size={20} color={can ? colors['forest-900'] : colors.muted} />
              </View>
              <T v="h3" style={{ flex: 1 }}>{t(rw.el, rw.en)}</T>
              <T v="num" color={can ? colors['forest-700'] : colors.muted}>{rw.cost}</T>
            </Card>
          );
        })}
        <DemoBadge label={t('Ενδεικτικοί συνεργάτες — concept · Ενδεικτικές τιμές', 'Indicative partners — concept · Indicative prices')} />
      </Animated.View>

      {wallet && wallet.history.length > 0 && (
        <Animated.View entering={enter(5)} style={{ gap: 10 }}>
          <T v="eyebrow" color={colors.muted}>{t('Ιστορικό', 'History')}</T>
          <Card style={{ gap: 10 }}>
            {wallet.history.map((h) => (
              <View key={h.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T v="body">{new Date(h.createdAt).toLocaleDateString(t('el-GR', 'en-GB'), { day: 'numeric', month: 'long' })}</T>
                <T v="num" color={colors['forest-700']}>+{h.earned}</T>
              </View>
            ))}
          </Card>
        </Animated.View>
      )}
      <T v="caption" color={colors.muted}>
        {t('Η χρήση της εφαρμογής δεν ισοδυναμεί με επιβεβαιωμένη ανακύκλωση.', 'Using the app is not verified recycling.')}
      </T>
    </Screen>
  );
}
