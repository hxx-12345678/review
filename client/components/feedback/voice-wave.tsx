"use client";

import { Mic, MicOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoicePillProps {
  isListening: boolean;
  onToggle: () => void;
  language?: string;
  className?: string;
}

export function VoiceWaveIndicator({ isListening, language }: { isListening: boolean; language?: string }) {
  if (!isListening) return null;

  const label =
    language === "spanish"
      ? "Escuchando... hable con confianza"
      : language === "hindi"
      ? "सुन रहे हैं... बोलिए"
      : language === "hinglish"
      ? "Listening... speak in Hinglish or English"
      : "Listening... speak naturally in your own words";

  return (
    <div className="flex items-center justify-between rounded-lg bg-red-500/10 dark:bg-red-950/30 border border-red-500/20 px-3 py-2 text-xs text-red-600 dark:text-red-400 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full size-2.5 bg-red-500" />
        </span>
        <span className="font-medium text-[11px]">{label}</span>
      </div>

      {/* Animated Sound Wave Bars */}
      <div className="flex items-center gap-1">
        <span className="inline-block w-1 rounded-full bg-red-500 animate-[pulse_0.6s_ease-in-out_infinite] h-3" />
        <span className="inline-block w-1 rounded-full bg-red-500 animate-[pulse_0.8s_ease-in-out_infinite_0.1s] h-5" />
        <span className="inline-block w-1 rounded-full bg-red-500 animate-[pulse_0.5s_ease-in-out_infinite_0.2s] h-4" />
        <span className="inline-block w-1 rounded-full bg-red-500 animate-[pulse_0.7s_ease-in-out_infinite_0.15s] h-6" />
        <span className="inline-block w-1 rounded-full bg-red-500 animate-[pulse_0.6s_ease-in-out_infinite_0.25s] h-3" />
      </div>
    </div>
  );
}

export function VoiceButton({
  isListening,
  onToggle,
  language,
  className,
}: VoicePillProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm",
        isListening
          ? "bg-red-500 text-white ring-2 ring-red-400 ring-offset-1 animate-pulse"
          : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20",
        className
      )}
      title={isListening ? "Stop listening" : "Tap to speak your review"}
    >
      {isListening ? (
        <>
          <MicOff className="size-3.5" />
          <span>Done</span>
          <Check className="size-3" />
        </>
      ) : (
        <>
          <Mic className="size-3.5" />
          <span>
            {language === "spanish"
              ? "Dictar por voz"
              : language === "hindi"
              ? "बोलकर बताएं"
              : "Tap to Speak"}
          </span>
        </>
      )}
    </button>
  );
}
