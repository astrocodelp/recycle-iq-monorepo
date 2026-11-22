'use client';

import { useChat } from '@ai-sdk/react';
import { ASSISTANT_ACTION_TOOLS, ASSISTANT_TOOL_LABELS, type AssistantChart, type AssistantMode } from '@recycleiq/engine';
import { DefaultChatTransport, getToolName, isToolUIPart, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from 'ai';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  Check,
  Copy,
  Leaf,
  Loader2,
  MapPin,
  Maximize2,
  Mic,
  Minimize2,
  RotateCcw,
  Scale,
  SlidersHorizontal,
  Sparkles,
  Square,
  SquarePen,
  Truck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AssistantChartView } from '@/components/assistant/chart';
import { Markdown } from '@/components/assistant/markdown';
import { useDictation } from '@/components/assistant/use-dictation';

type L = { el: string; en: string };
type Starter = { icon: LucideIcon; title: L; prompts: L[] };

/** What each audience comes to the assistant for. Municipal staff work in tasks; residents ask about one item. */
const STARTERS: Record<AssistantMode, Starter[]> = {
  municipal: [
    {
      icon: Bell,
      title: { el: 'Αναφορές πολιτών', en: 'Citizen reports' },
      prompts: [
        { el: 'Ποιοι κάδοι έχουν ανοιχτές αναφορές;', en: 'Which bins have open reports?' },
        { el: 'Ποιες αναφορές περιμένουν πάνω από 24 ώρες;', en: 'Which reports have waited over 24 hours?' },
      ],
    },
    {
      icon: BarChart3,
      title: { el: 'Αναλύσεις', en: 'Analytics' },
      prompts: [
        { el: 'Δείξε τις σαρώσεις ανά ημέρα τον τελευταίο μήνα', en: 'Show scans per day for the last month' },
        { el: 'Ποιες 5 γειτονιές έχουν τις περισσότερες σαρώσεις;', en: 'Top 5 neighbourhoods by scans' },
      ],
    },
    {
      icon: MapPin,
      title: { el: 'Κάδοι και σημεία', en: 'Bins and points' },
      prompts: [{ el: 'Πόσους κάδους ανά είδος έχει η Κυψέλη;', en: 'How many bins of each kind does Kypseli have?' }],
    },
    {
      icon: Leaf,
      title: { el: 'Περιβάλλον', en: 'Environment' },
      prompts: [{ el: 'Πόσο CO₂ γλιτώσαμε τον τελευταίο μήνα;', en: 'How much CO₂ did we save last month?' }],
    },
    {
      icon: Scale,
      title: { el: 'Κανόνες', en: 'Rules' },
      prompts: [{ el: 'Ποιοι κανόνες του Δήμου είναι ενεργοί;', en: 'Which municipal rules are on?' }],
    },
    {
      icon: Truck,
      title: { el: 'Ογκώδη', en: 'Bulky items' },
      prompts: [{ el: 'Ποια αιτήματα ογκωδών είναι ανοιχτά;', en: 'Which bulky pickups are open?' }],
    },
  ],
  citizen: [
    {
      icon: Sparkles,
      title: { el: 'Πού πάει;', en: 'Where does it go?' },
      prompts: [
        { el: 'Πού πετάω κουτί πίτσας με λάδια;', en: 'Where does a greasy pizza box go?' },
        { el: 'Πού πάνε οι μπαταρίες;', en: 'Where do batteries go?' },
      ],
    },
    {
      icon: MapPin,
      title: { el: 'Κοντά μου', en: 'Near me' },
      prompts: [{ el: 'Πού είναι ο κοντινότερος κάδος ανακύκλωσης;', en: 'Where is the nearest recycling bin?' }],
    },
    {
      icon: BarChart3,
      title: { el: 'Η γειτονιά μου', en: 'My neighbourhood' },
      prompts: [{ el: 'Δείξε την κατάταξη της εβδομάδας', en: "Show this week's leaderboard" }],
    },
  ],
};

type ToolPart = {
  type: string;
  toolCallId: string;
  state: string;
  input?: Record<string, unknown>;
  output?: { chart?: AssistantChart; ok?: boolean; error?: string } & Record<string, unknown>;
  errorText?: string;
  approval?: { id: string; approved?: boolean; isAutomatic?: boolean };
};

const shortModel = (m: string) => m.split('/').pop() ?? m;

/** "Βοηθός": the RecycleIQ assistant as a drawer on every dashboard page (municipal mode). */
export function AssistantPanel({ lang, binSource, mode = 'municipal' }: { lang: 'el' | 'en'; binSource: 'synthetic' | 'osm'; mode?: AssistantMode }) {
  const t = (el: string, en: string) => (lang === 'el' ? el : en);
  const locale = lang === 'el' ? 'el-GR' : 'en-GB';
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [input, setInput] = useState('');
  const [models, setModels] = useState<{ models: string[]; defaultModel: string; enabled: boolean } | null>(null);
  const [model, setModel] = useState<string>('');
  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(null);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  // Read by the transport at send time (also for automatic sends after an approval).
  const [settings] = useState(() => ({ model, lang, binSource, mode }));
  useEffect(() => {
    Object.assign(settings, { model, lang, binSource, mode });
  }, [settings, model, lang, binSource, mode]);
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

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

  // Read the remaining-questions headers and the friendly limit message from every request.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/v1/assistant',
        body: () => ({ ...settings, client: 'web' }),
        fetch: async (url, init) => {
          const res = await fetch(url, init);
          const rem = res.headers.get('X-Assistant-Remaining');
          const lim = res.headers.get('X-Assistant-Limit');
          if (rem !== null && lim !== null) setQuota({ remaining: Number(rem), limit: Number(lim) });
          if (res.status === 429) {
            const j = (await res.clone().json().catch(() => null)) as { message?: string } | null;
            setLimitMsg(j?.message ?? null);
            setQuota((q) => (q ? { ...q, remaining: 0 } : q));
          } else setLimitMsg(null);
          return res;
        },
      }),
    [settings],
  );
  const { messages, sendMessage, status, error, addToolApprovalResponse, stop, setMessages, regenerate, clearError } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const busy = status === 'submitted' || status === 'streaming';

  // Follow the answer while the reader is at the bottom; leave them alone if they scrolled up.
  useEffect(() => {
    if (atBottom) scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, status, atBottom]);

  // Esc closes; the page behind does not scroll while the panel is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => box.current?.focus(), 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // The input grows with the text, up to about five lines.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [input]);

  const send = useCallback(
    (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      clearError();
      setAtBottom(true);
      sendMessage({ text: q });
      setInput('');
    },
    [busy, clearError, sendMessage],
  );
  // Speak instead of typing: the words fill the box while you talk; the mic closes after 3 s of silence and
  // the person reviews, edits and sends the question themselves.
  const mic = useDictation({ onText: setInput, onEnd: () => box.current?.focus() });
  const tooLong = input.length > 1000;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-pill bg-ink px-4 py-3 text-body font-semibold text-white shadow-pop transition-transform hover:bg-forest-800 active:scale-[0.97] sm:right-5 sm:bottom-5 print:hidden"
          aria-label={t('Άνοιγμα βοηθού', 'Open assistant')}
        >
          <Sparkles size={18} className="text-lime" aria-hidden /> {t('Βοηθός', 'Assistant')}
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-scrim/30 sm:p-3" onClick={() => setOpen(false)}>
          <aside
            className={`relative flex h-dvh w-full flex-col overflow-hidden bg-paper shadow-pop transition-[max-width] duration-200 sm:h-full sm:rounded-[16px] ${wide ? 'sm:max-w-[820px]' : 'sm:max-w-[460px]'}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('Βοηθός RecycleIQ', 'RecycleIQ assistant')}
          >
            <header className="flex items-center gap-3 border-b border-line px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-forest-700 text-lime" aria-hidden>
                <Sparkles size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{mode === 'municipal' ? t('Βοηθός του Δήμου', 'Municipal assistant') : t('Ρώτα το RecycleIQ', 'Ask RecycleIQ')}</p>
                <p className="truncate text-[12px] text-muted">
                  {t('Ανοιχτό μοντέλο', 'Open model')} · {model ? shortModel(model) : '…'} · {t('δεδομένα του dashboard', 'dashboard data')}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                {messages.length > 0 && (
                  <IconButton
                    label={t('Νέα συζήτηση', 'New chat')}
                    onClick={() => {
                      stop();
                      setMessages([]);
                      clearError();
                    }}
                  >
                    <SquarePen size={17} />
                  </IconButton>
                )}
                <IconButton label={t('Ρυθμίσεις', 'Settings')} pressed={showSettings} onClick={() => setShowSettings((v) => !v)}>
                  <SlidersHorizontal size={17} />
                </IconButton>
                <span className="hidden sm:inline-flex">
                  <IconButton label={wide ? t('Στενότερο', 'Narrower') : t('Πλατύτερο', 'Wider')} onClick={() => setWide((v) => !v)}>
                    {wide ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                  </IconButton>
                </span>
                <IconButton label={t('Κλείσιμο', 'Close')} onClick={() => setOpen(false)}>
                  <X size={18} />
                </IconButton>
              </div>
            </header>

            {showSettings && models && (
              <div className="flex flex-col gap-2 border-b border-line bg-surface-2 px-4 py-3 text-[13px]">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-muted">{t('Μοντέλο (μόνο ανοιχτά)', 'Model (open only)')}</span>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="rounded-control border border-line bg-surface px-2 py-1.5 text-[13px]"
                  >
                    {models.models.map((m) => (
                      <option key={m} value={m}>
                        {shortModel(m)}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-[12px] text-muted">
                  {t(
                    'Ανοιχτά μοντέλα μέσω Vercel AI Gateway. Οι απαντήσεις βγαίνουν μόνο από τα δεδομένα του dashboard· κάθε ενέργεια θέλει την έγκρισή σου.',
                    'Open models via the Vercel AI Gateway. Answers come only from the dashboard data; every action needs your approval.',
                  )}
                </p>
              </div>
            )}

            <div
              ref={scroller}
              onScroll={(e) => {
                const el = e.currentTarget;
                setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
              }}
              className="relative flex-1 overflow-y-auto px-4 py-4"
            >
              {messages.length === 0 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[20px] leading-tight font-bold">{mode === 'municipal' ? t('Τι θέλεις να δεις σήμερα;', 'What do you want to see today?') : t('Ρώτα ό,τι θέλεις', 'Ask anything')}</p>
                    <p className="mt-1 text-body text-muted">
                      {mode === 'municipal'
                        ? t('Αναλύσεις, αναφορές, κάδοι και κανόνες, με γραφήματα από τα δεδομένα του Δήμου. Μπορείς και να μιλήσεις.', 'Analytics, reports, bins and rules, with charts from the municipal data. You can also speak.')
                        : t('Πού πάει κάτι, πού είναι ο κάδος, πώς τα πάει η γειτονιά σου.', 'Where something goes, where the bin is, how your neighbourhood is doing.')}
                    </p>
                  </div>
                  <div className={`grid gap-2 ${wide ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                    {STARTERS[mode].map((g) => (
                      <div key={g.title.en} className="flex flex-col gap-1.5 rounded-card border border-line bg-surface p-3">
                        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-forest-700">
                          <g.icon size={14} aria-hidden /> {g.title[lang]}
                        </p>
                        {g.prompts.map((p) => (
                          <button
                            key={p.en}
                            type="button"
                            onClick={() => send(p[lang])}
                            className="rounded-control px-2 py-1.5 text-left text-[13px] leading-snug text-ink transition-colors hover:bg-forest-50"
                          >
                            {p[lang]}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                  {models && !models.enabled && <p className="text-caption text-danger">{t('Ο βοηθός δεν έχει ρυθμιστεί (AI Gateway).', 'The assistant is not configured (AI Gateway).')}</p>}
                </div>
              )}
              <div className="flex flex-col gap-5">
                {messages.map((m, i) => (
                  <Message
                    key={m.id}
                    message={m}
                    lang={lang}
                    locale={locale}
                    streaming={busy && i === messages.length - 1}
                    onApproval={(id, approved) => addToolApprovalResponse({ id, approved })}
                  />
                ))}
                {status === 'submitted' && (
                  <p className="flex items-center gap-2 text-caption text-muted" role="status">
                    <Loader2 size={14} className="animate-spin" /> {t('Σκέφτομαι…', 'Thinking…')}
                  </p>
                )}
                {error && (
                  <div className="flex flex-col items-start gap-2 rounded-card border border-line bg-surface p-3" role="alert">
                    <p className="text-body">
                      {limitMsg ?? t('Κάτι πήγε στραβά με τον βοηθό.', 'The assistant hit a problem.')}
                    </p>
                    {!limitMsg && (
                      <button type="button" onClick={() => regenerate()} className="inline-flex items-center gap-1.5 rounded-control bg-surface-2 px-3 py-1.5 text-[13px] font-semibold hover:bg-line">
                        <RotateCcw size={14} /> {t('Δοκίμασε ξανά', 'Try again')}
                      </button>
                    )}
                  </div>
                )}
                {mic.error && (
                  <p className="text-caption text-danger">
                    {mic.error === 'not-allowed' || mic.error === 'service-not-allowed'
                      ? t('Δώσε άδεια για το μικρόφωνο στον browser.', 'Allow the microphone in the browser.')
                      : t('Δεν σε άκουσα καλά. Δοκίμασε ξανά ή γράψε την ερώτηση.', 'I did not catch that. Try again or type the question.')}
                  </p>
                )}
              </div>
            </div>
            {!atBottom && messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setAtBottom(true);
                  scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
                }}
                className="absolute bottom-28 left-1/2 z-10 -translate-x-1/2 rounded-pill border border-line bg-surface p-2 shadow-soft"
                aria-label={t('Στο τέλος', 'Jump to latest')}
              >
                <ArrowDown size={16} />
              </button>
            )}

            <form
              className="border-t border-line bg-surface px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]"
              onSubmit={(e) => {
                e.preventDefault();
                if (!tooLong) send(input);
              }}
            >
              <div className={`flex items-end gap-2 rounded-[14px] border bg-paper p-1.5 pl-3 focus-within:border-forest-700 ${tooLong ? 'border-danger' : 'border-line'}`}>
                <textarea
                  ref={box}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      if (!tooLong) send(input);
                    }
                  }}
                  placeholder={mic.listening ? t('Σε ακούω… κλείνει μετά από 3″ σιωπής', 'Listening… closes after 3 s of silence') : t('Ρώτα κάτι…', 'Ask something…')}
                  className="max-h-[132px] min-h-[36px] flex-1 resize-none bg-transparent py-2 text-body leading-snug outline-none"
                  aria-label={t('Ερώτηση', 'Question')}
                />
                {mic.supported && !busy && (
                  <button
                    type="button"
                    onClick={() => (mic.listening ? mic.stop() : mic.start(input))}
                    aria-pressed={mic.listening}
                    aria-label={mic.listening ? t('Σταμάτα την ακρόαση', 'Stop listening') : t('Ρώτα με τη φωνή σου', 'Ask by voice')}
                    title={mic.listening ? t('Σταμάτα την ακρόαση', 'Stop listening') : t('Ρώτα με τη φωνή σου (ελληνικά)', 'Ask by voice (Greek)')}
                    className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] transition-colors ${mic.listening ? 'animate-pulse bg-danger text-white' : 'text-muted hover:bg-surface-2 hover:text-ink'}`}
                  >
                    {mic.listening ? <Square size={14} fill="currentColor" /> : <Mic size={18} />}
                  </button>
                )}
                {busy ? (
                  <button type="button" onClick={() => stop()} className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-ink text-white" aria-label={t('Στοπ', 'Stop')}>
                    <Square size={13} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim() || tooLong}
                    className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-forest-700 text-white transition-opacity disabled:opacity-30"
                    aria-label={t('Αποστολή', 'Send')}
                  >
                    <ArrowUp size={18} />
                  </button>
                )}
              </div>
              <p className="mt-1.5 flex justify-between gap-3 px-1 text-[11px] text-muted">
                <span>
                  {quota && quota.remaining >= 0
                    ? t(`${quota.remaining} από ${quota.limit} ερωτήσεις ακόμη σήμερα`, `${quota.remaining} of ${quota.limit} questions left today`)
                    : t('Ανοιχτό μοντέλο · οι ενέργειες θέλουν έγκριση', 'Open model · actions need approval')}
                </span>
                {input.length > 800 ? (
                  <span className={tooLong ? 'font-semibold text-danger' : ''}>{input.length}/1000</span>
                ) : (
                  <span className="hidden sm:inline">{t('Enter αποστολή · Shift+Enter νέα γραμμή', 'Enter to send · Shift+Enter new line')}</span>
                )}
              </p>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}

function IconButton({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`flex size-9 items-center justify-center rounded-[10px] text-muted transition-colors hover:bg-surface-2 hover:text-ink ${pressed ? 'bg-surface-2 text-ink' : ''}`}
    >
      {children}
    </button>
  );
}

function CopyButton({ text, lang }: { text: string; lang: 'el' | 'en' }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1 rounded-control px-1.5 py-1 text-[12px] text-muted hover:bg-surface-2 hover:text-ink"
      aria-label={lang === 'el' ? 'Αντιγραφή απάντησης' : 'Copy answer'}
    >
      {done ? <Check size={13} /> : <Copy size={13} />} {done ? (lang === 'el' ? 'Αντιγράφηκε' : 'Copied') : lang === 'el' ? 'Αντιγραφή' : 'Copy'}
    </button>
  );
}

function Message({ message, lang, locale, streaming, onApproval }: { message: UIMessage; lang: 'el' | 'en'; locale: string; streaming: boolean; onApproval: (id: string, approved: boolean) => void }) {
  const t = (el: string, en: string) => (lang === 'el' ? el : en);
  if (message.role === 'user')
    return (
      <div className="ml-10 self-end rounded-[16px] rounded-br-[4px] bg-forest-700 px-3.5 py-2 text-body whitespace-pre-wrap text-white">
        {message.parts.map((p, i) => (p.type === 'text' ? <span key={i}>{p.text}</span> : null))}
      </div>
    );
  const text = message.parts.map((p) => (p.type === 'text' ? p.text : '')).join('\n').trim();
  const tools = message.parts.filter((p) => isToolUIPart(p)) as unknown as ToolPart[];
  const running = tools.filter((p) => p.state !== 'output-available' && p.state !== 'output-error' && p.state !== 'output-denied' && p.state !== 'approval-requested');
  return (
    <div className="flex flex-col gap-2.5 text-body text-ink">
      {/* What the assistant looked up, as one quiet row of chips. */}
      {tools.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tools.map((part, i) => {
            const name = getToolName(part as never);
            const label = ASSISTANT_TOOL_LABELS[name]?.[lang] ?? name;
            const isAction = (ASSISTANT_ACTION_TOOLS as readonly string[]).includes(name);
            const done = part.state === 'output-available';
            const failed = part.state === 'output-error' || (done && part.output?.ok === false);
            return (
              <span
                key={i}
                className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] ${failed ? 'bg-danger-soft text-danger' : isAction && done ? 'bg-forest-50 font-semibold text-forest-700' : 'bg-surface-2 text-muted'}`}
              >
                {failed ? <X size={11} /> : done ? <Check size={11} /> : part.state === 'output-denied' ? <X size={11} /> : <Loader2 size={11} className="animate-spin" />} {label}
              </span>
            );
          })}
        </div>
      )}
      {message.parts.map((p, i) => {
        if (p.type === 'text') return p.text.trim() ? <Markdown key={i} text={p.text} /> : null;
        if (!isToolUIPart(p)) return null;
        const part = p as unknown as ToolPart;
        const name = getToolName(p);
        const label = ASSISTANT_TOOL_LABELS[name]?.[lang] ?? name;
        if (part.state === 'approval-requested' && part.approval && !part.approval.isAutomatic)
          return (
            <div key={i} className="rounded-card border border-warn bg-warn-soft p-3">
              <p className="text-[13px] font-semibold">
                {t('Θέλει την έγκρισή σου', 'Needs your approval')}: {label}
              </p>
              {part.input && (
                <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
                  {Object.entries(part.input).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted">{k}</dt>
                      <dd className="num break-all">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className="mt-2.5 flex gap-2">
                <button type="button" onClick={() => onApproval(part.approval!.id, true)} className="rounded-control bg-forest-700 px-3 py-1.5 text-[13px] font-semibold text-white">
                  {t('Έγκριση', 'Approve')}
                </button>
                <button type="button" onClick={() => onApproval(part.approval!.id, false)} className="rounded-control bg-surface px-3 py-1.5 text-[13px] font-semibold">
                  {t('Άρνηση', 'Deny')}
                </button>
              </div>
            </div>
          );
        if (part.state === 'output-available' && part.output?.chart) return <AssistantChartView key={i} chart={part.output.chart} locale={locale} />;
        return null;
      })}
      {!streaming && text && running.length === 0 && (
        <div className="-mt-1">
          <CopyButton text={text} lang={lang} />
        </div>
      )}
    </div>
  );
}
