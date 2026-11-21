import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Clock, Gift, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/components/back-button';
import { Confetti } from '@/components/confetti';
import { CountUp } from '@/components/count-up';
import { PressableScale } from '@/components/pressable-scale';
import { Button, T } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { enter, fade } from '@/lib/motion';
import { useApp } from '@/lib/store';
import { colors, r } from '@/lib/theme';

type Phase = 'camera' | 'checking' | 'success' | 'limit' | 'error';

/**
 * Daily bin selfie. In the pilot the four checks run on the device and the photo is discarded;
 * the server only receives "check-in happened" and applies the coupon rules.
 */
export default function Checkin() {
  const { decision } = useLocalSearchParams<{ decision?: string }>();
  const { t, deviceId, districtId, bumpWallet } = useApp();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('camera');
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<{ earned: number; breakdown: { label: { el: string; en: string }; amount: number }[]; streak: number; before: number } | null>(null);
  const [nextAt, setNextAt] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);

  const checks = [
    t('Βρέθηκε κάδος', 'Bin detected'),
    t('Γειτονιά επιβεβαιώθηκε', 'Neighbourhood confirmed'),
    t('Έλεγχος ζωντάνιας', 'Liveness check'),
    t('Μοναδική φωτογραφία', 'Unique photo'),
  ];

  useEffect(() => {
    if (phase !== 'checking') return;
    if (step < checks.length) {
      const id = setTimeout(() => setStep((s) => s + 1), 520);
      return () => clearTimeout(id);
    }
    (async () => {
      try {
        const before = (await api.wallet(deviceId)).balance;
        const res = await api.checkin({ deviceId, decisionId: decision, districtId });
        setResult({ ...res.reward, streak: res.streak, before });
        setPhase('success');
        setBurst((b) => b + 1);
        bumpWallet();
      } catch (e) {
        if (e instanceof ApiError && e.status === 429) {
          setNextAt((e.details as { nextAt?: string } | undefined)?.nextAt ?? null);
          setPhase('limit');
        } else setPhase('error');
      }
    })();
  }, [phase, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    setStep(0);
    setPhase('checking');
  };
  const cameraOk = permission?.granted && Platform.OS !== 'web';

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {phase === 'camera' && cameraOk && <CameraView style={{ position: 'absolute', inset: 0 }} facing="front" />}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton tone="dark" close />
        <T v="h2" color="#fff">{t('Selfie στον κάδο', 'Bin selfie')}</T>
      </View>

      <View style={{ flex: 1, padding: 18, justifyContent: 'center', gap: 16 }}>
        {phase === 'camera' && (
          <Animated.View entering={enter(0)} style={{ alignItems: 'center', gap: 14 }}>
            <View style={{ width: 240, height: 300, borderRadius: 120, borderWidth: 3, borderColor: colors.lime, borderStyle: 'dashed' }} />
            <T v="bodyLg" color="#fff" style={{ textAlign: 'center' }}>
              {t('Βγάλε μια selfie δίπλα στον κάδο, τη στιγμή που ανακυκλώνεις.', 'Take a selfie next to the bin as you recycle.')}
            </T>
            {!cameraOk && Platform.OS !== 'web' && (
              <PressableScale onPress={requestPermission}>
                <T v="caption" color={colors.lime}>{t('Επίτρεψε την κάμερα', 'Allow the camera')}</T>
              </PressableScale>
            )}
          </Animated.View>
        )}

        {phase === 'checking' && (
          <View style={{ gap: 12 }}>
            {checks.map((c, i) => (
              <Animated.View key={c} entering={enter(i)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: r.card, padding: 14 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: i < step ? colors.lime : 'rgba(255,255,255,0.1)' }}>
                  {i < step ? <Check size={16} color={colors['forest-900']} strokeWidth={3} /> : i === step ? <ActivityIndicator size="small" color={colors.lime} /> : null}
                </View>
                <T v="bodyLg" color={i <= step ? '#fff' : 'rgba(255,255,255,0.5)'}>{c}</T>
              </Animated.View>
            ))}
          </View>
        )}

        {phase === 'success' && result && (
          <View style={{ alignItems: 'center', gap: 16 }}>
            <Animated.View entering={ZoomIn.springify().damping(14).stiffness(220)} style={{ width: 96, height: 96, borderRadius: 30, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}>
              <Gift size={44} color={colors['forest-900']} />
            </Animated.View>
            <Animated.View entering={fade(150)} style={{ alignItems: 'center' }}>
              <T v="eyebrow" color="rgba(255,255,255,0.7)">{t('Κέρδισες', 'You earned')}</T>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <T v="numLg" color={colors.lime} style={{ fontSize: 56, lineHeight: 60 }}>+</T>
                <CountUp from={0} to={result.earned} color={colors.lime} style={{ fontSize: 56, lineHeight: 60 }} />
              </View>
              <T v="h2" color="#fff">{t('κουπόνια', 'coupons')}</T>
            </Animated.View>
            <Animated.View entering={enter(3)} style={{ alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: r.card, padding: 14, gap: 8 }}>
              {result.breakdown.map((b, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T v="body" color="rgba(255,255,255,0.85)">{t(b.label)}</T>
                  <T v="num" color="#fff">+{b.amount}</T>
                </View>
              ))}
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T v="body" color="rgba(255,255,255,0.85)">{t('Σύνολο', 'Balance')}</T>
                <CountUp from={result.before} to={result.before + result.earned} duration={1400} color="#fff" style={{ fontSize: 20, lineHeight: 24 }} />
              </View>
            </Animated.View>
          </View>
        )}

        {phase === 'limit' && (
          <Animated.View entering={enter(0)} style={{ alignItems: 'center', gap: 12 }}>
            <Clock size={44} color={colors.lime} />
            <T v="h2" color="#fff" style={{ textAlign: 'center' }}>{t('Μία selfie κάθε 24 ώρες', 'One selfie every 24 hours')}</T>
            <T v="body" color="rgba(255,255,255,0.75)" style={{ textAlign: 'center' }}>
              {nextAt
                ? t(`Η επόμενη είναι διαθέσιμη στις ${new Date(nextAt).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}.`, `Next one available at ${new Date(nextAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.`)
                : t('Ξαναδοκίμασε αύριο.', 'Try again tomorrow.')}
            </T>
          </Animated.View>
        )}

        {phase === 'error' && (
          <T v="bodyLg" color="#fff" style={{ textAlign: 'center' }}>{t('Δεν υπάρχει σύνδεση. Δοκίμασε ξανά.', 'No connection. Try again.')}</T>
        )}
      </View>

      <View style={{ padding: 18, paddingBottom: insets.bottom + 16, gap: 10 }}>
        {phase === 'camera' && (
          <>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <ShieldCheck size={16} color={colors.lime} />
              <T v="caption" color="rgba(255,255,255,0.75)" style={{ flex: 1 }}>
                {t('Η φωτογραφία ελέγχεται στη συσκευή σου και διαγράφεται. Δεν αποθηκεύουμε το πρόσωπό σου ούτε τη διεύθυνσή σου.', 'The photo is checked on your device and deleted. We never store your face or your address.')}
              </T>
            </View>
            <Button label={t('Βγάλε selfie', 'Take selfie')} variant="lime" onPress={start} />
          </>
        )}
        {(phase === 'success' || phase === 'limit') && (
          <Button label={t('Δες τα κουπόνια σου', 'See your coupons')} variant="lime" onPress={() => router.replace('/coupons')} />
        )}
        {phase === 'error' && <Button label={t('Δοκίμασε ξανά', 'Try again')} variant="lime" onPress={start} />}
      </View>
      <Confetti run={burst} />
    </View>
  );
}
