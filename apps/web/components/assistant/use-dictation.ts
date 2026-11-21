'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

// The Web Speech API is not in the TypeScript DOM lib; only the parts used here.
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type Ctor = new () => SpeechRecognitionLike;

const noop = () => () => {};

function recognitionCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Voice input for the assistant with the browser's own speech recognition (Chrome, Edge, Safari).
 * `onText` gets the running transcript, `onFinal` the finished question when the person stops talking.
 * Hidden where the browser has no speech recognition (e.g. Firefox).
 */
export function useDictation({ lang, onText, onFinal }: { lang: 'el' | 'en'; onText: (text: string) => void; onFinal: (text: string) => void }) {
  // False on the server and on first paint, then whether this browser has speech recognition.
  const supported = useSyncExternalStore(noop, () => recognitionCtor() !== null, () => false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const last = useRef('');
  const cb = useRef({ onText, onFinal });
  useEffect(() => {
    cb.current = { onText, onFinal };
  });
  useEffect(() => () => rec.current?.abort(), []);

  const start = useCallback(() => {
    const C = recognitionCtor();
    if (!C) return;
    setError(null);
    last.current = '';
    const r = new C();
    r.lang = lang === 'el' ? 'el-GR' : 'en-US';
    r.interimResults = true;
    r.continuous = false;
    r.onstart = () => setListening(true);
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? '')
        .join('');
      last.current = text;
      cb.current.onText(text);
    };
    r.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') setError(e.error);
    };
    r.onend = () => {
      setListening(false);
      rec.current = null;
      const text = last.current.trim();
      last.current = '';
      if (text) cb.current.onFinal(text);
    };
    rec.current = r;
    r.start();
  }, [lang]);
  const stop = useCallback(() => rec.current?.stop(), []);

  return { supported, listening, error, start, stop };
}
