import { DEFAULT_LOCATION, formatDistance, haversine } from '@recycleiq/engine';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, Check, MapPin, ShieldCheck, TriangleAlert, Trash2, Wrench } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/components/back-button';
import { PressableScale } from '@/components/pressable-scale';
import { Button, Card, T } from '@/components/ui';
import { api, ApiError, type Point } from '@/lib/api';
import { enter, fade } from '@/lib/motion';
import { useApp } from '@/lib/store';
import { categoryColors, colors, font, r } from '@/lib/theme';

type Kind = 'full' | 'overflowing' | 'damaged';
type Step = 'photo' | 'details' | 'sending' | 'done' | 'duplicate' | 'error';
const REPORTABLE = ['blue_bin', 'glass_bell', 'brown_bin', 'clothing_bin', 'general_bin'];

/**
 * Report a full, overflowing or damaged bin. The photo stays on the phone (in a later version an
 * on-device model confirms the bin looks full); the municipality receives the bin, the problem and the time.
 */
export default function Report() {
  const { bin } = useLocalSearchParams<{ bin?: string }>();
  const { t, lang, deviceId, coords, district, binSource } = useApp();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('photo');
  const [points, setPoints] = useState<Point[] | null>(null);
  const [pointId, setPointId] = useState<string | null>(bin ?? null);
  const [kind, setKind] = useState<Kind>('full');

  useEffect(() => {
    api.points({ near: district?.id ?? null, source: binSource, limit: 2000 }).then((res) => setPoints(res.points), () => setPoints([]));
  }, [district?.id, binSource]);

  const from = coords ?? (district ? { lng: district.lng, lat: district.lat } : DEFAULT_LOCATION);
  const nearest = useMemo(
    () =>
      (points ?? [])
        .filter((p) => REPORTABLE.includes(p.kind) || p.id === bin)
        .map((p) => ({ ...p, distance: haversine(p, from) }))
        .sort((a, b) => (a.id === bin ? -1 : b.id === bin ? 1 : a.distance - b.distance))
        .slice(0, 5),
    [points, from, bin],
  );

  // Pre-select the nearest bin (or the one from the QR code); the resident can change it.
  useEffect(() => {
    if (!pointId && nearest[0]) setPointId(nearest[0].id);
  }, [nearest, pointId]);

  const send = async () => {
    if (!pointId) return;
    setStep('sending');
    try {
      await api.reportBin({ pointId, kind, deviceId });
      setStep('done');
    } catch (e) {
      setStep(e instanceof ApiError && e.status === 409 ? 'duplicate' : 'error');
    }
  };
  const cameraOk = permission?.granted && Platform.OS !== 'web';
  const kinds: { id: Kind; label: string; icon: typeof Trash2 }[] = [
    { id: 'full', label: t('Γεμάτος', 'Full'), icon: Trash2 },
    { id: 'overflowing', label: t('Ξεχειλίζει', 'Overflowing'), icon: TriangleAlert },
    { id: 'damaged', label: t('Χαλασμένος', 'Damaged'), icon: Wrench },
  ];

  if (step === 'photo')
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        {cameraOk && <CameraView style={{ position: 'absolute', inset: 0 }} facing="back" />}
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BackButton tone="dark" close />
          <T v="h2" color="#fff">{t('Γεμάτος κάδος', 'Full bin')}</T>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
          <View style={{ width: 240, height: 280, borderRadius: 24, borderWidth: 3, borderColor: colors.lime, borderStyle: 'dashed' }} />
          <T v="bodyLg" color="#fff" style={{ textAlign: 'center' }}>{t('Φωτογράφισε τον κάδο ολόκληρο.', 'Photograph the whole bin.')}</T>
          {!cameraOk && Platform.OS !== 'web' && (
            <PressableScale onPress={requestPermission}>
              <T v="caption" color={colors.lime}>{t('Επίτρεψε την κάμερα', 'Allow the camera')}</T>
            </PressableScale>
          )}
        </View>
        <View style={{ padding: 18, paddingBottom: insets.bottom + 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <ShieldCheck size={16} color={colors.lime} />
            <T v="caption" color="rgba(255,255,255,0.75)" style={{ flex: 1 }}>
              {t('Η φωτογραφία μένει στο κινητό σου. Στον Δήμο πηγαίνει μόνο ο κάδος και το πρόβλημα.', 'The photo stays on your phone. Only the bin and the problem go to the municipality.')}
            </T>
          </View>
          <Button label={t('Λήψη', 'Capture')} variant="lime" icon={<Camera size={18} color={colors['forest-800']} />} onPress={() => setStep('details')} />
        </View>
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: insets.bottom + 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton close />
        <T v="h2">{t('Γεμάτος κάδος', 'Full bin')}</T>
      </View>

      {step === 'done' || step === 'duplicate' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <Animated.View entering={ZoomIn.springify().damping(14).stiffness(220)} style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}>
            <Check size={44} color={colors['forest-900']} strokeWidth={3} />
          </Animated.View>
          <Animated.View entering={fade(120)} style={{ alignItems: 'center', gap: 6 }}>
            <T v="h1" style={{ textAlign: 'center' }}>
              {step === 'done' ? t('Ο Δήμος ενημερώθηκε', 'The municipality has been notified') : t('Το έχεις ήδη αναφέρει', 'You already reported this bin')}
            </T>
            <T v="body" color={colors.muted} style={{ textAlign: 'center' }}>
              {step === 'done' ? t('Ευχαριστούμε. Η αναφορά σου φαίνεται τώρα στο dashboard του Δήμου.', 'Thank you. Your report is now on the municipal dashboard.') : t('Μία αναφορά ανά κάδο κάθε 6 ώρες.', 'One report per bin every 6 hours.')}
            </T>
          </Animated.View>
          <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
            <Button label={t('Τέλος', 'Done')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          </View>
        </View>
      ) : (
        <>
          <Animated.View entering={enter(0)} style={{ gap: 8 }}>
            <T v="eyebrow" color={colors.muted}>{t('Ποιος κάδος;', 'Which bin?')}</T>
            {points === null ? (
              <ActivityIndicator color={colors['forest-700']} />
            ) : (
              nearest.map((p) => (
                <PressableScale key={p.id} onPress={() => setPointId(p.id)} accessibilityRole="radio" accessibilityState={{ selected: pointId === p.id }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: r.card, borderWidth: 2, borderColor: pointId === p.id ? colors['forest-700'] : colors.line, backgroundColor: colors.surface }}>
                    <MapPin size={18} color={categoryColors[p.categories[0] ?? 'packaging'].solid} />
                    <View style={{ flex: 1 }}>
                      <T v="h3" numberOfLines={1}>{t(p.name)}</T>
                      <T v="caption" color={colors.muted}>{p.id === bin ? t('Από το QR του κάδου', 'From the bin QR') : formatDistance(p.distance, lang)}</T>
                    </View>
                    {pointId === p.id && <Check size={18} color={colors['forest-700']} />}
                  </View>
                </PressableScale>
              ))
            )}
          </Animated.View>
          <Animated.View entering={enter(1)} style={{ gap: 8 }}>
            <T v="eyebrow" color={colors.muted}>{t('Τι συμβαίνει;', "What's wrong?")}</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {kinds.map((k) => (
                <PressableScale key={k.id} onPress={() => setKind(k.id)} style={{ flex: 1 }} accessibilityRole="radio" accessibilityState={{ selected: kind === k.id }}>
                  <Card style={{ alignItems: 'center', gap: 6, padding: 12, borderWidth: 2, borderColor: kind === k.id ? colors['forest-700'] : colors.line }}>
                    <k.icon size={22} color={kind === k.id ? colors['forest-700'] : colors.muted} />
                    <T v="caption" style={{ fontFamily: font.semibold }}>{k.label}</T>
                  </Card>
                </PressableScale>
              ))}
            </View>
          </Animated.View>
          <View style={{ flex: 1 }} />
          {step === 'error' && <T v="body" color={colors.danger}>{t('Δεν στάλθηκε. Δοκίμασε ξανά.', 'Not sent. Try again.')}</T>}
          <Button label={t('Ενημέρωσε τον Δήμο', 'Notify the municipality')} disabled={!pointId} loading={step === 'sending'} onPress={send} />
        </>
      )}
    </View>
  );
}
