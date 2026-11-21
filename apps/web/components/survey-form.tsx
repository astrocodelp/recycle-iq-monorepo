'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';
import { OTHER, SURVEY, type Answers, type Question } from '@/lib/survey';

/** The resident survey, one section per step, built for keyboards and screen readers (fieldset/legend, real inputs). */
export function SurveyForm({ source }: { source: string | null }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [missing, setMissing] = useState<string[]>([]);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const section = SURVEY[step]!;
  const last = step === SURVEY.length - 1;

  const set = (id: string, v: Answers[string] | undefined) =>
    setAnswers((a) => {
      const n = { ...a };
      if (v === undefined || (Array.isArray(v) && !v.length) || v === '') delete n[id];
      else n[id] = v;
      return n;
    });

  const unanswered = (q: Question) => {
    if (!q.required) return false;
    const v = answers[q.id];
    if (q.type === 'grid') return Object.keys((v as Record<string, string>) ?? {}).length < q.rows.length;
    if (q.type === 'multi') return v === undefined && !answers[`${q.id}${OTHER}`];
    return v === undefined;
  };

  const next = async () => {
    const miss = section.questions.filter(unanswered).map((q) => q.id);
    setMissing(miss);
    if (miss.length) {
      document.getElementById(`q-${miss[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!last) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setState('sending');
    const res = await fetch('/api/v1/survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, email: email.trim() || undefined, source, website }),
    }).catch(() => null);
    setState(res?.ok ? 'done' : 'error');
  };

  if (state === 'done')
    return (
      <div className="card flex flex-col items-start gap-3 p-6" role="status">
        <span className="flex size-12 items-center justify-center rounded-full bg-lime text-forest-900">
          <Check size={26} aria-hidden />
        </span>
        <h2 className="text-[22px] font-bold">Ευχαριστούμε!</h2>
        <p className="text-body text-muted">Η γνώμη σου μπαίνει κατευθείαν στον σχεδιασμό του RecycleIQ. Αν σου άρεσε, στείλ’ το και σε έναν φίλο.</p>
        <a href="/app" className="rounded-control bg-forest-700 px-4 py-2.5 text-body font-semibold text-white hover:bg-forest-800">
          Δοκίμασε την εφαρμογή
        </a>
      </div>
    );

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      noValidate
    >
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-caption text-muted">
          <span>
            Βήμα {step + 1} από {SURVEY.length}
          </span>
          <span>{section.title}</span>
        </div>
        <div className="h-2 rounded-pill bg-surface-2" role="progressbar" aria-valuemin={1} aria-valuemax={SURVEY.length} aria-valuenow={step + 1} aria-label="Πρόοδος">
          <div className="h-2 rounded-pill bg-forest-700 transition-all" style={{ width: `${((step + 1) / SURVEY.length) * 100}%` }} />
        </div>
      </div>

      <h2 className="text-[22px] font-bold">{section.title}</h2>
      {section.intro && <p className="-mt-3 text-body text-muted">{section.intro}</p>}

      {section.questions.map((q) => (
        <QuestionField key={q.id} q={q} answers={answers} set={set} invalid={missing.includes(q.id)} />
      ))}

      {last && (
        <div className="card flex flex-col gap-2 p-4">
          <label htmlFor="email" className="text-body font-semibold">
            Email, αν θέλεις να δοκιμάσεις πρώτος/η το πιλοτικό (προαιρετικό)
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-control border border-line bg-surface px-3 py-2.5 text-body outline-none focus:border-forest-700"
          />
          <p className="text-caption text-muted">Μόνο για το πιλοτικό του RecycleIQ. Το διαγράφουμε μετά, ή όποτε μας το ζητήσεις. Δεν συνδέεται με τις απαντήσεις σου στο dashboard.</p>
        </div>
      )}
      {/* Honeypot for bots: hidden from people and screen readers. */}
      <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      {missing.length > 0 && (
        <p className="text-body text-danger" role="alert">
          Συμπλήρωσε τις ερωτήσεις που λείπουν (με κόκκινο).
        </p>
      )}
      {state === 'error' && (
        <p className="text-body text-danger" role="alert">
          Δεν στάλθηκε. Δοκίμασε ξανά σε λίγο.
        </p>
      )}

      <div className="flex gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded-control bg-surface-2 px-5 py-3 text-body font-semibold text-ink hover:bg-line">
            Πίσω
          </button>
        )}
        <button type="submit" disabled={state === 'sending'} className="flex-1 rounded-control bg-forest-700 px-5 py-3 text-body font-semibold text-white hover:bg-forest-800 disabled:opacity-50">
          {last ? (state === 'sending' ? 'Αποστολή…' : 'Αποστολή') : 'Επόμενο'}
        </button>
      </div>
    </form>
  );
}

function QuestionField({ q, answers, set, invalid }: { q: Question; answers: Answers; set: (id: string, v: Answers[string] | undefined) => void; invalid: boolean }) {
  const box = `card flex flex-col gap-3 p-4 ${invalid ? 'ring-2 ring-danger' : ''}`;
  const req = q.required ? <span className="text-danger"> *</span> : null;
  const help = q.help ? <p className="-mt-1 text-caption text-muted">{q.help}</p> : null;
  const choice = 'flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-line px-3 py-2 text-body hover:bg-surface-2 has-[:checked]:border-forest-700 has-[:checked]:bg-forest-50';

  if (q.type === 'text')
    return (
      <div id={`q-${q.id}`} className={box}>
        <label htmlFor={`f-${q.id}`} className="text-body font-semibold">
          {q.title}
          {req}
        </label>
        {help}
        {q.long ? (
          <textarea
            id={`f-${q.id}`}
            rows={3}
            maxLength={2000}
            value={(answers[q.id] as string) ?? ''}
            onChange={(e) => set(q.id, e.target.value)}
            className="rounded-control border border-line bg-surface px-3 py-2.5 text-body outline-none focus:border-forest-700"
          />
        ) : (
          <input
            id={`f-${q.id}`}
            maxLength={200}
            value={(answers[q.id] as string) ?? ''}
            onChange={(e) => set(q.id, e.target.value)}
            className="rounded-control border border-line bg-surface px-3 py-2.5 text-body outline-none focus:border-forest-700"
          />
        )}
      </div>
    );

  if (q.type === 'grid') {
    const g = (answers[q.id] as Record<string, string>) ?? {};
    return (
      <fieldset id={`q-${q.id}`} className={box}>
        <legend className="contents">
          <span className="text-body font-semibold">
            {q.title}
            {req}
          </span>
        </legend>
        {help}
        <div className="flex flex-col gap-4">
          {q.rows.map((row) => (
            <fieldset key={row} className="flex flex-col gap-2">
              <legend className="text-body">{row}</legend>
              <div className="grid grid-cols-5 gap-1.5">
                {q.columns.map((col) => (
                  <label key={col} className={`${choice} min-h-12 flex-col justify-center gap-1 px-1 text-center text-[12px] leading-tight`}>
                    <input type="radio" name={`${q.id}-${row}`} checked={g[row] === col} onChange={() => set(q.id, { ...g, [row]: col })} className="size-4 accent-forest-700" />
                    {col}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </fieldset>
    );
  }

  if (q.type === 'scale') {
    const v = answers[q.id] as number | undefined;
    return (
      <fieldset id={`q-${q.id}`} className={box}>
        <legend className="contents">
          <span className="text-body font-semibold">
            {q.title}
            {req}
          </span>
        </legend>
        {help}
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className={`${choice} justify-center`}>
              <input type="radio" name={q.id} checked={v === n} onChange={() => set(q.id, n)} className="size-4 accent-forest-700" />
              <span className="num font-semibold">{n}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-between text-caption text-muted">
          <span>1 = {q.low}</span>
          <span>5 = {q.high}</span>
        </div>
      </fieldset>
    );
  }

  const multi = q.type === 'multi';
  const picked = multi ? ((answers[q.id] as string[]) ?? []) : [];
  return (
    <fieldset id={`q-${q.id}`} className={box}>
      <legend className="contents">
        <span className="text-body font-semibold">
          {q.title}
          {req}
        </span>
      </legend>
      {help}
      <div className="flex flex-col gap-2">
        {q.options.map((o) => (
          <label key={o} className={choice}>
            <input
              type={multi ? 'checkbox' : 'radio'}
              name={q.id}
              checked={multi ? picked.includes(o) : answers[q.id] === o}
              onChange={(e) => (multi ? set(q.id, e.target.checked ? [...picked, o] : picked.filter((x) => x !== o)) : set(q.id, o))}
              className="size-4 shrink-0 accent-forest-700"
            />
            {o}
          </label>
        ))}
        {q.other && (
          <input
            aria-label={`${q.title}: άλλο`}
            placeholder="Άλλο…"
            maxLength={300}
            value={(answers[`${q.id}${OTHER}`] as string) ?? ''}
            onChange={(e) => set(`${q.id}${OTHER}`, e.target.value)}
            className="rounded-control border border-line bg-surface px-3 py-2.5 text-body outline-none focus:border-forest-700"
          />
        )}
      </div>
    </fieldset>
  );
}
