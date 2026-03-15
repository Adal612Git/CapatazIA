"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface TtsPlayButtonProps {
  text: string;
  label?: string;
  preferredVoiceNames?: string[];
}

function pickSpanishVoice(voices: SpeechSynthesisVoice[], preferredVoiceNames: string[]) {
  const normalizedPreferences = preferredVoiceNames.map((name) => name.toLowerCase());

  const preferredVoice =
    voices.find((voice) => normalizedPreferences.some((name) => voice.name.toLowerCase().includes(name))) ?? null;
  if (preferredVoice) {
    return preferredVoice;
  }

  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith("es-mx")) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("es")) ??
    voices[0] ??
    null
  );
}

export function TtsPlayButton({ text, label = "Reproducir audio", preferredVoiceNames = [] }: TtsPlayButtonProps) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function stopPlayback() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
  }

  function togglePlayback() {
    if (!supported || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    if (speaking) {
      stopPlayback();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickSpanishVoice(window.speechSynthesis.getVoices(), preferredVoiceNames);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = "es-MX";
    }

    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => {
      utteranceRef.current = null;
      setSpeaking(false);
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setSpeaking(false);
    };

    utteranceRef.current = utterance;
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  if (!supported) {
    return null;
  }

  return (
    <button
      className={`tts-button ${speaking ? "tts-button-active" : ""}`}
      type="button"
      onClick={togglePlayback}
      aria-label={label}
      title={label}
    >
      {speaking ? <Pause size={14} /> : <Play size={14} />}
      <span>{speaking ? "Pausa" : "Play"}</span>
    </button>
  );
}
