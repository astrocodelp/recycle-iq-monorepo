import type { AssistantChart } from '@recycleiq/engine';
import { MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Line, Path, Circle } from 'react-native-svg';
import { T } from '@/components/ui';
import { colors, font, r } from '@/lib/theme';

/** Draws an assistant tool result: bars, a trend line, KPI cards, a table or a list of bins. */
export function AssistantChartView({ chart, locale }: { chart: AssistantChart; locale: string }) {
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: r.card, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 10 }}>
      <T v="caption" style={{ fontFamily: font.bold }}>{chart.title}</T>
      {chart.type === 'bar' && <Bars chart={chart} nf={nf} />}
      {chart.type === 'line' && <Trend chart={chart} locale={locale} />}
      {chart.type === 'kpis' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {chart.items.map((k) => (
            <View key={k.label} style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: colors['surface-2'], borderRadius: 12, padding: 10, gap: 2 }}>
              <T v="micro" color={colors.muted}>{k.label}</T>
              <T v="num" style={{ fontSize: 20 }}>{k.value}</T>
              {k.hint && <T v="micro" color={colors['forest-700']}>{k.hint}</T>}
            </View>
          ))}
        </View>
      )}
      {chart.type === 'table' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line }}>
              {chart.columns.map((c) => (
                <T key={c} v="micro" style={{ width: 120, paddingVertical: 4, fontFamily: font.bold }}>{c}</T>
              ))}
            </View>
            {chart.rows.map((row, i) => (
              <View key={i} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line }}>
                {row.map((c, j) => (
                  <T key={j} v="caption" style={{ width: 120, paddingVertical: 5, paddingRight: 6 }}>{typeof c === 'number' ? nf.format(c) : c}</T>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      {chart.type === 'map-list' && (
        <View>
          {chart.items.map((it, i) => (
            <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
              <MapPin size={15} color={colors['forest-700']} />
              <T v="caption" numberOfLines={1} style={{ flex: 1 }}>{it.label}</T>
              {it.status && it.status !== 'available' && <T v="micro" color={colors.warn}>{it.status.toUpperCase()}</T>}
              {it.detail && <T v="caption" color={colors.muted}>{it.detail}</T>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Bars({ chart, nf }: { chart: Extract<AssistantChart, { type: 'bar' }>; nf: Intl.NumberFormat }) {
  const max = Math.max(1, ...chart.items.map((i) => i.value));
  return (
    <View style={{ gap: 9 }}>
      {chart.items.map((it, i) => (
        <View key={`${i}-${it.label}`} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T v="caption" numberOfLines={1} style={{ flex: 1 }}>{it.label}</T>
            <T v="caption" color={colors.muted}>
              {nf.format(it.value)}
              {chart.unit ? ` ${chart.unit}` : ''}
              {it.hint ? ` · ${it.hint}` : ''}
            </T>
          </View>
          <View style={{ height: 10, backgroundColor: colors['surface-2'], borderTopRightRadius: 4, borderBottomRightRadius: 4 }}>
            <View
              style={{
                height: 10,
                width: `${Math.max(2, (it.value / max) * 100)}%`,
                backgroundColor: it.color ?? colors['forest-700'],
                borderTopRightRadius: 4,
                borderBottomRightRadius: 4,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function Trend({ chart, locale }: { chart: Extract<AssistantChart, { type: 'line' }>; locale: string }) {
  const [w, setW] = useState(300);
  const h = 150;
  const pad = { l: 30, r: 8, t: 8, b: 22 };
  const pts = chart.points;
  const max = Math.max(1, ...pts.map((p) => p.y));
  const nice = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / nice) * nice;
  const x = (i: number) => pad.l + (pts.length <= 1 ? 0 : (i / (pts.length - 1)) * (w - pad.l - pad.r));
  const y = (v: number) => pad.t + (h - pad.t - pad.b) * (1 - v / top);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join('');
  const area = pts.length ? `${line}L${x(pts.length - 1)},${y(0)}L${x(0)},${y(0)}Z` : '';
  const df = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const label = (s: string) => {
    const d = new Date(`${s}T00:00:00`);
    return Number.isNaN(d.getTime()) ? s : df.format(d);
  };
  const last = pts[pts.length - 1];
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Svg width={w} height={h}>
        {[0, top / 2, top].map((v) => (
          <Line key={v} x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke={colors.line} strokeWidth={1} />
        ))}
        <Path d={area} fill={colors['forest-50']} />
        <Path d={line} stroke={colors['forest-700']} strokeWidth={2} fill="none" />
        {last && <Circle cx={x(pts.length - 1)} cy={y(last.y)} r={4} fill={colors['forest-700']} stroke={colors.surface} strokeWidth={2} />}
      </Svg>
      <View style={{ position: 'absolute', left: 0, top: y(top) - 7 }}>
        <T v="micro" color={colors.muted}>{top}</T>
      </View>
      <View style={{ position: 'absolute', left: 0, top: y(0) - 7 }}>
        <T v="micro" color={colors.muted}>0</T>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: pad.l }}>
        <T v="micro" color={colors.muted}>{pts[0] ? label(pts[0].x) : ''}</T>
        <T v="micro" color={colors.muted}>{last ? `${label(last.x)} · ${last.y}` : ''}</T>
      </View>
    </View>
  );
}
