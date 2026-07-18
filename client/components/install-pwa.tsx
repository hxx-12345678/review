"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { Download, MonitorSmartphone, X, Share2, Monitor, Smartphone, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    __deferredPrompt?: any
    __installReady?: boolean | null
  }
}

interface InstallPWAProps {
  variant?: "default" | "hero" | "header" | "cta" | "mobile-menu"
  onInstall?: () => void
  onOpenChange?: (open: boolean) => void
}

export function InstallPWA({ variant = "default", onInstall, onOpenChange }: InstallPWAProps) {
  const [installed, setInstalled] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [canInstall, setCanInstall] = useState<boolean | null>(null)
  const [installing, setInstalling] = useState(false)
  const [checked, setChecked] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
    if (standalone || (window.navigator as any).standalone === true) {
      setInstalled(true)
      setChecked(true)
      return
    }

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream)

    const checkPrompt = () => {
      if (window.__deferredPrompt) {
        setCanInstall(true)
        setChecked(true)
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
        return true
      }
      if (window.__installReady === false) {
        setCanInstall(false)
        setChecked(true)
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
        return true
      }
      return false
    }

    if (checkPrompt()) return

    pollRef.current = setInterval(checkPrompt, 300)

    const timeout = setTimeout(() => {
      setChecked(true)
      setCanInstall(!!window.__deferredPrompt)
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }, 8000)

    const appinstalledHandler = () => {
      setInstalled(true)
      setCanInstall(false)
    }
    window.addEventListener("appinstalled", appinstalledHandler)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      clearTimeout(timeout)
      window.removeEventListener("appinstalled", appinstalledHandler)
    }
  }, [])

  const openModal = useCallback(() => {
    setShowInstructions(true)
    onOpenChange?.(true)
  }, [onOpenChange])

  const closeModal = useCallback(() => {
    setShowInstructions(false)
    onOpenChange?.(false)
  }, [onOpenChange])

  const handleInstall = useCallback(async () => {
    const prompt = window.__deferredPrompt
    if (prompt) {
      setInstalling(true)
      try {
        prompt.prompt()
        const { outcome } = await prompt.userChoice
        if (outcome === "accepted") {
          setInstalled(true)
          onInstall?.()
        }
        window.__deferredPrompt = null
        setCanInstall(false)
      } catch {
        openModal()
      } finally {
        setInstalling(false)
      }
    } else if (isIOS) {
      openModal()
    } else {
      openModal()
    }
  }, [isIOS, onInstall, openModal])

  if (installed) return null

  const isSupported = canInstall === true

  const btnContent = (
    <>
      {variant === "header" ? (
        <MonitorSmartphone className="size-4" />
      ) : variant === "mobile-menu" ? (
        <Download className="size-4 text-white" />
      ) : (
        <Download className="size-4" />
      )}
      {installing ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Installing...
        </span>
      ) : variant === "header" ? (
        "Install app"
      ) : (
        "Download app"
      )}
    </>
  )

  const btn = (
    <button
      onClick={handleInstall}
      disabled={installing}
      className={
        variant === "hero"
          ? "magnetic-child group inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-white/20 hover:shadow-lg squishy disabled:opacity-50"
          : variant === "header"
            ? cn(
                "items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                "border border-zinc-700 text-zinc-300 hover:bg-white/10 hover:text-white",
                isSupported ? "inline-flex" : "hidden sm:inline-flex",
              )
            : variant === "cta"
              ? "magnetic-child group inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-sm font-bold text-white transition-all duration-200 hover:bg-white/15 squishy disabled:opacity-50"
              : variant === "mobile-menu"
                ? cn(
                    "flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all duration-200",
                    isSupported
                      ? "bg-primary hover:bg-primary/90"
                      : "bg-white/10 border border-white/20 hover:bg-white/15",
                  )
                : "flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      }
    >
      {btnContent}
    </button>
  )

  return (
    <>
      {variant === "hero" || variant === "cta" ? <div className="magnetic-wrap">{btn}</div> : btn}

      {showInstructions && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-x-0 bottom-0 top-[56px] sm:inset-0 z-[9999] flex items-end justify-center bg-black/50 sm:items-center"
          onClick={closeModal}
        >
          <div
            className={cn(
              "flex w-full flex-col bg-background shadow-2xl",
              "max-h-[85vh] sm:max-h-auto sm:max-w-md",
              "sm:rounded-2xl sm:border sm:border-border",
              "rounded-t-2xl border border-border",
              "pb-2 sm:pb-0",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle for mobile */}
            <div className="flex justify-center pt-2 pb-1 sm:hidden">
              <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                  <Download className="size-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Install BEYONDVYU</h3>
                  <p className="text-xs text-muted-foreground">Add to your home screen</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 hover:bg-muted -mr-1"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto px-5 py-4">
              {isIOS ? (
                <div className="space-y-3">
                  <Step
                    icon={Share2}
                    text={<>Tap the <strong>Share</strong> button <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">⎔</span> in Safari&apos;s toolbar.</>}
                  />
                  <Step icon={Monitor} text={<>Scroll down and tap <strong>Add to Home Screen</strong>.</>} />
                  <Step icon={Download} text={<>Tap <strong>Add</strong> in the top right corner.</>} />
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    BEYONDVYU will appear on your home screen like a native app.
                  </p>
                </div>
              ) : !isSupported && checked ? (
                <div className="space-y-3">
                  <Step
                    icon={AlertCircle}
                    text={<>Automatic install not available on this browser.</>}
                  />
                  <Step icon={Smartphone} text={<>Open Chrome or Edge on Android/Desktop.</>} />
                  <Step icon={Monitor} text={<>Open browser menu (three dots) and tap <strong>Install app</strong>.</>} />
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    Make sure you are connected to the internet and try again.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Step icon={Smartphone} text={<>Open Chrome or Edge on your device.</>} />
                  <Step icon={Monitor} text={<>Tap the browser menu (three dots) in the top-right.</>} />
                  <Step icon={Download} text={<>Select <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</>} />
                  <p className="text-center text-xs text-muted-foreground pt-1">
                    For the best experience, use Chrome or Edge on Android/desktop.
                  </p>
                </div>
              )}

              {isSupported && (
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98] transition-all"
                >
                  {installing ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Installing...
                    </>
                  ) : (
                    <>
                      <Download className="size-4" />
                      Install now
                    </>
                  )}
                </button>
              )}

              {!isSupported && checked && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Available on Chrome, Edge, Samsung Internet</span>
                </div>
              )}

              {!checked && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                  Checking install availability...
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function Step({ icon: Icon, text }: { icon: any; text: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="size-[18px] text-primary" />
      </div>
      <p className="text-sm leading-snug text-muted-foreground">{text}</p>
    </div>
  )
}
