import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

export function Screen({ children, scroll = true, padded = true, ...rest }: { children: ReactNode; scroll?: boolean; padded?: boolean } & ScrollViewProps) {
  const insets = useSafeAreaInsets();
  const style = { paddingTop: insets.top + 8, paddingHorizontal: padded ? 18 : 0, paddingBottom: 32, gap: 16 };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: colors.paper }, style]}>{children}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={style} keyboardShouldPersistTaps="handled" {...rest}>
      {children}
    </ScrollView>
  );
}
