import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useRef, useState } from 'react';

/**
 * Voice input for the assistant. The phone's own speech recognizer (iOS Speech, Android's recognition service,
 * the browser's Web Speech API on the web build) turns speech into text. RecycleIQ never receives the audio.
 *
 * `onText` gets the running transcript while the person speaks, `onFinal` the finished sentence once they stop.
 */
export function useDictation({ lang, onText, onFinal }: { lang: 'el' | 'en'; onText: (text: string) => void; onFinal: (text: string) => void }) {
  const [supported] = useState(() => {
    try {
      return ExpoSpeechRecognitionModule.isRecognitionAvailable();
    } catch {
      return false;
    }
  });
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const last = useRef('');
  const cb = useRef({ onText, onFinal });
  cb.current = { onText, onFinal };

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results[0]?.transcript ?? '';
    last.current = text;
    cb.current.onText(text);
  });
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    const text = last.current.trim();
    last.current = '';
    if (text) cb.current.onFinal(text);
  });
  useSpeechRecognitionEvent('error', (e) => {
    setListening(false);
    last.current = '';
    // "no-speech" and "aborted" are normal endings, not something to show.
    if (e.error !== 'no-speech' && e.error !== 'aborted') setError(e.error);
  });

  const start = useCallback(async () => {
    setError(null);
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError('not-allowed');
      return;
    }
    last.current = '';
    ExpoSpeechRecognitionModule.start({ lang: lang === 'el' ? 'el-GR' : 'en-US', interimResults: true, continuous: false });
  }, [lang]);
  const stop = useCallback(() => ExpoSpeechRecognitionModule.stop(), []);

  return { supported, listening, error, start, stop };
}
