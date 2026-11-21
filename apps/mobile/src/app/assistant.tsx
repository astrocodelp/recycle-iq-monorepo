import { useChat } from '@ai-sdk/react';
import { ASSISTANT_ACTION_TOOLS, ASSISTANT_TOOL_LABELS, type AssistantChart } from '@recycleiq/engine';
import { DefaultChatTransport, getToolName, isToolUIPart, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { ArrowUp, BarChart3, Check, MapPin, Mic, RotateCcw, Sparkles, Square, X } from 'lucide-react-native';
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

  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(null);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_URL}/api/v1/assistant`,
        // Reads the remaining-questions headers, and turns a 429 into the server's own friendly message.
        fetch: (async (url: string, init: RequestInit) => {
          const res = await expoFetch(url, init as never);
          const rem = res.headers.get('X-Assistant-Remaining');
          const lim = res.headers.get('X-Assistant-Limit');
          if (rem !== null && lim !== null) setQuota({ remaining: Number(rem), limit: Number(lim) });
          if (res.status === 429) {
            const j = (await res.json().catch(() => null)) as { message?: string } | null;
            setLimitMsg(j?.message ?? null);
            setQuota((q) => (q ? { ...q, remaining: 0 } : q));
            throw new Error(j?.message ?? 'rate limited');
          }
          setLimitMsg(null);
          return res;
        }) as unknown as typeof globalThis.fetch,
        body: () => ({ ...settings, model: settings.model ?? undefined, mode: 'citizen', client: 'app' }),
      }),
    [settings],
  );
  const { messages, sendMessage, status, error, addToolApprovalResponse, stop, regenerate, clearError } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const busy = status === 'submitted' || status === 'streaming';
  const locale = lang === 'el' ? 'el-GR' : 'en-GB';

  const send = (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    clearError();
    sendMessage({ text: q });
    setInput('');
  };
  // Speak instead of typing: the transcript fills the box while you talk and is sent when you stop.
  const mic = useDictation({ onText: setInput, onFinal: send });

  // What residents come for: one item, the nearest bin, their neighbourhood.
  const starters = [
    { icon: Sparkles, title: t('Πού πάει;', 'Where does it go?'), prompts: [t('Πού πετάω κουτί πίτσας με λάδια;', 'Where does a greasy pizza box go?'), t('Πού πάνε οι μπαταρίες;', 'Where do batteries go?')] },
    { icon: MapPin, title: t('Κοντά μου', 'Near me'), prompts: [t('Πού είναι ο κοντινότερος κάδος ανακύκλωσης;', 'Where is the nearest recycling bin?')] },
    { icon: BarChart3, title: t('Η γειτονιά μου', 'My neighbourhood'), prompts: [t('Τι σκανάρουν στη γειτονιά μου;', 'What do people scan in my neighbourhood?'), t('Δείξε την κατάταξη της εβδομάδας', "Show this week's leaderboard")] },
  ];

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
          <View style={{ gap: 14 }}>
            <View style={{ gap: 4 }}>
              <T v="h2">{t('Ρώτα ό,τι θέλεις', 'Ask anything')}</T>
              <T v="body" color={colors.muted}>
                {t(
                  'Πού πάει κάτι, πού είναι ο κοντινότερος κάδος, πώς τα πάει η γειτονιά σου. Γράψε ή πάτα το μικρόφωνο.',
                  'Where something goes, where the nearest bin is, how your neighbourhood is doing. Type or tap the mic.',
                )}
              </T>
            </View>
            {starters.map((g) => (
              <View key={g.title} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: r.card, padding: 12, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <g.icon size={14} color={colors['forest-700']} />
                  <T v="micro" color={colors['forest-700']} style={{ fontFamily: font.bold }}>{g.title}</T>
                </View>
                {g.prompts.map((p) => (
                  <PressableScale key={p} onPress={() => send(p)} accessibilityRole="button" scaleTo={0.98}>
                    <View style={{ paddingVertical: 9, paddingHorizontal: 4 }}>
                      <T v="body">{p}</T>
                    </View>
                  </PressableScale>
                ))}
              </View>
            ))}
            <T v="micro" color={colors.faint}>{t('Μπορώ και να αναφέρω γεμάτο κάδο, μόνο αφού το εγκρίνεις.', 'I can also report a full bin, only after you approve.')}</T>
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
        {error && (
          <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: r.card, padding: 12, gap: 8, alignItems: 'flex-start' }}>
            <T v="body">{limitMsg ?? t('Κάτι πήγε στραβά με τον βοηθό.', 'The assistant hit a problem.')}</T>
            {!limitMsg && (
              <PressableScale onPress={() => regenerate()} accessibilityRole="button">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors['surface-2'], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <RotateCcw size={14} color={colors.ink} />
                  <T v="caption" style={{ fontFamily: font.semibold }}>{t('Δοκίμασε ξανά', 'Try again')}</T>
                </View>
              </PressableScale>
            )}
          </View>
        )}
        {mic.error && (
          <T v="caption" color={colors.danger}>
            {mic.error === 'not-allowed'
              ? t('Δώσε άδεια για το μικρόφωνο στις ρυθμίσεις του κινητού.', 'Allow the microphone in the phone settings.')
              : t('Δεν σε άκουσα καλά. Δοκίμασε ξανά ή γράψε την ερώτηση.', 'I did not catch that. Try again or type the question.')}
          </T>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: insets.bottom + 8, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, borderWidth: 1, borderColor: input.length > 1000 ? colors.danger : colors.line, borderRadius: 22, backgroundColor: colors.paper, padding: 5, paddingLeft: 14 }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            placeholder={mic.listening ? t('Σε ακούω…', 'Listening…') : t('Ρώτα κάτι…', 'Ask something…')}
            placeholderTextColor={colors.faint}
            accessibilityLabel={t('Ερώτηση', 'Question')}
            style={{ flex: 1, minHeight: 36, maxHeight: 120, paddingTop: 8, paddingBottom: 8, fontFamily: font.medium, fontSize: 16, color: colors.ink }}
          />
          {mic.supported && !busy && (
            <PressableScale
              onPress={() => (mic.listening ? mic.stop() : mic.start())}
              accessibilityRole="button"
              accessibilityLabel={mic.listening ? t('Σταμάτα την ακρόαση', 'Stop listening') : t('Ρώτα με τη φωνή σου', 'Ask by voice')}
            >
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: mic.listening ? colors.danger : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {mic.listening ? <Square size={14} color="#fff" fill="#fff" /> : <Mic size={20} color={colors.muted} />}
              </View>
            </PressableScale>
          )}
          <PressableScale
            onPress={() => (busy ? stop() : send(input))}
            accessibilityRole="button"
            accessibilityLabel={busy ? t('Στοπ', 'Stop') : t('Αποστολή', 'Send')}
            disabled={!busy && !input.trim()}
          >
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: busy ? colors.ink : colors['forest-700'], opacity: !busy && !input.trim() ? 0.3 : 1, alignItems: 'center', justifyContent: 'center' }}>
              {busy ? <Square size={12} color="#fff" fill="#fff" /> : <ArrowUp size={20} color="#fff" />}
            </View>
          </PressableScale>
        </View>
        <T v="micro" color={colors.faint} style={{ paddingHorizontal: 6 }}>
          {quota && quota.remaining >= 0
            ? t(`${quota.remaining} από ${quota.limit} ερωτήσεις ακόμη σε αυτό το διάστημα`, `${quota.remaining} of ${quota.limit} questions left for now`)
            : t('Ανοιχτό μοντέλο · τα στοιχεία του Δήμου · χωρίς λογαριασμό', 'Open model · city data · no account')}
        </T>
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
  const tools = message.parts.filter((p) => isToolUIPart(p)) as unknown as (ToolPart & { type: string })[];
  return (
    <View style={{ gap: 10 }}>
      {tools.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {tools.map((part, i) => {
            const name = getToolName(part as never);
            const label = ASSISTANT_TOOL_LABELS[name]?.[lang] ?? name;
            const isAction = (ASSISTANT_ACTION_TOOLS as readonly string[]).includes(name);
            const done = part.state === 'output-available';
            const failed = part.state === 'output-error' || part.state === 'output-denied' || (done && part.output?.ok === false);
            const tone = failed ? colors.danger : isAction && done ? colors['forest-700'] : colors.muted;
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: failed ? colors['danger-soft'] : isAction && done ? colors['forest-50'] : colors['surface-2'], borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                {failed ? <X size={11} color={tone} /> : done ? <Check size={11} color={tone} /> : part.state === 'approval-requested' ? null : <ActivityIndicator size="small" color={tone} style={{ transform: [{ scale: 0.6 }] }} />}
                <T v="micro" color={tone}>{label}</T>
              </View>
            );
          })}
        </View>
      )}
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
              <T v="h3">{t('Θέλει την έγκρισή σου', 'Needs your approval')}: {label}</T>
              {Object.entries(part.input ?? {}).map(([k, v]) => (
                <T key={k} v="caption" color={colors.muted}>
                  {k}: <Text style={{ fontFamily: font.semibold, color: colors.ink }}>{String(v)}</Text>
                </T>
              ))}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip label={t('Έγκριση', 'Approve')} selected onPress={() => onApproval(part.approval!.id, true)} />
                <Chip label={t('Άρνηση', 'Deny')} onPress={() => onApproval(part.approval!.id, false)} />
              </View>
            </View>
          );
        if (part.state === 'output-available' && part.output?.chart) return <AssistantChartView key={i} chart={part.output.chart} locale={locale} />;
        return null;
      })}
    </View>
  );
}

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
