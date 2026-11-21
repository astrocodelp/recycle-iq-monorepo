import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, font } from '@/lib/theme';
import { T } from './ui';

export function ConfidenceRing({ value, size = 56, color = colors.lime, track = 'rgba(255,255,255,0.25)', textColor = '#fff' }: {
  value: number;
  size?: number;
  color?: string;
  track?: string;
  textColor?: string;
}) {
  const stroke = 5;
  const rad = (size - stroke) / 2;
  const c = 2 * Math.PI * rad;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`${Math.round(value * 100)}%`}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={rad} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={rad}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * value} ${c}`}
        />
      </Svg>
      <T v="num" color={textColor} style={{ fontFamily: font.monoBold, fontSize: 13 }}>
        {Math.round(value * 100)}%
      </T>
    </View>
  );
}
