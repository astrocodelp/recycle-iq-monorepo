import { getObject } from '@recycleiq/engine';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Phone, ShieldCheck, Truck } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { BackButton } from '@/components/back-button';
import { Screen } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { api, ApiError, CITY_STATUS, type CityStatus } from '@/lib/api';
import { fade } from '@/lib/motion';
import { useApp } from '@/lib/store';
import { colors, font } from '@/lib/theme';

/**
 * Ask the city to collect a bulky item. The request is filed in the city's own system (AthensGov,
 * "bulky_waste"). The address is needed for the pickup: it goes to the city only, RecycleIQ does not keep it.
 */
export default function Bulky() {
  const { objectId } = useLocalSearchParams<{ objectId?: string }>();
  const { t, district, deviceId } = useApp();
  const object = objectId ? getObject(objectId) : undefined;
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [step, setStep] = useState<'form' | 'sending' | 'done' | 'error' | 'off'>('form');
  const [city, setCity] = useState<{ id: string; status: CityStatus } | null>(null);
  const [checking, setChecking] = useState(false);

  const send = async () => {
    if (address.trim().length < 3) return;
    setStep('sending');
    try {
      const res = await api.bulkyRequest({ objectId: objectId ?? 'unknown', districtId: district?.id ?? null, address: address.trim(), note: note.trim() || undefined, deviceId });
      setCity(res.city);
      setStep('done');
    } catch (e) {
      setStep(e instanceof ApiError && e.status === 503 ? 'off' : 'error');
    }
  };
  const refresh = async () => {
    if (!city) return;
    setChecking(true);
    try {
      const r = await api.cityRequest(city.id);
      setCity({ id: r.id, status: r.status });
    } catch {}
    setChecking(false);
  };

  const input = { fontFamily: font.semibold, fontSize: 16, color: colors.ink, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, height: 46 } as const;

  if (step === 'done' && city)
    return (
      <Screen>
        <BackButton close />
        <View style={{ alignItems: 'center', gap: 14, marginTop: 24 }}>
          <Animated.View entering={ZoomIn.springify().damping(14).stiffness(220)} style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}>
            <Check size={44} color={colors['forest-900']} strokeWidth={3} />
          </Animated.View>
          <Animated.View entering={fade(120)} style={{ alignItems: 'center', gap: 6 }}>
            <T v="h1" style={{ textAlign: 'center' }}>{t('Το αίτημα στάλθηκε στον Δήμο', 'Your request was sent to the city')}</T>
            <T v="body" color={colors.muted} style={{ textAlign: 'center' }}>
              {t(`Αριθμός αιτήματος ${city.id} · ${CITY_STATUS[city.status].el}`, `Request ${city.id} · ${CITY_STATUS[city.status].en}`)}
            </T>
            <T v="caption" color={colors.muted} style={{ textAlign: 'center' }}>
              {t('Ο Δήμος θα επικοινωνήσει για την ημέρα παραλαβής. Μην βγάλεις το αντικείμενο στον δρόμο πριν από αυτό.', 'The city will arrange the pickup day. Do not put the item out on the street before then.')}
            </T>
          </Animated.View>
        </View>
        <Button label={t('Έλεγξε την κατάσταση', 'Check the status')} variant="secondary" loading={checking} onPress={refresh} />
        <Button label={t('Τέλος', 'Done')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </Screen>
    );

  return (
    <Screen>
      <BackButton close />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Truck size={22} color={colors['forest-700']} />
        <T v="h1">{t('Παραλαβή από τον Δήμο', 'City pickup')}</T>
      </View>
      <T v="body" color={colors.muted}>
        {object ? t(`${object.name.el}: ο Δήμος το παραλαμβάνει από την πόρτα σου, κατόπιν αιτήματος.`, `${object.name.en}: the city collects it from your door, on request.`) : t('Ο Δήμος παραλαμβάνει τα ογκώδη από την πόρτα σου, κατόπιν αιτήματος.', 'The city collects bulky items from your door, on request.')}
      </T>
      <T v="caption" color={colors.muted}>
        {t(
          'Το RecycleIQ είναι ανεξάρτητη εφαρμογή, όχι εφαρμογή του Δήμου. Το αίτημα καταχωρείται στο σύστημα αιτημάτων πολιτών του Δήμου Αθηναίων, και την παραλαβή την κάνει ο Δήμος.',
          'RecycleIQ is an independent app, not a City of Athens app. Your request is filed in the City of Athens citizen request system, and the city carries out the pickup.',
        )}
      </T>
      <Card style={{ gap: 10 }}>
        <T v="eyebrow" color={colors.muted}>{t('Διεύθυνση παραλαβής', 'Pickup address')}</T>
        <TextInput
          value={address}
          onChangeText={setAddress}
          maxLength={200}
          placeholder={t('π.χ. Φωκίωνος Νέγρη 10', 'e.g. Fokionos Negri 10')}
          placeholderTextColor={colors.faint}
          accessibilityLabel={t('Διεύθυνση παραλαβής', 'Pickup address')}
          style={input}
        />
        <T v="eyebrow" color={colors.muted}>{t('Σημείωση (προαιρετικά)', 'Note (optional)')}</T>
        <TextInput
          value={note}
          onChangeText={setNote}
          maxLength={500}
          placeholder={t('π.χ. ισόγειο, κουδούνι Β2', 'e.g. ground floor, bell B2')}
          placeholderTextColor={colors.faint}
          accessibilityLabel={t('Σημείωση', 'Note')}
          style={input}
        />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <ShieldCheck size={16} color={colors['forest-700']} style={{ marginTop: 2 }} />
          <T v="caption" color={colors.muted} style={{ flex: 1 }}>
            {t('Η διεύθυνση πηγαίνει μόνο στον Δήμο για την παραλαβή. Το RecycleIQ δεν την αποθηκεύει.', 'The address goes only to the city for the pickup. RecycleIQ does not store it.')}
          </T>
        </View>
      </Card>
      {step === 'error' && <T v="body" color={colors.danger}>{t('Ο Δήμος δεν απάντησε. Δοκίμασε ξανά σε λίγο.', 'The city did not answer. Try again shortly.')}</T>}
      {step === 'off' && <T v="body" color={colors.danger}>{t('Η σύνδεση με τα αιτήματα του Δήμου δεν είναι ενεργή ακόμη.', 'The connection to city requests is not active yet.')}</T>}
      <Button label={t('Στείλε αίτημα στον Δήμο', 'Send the request to the city')} disabled={address.trim().length < 3} loading={step === 'sending'} onPress={send} />
      <Button
        label={t('Ή κάλεσε τον Δήμο στο 1595', 'Or call the city on 1595')}
        variant="ghost"
        icon={<Phone size={18} color={colors['forest-700']} />}
        onPress={() => Linking.openURL('tel:1595')}
      />
    </Screen>
  );
}
