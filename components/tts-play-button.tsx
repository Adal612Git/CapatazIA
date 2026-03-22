"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface TtsPlayButtonProps {
  text: string;
  label?: string;
  userId?: string;
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

export function TtsPlayButton({ text, label = "Reproducir audio", userId, preferredVoiceNames = [] }: TtsPlayButtonProps) {
  const supported = typeof window !== "undefined";
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cachedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (cachedUrlRef.current) {
        URL.revokeObjectURL(cachedUrlRef.current);
      }
      audioRef.current?.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function stopPlayback() {
    if (typeof window === "undefined") {
      return;
    }

    audioRef.current?.pause();
    audioRef.current = null;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setSpeaking(false);
  }

  async function tryPlayAzureAudio() {
    if (typeof window === "undefined") {
      return false;
    }

    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        userId,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const blob = await response.blob();
    if (cachedUrlRef.current) {
      URL.revokeObjectURL(cachedUrlRef.current);
    }
    const url = URL.createObjectURL(blob);
    cachedUrlRef.current = url;

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => {
      audioRef.current = null;
      setSpeaking(false);
    };
    audio.onerror = () => {
      audioRef.current = null;
      setSpeaking(false);
    };
    await audio.play();
    return true;
  }

  async function togglePlayback() {
    if (!supported || typeof window === "undefined") {
      return;
    }

    if (speaking) {
      stopPlayback();
      return;
    }

    setSpeaking(true);

    try {
      const azurePlayed = await tryPlayAzureAudio();
      if (azurePlayed) {
        return;
      }
    } catch {
      // Fallback to browser speech synthesis below.
    }

    if (!("speechSynthesis" in window)) {
      setSpeaking(false);
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
