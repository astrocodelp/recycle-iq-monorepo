import { PICKABLE_OBJECTS } from '@recycleiq/engine';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Camera, Info } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/components/back-button';
import { ObjectIcon } from '@/components/icons';
import { PressableScale } from '@/components/pressable-scale';
import { T } from '@/components/ui';
import { enter, fade } from '@/lib/motion';
import { useApp } from '@/lib/store';
import { colors, font, r } from '@/lib/theme';

/**
 * Scan. The on-device vision model (SigLIP 2, see docs/VISION.md) plugs into `recognize`.
 * Until it ships, the shutter freezes the frame and the user confirms what it is from the tray;
 * the photo never leaves the phone.
 */
async function recognize(): Promise<string[] | null> {
  return null;
}

export default function Scan() {
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [captured, setCaptured] = useState(false);
  const [candidates, setCandidates] = useState<string[] | null>(null);
  const cam = useRef<CameraView>(null);
  const reduce = useReducedMotion();
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (!reduce) sweep.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduce, sweep]);
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sweep.value * 240 }] }));

  const shoot = async () => {
    try {
      await cam.current?.takePictureAsync({ quality: 0.3, skipProcessing: true });
    } catch {}
    setCaptured(true);
    setCandidates(await recognize());
  };
  const pick = (id: string) => router.replace({ pathname: '/item/[id]', params: { id, via: 'scan' } });
  const cameraOk = permission?.granted && Platform.OS !== 'web';
  const list = candidates ? PICKABLE_OBJECTS.filter((o) => candidates.includes(o.id)) : PICKABLE_OBJECTS;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ position: 'absolute', inset: 0 }}>
        {cameraOk && <CameraView ref={cam} style={{ flex: 1 }} facing="back" active={!captured} />}
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
          <PressableScale onPress={requestPermission} style={{ marginTop: 18 }}>
            <T v="caption" color="rgba(255,255,255,0.75)" style={{ textAlign: 'center', paddingHorizontal: 40 }}>
              {Platform.OS === 'web'
                ? t('Η κάμερα λειτουργεί στην εφαρμογή κινητού. Διάλεξε το αντικείμενο από κάτω.', 'The camera works in the phone app. Pick the item below.')
                : t('Πάτησε για να επιτρέψεις την κάμερα', 'Tap to allow the camera')}
            </T>
          </PressableScale>
        )}
      </View>

      <View style={{ paddingBottom: insets.bottom + 16, gap: 14 }}>
        {captured && (
          <Animated.View entering={fade()} style={{ marginHorizontal: 18, flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: r.card, padding: 12 }}>
            <Info size={16} color={colors.lime} style={{ marginTop: 1 }} />
            <T v="caption" color="rgba(255,255,255,0.85)" style={{ flex: 1 }}>
              {t('Επιβεβαίωσε τι είναι. Η φωτογραφία μένει στο κινητό σου.', 'Confirm what it is. The photo stays on your phone.')}
            </T>
          </Animated.View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 18 }}>
          {list.map((o, i) => (
            <Animated.View key={o.id} entering={enter(i)}>
              <PressableScale onPress={() => pick(o.id)} accessibilityRole="button" accessibilityLabel={t(o.name)}>
                <View style={{ width: 84, height: 96, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 6 }}>
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
