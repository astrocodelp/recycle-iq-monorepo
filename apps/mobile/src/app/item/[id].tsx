import { getObject } from '@recycleiq/engine';
import { useLocalSearchParams } from 'expo-router';
import { ChevronRight, Info, WifiOff } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { BackButton } from '@/components/back-button';
import { ObjectIcon } from '@/components/icons';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { useDecide } from '@/lib/decide';
import { enter } from '@/lib/motion';
import { useApp } from '@/lib/store';
import { colors, font, r } from '@/lib/theme';

/** One clarifying question at most; items without one go straight to the decision. */
export default function Item() {
  const { id, via } = useLocalSearchParams<{ id: string; via?: string }>();
  const { t } = useApp();
  const { decide, busy, error } = useDecide();
  const obj = getObject(id ?? '') ?? getObject('unknown')!;
  const question = obj.questions[0];
  const mode = via === 'scan' ? 'scan' : 'search';
  const started = useRef(false);

  useEffect(() => {
    if (!question && !started.current) {
      started.current = true;
      decide(obj.id, {}, mode);
    }
  }, [question, obj.id, mode, decide]);

  return (
    <Screen>
      <BackButton />
      <Animated.View entering={enter(0)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: obj.thumbTone, alignItems: 'center', justifyContent: 'center' }}>
          <ObjectIcon name={obj.icon} size={30} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="eyebrow" color={colors.muted}>{t('Αντικείμενο', 'Item')}</T>
          <T v="h1">{t(obj.name)}</T>
          <T v="caption" color={colors.muted}>{t(obj.material)}</T>
        </View>
      </Animated.View>

      {question ? (
        <>
          <Animated.View entering={enter(1)} style={{ gap: 6 }}>
            <T v="h2" style={{ fontSize: 20, lineHeight: 26 }}>{t(question.prompt)}</T>
            {question.helper && (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Info size={16} color={colors['forest-700']} style={{ marginTop: 2 }} />
                <T v="body" color={colors.muted} style={{ flex: 1 }}>{t(question.helper)}</T>
              </View>
            )}
          </Animated.View>
          <View style={{ gap: 10 }}>
            {question.options.map((o, i) => (
              <Animated.View key={o.id} entering={enter(i + 2)}>
                <PressableScale
                  disabled={busy}
                  onPress={() => decide(obj.id, { [question.id]: o.id }, mode)}
                  accessibilityRole="button"
                  accessibilityLabel={t(o.label)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: r.card, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T v="bodyLg" style={{ fontFamily: font.semibold }}>{t(o.label)}</T>
                      {o.hint && <T v="caption" color={colors.muted}>{t(o.hint)}</T>}
                    </View>
                    <ChevronRight size={20} color={colors.faint} />
                  </View>
                </PressableScale>
              </Animated.View>
            ))}
          </View>
        </>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
          <ActivityIndicator color={colors['forest-700']} />
          <T v="body" color={colors.muted}>{t('Η μηχανή αποφασίζει…', 'The engine is deciding…')}</T>
        </View>
      )}

      {busy && question && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <ActivityIndicator color={colors['forest-700']} />
          <T v="caption" color={colors.muted}>{t('Εφαρμόζουμε τους κανόνες του Δήμου…', 'Applying municipal rules…')}</T>
        </View>
      )}

      {error && (
        <Card style={{ gap: 10, backgroundColor: colors['warn-soft'], borderColor: colors['warn-soft'] }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <WifiOff size={18} color={colors.warn} />
            <T v="h3" color={colors.warn}>
              {error === 'network' ? t('Δεν υπάρχει σύνδεση', 'No connection') : t('Κάτι πήγε στραβά', 'Something went wrong')}
            </T>
          </View>
          <T v="body" color={colors.warn}>
            {t('Δεν μπορέσαμε να ρωτήσουμε τη μηχανή αποφάσεων. Δοκίμασε ξανά.', 'We could not reach the decision engine. Try again.')}
          </T>
          {!question && <Button label={t('Δοκίμασε ξανά', 'Try again')} variant="secondary" onPress={() => decide(obj.id, {}, mode)} />}
        </Card>
      )}
    </Screen>
  );
}
