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

/** Close the mic after this much silence (no new words). */
export const SILENCE_MS = 3000;

/**
 * Voice input for the assistant with the browser's own speech recognition (Chrome's built-in voice input, Edge, Safari),
 * always in Greek. No external speech service is called by RecycleIQ.
 * The mic keeps listening through pauses and closes after 3 seconds of silence (or when the person taps stop).
 * It never sends: the words land in the box, after anything already typed, so the person can fix them and send.
 * `onText` gets the box's text while they talk, `onEnd` fires when the mic closes. Hidden where the browser has no
 * speech recognition (e.g. Firefox).
 */
export function useDictation({ onText, onEnd }: { onText: (text: string) => void; onEnd?: () => void }) {
  // False on the server and on first paint, then whether this browser has speech recognition.
  const supported = useSyncExternalStore(noop, () => recognitionCtor() !== null, () => false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const silence = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cb = useRef({ onText, onEnd });
  useEffect(() => {
    cb.current = { onText, onEnd };
  });
  const clearSilence = () => {
    if (silence.current) clearTimeout(silence.current);
    silence.current = null;
  };
  const armSilence = useCallback(() => {
    clearSilence();
    silence.current = setTimeout(() => rec.current?.stop(), SILENCE_MS);
  }, []);
  useEffect(
    () => () => {
      clearSilence();
      rec.current?.abort();
    },
    [],
  );

  /** `base` is what is already in the box; the spoken words are added after it. */
  const start = useCallback(
    (base = '') => {
      const C = recognitionCtor();
      if (!C) return;
      setError(null);
      const prefix = base.trim() ? `${base.trim()} ` : '';
      const r = new C();
      // Always Greek: the browser's own recognizer (Chrome, Edge, Safari) with Greek input.
      r.lang = 'el-GR';
      r.interimResults = true;
      r.continuous = true;
      r.onstart = () => {
        setListening(true);
        armSilence();
      };
      r.onresult = (e) => {
        const text = Array.from(e.results)
          .map((res) => res[0]?.transcript ?? '')
          .join('')
          .trim();
        cb.current.onText(prefix + text);
        armSilence();
      };
      r.onerror = (e) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') setError(e.error);
      };
      r.onend = () => {
        clearSilence();
        setListening(false);
        rec.current = null;
        cb.current.onEnd?.();
      };
      rec.current = r;
      r.start();
    },
    [armSilence],
  );
  const stop = useCallback(() => rec.current?.stop(), []);

  return { supported, listening, error, start, stop };
}
