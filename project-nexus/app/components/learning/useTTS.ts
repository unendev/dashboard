"use client";

import { useCallback, useEffect, useState } from 'react';

export function useTTS() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const vs = window.speechSynthesis.getVoices();
      setVoices(vs);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback((text: string, lang: string = 'ru-RU') => {
    window.speechSynthesis.cancel(); // Stop current speech

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a specific voice for the language
    const voice = voices.find(v => v.lang.startsWith(lang)) || 
                  voices.find(v => v.lang.includes(lang));
    
    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = lang;
    utterance.rate = 0.9; // Slightly slower for learning

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [voices]);

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { speak, cancel, speaking, voices };
}
