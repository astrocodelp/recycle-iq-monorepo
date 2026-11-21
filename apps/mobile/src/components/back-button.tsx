import { router } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import { View } from 'react-native';
import { useApp } from '@/lib/store';
import { PressableScale } from './pressable-scale';

export function BackButton({ tone = 'light', close = false }: { tone?: 'light' | 'dark' | 'glass'; close?: boolean }) {
  const { t } = useApp();
  const Icon = close ? X : ArrowLeft;
  const bg = tone === 'light' ? '#fff' : tone === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.22)';
  const fg = tone === 'light' ? '#17211D' : '#fff';
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={close ? t('Κλείσιμο', 'Close') : t('Πίσω', 'Back')}
      hitSlop={10}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={fg} />
      </View>
    </PressableScale>
  );
}
