import { useEffect, useRef, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { T } from './ui';

/** Animates a number from `from` to `to` (ease-out), e.g. a coupon balance going up. */
export function CountUp({ from, to, duration = 1200, color, style, format = (n) => String(n) }: {
  from: number;
  to: number;
  duration?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  format?: (n: number) => string;
}) {
  const [n, setN] = useState(from);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const k = Math.min(1, (Date.now() - start) / duration);
      setN(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [from, to, duration]);
  return (
    <T v="numLg" color={color} style={style}>
      {format(n)}
    </T>
  );
}
