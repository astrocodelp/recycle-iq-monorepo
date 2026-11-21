import {
  CATEGORIES,
  DEFAULT_LOCATION,
  formatDistance,
  getObject,
  impactFor,
  rankPoints,
  walkingMinutes,
  type Decision,
} from '@recycleiq/engine';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Leaf,
  Info,
  Lightbulb,
  ListChecks,
  MapPin,
  ScanLine,
  Sparkles,
  Truck,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/components/back-button';
import { Confetti } from '@/components/confetti';
import { ConfidenceRing } from '@/components/confidence-ring';
import { CategoryTile, ObjectIcon } from '@/components/icons';
import { PressableScale } from '@/components/pressable-scale';
import { Button, Card, DemoBadge, T } from '@/components/ui';
import { api, type Point } from '@/lib/api';
import { EASE_OUT, enter } from '@/lib/motion';
import { useApp } from '@/lib/store';
import { categoryColors, colors, font, r } from '@/lib/theme';

export default function Result() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang, recall, coords, district, deviceId, binSource } = useApp();
  const insets = useSafeAreaInsets();
  const cached = recall(id ?? '');
  const [decision, setDecision] = useState<Decision | null>(cached?.decision ?? null);
  const [nearby, setNearby] = useState<Point[]>(cached?.nearby ?? []);
  const [failed, setFailed] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [requested, setRequested] = useState(false);
  const story = cached?.unlockedStory ?? null;
  const [burst] = useState(story ? 1 : 0);

  useEffect(() => {
    if (decision || !id) return;
    api.decision(id).then((r) => setDecision(r.decision), () => setFailed(true));
  }, [id, decision]);

  // With a GPS fix in memory, re-rank nearby bins on the device. Coordinates never leave the phone.
  useEffect(() => {
    if (!decision?.pointQuery) return;
    if (!coords && nearby.length) return;
    const q = decision.pointQuery;
    api.points({ category: q.category, near: decision.districtId === 'athens' ? null : decision.districtId, source: binSource, limit: 2000 }).then(
      (r) => setNearby(rankPoints(r.points, q, coords ?? (district ? { lng: district.lng, lat: district.lat } : DEFAULT_LOCATION)) as Point[]),
      () => {},
    );
  }, [decision, coords]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!decision)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.paper }}>
        {failed ? <T v="body">{t('Δεν βρέθηκε η σύσταση.', 'Recommendation not found.')}</T> : <ActivityIndicator color={colors['forest-700']} />}
        {failed && <Button label={t('Αρχική', 'Home')} variant="secondary" onPress={() => router.replace('/')} />}
      </View>
    );

  const obj = getObject(decision.objectId) ?? getObject('unknown')!;
  const color = decision.uncertain ? colors.muted : categoryColors[decision.category].solid;
  const certainty = { high: t('Υψηλή βεβαιότητα', 'High certainty'), medium: t('Μέτρια βεβαιότητα', 'Medium certainty'), low: t('Χαμηλή βεβαιότητα', 'Low certainty') }[decision.certainty];
  const totalMs = decision.trace.reduce((s, x) => s + x.durationMs, 0);
  const doneCount = Object.values(done).filter(Boolean).length;
  const askBrownBin = decision.objectId === 'food-scraps' && decision.category === 'general' && decision.districtId !== 'athens';

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 180 }}>
        {/* Hero: the category colour carries the verdict, always with its name. */}
        <View style={{ backgroundColor: color, paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 22, borderBottomLeftRadius: r.hero, borderBottomRightRadius: r.hero, gap: 14 }}>
          <BackButton tone="glass" />
          <Animated.View entering={enter(0)} style={{ alignItems: 'center', gap: 8 }}>
            <View style={{ width: 84, height: 84, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              {decision.uncertain ? <ObjectIcon name="HelpCircle" size={40} color={color} /> : <CategoryTile category={decision.category} size={56} variant="soft" />}
            </View>
            <T v="eyebrow" color="rgba(255,255,255,0.75)">{t('Προορισμός', 'Destination')}</T>
            <T v="display" color="#fff" style={{ textAlign: 'center' }}>{t(decision.destination)}</T>
            <T v="bodyLg" color="rgba(255,255,255,0.9)" style={{ textAlign: 'center' }}>{t(decision.headline)}</T>
          </Animated.View>
          <Animated.View entering={enter(1)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: r.card, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', padding: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <ObjectIcon name={obj.icon} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <T v="h3" color="#fff">{t(obj.name)}</T>
              <T v="caption" color="rgba(255,255,255,0.85)">{certainty} · {t(CATEGORIES[decision.category].short)}</T>
            </View>
            <ConfidenceRing value={decision.confidence} />
          </Animated.View>
        </View>

        <View style={{ padding: 18, gap: 14 }}>
          {story && (
            <Animated.View entering={enter(2)}>
              <Card onPress={() => router.push('/neighbourhood')} style={{ gap: 6, backgroundColor: colors['forest-800'], borderColor: colors['forest-800'] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color={colors.lime} />
                  <T v="caption" color={colors.lime}>{t('Ξεκλείδωσες μια ιστορία της γειτονιάς σου!', 'You unlocked a neighbourhood story!')}</T>
                </View>
                <T v="h2" color="#fff">{t(story.title)}</T>
                {story.body && <T v="body" color="rgba(255,255,255,0.85)" numberOfLines={3}>{t(story.body)}</T>}
              </Card>
            </Animated.View>
          )}
          <Animated.View entering={enter(2)}>
            <Card style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Info size={18} color={colors['cat-packaging']} />
                <T v="h3">{t('Γιατί;', 'Why?')}</T>
              </View>
              <T v="bodyLg">{t(decision.why)}</T>
            </Card>
          </Animated.View>

          {(() => {
            const imp = impactFor(decision.objectId, decision.category, decision.uncertain);
            return (
              <Animated.View entering={enter(3)}>
                <Card style={{ gap: 6, backgroundColor: imp.counts ? colors['forest-50'] : colors.surface, borderColor: imp.counts ? colors['forest-100'] : colors.line }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Leaf size={18} color={colors['forest-700']} />
                    <T v="caption" color={colors['forest-700']}>{t('Τι κερδίζει ο πλανήτης', 'What the planet gains')}</T>
                  </View>
                  <T v="h2">{t(imp.headline)}</T>
                  <T v="body" color={colors.muted}>{t(imp.detail)}</T>
                  {imp.grams != null && (
                    <T v="micro" color={colors.faint}>{t('Πηγή: συντελεστές DESNZ 2025 · εκτίμηση', 'Source: DESNZ 2025 factors · estimate')}</T>
                  )}
                </Card>
              </Animated.View>
            );
          })()}

          {decision.warnings.map((w, i) => (
            <Animated.View key={i} entering={enter(3)}>
              <Card style={{ flexDirection: 'row', gap: 10, backgroundColor: colors['danger-soft'], borderColor: colors['danger-soft'] }}>
                <AlertTriangle size={18} color={colors.danger} />
                <T v="body" color={colors.danger} style={{ flex: 1, fontFamily: font.semibold }}>{t(w)}</T>
              </Card>
            </Animated.View>
          ))}

          <Animated.View entering={enter(4)}>
            <Card style={{ gap: 12 }} onPress={() => setTraceOpen((o) => !o)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={20} color={colors.lime} />
                </View>
                <View style={{ flex: 1 }}>
                  <T v="h3">{t('Πώς αποφασίσαμε;', 'How did we decide?')}</T>
                  <T v="caption" color={colors.muted}>{t(`6 βήματα · ${totalMs} ms`, `6 steps · ${totalMs} ms`)}</T>
                </View>
                <Chevron open={traceOpen} />
              </View>
              {traceOpen && (
                <View style={{ gap: 0 }}>
                  {decision.trace.map((s, i) => (
                    <Animated.View key={s.stage} entering={enter(i)} style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ alignItems: 'center' }}>
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors['forest-700'], alignItems: 'center', justifyContent: 'center' }}>
                          <T v="micro" color="#fff">{i + 1}</T>
                        </View>
                        {i < decision.trace.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: colors.line, marginVertical: 2 }} />}
                      </View>
                      <View style={{ flex: 1, paddingBottom: 14, gap: 2 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <T v="h3">{t(s.title)}</T>
                          <T v="caption" color={colors.faint}>{s.durationMs} ms</T>
                        </View>
                        <T v="body" color={colors.ink}>{t(s.output)}</T>
                        {s.inputs.slice(0, 3).map((inp, j) => (
                          <T key={j} v="caption" color={colors.muted}>{t(inp.label)}: {t(inp.value)}</T>
                        ))}
                      </View>
                    </Animated.View>
                  ))}
                </View>
              )}
            </Card>
          </Animated.View>

          {decision.prep.length > 0 && (
            <Animated.View entering={enter(5)}>
              <Card style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ListChecks size={18} color={colors['cat-packaging']} />
                  <T v="h3" style={{ flex: 1 }}>{t('Πριν το πετάξεις', 'Before you drop it off')}</T>
                  <T v="caption" color={colors.muted}>{doneCount === decision.prep.length ? t('Έτοιμο!', 'All set!') : t(`${doneCount} από ${decision.prep.length}`, `${doneCount} of ${decision.prep.length}`)}</T>
                </View>
                {decision.prep.map((p, i) => (
                  <PressableScale key={i} onPress={() => setDone((d) => ({ ...d, [i]: !d[i] }))} accessibilityRole="checkbox" accessibilityState={{ checked: !!done[i] }}>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 4 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: done[i] ? colors['forest-700'] : colors['line-strong'], backgroundColor: done[i] ? colors['forest-700'] : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        {done[i] && <Check size={14} color="#fff" strokeWidth={3} />}
                      </View>
                      <T v="body" color={done[i] ? colors.muted : colors.ink} style={{ flex: 1, textDecorationLine: done[i] ? 'line-through' : 'none' }}>{t(p)}</T>
                    </View>
                  </PressableScale>
                ))}
              </Card>
            </Animated.View>
          )}

          {(decision.notes.length > 0 || decision.alternatives) && (
            <Animated.View entering={enter(6)}>
              <Card style={{ gap: 8, backgroundColor: colors['forest-50'], borderColor: colors['forest-100'] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Lightbulb size={18} color={colors['forest-700']} />
                  <T v="h3">{t('Καλό να ξέρεις', 'Good to know')}</T>
                </View>
                {decision.notes.map((n, i) => <T key={i} v="body">{t(n)}</T>)}
                {decision.alternatives && decision.notes.every((n) => n.el !== decision.alternatives!.el) && <T v="body">{t(decision.alternatives)}</T>}
                {askBrownBin && (
                  <Button
                    label={requested ? t('Το αίτημα στάλθηκε', 'Request sent') : t('Ζήτησε καφέ κάδο', 'Request a brown bin')}
                    variant={requested ? 'secondary' : 'primary'}
                    disabled={requested}
                    onPress={() => api.requestBrownBin({ districtId: decision.districtId, deviceId }).then(() => setRequested(true), () => {})}
                  />
                )}
              </Card>
            </Animated.View>
          )}

          {nearby.length > 0 && (
            <Animated.View entering={enter(7)} style={{ gap: 10 }}>
              <T v="eyebrow" color={colors.muted}>
                {coords ? t('Κοντά σου', 'Near you') : t(`Κοντά στο κέντρο: ${district ? district.name.el : 'Αθήνα'}`, `Near the centre of ${district ? district.name.en : 'Athens'}`)}
              </T>
              {nearby.slice(0, 3).map((p) => (
                <Card key={p.id} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: categoryColors[p.categories[0] ?? 'packaging'].soft, alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={18} color={categoryColors[p.categories[0] ?? 'packaging'].solid} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T v="h3" numberOfLines={1}>{t(p.name)}</T>
                    <T v="caption" color={colors.muted}>
                      {formatDistance(p.distance, lang)} · {walkingMinutes(p.distance)} {t('λεπτά με τα πόδια', 'min walk')}
                      {p.status !== 'available' ? ` · ${p.status === 'full' ? t('Γεμάτος', 'Full') : t('Εκτός λειτουργίας', 'Out of service')}` : ''}
                    </T>
                  </View>
                </Card>
              ))}
            </Animated.View>
          )}

          <DemoBadge label={binSource === 'osm' ? t('Ενδεικτικοί κανόνες demo · Κάδοι © OpenStreetMap', 'Indicative rules · Bins © OpenStreetMap') : t('Ενδεικτικοί κανόνες demo · Ενδεικτικά σημεία', 'Indicative rules · Illustrative points')} />
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18, paddingBottom: insets.bottom + 12, gap: 8, backgroundColor: 'rgba(248,249,246,0.96)', borderTopWidth: 1, borderTopColor: colors.line }}>
        {decision.uncertain ? (
          <Button label={t('Διάλεξε τι είναι', 'Pick what it is')} icon={<ScanLine size={18} color="#fff" />} onPress={() => router.replace('/scan')} />
        ) : decision.category === 'bulky' ? (
          <Button
            label={t('Ζήτα παραλαβή από τον Δήμο', 'Ask the city to collect it')}
            icon={<Truck size={18} color="#fff" />}
            onPress={() => router.push({ pathname: '/bulky', params: { objectId: decision.objectId } })}
          />
        ) : (
          <Button label={t('Βρες πού να το πετάξεις', 'Find where to drop it off')} icon={<MapPin size={18} color="#fff" />} onPress={() => router.push('/points')} />
        )}
        <Button label={t('Σάρωση νέου αντικειμένου', 'Scan a new item')} variant="ghost" icon={<ScanLine size={18} color={colors['forest-700']} />} onPress={() => router.replace('/scan')} />
      </View>
      <Confetti run={burst} />
    </View>
  );
}

function Chevron({ open }: { open: boolean }) {
  const reduce = useReducedMotion();
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(open ? '180deg' : '0deg', { duration: reduce ? 0 : 200, easing: EASE_OUT }) }],
  }));
  return (
    <Animated.View style={style}>
      <ChevronDown size={20} color={colors.muted} />
    </Animated.View>
  );
}
