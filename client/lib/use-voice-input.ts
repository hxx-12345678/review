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
  // Finalized speech only. Interim text is displayed but not committed until the
  // engine marks it final. If a mobile session ends mid-phrase, onend promotes
  // the visible interim text so a restart cannot drop the guest's last words.
  const committedRef = useRef<string>(initialText.trim());
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  // Mobile browsers often end a continuous recognition session after a pause.
  // Keep the user's intent separate from the browser session so we can restart
  // without making them tap the microphone again. Each instance has a token so
  // an old aborted session cannot restart over a newer one.
  const shouldListenRef = useRef(false);
  const instanceIdRef = useRef(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announcedRef = useRef(false);

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  useEffect(() => {
    // Ignore the echo from our own transcript update. Only an external edit
    // (typing, AI rewrite, clearing) should replace the committed base text.
    if (initialText === accumulatedRef.current) return;
    accumulatedRef.current = initialText;
    committedRef.current = initialText.trim();
  }, [initialText]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRec);
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    announcedRef.current = false;
    instanceIdRef.current += 1;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
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

    shouldListenRef.current = false;
    instanceIdRef.current += 1;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    // Stop existing instance if any.
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    try {
      const recognition = new SpeechRec();
      const instanceId = instanceIdRef.current;
      recognitionRef.current = recognition;
      shouldListenRef.current = true;
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

      committedRef.current = accumulatedRef.current.trim();

      recognition.onstart = () => {
        setIsListening(true);
        setInterimText("");
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(50);
        }
        if (!announcedRef.current) {
          announcedRef.current = true;
          toast.success(
            language === "spanish"
              ? "¡Escuchando! Hable naturalmente..."
              : language === "hindi"
              ? "सुन रहे हैं... कृपया बोलें!"
              : "Listening... speak your experience naturally!"
          );
        }
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcriptPiece = res[0]?.transcript || "";
          if (res.isFinal) {
            committedRef.current = committedRef.current
              ? `${committedRef.current} ${transcriptPiece.trim()}`
              : transcriptPiece.trim();
          } else {
            interim += transcriptPiece;
          }
        }

        setInterimText(interim);
        const combined = interim
          ? committedRef.current
            ? `${committedRef.current} ${interim}`
            : interim
          : committedRef.current;
        accumulatedRef.current = combined;
        onTranscriptChangeRef.current(combined);
      };

      recognition.onerror = (event: any) => {
        if (instanceId !== instanceIdRef.current) return;
        setIsListening(false);
        setInterimText("");
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          shouldListenRef.current = false;
          announcedRef.current = false;
          toast.error("Microphone access blocked. Please allow microphone permissions in your browser.");
        } else if (event.error === "network") {
          shouldListenRef.current = false;
          announcedRef.current = false;
          toast.error("Voice input network error. Please check your internet connection.");
        } else if (event.error === "audio-capture") {
          shouldListenRef.current = false;
          announcedRef.current = false;
          toast.error("No microphone was found. Please check your device and try again.");
        } else if (event.error !== "no-speech") {
          // Speech engines emit "no-speech" for ordinary pauses. Any other
          // error is not safely retryable, so stop instead of looping.
          shouldListenRef.current = false;
          announcedRef.current = false;
          console.warn("Speech recognition error:", event.error);
        }
      };

      recognition.onend = () => {
        if (instanceId !== instanceIdRef.current) return;
        setIsListening(false);
        setInterimText("");
        // Do not drop the last visible phrase when a mobile session closes
        // before the engine marks it final. It becomes the new base text.
        committedRef.current = accumulatedRef.current.trim();
        if (!shouldListenRef.current) return;

        // The browser ended the session while the guest still wants to speak
        // (common on mobile and after a short pause). Restart the same session.
        restartTimerRef.current = setTimeout(() => {
          if (!shouldListenRef.current || instanceId !== instanceIdRef.current) return;
          try {
            recognition.start();
          } catch {
            shouldListenRef.current = false;
            setIsListening(false);
          }
        }, 250);
      };

      recognition.start();
    } catch (err) {
      console.error("Speech recognition start failed:", err);
      shouldListenRef.current = false;
      setIsListening(false);
      setInterimText("");
      toast.error("Voice input could not start. Please type your feedback below.");
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
      shouldListenRef.current = false;
      instanceIdRef.current += 1;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
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
