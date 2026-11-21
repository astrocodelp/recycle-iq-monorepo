import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors, font } from '@/lib/theme';
import { T } from './ui';

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <LinearGradient id="riq" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1C7A44" />
          <Stop offset="1" stopColor="#0F4A27" />
        </LinearGradient>
      </Defs>
      <Rect width="32" height="32" rx="9.5" fill="url(#riq)" />
      <Path d="M22.2 11.6A8 8 0 1 0 24 16.4" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
      <Path d="M23.4 6.9 23.2 12.6 17.6 11.7Z" fill="#fff" />
      <Path d="M17.2 17.2C19.6 15.6 24.4 15.8 25.4 21.6 19.6 22.6 16.6 20.4 17.2 17.2Z" fill="#C7F36B" />
      <Path d="M18.4 18.6 22.6 20.4" stroke="#166534" strokeWidth="1" strokeLinecap="round" opacity={0.55} />
    </Svg>
  );
}

export function Logo() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <LogoMark size={30} />
      <T v="h2" style={{ fontFamily: font.extrabold, fontSize: 18 }}>
        Recycle<T v="h2" color={colors['forest-500']} style={{ fontFamily: font.extrabold, fontSize: 18 }}>IQ</T>
      </T>
    </View>
  );
}
