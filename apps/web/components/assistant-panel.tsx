'use client';

import { useChat } from '@ai-sdk/react';
import { ASSISTANT_ACTION_TOOLS, ASSISTANT_TOOL_LABELS, type AssistantChart, type AssistantMode } from '@recycleiq/engine';
import { DefaultChatTransport, getToolName, isToolUIPart, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from 'ai';
import { Bot, Check, Loader2, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AssistantChartView } from '@/components/assistant/chart';
import { Markdown } from '@/components/assistant/markdown';

const SUGGESTIONS = {
  municipal: {
    el: ['Ποιοι κάδοι έχουν ανοιχτές αναφορές;', 'Δείξε τις σαρώσεις ανά ημέρα τον τελευταίο μήνα', 'Ποιες 5 γειτονιές έχουν τις περισσότερες σαρώσεις;', 'Πόσο CO₂ γλιτώσαμε τον τελευταίο μήνα;'],
    en: ['Which bins have open reports?', 'Show scans per day for the last month', 'Top 5 neighbourhoods by scans', 'How much CO₂ did we save last month?'],
  },
  citizen: {
    el: ['Πού πετάω κουτί πίτσας με λάδια;', 'Πού είναι ο κοντινότερος καφέ κάδος;', 'Δείξε την κατάταξη της εβδομάδας'],
    en: ['Where does a greasy pizza box go?', 'Where is the nearest brown bin?', "Show this week's leaderboard"],
  },
} as const;

type ToolPart = {
  type: string;
  toolCallId: string;
  state: string;
  input?: Record<string, unknown>;
  output?: { chart?: AssistantChart; ok?: boolean; error?: string } & Record<string, unknown>;
  errorText?: string;
  approval?: { id: string; approved?: boolean; isAutomatic?: boolean };
};

/** "Βοηθός": the RecycleIQ assistant as a drawer on every dashboard page (municipal mode). */
export function AssistantPanel({ lang, binSource, mode = 'municipal' }: { lang: 'el' | 'en'; binSource: 'synthetic' | 'osm'; mode?: AssistantMode }) {
  const t = (el: string, en: string) => (lang === 'el' ? el : en);
  const locale = lang === 'el' ? 'el-GR' : 'en-GB';
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [models, setModels] = useState<{ models: string[]; defaultModel: string; enabled: boolean } | null>(null);
  const [model, setModel] = useState<string>('');
  // Read by the transport at send time (also for automatic sends after an approval).
  const [settings] = useState(() => ({ model, lang, binSource, mode }));
  useEffect(() => {
    Object.assign(settings, { model, lang, binSource, mode });
  }, [settings, model, lang, binSource, mode]);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || models) return;
    fetch('/api/v1/assistant/models')
      .then((r) => r.json())
      .then((m) => {
        setModels(m);
        setModel((cur) => cur || m.defaultModel);
      })
      .catch(() => {});
  }, [open, models]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/v1/assistant',
        body: () => ({ ...settings, client: 'web' }),
      }),
    [settings],
  );
  const { messages, sendMessage, status, error, addToolApprovalResponse, stop, setMessages } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const busy = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages, status]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    sendMessage({ text: q });
    setInput('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-5 bottom-5 z-40 inline-flex items-center gap-2 rounded-pill bg-ink px-4 py-3 text-body font-semibold text-white shadow-pop hover:bg-forest-800 print:hidden"
        aria-label={t('Άνοιγμα βοηθού', 'Open assistant')}
      >
        <Sparkles size={18} aria-hidden /> {t('Βοηθός', 'Assistant')}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-scrim/30" onClick={() => setOpen(false)}>
          <aside
            className="flex h-full w-full max-w-[520px] flex-col bg-paper shadow-pop"
            onClick={(e) => e.stopPropagation()}
            aria-label={t('Βοηθός RecycleIQ', 'RecycleIQ assistant')}
          >
            <header className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Bot size={20} className="text-forest-700" aria-hidden />
              <div className="flex-1">
                <p className="font-bold">{t('Ρώτα το RecycleIQ', 'Ask RecycleIQ')}</p>
                <p className="text-[11px] text-muted">{t('Ανοιχτά μοντέλα μέσω Vercel AI Gateway · δεδομένα του dashboard', 'Open models via Vercel AI Gateway · dashboard data')}</p>
              </div>
              {models && (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="max-w-40 rounded-control border border-line bg-surface px-2 py-1 text-[12px]"
                  aria-label={t('Μοντέλο', 'Model')}
                >
                  {models.models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
              <button type="button" onClick={() => setOpen(false)} className="rounded-control p-1.5 hover:bg-surface-2" aria-label={t('Κλείσιμο', 'Close')}>
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-body text-muted">
                    {t(
                      'Ρώτα για σαρώσεις, γειτονιές, κάδους, γεμάτους κάδους, κανόνες και όφελος για το περιβάλλον. Οι απαντήσεις βγαίνουν από τα δεδομένα του dashboard, με γραφήματα.',
                      'Ask about scans, neighbourhoods, bins, full bins, rules and environmental benefit. Answers come from the dashboard data, with charts.',
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS[mode][lang].map((s) => (
                      <button key={s} type="button" onClick={() => send(s)} className="rounded-pill border border-line bg-surface px-3 py-1.5 text-left text-[13px] hover:border-forest-700">
                        {s}
                      </button>
                    ))}
                  </div>
                  {models && !models.enabled && <p className="text-caption text-danger">{t('Ο βοηθός δεν έχει ρυθμιστεί (AI Gateway).', 'The assistant is not configured (AI Gateway).')}</p>}
                </div>
              )}
              <div className="flex flex-col gap-4">
                {messages.map((m) => (
                  <Message key={m.id} message={m} lang={lang} locale={locale} onApproval={(id, approved) => addToolApprovalResponse({ id, approved })} />
                ))}
                {status === 'submitted' && (
                  <p className="flex items-center gap-2 text-caption text-muted">
                    <Loader2 size={14} className="animate-spin" /> {t('Σκέφτομαι…', 'Thinking…')}
                  </p>
                )}
                {error && <p className="text-caption text-danger">{t('Κάτι πήγε στραβά. Δοκίμασε ξανά.', 'Something went wrong. Please try again.')}</p>}
                <div ref={end} />
              </div>
            </div>

            <form
              className="flex items-center gap-2 border-t border-line p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              {messages.length > 0 && !busy && (
                <button type="button" onClick={() => setMessages([])} className="rounded-control px-2 py-2 text-[12px] text-muted hover:bg-surface-2">
                  {t('Νέα', 'New')}
                </button>
              )}
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('Ρώτα κάτι…', 'Ask something…')}
                className="flex-1 rounded-control border border-line bg-surface px-3 py-2 text-body outline-none focus:border-forest-700"
                aria-label={t('Ερώτηση', 'Question')}
              />
              {busy ? (
                <button type="button" onClick={() => stop()} className="rounded-control bg-surface-2 px-3 py-2 text-[13px] font-semibold">
                  {t('Στοπ', 'Stop')}
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()} className="rounded-control bg-forest-700 p-2.5 text-white disabled:opacity-40" aria-label={t('Αποστολή', 'Send')}>
                  <Send size={16} />
                </button>
              )}
            </form>
          </aside>
        </div>
      )}
    </>
  );
}

function Message({ message, lang, locale, onApproval }: { message: UIMessage; lang: 'el' | 'en'; locale: string; onApproval: (id: string, approved: boolean) => void }) {
  const t = (el: string, en: string) => (lang === 'el' ? el : en);
  if (message.role === 'user')
    return (
      <div className="ml-10 self-end rounded-card bg-forest-700 px-3 py-2 text-body text-white">
        {message.parts.map((p, i) => (p.type === 'text' ? <span key={i}>{p.text}</span> : null))}
      </div>
    );
  return (
    <div className="flex flex-col gap-2 text-body text-ink">
      {message.parts.map((p, i) => {
        if (p.type === 'text') return p.text.trim() ? <Markdown key={i} text={p.text} /> : null;
        if (!isToolUIPart(p)) return null;
        const part = p as unknown as ToolPart;
        const name = getToolName(p);
        const label = ASSISTANT_TOOL_LABELS[name]?.[lang] ?? name;
        const isAction = (ASSISTANT_ACTION_TOOLS as readonly string[]).includes(name);
        if (part.state === 'approval-requested' && part.approval && !part.approval.isAutomatic)
          return (
            <div key={i} className="rounded-card border border-warn bg-warn-soft p-3">
              <p className="text-[13px] font-semibold">{t('Επιβεβαίωση ενέργειας', 'Confirm action')}: {label}</p>
              <p className="num mt-1 text-[12px] text-muted">{JSON.stringify(part.input)}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => onApproval(part.approval!.id, true)} className="rounded-control bg-forest-700 px-3 py-1.5 text-[13px] font-semibold text-white">
                  {t('Έγκριση', 'Approve')}
                </button>
                <button type="button" onClick={() => onApproval(part.approval!.id, false)} className="rounded-control bg-surface-2 px-3 py-1.5 text-[13px] font-semibold">
                  {t('Άρνηση', 'Deny')}
                </button>
              </div>
            </div>
          );
        if (part.state === 'output-available' && part.output?.chart) return <AssistantChartView key={i} chart={part.output.chart} locale={locale} />;
        if (part.state === 'output-denied') return <p key={i} className="text-[12px] text-muted">✕ {label}: {t('απορρίφθηκε', 'denied')}</p>;
        if (part.state === 'output-error') return <p key={i} className="text-[12px] text-danger">{label}: {part.errorText}</p>;
        const done = part.state === 'output-available';
        return (
          <p key={i} className={`flex items-center gap-1.5 text-[12px] ${isAction && done ? 'font-semibold text-forest-700' : 'text-muted'}`}>
            {done ? <Check size={12} /> : <Loader2 size={12} className="animate-spin" />} {label}
            {isAction && done && part.output?.ok === false && <span className="text-danger"> · {String(part.output.error ?? '')}</span>}
          </p>
        );
      })}
    </div>
  );
}
