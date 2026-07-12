"use client"

import { useEffect, useState, useMemo, useRef } from "react"

interface BrandingConfig {
  name: string
  logoUrl?: string | null
  primaryColor?: string | null
  backgroundColor?: string | null
  splashTagline?: string | null
  showPoweredBy?: boolean | null
}

function getContrastTextColor(hex: string): string {
  const h = hex.replace("#", "")
  if (h.length !== 3 && h.length !== 6) return "#ffffff"
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
  const r = parseInt(full.substring(0, 2), 16)
  const g = parseInt(full.substring(2, 4), 16)
  const b = parseInt(full.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff"
}

export function BrandedLoading({
  business,
  onReady,
  minDuration = 1500,
}: {
  business: BrandingConfig
  onReady: () => void
  minDuration?: number
}) {
  const [phase, setPhase] = useState<"entering" | "visible" | "exiting">("entering")
  const [contentReady, setContentReady] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  const bgColor = business.backgroundColor || "#ffffff"
  const accentColor = business.primaryColor || "#1c3a35"
  const textColor = useMemo(() => getContrastTextColor(bgColor), [bgColor])
  const isDarkBg = textColor === "#ffffff"

  const showLogo = business.logoUrl && !imageFailed

  // Preload logo image
  useEffect(() => {
    if (!business.logoUrl) {
      setContentReady(true)
      return
    }
    const img = new Image()
    img.onload = () => setContentReady(true)
    img.onerror = () => {
      setImageFailed(true)
      setContentReady(true)
    }
    img.src = business.logoUrl
  }, [business.logoUrl])

  // Store onReady in ref to avoid re-triggering exit timer on parent re-render
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  // Phase 1: Enter animation (200ms - Material Design standard for elements entering)
  useEffect(() => {
    const t = setTimeout(() => setPhase("visible"), 200)
    return () => clearTimeout(t)
  }, [])

  // Phase 2: Dismiss after minDuration + content ready
  useEffect(() => {
    if (!contentReady || phase !== "visible") return
    const timer = setTimeout(() => {
      setPhase("exiting")
    }, minDuration)
    return () => clearTimeout(timer)
  }, [contentReady, minDuration, phase])

  // Phase 3: After exit animation (200ms), call onReady
  useEffect(() => {
    if (phase !== "exiting") return
    const timer = setTimeout(() => {
      onReadyRef.current()
    }, 200)
    return () => clearTimeout(timer)
  }, [phase])

  const isEntering = phase === "entering"
  const isExiting = phase === "exiting"

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        backgroundColor: bgColor,
        // Use dvh for mobile viewport that adapts to Safari toolbar
        height: "100dvh",
        opacity: isExiting ? 0 : 1,
        // Standard ease-out for exit, deceleration curve for enter
        transition: "opacity 200ms cubic-bezier(0.0, 0, 0.2, 1)",
      }}
    >
      {/* Logo area — 30-40% of viewport width per Android/iOS splash guidelines */}
      <div className="flex flex-1 items-center justify-center px-[8vw]">
        <div className="flex flex-col items-center gap-5">
          {showLogo ? (
            <img
              src={business.logoUrl || undefined}
              alt={`${business.name} logo`}
              className="w-auto object-contain"
              style={{
                maxHeight: "min(35vh, 180px)",
                maxWidth: "min(40vw, 220px)",
                filter: isDarkBg
                  ? "drop-shadow(0 2px 8px rgba(0,0,0,0.2))"
                  : "drop-shadow(0 2px 8px rgba(0,0,0,0.08))",
                opacity: isEntering ? 0 : 1,
                transform: isEntering ? "scale(0.96)" : "scale(1)",
                transition: "opacity 200ms cubic-bezier(0.0, 0, 0.2, 1), transform 200ms cubic-bezier(0.0, 0, 0.2, 1)",
              }}
            />
          ) : (
            /* Fallback: initials circle — responsive to viewport */
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: "min(30vw, 150px)",
                height: "min(30vw, 150px)",
                backgroundColor: isDarkBg ? "rgba(255,255,255,0.12)" : `${accentColor}15`,
                border: `2px solid ${isDarkBg ? "rgba(255,255,255,0.2)" : `${accentColor}30`}`,
                opacity: isEntering ? 0 : 1,
                transform: isEntering ? "scale(0.96)" : "scale(1)",
                transition: "opacity 200ms cubic-bezier(0.0, 0, 0.2, 1), transform 200ms cubic-bezier(0.0, 0, 0.2, 1)",
              }}
            >
              <span
                className="font-bold tracking-tight"
                style={{
                  color: textColor,
                  fontSize: "min(8vw, 2.5rem)",
                }}
              >
                {business.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            </div>
          )}

          {/* Tagline — optional, below logo */}
          {business.splashTagline && (
            <p
              className="font-medium tracking-wide text-center"
              style={{
                color: textColor,
                opacity: isEntering ? 0 : 0.6,
                fontSize: "clamp(0.7rem, 2.5vw, 0.875rem)",
                transition: "opacity 200ms cubic-bezier(0.0, 0, 0.2, 1) 100ms",
              }}
            >
              {business.splashTagline}
            </p>
          )}
        </div>
      </div>

      {/* Loading dots — slightly larger for visibility */}
      <div className="flex items-center gap-2 pb-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="loading-dot rounded-full"
            style={{
              width: "7px",
              height: "7px",
              backgroundColor: isDarkBg ? "rgba(255,255,255,0.45)" : `${accentColor}70`,
              animation: `loadingDot 1.2s ease-in-out ${i * 200}ms infinite`,
            }}
          />
        ))}
      </div>

      {/* "Powered by BEYONDVYU" — bottom center, respects iPhone safe area */}
      {business.showPoweredBy !== false && (
        <div
          className="absolute left-1/2 flex items-center gap-1.5 px-3 py-1.5"
          style={{
            // Respect iPhone home indicator safe area
            bottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
            transform: "translateX(-50%)",
            borderRadius: "9999px",
            backgroundColor: isDarkBg ? "rgba(255,255,255,0.08)" : `${accentColor}10`,
          }}
        >
          <span
            className="font-medium tracking-wide"
            style={{
              color: textColor,
              opacity: 0.6,
              fontSize: "0.65rem",
            }}
          >
            powered by
          </span>
          <span
            className="font-bold tracking-tight"
            style={{
              color: textColor,
              opacity: 0.75,
              fontSize: "0.7rem",
            }}
          >
            BEYONDVYU
          </span>
        </div>
      )}
    </div>
  )
}
