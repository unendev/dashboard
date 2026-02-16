"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

export function useTTS() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioUnlockedRef = useRef(false);

  const clearAudioRef = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  const unlockAudioPlayback = useCallback(async () => {
    if (audioUnlockedRef.current || typeof window === 'undefined') {
      return;
    }

    const primer = new Audio();
    primer.muted = true;
    primer.setAttribute('playsinline', 'true');
    // 极短静音音频：用于在 iOS/移动端点击链路中解锁后续播放权限
    primer.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';

    try {
      await primer.play();
      primer.pause();
      audioUnlockedRef.current = true;
    } catch {
      // 解锁失败不阻断主流程，后续仍会尝试正常播放并走回退
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    const loadVoices = () => {
      const vs = window.speechSynthesis.getVoices();
      setVoices(vs);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
      clearAudioRef();
    };
  }, [clearAudioRef]);

  const speakByWebSpeech = useCallback((text: string, lang: string = 'ru-RU') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      throw new Error('浏览器不支持语音合成。');
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    const normalizedLang = lang.toLowerCase().startsWith('ru') ? 'ru-RU' : lang;

    const voice = voices.find(v => v.lang.startsWith(normalizedLang)) ||
      voices.find(v => v.lang.includes(normalizedLang));

    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = normalizedLang;
    utterance.rate = 0.9;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [voices]);

  const speak = useCallback(async (text: string, lang: string = 'ru-RU') => {
    const normalizedText = text?.trim();
    if (!normalizedText) {
      return false;
    }

    setLastError(null);
    setSpeaking(true);

    clearAudioRef();

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    await unlockAudioPlayback();

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: normalizedText, lang }),
      });

      if (!response.ok) {
        throw new Error(`ServerTTS:${response.status}`);
      }

      const audioBlob = await response.blob();
      const objectUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio();
      audioRef.current = audio;
      audioUrlRef.current = objectUrl;
      audio.src = objectUrl;
      audio.preload = 'auto';
      audio.setAttribute('playsinline', 'true');

      audio.onended = () => {
        clearAudioRef();
        setSpeaking(false);
      };

      audio.onerror = () => {
        clearAudioRef();
        setSpeaking(false);
      };

      await audio.play();
      return true;
    } catch (serverError) {
      try {
        speakByWebSpeech(normalizedText, lang);
        return true;
      } catch (fallbackError) {
        const message = '语音播放失败：服务端TTS与浏览器语音均不可用，请检查设备音量或网络后重试。';
        setLastError(message);
        setSpeaking(false);
        console.error('TTS failed', { serverError, fallbackError });

        if (typeof window !== 'undefined') {
          window.alert(message);
        }

        return false;
      }
    }
  }, [clearAudioRef, speakByWebSpeech, unlockAudioPlayback]);

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    clearAudioRef();

    setSpeaking(false);
  }, [clearAudioRef]);

  return { speak, cancel, speaking, voices, lastError };
}
