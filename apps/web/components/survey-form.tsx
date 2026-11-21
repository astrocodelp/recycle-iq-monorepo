'use client';

import { ArrowRight, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogoMark } from '@/components/logo';
import { OTHER, SURVEY, type Answers, type Question } from '@/lib/survey';

type Step = { kind: 'welcome' } | { kind: 'q'; q: Question; section: string; n: number } | { kind: 'email' } | { kind: 'done' };
const KEYS = 'ΑΒΓΔΕΖΗΘΙΚΛΜ'.split('');

/**
 * Typeform-style survey: one question per screen, big type, keyboard first (letters pick, Enter continues,
 * arrows move), auto-advance on single choices. Built on real buttons and inputs for screen readers.
 */
export function SurveyForm({ source }: { source: string | null }) {
  const steps = useMemo<Step[]>(() => {
    let n = 0;
    return [
      { kind: 'welcome' },
      ...SURVEY.flatMap((s) => s.questions.map((q) => ({ kind: 'q' as const, q, section: s.title, n: ++n }))),
      { kind: 'email' },
      { kind: 'done' },
    ];
  }, []);
  const total = steps.filter((s) => s.kind === 'q').length;
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<'up' | 'down'>('up');
  const [answers, setAnswers] = useState<Answers>({});
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [warn, setWarn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  const heading = useRef<HTMLHeadingElement>(null);
  const step = steps[i]!;

  const set = (id: string, v: Answers[string] | undefined) =>
    setAnswers((a) => {
      const n = { ...a };
      if (v === undefined || (Array.isArray(v) && !v.length) || v === '') delete n[id];
      else n[id] = v;
      return n;
    });

  const missing = useCallback(
    (s: Step, a: Answers) => {
      if (s.kind !== 'q' || !s.q.required) return false;
      const q = s.q;
      const v = a[q.id];
      if (q.type === 'grid') return Object.keys((v as Record<string, string>) ?? {}).length < q.rows.length;
      if (q.type === 'multi') return v === undefined && !a[`${q.id}${OTHER}`];
      return v === undefined;
    },
    [],
  );

  const submit = async (a: Answers) => {
    setState('sending');
    const res = await fetch('/api/v1/survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: a, email: email.trim() || undefined, source, website }),
    }).catch(() => null);
    if (res?.ok) {
      setState('idle');
      setDir('up');
      setI(steps.length - 1);
    } else setState('error');
  };

  const go = useCallback(
    (to: number, a: Answers = answers) => {
      if (to > i && missing(step, a)) {
        setWarn(true);
        return;
      }
      setWarn(false);
      if (steps[to]?.kind === 'done') {
        submit(a);
        return;
      }
      if (to < 0 || to >= steps.length) return;
      setDir(to > i ? 'up' : 'down');
      setI(to);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i, step, answers, missing, steps],
  );
  const next = (a?: Answers) => go(i + 1, a);

  // Move focus to the new question so screen readers announce it and the keyboard starts there.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [i]);

  const choose = (q: Question, v: string | number) => {
    if (q.type === 'multi') {
      const cur = (answers[q.id] as string[]) ?? [];
      set(q.id, cur.includes(v as string) ? cur.filter((x) => x !== v) : [...cur, v as string]);
      setWarn(false);
      return;
    }
    const a = { ...answers, [q.id]: v };
    setAnswers(a);
    setWarn(false);
    // Single choice and scale: move on by themselves, like Typeform.
    window.setTimeout(() => go(i + 1, a), 280);
  };

  // Keyboard: letters pick a choice, Enter continues, arrows move between questions.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLTextAreaElement || (e.target instanceof HTMLInputElement && e.target.type !== 'radio' && e.target.type !== 'checkbox');
      if (e.key === 'Enter' && !e.shiftKey && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        next();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        next();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        go(i - 1);
        return;
      }
      if (step.kind === 'q' && (step.q.type === 'single' || step.q.type === 'multi')) {
        const k = KEYS.indexOf(e.key.toUpperCase());
        const latin = e.key.length === 1 ? e.key.toUpperCase().charCodeAt(0) - 65 : -1;
        const idx = k >= 0 ? k : latin;
        if (idx >= 0 && idx < step.q.options.length) choose(step.q, step.q.options[idx]!);
      }
      if (step.kind === 'q' && step.q.type === 'scale' && /^[1-5]$/.test(e.key)) choose(step.q, Number(e.key));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const done = step.kind === 'done';
  const answered = steps.slice(1, i).filter((s) => s.kind === 'q').length;
  const progress = done ? 100 : Math.round((answered / total) * 100);

  return (
    <div className="fixed inset-0 flex flex-col bg-canvas text-paper">
      <div className="h-1 w-full bg-white/10" role="progressbar" aria-label="Πρόοδος" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <div className="h-1 bg-lime transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div key={i} className={`mx-auto flex min-h-full max-w-2xl flex-col justify-center px-6 py-12 ${dir === 'up' ? 'tf-up' : 'tf-down'}`}>
          {step.kind === 'welcome' && (
            <div className="flex flex-col items-start gap-6">
              <LogoMark size={52} />
              <h1 ref={heading} tabIndex={-1} className="text-[34px] leading-tight font-bold outline-none sm:text-[44px]">
                Πώς να γίνει η ανακύκλωση πιο εύκολη για όλους;
              </h1>
              <p className="text-[18px] leading-relaxed text-white/75 sm:text-[20px]">
                Φτιάχνουμε το RecycleIQ για την Αθήνα: σκανάρεις ένα αντικείμενο και μαθαίνεις σε ποιον κάδο πάει. Πες μας πώς να το χρησιμοποιεί ο καθένας και
                τι θα σε έκανε να ανακυκλώνεις συχνότερα.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <PrimaryButton onClick={() => next()}>Ξεκίνα</PrimaryButton>
                <span className="text-[14px] text-white/60">⏱ 3 λεπτά · ανώνυμο · πάτα Enter ↵</span>
              </div>
            </div>
          )}

          {step.kind === 'q' && (
            <QuestionScreen
              key={step.q.id}
              step={step}
              total={total}
              answers={answers}
              set={(id, v) => {
                set(id, v);
                setWarn(false);
              }}
              choose={choose}
              headingRef={heading}
              warn={warn}
              onOk={() => next()}
            />
          )}

          {step.kind === 'email' && (
            <div className="flex flex-col gap-5">
              <p className="text-[15px] text-lime">Τελευταίο · προαιρετικό</p>
              <h2 ref={heading} tabIndex={-1} className="text-[26px] leading-snug font-semibold outline-none sm:text-[32px]">
                Θέλεις να δοκιμάσεις πρώτος/η το πιλοτικό; Άφησε το email σου.
              </h2>
              <p className="text-[16px] text-white/65">Μόνο για το πιλοτικό. Το διαγράφουμε μετά, ή όποτε μας το ζητήσεις. Δεν συνδέεται με τις απαντήσεις σου.</p>
              <input
                type="email"
                autoComplete="email"
                aria-label="Email (προαιρετικό)"
                placeholder="το@email.σου"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-b-2 border-white/30 bg-transparent py-2 text-[24px] text-paper outline-none placeholder:text-white/30 focus:border-lime"
              />
              <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
              {state === 'error' && (
                <p role="alert" className="text-[16px] text-[#FCA5A5]">
                  Δεν στάλθηκε. Δοκίμασε ξανά σε λίγο.
                </p>
              )}
              <div>
                <PrimaryButton onClick={() => next()} disabled={state === 'sending'}>
                  {state === 'sending' ? 'Αποστολή…' : email.trim() ? 'Αποστολή' : 'Αποστολή χωρίς email'}
                </PrimaryButton>
              </div>
            </div>
          )}

          {done && (
            <div className="flex flex-col items-start gap-6" role="status">
              <span className="flex size-16 items-center justify-center rounded-full bg-lime text-forest-900">
                <Check size={34} aria-hidden />
              </span>
              <h2 ref={heading} tabIndex={-1} className="text-[34px] leading-tight font-bold outline-none sm:text-[44px]">
                Ευχαριστούμε!
              </h2>
              <p className="text-[18px] text-white/75 sm:text-[20px]">Η γνώμη σου μπαίνει κατευθείαν στον σχεδιασμό του RecycleIQ. Στείλ’ το και σε έναν φίλο.</p>
              <div className="flex flex-wrap gap-3">
                <a href="/app" className="inline-flex items-center gap-2 rounded-[10px] bg-lime px-6 py-3 text-[18px] font-bold text-forest-900 hover:brightness-95">
                  Δοκίμασε την εφαρμογή <ArrowRight size={18} aria-hidden />
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    const url = `${location.origin}/feedback`;
                    if (navigator.share) await navigator.share({ title: 'RecycleIQ', url }).catch(() => {});
                    else {
                      await navigator.clipboard?.writeText(url).catch(() => {});
                      setCopied(true);
                    }
                  }}
                  className="rounded-[10px] border border-white/30 px-6 py-3 text-[18px] font-semibold hover:bg-white/10"
                >
                  {copied ? 'Ο σύνδεσμος αντιγράφηκε ✓' : 'Κοινοποίηση'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!done && step.kind !== 'welcome' && (
        <div className="flex items-center justify-between px-5 pb-5">
          <span className="flex items-center gap-2 text-[13px] text-white/50">
            <LogoMark size={20} /> RecycleIQ
          </span>
          <div className="flex overflow-hidden rounded-[10px] bg-lime text-forest-900">
            <button type="button" onClick={() => go(i - 1)} aria-label="Προηγούμενη ερώτηση" className="p-2.5 hover:brightness-95">
              <ChevronUp size={20} aria-hidden />
            </button>
            <span className="w-px bg-forest-900/20" aria-hidden />
            <button type="button" onClick={() => next()} aria-label="Επόμενη ερώτηση" className="p-2.5 hover:brightness-95">
              <ChevronDown size={20} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-[10px] bg-lime px-6 py-3 text-[18px] font-bold text-forest-900 shadow-[0_4px_14px_rgba(199,243,107,0.25)] hover:brightness-95 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function QuestionScreen({
  step,
  total,
  answers,
  set,
  choose,
  headingRef,
  warn,
  onOk,
}: {
  step: Extract<Step, { kind: 'q' }>;
  total: number;
  answers: Answers;
  set: (id: string, v: Answers[string] | undefined) => void;
  choose: (q: Question, v: string | number) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  warn: boolean;
  onOk: () => void;
}) {
  const { q, n, section } = step;
  const optionCls = (on: boolean) =>
    `flex w-full items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left text-[17px] transition-colors sm:text-[18px] ${
      on ? 'border-lime bg-lime/15' : 'border-white/30 bg-white/5 hover:bg-white/10'
    }`;
  const keyCls = (on: boolean) =>
    `flex size-7 shrink-0 items-center justify-center rounded-[6px] border text-[13px] font-bold ${on ? 'border-lime bg-lime text-forest-900' : 'border-white/40 text-white/80'}`;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[14px] text-lime">
        {section} · {n} από {total}
      </p>
      <h2 ref={headingRef} tabIndex={-1} className="flex gap-3 text-[24px] leading-snug font-semibold outline-none sm:text-[30px]">
        <span className="shrink-0 text-lime" aria-hidden>
          {n}→
        </span>
        <span>
          {q.title}
          {q.required ? <span className="text-lime"> *</span> : null}
        </span>
      </h2>
      {q.help && <p className="-mt-2 text-[16px] text-white/65">{q.help}</p>}

      {(q.type === 'single' || q.type === 'multi') && (
        <div className="flex max-w-xl flex-col gap-2" role="group" aria-label={q.title}>
          {q.type === 'multi' && <p className="text-[14px] text-white/60">Διάλεξε όσα θέλεις</p>}
          {q.options.map((o, k) => {
            const on = q.type === 'multi' ? ((answers[q.id] as string[]) ?? []).includes(o) : answers[q.id] === o;
            return (
              <button key={o} type="button" aria-pressed={on} onClick={() => choose(q, o)} className={optionCls(on)}>
                <span className={keyCls(on)} aria-hidden>
                  {KEYS[k]}
                </span>
                <span className="flex-1">{o}</span>
                {on && <Check size={18} className="text-lime" aria-hidden />}
              </button>
            );
          })}
          {q.type === 'multi' && q.other && (
            <input
              aria-label={`${q.title}: άλλο`}
              placeholder="Άλλο… γράψε εδώ"
              maxLength={300}
              value={(answers[`${q.id}${OTHER}`] as string) ?? ''}
              onChange={(e) => set(`${q.id}${OTHER}`, e.target.value)}
              className="rounded-[10px] border border-white/30 bg-white/5 px-3 py-2.5 text-[17px] text-paper outline-none placeholder:text-white/40 focus:border-lime"
            />
          )}
        </div>
      )}

      {q.type === 'scale' && (
        <div className="flex max-w-xl flex-col gap-2">
          <div className="grid grid-cols-5 gap-2" role="group" aria-label={q.title}>
            {[1, 2, 3, 4, 5].map((v) => {
              const on = answers[q.id] === v;
              return (
                <button key={v} type="button" aria-pressed={on} onClick={() => choose(q, v)} className={`${optionCls(on)} justify-center py-4 text-[22px] font-bold`}>
                  {v}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-[14px] text-white/60">
            <span>{q.low}</span>
            <span>{q.high}</span>
          </div>
        </div>
      )}

      {q.type === 'grid' && (
        <div className="flex flex-col gap-4">
          <p className="text-[14px] text-white/60">1 = {q.columns[0]} · 5 = {q.columns[q.columns.length - 1]}</p>
          {q.rows.map((row) => {
            const g = (answers[q.id] as Record<string, string>) ?? {};
            return (
              <div key={row} className="flex flex-col gap-2" role="group" aria-label={row}>
                <span className="text-[17px]">{row}</span>
                <div className="grid grid-cols-5 gap-1.5">
                  {q.columns.map((col, k) => {
                    const on = g[row] === col;
                    return (
                      <button
                        key={col}
                        type="button"
                        aria-pressed={on}
                        aria-label={`${row}: ${col}`}
                        title={col}
                        onClick={() => set(q.id, { ...g, [row]: col })}
                        className={`rounded-[8px] border py-2 text-[16px] font-bold transition-colors ${on ? 'border-lime bg-lime text-forest-900' : 'border-white/30 bg-white/5 hover:bg-white/10'}`}
                      >
                        {k + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {q.type === 'text' &&
        (q.long ? (
          <textarea
            aria-label={q.title}
            rows={2}
            maxLength={2000}
            placeholder="Γράψε εδώ…"
            value={(answers[q.id] as string) ?? ''}
            onChange={(e) => set(q.id, e.target.value)}
            className="resize-none border-b-2 border-white/30 bg-transparent py-2 text-[22px] text-paper outline-none placeholder:text-white/30 focus:border-lime"
          />
        ) : (
          <input
            aria-label={q.title}
            maxLength={200}
            placeholder="Γράψε εδώ…"
            value={(answers[q.id] as string) ?? ''}
            onChange={(e) => set(q.id, e.target.value)}
            className="border-b-2 border-white/30 bg-transparent py-2 text-[22px] text-paper outline-none placeholder:text-white/30 focus:border-lime"
          />
        ))}

      {warn && (
        <p role="alert" className="w-fit rounded-[8px] bg-[#7F1D1D] px-3 py-1.5 text-[15px] text-white">
          ⚠ Χρειαζόμαστε μια απάντηση εδώ
        </p>
      )}

      {q.type !== 'single' && q.type !== 'scale' && (
        <div className="flex items-center gap-3">
          <PrimaryButton onClick={onOk}>
            OK <Check size={18} aria-hidden />
          </PrimaryButton>
          <span className="text-[14px] text-white/55">πάτα Enter ↵{q.type === 'text' && q.long ? ' · Shift ⇧ + Enter για νέα γραμμή' : ''}</span>
        </div>
      )}
    </div>
  );
}
