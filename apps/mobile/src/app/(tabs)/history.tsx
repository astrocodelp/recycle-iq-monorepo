import { CATEGORIES, getObject } from '@recycleiq/engine';
import { router } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { CategoryTile } from '@/components/icons';
import { Screen } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { enter } from '@/lib/motion';
import { useApp } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function History() {
  const { t, history, lang } = useApp();
  return (
    <Screen>
      <Animated.View entering={enter(0)}>
        <T v="h1">{t('Ιστορικό', 'History')}</T>
        <T v="body" color={colors.muted}>{t('Αποθηκεύεται μόνο στο κινητό σου.', 'Stored only on your phone.')}</T>
      </Animated.View>
      {history.length === 0 ? (
        <Animated.View entering={enter(1)} style={{ alignItems: 'center', gap: 12, paddingVertical: 40 }}>
          <Clock size={40} color={colors.faint} />
          <T v="bodyLg" color={colors.muted} style={{ textAlign: 'center' }}>{t('Δεν έχεις σαρώσει τίποτα ακόμη.', "You haven't scanned anything yet.")}</T>
          <Button label={t('Σάρωσε το πρώτο σου', 'Scan your first item')} onPress={() => router.push('/scan')} />
        </Animated.View>
      ) : (
        history.map((h, i) => (
          <Animated.View key={h.id} entering={enter(i + 1)}>
            <Card onPress={() => router.push({ pathname: '/result/[id]', params: { id: h.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
              <CategoryTile category={h.category} size={40} />
              <View style={{ flex: 1 }}>
                <T v="h3">{t(getObject(h.objectId)?.name ?? h.name)}</T>
                <T v="caption" color={colors.muted}>
                  {h.uncertain ? t('Αβέβαιο', 'Uncertain') : t(h.destination)} · {new Date(h.at).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'short' })}
                </T>
              </View>
              <T v="caption" color={colors.muted}>{t(CATEGORIES[h.category].short)}</T>
            </Card>
          </Animated.View>
        ))
      )}
    </Screen>
  );
}
