import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Close the mic after this much silence (no new words). */
export const SILENCE_MS = 3000;

/**
 * Voice input for the assistant. The phone's own speech recognizer (iOS Speech, Android's recognition service,
 * the browser's Web Speech API on the web build) turns speech into text. RecycleIQ never receives the audio.
 *
 * The mic keeps listening through pauses and closes after 3 seconds of silence (or when the person taps stop).
 * It never sends: the words land in the box, after anything already typed, so the person can fix them and send.
 * `onText` gets the box's text while they talk, `onEnd` fires when the mic closes.
 */
export function useDictation({ onText, onEnd }: { onText: (text: string) => void; onEnd?: () => void }) {
  const [supported] = useState(() => {
    try {
      return ExpoSpeechRecognitionModule.isRecognitionAvailable();
    } catch {
      return false;
    }
  });
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefix = useRef('');
  // Finished segments (Android sends each pause as its own final result) and the words still being heard.
  const committed = useRef('');
  const silence = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cb = useRef({ onText, onEnd });
  cb.current = { onText, onEnd };

  const clearSilence = () => {
    if (silence.current) clearTimeout(silence.current);
    silence.current = null;
  };
  const armSilence = () => {
    clearSilence();
    silence.current = setTimeout(() => ExpoSpeechRecognitionModule.stop(), SILENCE_MS);
  };
  useEffect(() => clearSilence, []);

  useSpeechRecognitionEvent('start', () => {
    setListening(true);
    armSilence();
  });
  useSpeechRecognitionEvent('result', (e) => {
    const text = (e.results[0]?.transcript ?? '').trim();
    let spoken: string;
    if (e.isFinal) {
      // iOS repeats the whole session in its final result; Android sends only the last segment.
      committed.current = text.startsWith(committed.current) ? text : [committed.current, text].filter(Boolean).join(' ');
      spoken = committed.current;
    } else {
      spoken = text.startsWith(committed.current) ? text : [committed.current, text].filter(Boolean).join(' ');
    }
    cb.current.onText(prefix.current + spoken);
    armSilence();
  });
  useSpeechRecognitionEvent('end', () => {
    clearSilence();
    setListening(false);
    cb.current.onEnd?.();
  });
  useSpeechRecognitionEvent('error', (e) => {
    clearSilence();
    setListening(false);
    // "no-speech" and "aborted" are normal endings, not something to show.
    if (e.error !== 'no-speech' && e.error !== 'aborted') setError(e.error);
  });

  /** `base` is what is already in the box; the spoken words are added after it. */
  const start = useCallback(async (base = '') => {
    setError(null);
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError('not-allowed');
      return;
    }
    prefix.current = base.trim() ? `${base.trim()} ` : '';
    committed.current = '';
    // Always Greek input, on the phone's own recognizer; continuous so a pause does not end it.
    ExpoSpeechRecognitionModule.start({ lang: 'el-GR', interimResults: true, continuous: true });
  }, []);
  const stop = useCallback(() => ExpoSpeechRecognitionModule.stop(), []);

  return { supported, listening, error, start, stop };
}
