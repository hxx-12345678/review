"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface UseVoiceInputOptions {
  language: string;
  isUS?: boolean;
  initialText?: string;
  onTranscriptChange: (text: string) => void;
}

export function useVoiceInput({
  language,
  isUS = false,
  initialText = "",
  onTranscriptChange,
}: UseVoiceInputOptions) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const accumulatedRef = useRef<string>(initialText);
  const onTranscriptChangeRef = useRef(onTranscriptChange);

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  useEffect(() => {
    accumulatedRef.current = initialText;
  }, [initialText]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRec);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setInterimText("");
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.info("Voice input is not supported in this browser. You can type directly below.");
      return;
    }

    // Stop existing instance if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    try {
      const recognition = new SpeechRec();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;

      // Map chosen language code for speech engine
      const langMap: Record<string, string> = {
        english: isUS ? "en-US" : "en-IN",
        spanish: "es-US",
        hinglish: "hi-IN",
        gujlish: "gu-IN",
        hindi: "hi-IN",
        marathi: "mr-IN",
        gujarati: "gu-IN",
        tamil: "ta-IN",
        telugu: "te-IN",
        bengali: "bn-IN",
        kannada: "kn-IN",
      };

      recognition.lang = langMap[language] || (isUS ? "en-US" : "en-IN");

      let currentFinal = accumulatedRef.current.trim();

      recognition.onstart = () => {
        setIsListening(true);
        setInterimText("");
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(50);
        }
        toast.success(
          language === "spanish"
            ? "¡Escuchando! Hable naturalmente..."
            : language === "hindi"
            ? "सुन रहे हैं... कृपया बोलें!"
            : "Listening... speak your experience naturally!"
        );
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcriptPiece = res[0]?.transcript || "";
          if (res.isFinal) {
            currentFinal = currentFinal
              ? `${currentFinal} ${transcriptPiece.trim()}`
              : transcriptPiece.trim();
          } else {
            interim += transcriptPiece;
          }
        }

        setInterimText(interim);
        const combined = interim ? (currentFinal ? `${currentFinal} ${interim}` : interim) : currentFinal;
        accumulatedRef.current = combined;
        onTranscriptChangeRef.current(combined);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setInterimText("");
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          toast.error("Microphone access blocked. Please allow microphone permissions in your browser.");
        } else if (event.error === "network") {
          toast.error("Voice input network error. Please check your internet connection.");
        } else if (event.error !== "no-speech") {
          // ignore silent timeout
          console.warn("Speech recognition error:", event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText("");
      };

      recognition.start();
    } catch (err) {
      console.error("Speech recognition start failed:", err);
      setIsListening(false);
      setInterimText("");
    }
  }, [language, isUS]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, stopListening, startListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  return {
    isListening,
    interimText,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  };
}
