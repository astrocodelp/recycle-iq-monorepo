import { useChat } from '@ai-sdk/react';
import { ASSISTANT_ACTION_TOOLS, ASSISTANT_TOOL_LABELS, type AssistantChart } from '@recycleiq/engine';
import { DefaultChatTransport, getToolName, isToolUIPart, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { Check, Mic, Send, Sparkles, Square } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AssistantChartView } from '@/components/assistant-chart';
import { BackButton } from '@/components/back-button';
import { PressableScale } from '@/components/pressable-scale';
import { Chip, T } from '@/components/ui';
import { API_URL } from '@/lib/api';
import { useDictation } from '@/lib/dictation';
import { useApp } from '@/lib/store';
import { colors, font, r } from '@/lib/theme';

type ToolPart = {
  toolCallId: string;
  state: string;
  input?: Record<string, unknown>;
  output?: { chart?: AssistantChart; ok?: boolean; error?: string } & Record<string, unknown>;
  errorText?: string;
  approval?: { id: string; isAutomatic?: boolean };
};

/** "Ρώτα το RecycleIQ": the assistant for residents, on open models through the Vercel AI Gateway. */
export default function Assistant() {
  const { t, lang, deviceId, districtId, binSource, assistantModel } = useApp();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const scroll = useRef<ScrollViewInstance>(null);
  // Read at send time, also for the automatic send after an approval.
  const [settings] = useState(() => ({ lang, deviceId, districtId, binSource, model: assistantModel }));
  useEffect(() => {
    Object.assign(settings, { lang, deviceId, districtId, binSource, model: assistantModel });
  }, [settings, lang, deviceId, districtId, binSource, assistantModel]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_URL}/api/v1/assistant`,
        fetch: expoFetch as unknown as typeof globalThis.fetch,
        body: () => ({ ...settings, model: settings.model ?? undefined, mode: 'citizen', client: 'app' }),
      }),
    [settings],
  );
  const { messages, sendMessage, status, error, addToolApprovalResponse, stop } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const busy = status === 'submitted' || status === 'streaming';
  const locale = lang === 'el' ? 'el-GR' : 'en-GB';

  const send = (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    sendMessage({ text: q });
    setInput('');
  };
  // Speak instead of typing: the transcript fills the box while you talk and is sent when you stop.
  const mic = useDictation({ onText: setInput, onFinal: send });

  const suggestions =
    lang === 'el'
      ? ['Πού πετάω κουτί πίτσας με λάδια;', 'Πού είναι ο κοντινότερος κάδος ανακύκλωσης;', 'Τι σκανάρουν στη γειτονιά μου;', 'Δείξε την κατάταξη της εβδομάδας']
      : ['Where does a greasy pizza box go?', 'Where is the nearest recycling bin?', 'What do people scan in my neighbourhood?', "Show this week's leaderboard"];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <BackButton close />
        <View style={{ flex: 1 }}>
          <T v="h2">{t('Ρώτα το RecycleIQ', 'Ask RecycleIQ')}</T>
          <T v="micro" color={colors.muted}>{t('Ανοιχτό μοντέλο · δεδομένα του Δήμου', 'Open model · city data')}</T>
        </View>
        <Sparkles size={20} color={colors['forest-700']} />
      </View>

      <ScrollView ref={scroll} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} contentContainerStyle={{ padding: 18, gap: 14 }}>
        {messages.length === 0 && (
          <View style={{ gap: 12 }}>
            <T v="body" color={colors.muted}>
              {t(
                'Ρώτα πού πάει κάτι, πού είναι ο κοντινότερος κάδος ή πώς τα πάει η γειτονιά σου. Μπορώ και να αναφέρω γεμάτο κάδο, αφού το εγκρίνεις.',
                'Ask where something goes, where the nearest bin is or how your neighbourhood is doing. I can also report a full bin once you approve.',
              )}
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {suggestions.map((s) => (
                <Chip key={s} label={s} onPress={() => send(s)} />
              ))}
            </View>
          </View>
        )}
        {messages.map((m) => (
          <Message key={m.id} message={m} lang={lang} locale={locale} onApproval={(id, approved) => addToolApprovalResponse({ id, approved })} />
        ))}
        {status === 'submitted' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color={colors['forest-700']} />
            <T v="caption" color={colors.muted}>{t('Σκέφτομαι…', 'Thinking…')}</T>
          </View>
        )}
        {error && <T v="caption" color={colors.danger}>{t('Κάτι πήγε στραβά. Δοκίμασε ξανά.', 'Something went wrong. Please try again.')}</T>}
        {mic.error && (
          <T v="caption" color={colors.danger}>
            {mic.error === 'not-allowed'
              ? t('Δώσε άδεια για το μικρόφωνο στις ρυθμίσεις του κινητού.', 'Allow the microphone in the phone settings.')
              : t('Δεν σε άκουσα καλά. Δοκίμασε ξανά ή γράψε την ερώτηση.', 'I did not catch that. Try again or type the question.')}
          </T>
        )}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: insets.bottom + 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          placeholder={mic.listening ? t('Σε ακούω…', 'Listening…') : t('Ρώτα κάτι…', 'Ask something…')}
          placeholderTextColor={colors.faint}
          returnKeyType="send"
          accessibilityLabel={t('Ερώτηση', 'Question')}
          style={{ flex: 1, height: 46, borderRadius: r.pill, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, fontFamily: font.medium, fontSize: 15, color: colors.ink, backgroundColor: colors.paper }}
        />
        {mic.supported && !busy && (
          <PressableScale
            onPress={() => (mic.listening ? mic.stop() : mic.start())}
            accessibilityRole="button"
            accessibilityLabel={mic.listening ? t('Σταμάτα την ακρόαση', 'Stop listening') : t('Ρώτα με τη φωνή σου', 'Ask by voice')}
          >
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: mic.listening ? colors.danger : colors['surface-2'], alignItems: 'center', justifyContent: 'center' }}>
              {mic.listening ? <Square size={16} color="#fff" fill="#fff" /> : <Mic size={20} color={colors.ink} />}
            </View>
          </PressableScale>
        )}
        <PressableScale onPress={() => (busy ? stop() : send(input))} accessibilityRole="button" accessibilityLabel={busy ? t('Στοπ', 'Stop') : t('Αποστολή', 'Send')}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: busy ? colors['surface-2'] : colors['forest-700'], alignItems: 'center', justifyContent: 'center' }}>
            {busy ? <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: colors.ink }} /> : <Send size={19} color="#fff" />}
          </View>
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

function Message({ message, lang, locale, onApproval }: { message: UIMessage; lang: 'el' | 'en'; locale: string; onApproval: (id: string, approved: boolean) => void }) {
  const t = (el: string, en: string) => (lang === 'el' ? el : en);
  if (message.role === 'user')
    return (
      <View style={{ alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: colors['forest-700'], borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10 }}>
        <T v="body" color="#fff">{message.parts.map((p) => (p.type === 'text' ? p.text : '')).join('')}</T>
      </View>
    );
  return (
    <View style={{ gap: 8 }}>
      {message.parts.map((p, i) => {
        if (p.type === 'text') return p.text.trim() ? <RichText key={i} text={p.text} /> : null;
        if (!isToolUIPart(p)) return null;
        const part = p as unknown as ToolPart;
        const name = getToolName(p);
        const label = ASSISTANT_TOOL_LABELS[name]?.[lang] ?? name;
        const isAction = (ASSISTANT_ACTION_TOOLS as readonly string[]).includes(name);
        if (part.state === 'approval-requested' && part.approval && !part.approval.isAutomatic)
          return (
            <View key={i} style={{ backgroundColor: colors['warn-soft'], borderRadius: r.card, borderWidth: 1, borderColor: colors.warn, padding: 12, gap: 8 }}>
              <T v="h3">{t('Επιβεβαίωση', 'Please confirm')}: {label}</T>
              <T v="caption" color={colors.muted}>{describe(part.input)}</T>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip label={t('Έγκριση', 'Approve')} selected onPress={() => onApproval(part.approval!.id, true)} />
                <Chip label={t('Άρνηση', 'Deny')} onPress={() => onApproval(part.approval!.id, false)} />
              </View>
            </View>
          );
        if (part.state === 'output-available' && part.output?.chart) return <AssistantChartView key={i} chart={part.output.chart} locale={locale} />;
        if (part.state === 'output-denied') return <T key={i} v="micro" color={colors.muted}>✕ {label}</T>;
        if (part.state === 'output-error') return <T key={i} v="micro" color={colors.danger}>{label}: {part.errorText}</T>;
        const done = part.state === 'output-available';
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {done ? <Check size={13} color={isAction ? colors['forest-700'] : colors.muted} /> : <ActivityIndicator size="small" color={colors.muted} />}
            <T v="micro" color={isAction && done ? colors['forest-700'] : colors.muted}>
              {label}
              {isAction && done && part.output?.ok === false ? ` · ${String(part.output.error ?? '')}` : ''}
            </T>
          </View>
        );
      })}
    </View>
  );
}

const describe = (input?: Record<string, unknown>) =>
  input ? Object.entries(input).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') : '';

/** Paragraphs, lists and **bold** from the model's Markdown, in the app's type. */
function RichText({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => !/^\s*\|?\s*:?-{2,}/.test(l));
  return (
    <View style={{ gap: 4 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <View key={i} style={{ height: 2 }} />;
        const bullet = /^\s*([-*•]|\d+[.)])\s+/.exec(line);
        const body = bullet ? line.slice(bullet[0].length) : line.replace(/^#{1,4}\s+/, '').replace(/^\s*\|(.*)\|\s*$/, (_m, c: string) => c.split('|').map((x) => x.trim()).join(' · '));
        return (
          <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
            {bullet && <T v="body">{/\d/.test(bullet[1]!) ? bullet[1] : '•'}</T>}
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 15.5, lineHeight: 22, color: colors.ink }}>
              {body.split(/(\*\*[^*]+\*\*)/g).map((seg, k) =>
                seg.startsWith('**') && seg.endsWith('**') ? (
                  <Text key={k} style={{ fontFamily: font.bold }}>{seg.slice(2, -2)}</Text>
                ) : (
                  seg.replace(/(^|\s)\*([^*]+)\*/g, '$1$2')
                ),
              )}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
