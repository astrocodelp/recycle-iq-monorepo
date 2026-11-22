import { PICKABLE_OBJECTS } from '@recycleiq/engine';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Camera, Info, Sparkles } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/components/back-button';
import { ObjectIcon } from '@/components/icons';
import { PressableScale } from '@/components/pressable-scale';
import { T } from '@/components/ui';
import { enter, fade } from '@/lib/motion';
import { useApp } from '@/lib/store';
import { colors, font, r } from '@/lib/theme';
import { recognizeInCloud } from '@/lib/cloud-vision';
import { pickPhotoOnWeb } from '@/lib/pick-photo';
import { isModelDownloaded, prefetchModelOnWifi, recognize, visionSupported } from '@/lib/vision';
import { confidentOnDevice } from '@/lib/vision-gate';

/**
 * Scan. The shutter freezes the frame and the pick tray is re-ordered with the most likely item first;
 * the resident confirms with one tap. Recognition (docs/VISION.md):
 * 1. the on-device SigLIP 2 model, when it is on the phone and very sure (98% right on the bench), and the
 *    item needs no visual check (a pizza box's grease is judged by the server);
 * 2. otherwise the server (a vision model, the photo is not stored), which also says if it looks greasy
 *    or still holds liquid;
 * 3. without network, the on-device model whatever its confidence; then the normal tray.
 */
interface Suggestion {
  /** Catalogue ids, most likely first. */
  order: string[];
  /** Clear enough to suggest the first item. */
  sure: boolean;
  /** The model saw something that is not in the catalogue, in a few Greek words. */
  notListed?: string;
  /** Answer to the item's question suggested by the photo (pizza box: greasy yes / no). */
  answer?: string;
  /** Still holds liquid: empty it first. */
  liquid?: boolean;
  where: 'cloud' | 'device';
}

/** Items whose bin depends on something the phone model cannot judge (grease). */
const NEEDS_SERVER = new Set(['pizza-box']);
type Phase = { k: 'idle' } | { k: 'downloading'; progress: number } | { k: 'recognizing' } | { k: 'done'; result: Suggestion | null };

export default function Scan() {
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  // On the web the browser's own picker is used, so do not ask for the camera on page load.
  const [permission, requestPermission] = useCameraPermissions({ get: Platform.OS !== 'web' });
  const [captured, setCaptured] = useState(false);
  /** Web only: the chosen photo, shown in the viewfinder (native apps freeze the camera frame instead). */
  const [photo, setPhoto] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ k: 'idle' });
  const cam = useRef<CameraView>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  const reduce = useReducedMotion();
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (!reduce) sweep.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduce, sweep]);
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sweep.value * 240 }] }));

  const shoot = async () => {
    let uri: string | null = null;
    if (Platform.OS === 'web') {
      // The browser's own picker: camera on phones, file chooser on a laptop.
      uri = await pickPhotoOnWeb();
      if (!uri) return;
      setPhoto(uri);
    } else {
      try {
        uri = (await cam.current?.takePictureAsync({ quality: 0.5, skipProcessing: true }))?.uri ?? null;
      } catch {}
    }
    setCaptured(true);
    if (!uri) return setPhase({ k: 'done', result: null });
    const ctrl = new AbortController();
    abort.current = ctrl;
    setPhase({ k: 'recognizing' });
    // 1. On the phone first, when the model is already there and very sure.
    let local = visionSupported && isModelDownloaded() ? await recognize(uri, { signal: ctrl.signal }) : null;
    if (ctrl.signal.aborted) return;
    if (local && confidentOnDevice(local) && !NEEDS_SERVER.has(local.ranked[0]!.id)) {
      return setPhase({ k: 'done', result: { order: local.ranked.map((r) => r.id), sure: true, where: 'device' } });
    }
    // 2. The server.
    const cloud = await recognizeInCloud(uri, ctrl.signal);
    if (ctrl.signal.aborted) return;
    if (cloud) {
      void prefetchModelOnWifi();
      const listed = cloud.item !== 'other';
      const sure = listed && cloud.confidence >= 0.5;
      return setPhase({
        k: 'done',
        result: {
          order: listed ? [cloud.item] : [],
          sure,
          notListed: listed ? undefined : cloud.seen || undefined,
          answer: sure && cloud.item === 'pizza-box' && cloud.greasy !== undefined ? (cloud.greasy ? 'yes' : 'no') : undefined,
          liquid: sure && cloud.liquid === true,
          where: 'cloud',
        },
      });
    }
    // 3. No network or server: the on-device model whatever its confidence, if this build has it.
    if (!visionSupported) return setPhase({ k: 'done', result: null });
    if (local) return setPhase({ k: 'done', result: { order: local.ranked.map((r) => r.id), sure: local.sure, where: 'device' } });
    if (!isModelDownloaded()) setPhase({ k: 'downloading', progress: 0 });
    local = await recognize(uri, {
      signal: ctrl.signal,
      onDownload: (progress) => !ctrl.signal.aborted && setPhase(progress >= 1 ? { k: 'recognizing' } : { k: 'downloading', progress }),
    });
    if (ctrl.signal.aborted) return;
    setPhase({ k: 'done', result: local ? { order: local.ranked.map((r) => r.id), sure: local.sure, where: 'device' } : null });
  };
  const cancel = () => {
    abort.current?.abort();
    setPhase({ k: 'done', result: null });
  };
  const cameraOk = permission?.granted && Platform.OS !== 'web';
  const result = phase.k === 'done' ? phase.result : null;
  const order = new Map((result?.order ?? []).map((id, i) => [id, i]));
  const list = result ? [...PICKABLE_OBJECTS].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99)) : PICKABLE_OBJECTS;
  const suggested = result?.sure ? list[0] : undefined;
  const busy = phase.k === 'downloading' || phase.k === 'recognizing';
  const pick = (id: string) => {
    const answer = result?.answer && id === result.order[0] ? result.answer : undefined;
    router.replace({ pathname: '/item/[id]', params: { id, via: 'scan', ...(answer ? { suggest: answer } : {}) } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ position: 'absolute', inset: 0 }}>
        {cameraOk && <CameraView ref={cam} style={{ flex: 1 }} facing="back" active={!captured} />}
        {photo && <Image source={{ uri: photo }} style={{ flex: 1, opacity: 0.85 }} resizeMode="cover" accessibilityIgnoresInvertColors />}
      </View>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton tone="dark" close />
        <T v="h2" color="#fff">{t('Σάρωση', 'Scan')}</T>
      </View>

      {/* Viewfinder with animated corner brackets and sweeping line. */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 260, height: 260 }}>
          {[{ top: 0, left: 0 }, { top: 0, right: 0 }, { bottom: 0, left: 0 }, { bottom: 0, right: 0 }].map((pos, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                width: 44,
                height: 44,
                borderColor: colors.lime,
                borderTopWidth: 'top' in pos ? 4 : 0,
                borderBottomWidth: 'bottom' in pos ? 4 : 0,
                borderLeftWidth: 'left' in pos ? 4 : 0,
                borderRightWidth: 'right' in pos ? 4 : 0,
                borderRadius: 6,
                ...pos,
              }}
            />
          ))}
          {!captured && <Animated.View style={[{ position: 'absolute', left: 14, right: 14, top: 8, height: 2, backgroundColor: colors.lime, opacity: 0.85 }, lineStyle]} />}
        </View>
        {!cameraOk && !captured && (
          <PressableScale onPress={Platform.OS === 'web' ? shoot : requestPermission} style={{ marginTop: 18 }}>
            <T v="caption" color="rgba(255,255,255,0.75)" style={{ textAlign: 'center', paddingHorizontal: 40 }}>
              {Platform.OS === 'web'
                ? t('Πάτα το κουμπί για να τραβήξεις ή να διαλέξεις φωτογραφία.', 'Press the button to take or choose a photo.')
                : t('Πάτησε για να επιτρέψεις την κάμερα', 'Tap to allow the camera')}
            </T>
          </PressableScale>
        )}
      </View>

      <View style={{ paddingBottom: insets.bottom + 16, gap: 14 }}>
        {captured && busy && (
          <Animated.View entering={fade()} style={{ marginHorizontal: 18, gap: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: r.card, padding: 12 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <ActivityIndicator color={colors.lime} />
              <T v="caption" color="rgba(255,255,255,0.9)" style={{ flex: 1 }}>
                {phase.k === 'downloading'
                  ? t(
                      `Κατεβάζουμε το μοντέλο αναγνώρισης (63 MB), μία φορά · ${Math.round(phase.progress * 100)}%`,
                      `Downloading the recognition model (63 MB), once · ${Math.round(phase.progress * 100)}%`,
                    )
                  : t('Αναγνώριση…', 'Recognising…')}
              </T>
            </View>
            {phase.k === 'downloading' && (
              <>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                  <View style={{ height: 4, width: `${Math.round(phase.progress * 100)}%`, backgroundColor: colors.lime }} />
                </View>
                <PressableScale onPress={cancel} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
                  <T v="caption" color={colors.lime} style={{ fontFamily: font.semibold }}>{t('Άκυρο · διάλεξε από τη λίστα', 'Cancel · pick from the list')}</T>
                </PressableScale>
              </>
            )}
          </Animated.View>
        )}
        {captured && !busy && (
          <Animated.View entering={fade()} style={{ marginHorizontal: 18, flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: r.card, padding: 12 }}>
            {suggested ? <Sparkles size={16} color={colors.lime} style={{ marginTop: 1 }} /> : <Info size={16} color={colors.lime} style={{ marginTop: 1 }} />}
            <T v="caption" color="rgba(255,255,255,0.85)" style={{ flex: 1 }}>
              {suggested
                ? t(`Μοιάζει με: ${suggested.name.el}. Πάτα για επιβεβαίωση.`, `Looks like: ${suggested.name.en}. Tap to confirm.`) +
                  (result?.liquid ? t(' Έχει ακόμα υγρό: άδειασέ το πρώτα.', ' It still has liquid in it: empty it first.') : '') +
                  (result?.answer === 'yes' ? t(' Φαίνεται λερωμένο με λάδια.', ' It looks greasy.') : result?.answer === 'no' ? t(' Φαίνεται καθαρό.', ' It looks clean.') : '')
                : result?.notListed
                  ? t(`Βλέπω: ${result.notListed}. Δεν είναι ακόμη στη λίστα μας — διάλεξε το πιο κοντινό ή γράψ’ το στην αναζήτηση.`, `I see: ${result.notListed}. It is not on our list yet — pick the closest or type it in search.`)
                  : result
                    ? t('Δεν είμαι σίγουρος — διάλεξε τι είναι.', "I'm not sure — pick what it is.")
                    : t('Διάλεξε τι είναι.', 'Pick what it is.')}
              {result?.where === 'cloud'
                ? t(' Η φωτογραφία στάλθηκε μόνο για την αναγνώριση και δεν κρατήθηκε.', ' The photo was sent only for recognition and was not kept.')
                : t(' Η φωτογραφία έμεινε στο κινητό σου.', ' The photo stayed on your phone.')}
            </T>
          </Animated.View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 18 }} style={{ opacity: busy ? 0.5 : 1 }}>
          {list.map((o, i) => (
            <Animated.View key={`${o.id}-${phase.k}`} entering={enter(i)}>
              <PressableScale onPress={() => pick(o.id)} accessibilityRole="button" accessibilityLabel={t(o.name)}>
                <View style={{ width: 84, height: 96, borderRadius: 18, backgroundColor: o === suggested ? 'rgba(199,243,107,0.16)' : 'rgba(255,255,255,0.08)', borderWidth: o === suggested ? 2 : 1, borderColor: o === suggested ? colors.lime : 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 6 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: o.thumbTone, alignItems: 'center', justifyContent: 'center' }}>
                    <ObjectIcon name={o.icon} size={22} />
                  </View>
                  <T v="micro" color="#fff" numberOfLines={2} style={{ textAlign: 'center', fontFamily: font.semibold }}>{t(o.name)}</T>
                </View>
              </PressableScale>
            </Animated.View>
          ))}
        </ScrollView>
        {!captured && (
          <View style={{ alignItems: 'center' }}>
            <PressableScale onPress={shoot} scaleTo={0.92} accessibilityRole="button" accessibilityLabel={t('Λήψη', 'Capture')}>
              <View style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={24} color={colors.canvas} />
                </View>
              </View>
            </PressableScale>
          </View>
        )}
      </View>
    </View>
  );
}
