import { useEffect, useState } from 'react';
import type { ContentLanguage } from '../../core/language/detectContentLanguage';
import { listVoices, onVoicesChanged, type VoiceOption } from '../../services/speech/tts';

/** This device's voices for one content language; updates when the list arrives late. */
export function useVoices(lang: ContentLanguage): VoiceOption[] {
  const [voices, setVoices] = useState(() => listVoices(lang));
  useEffect(() => {
    setVoices(listVoices(lang));
    return onVoicesChanged(() => setVoices(listVoices(lang)));
  }, [lang]);
  return voices;
}
