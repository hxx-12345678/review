"use client"

import { useEffect, useState, useCallback } from "react"
import { Download, MonitorSmartphone, X, Share2, Monitor, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

interface InstallPWAProps {
  variant?: "default" | "hero" | "header" | "cta"
  onInstall?: () => void
}

export function InstallPWA({ variant = "default", onInstall }: InstallPWAProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream)

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    window.addEventListener("appinstalled", () => {
      setInstalled(true)
      setDeferredPrompt(null)
    })

    setTimeout(() => setShow(true), 3000)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setInstalled(true)
        onInstall?.()
      }
      setDeferredPrompt(null)
    } else {
      setShowInstructions(true)
    }
  }, [deferredPrompt, onInstall])

  if (installed || !show) return null

  const btn = (
    <button
      onClick={handleInstall}
      className={
        variant === "hero"
          ? "magnetic-child group inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-white/20 hover:shadow-lg squishy"
          : variant === "header"
            ? cn(
                "hidden sm:inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                "border border-zinc-700 text-zinc-300 hover:bg-white/10 hover:text-white",
              )
            : variant === "cta"
              ? "magnetic-child group inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-sm font-bold text-white transition-all duration-200 hover:bg-white/15 squishy"
              : "flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      }
    >
      {variant === "header" ? <MonitorSmartphone className="size-4" /> : <Download className="size-4" />}
      {variant === "header" ? "Install" : "Download app"}
    </button>
  )

  return (
    <>
      {variant === "hero" || variant === "cta" ? <div className="magnetic-wrap">{btn}</div> : btn}

      {showInstructions && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 pb-8 sm:items-center"
          onClick={() => setShowInstructions(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Install BEYONDVYU</h3>
              <button
                onClick={() => setShowInstructions(false)}
                className="rounded-lg p-1.5 hover:bg-muted"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-4">
                <Step icon={Share2} text={<>Tap the <strong>Share</strong> button in your browser toolbar.</>} />
                <Step icon={Monitor} text={<>Scroll down and tap <strong>Add to Home Screen</strong>.</>} />
                <Step icon={Download} text={<>Tap <strong>Add</strong> in the top right to install.</>} />
              </div>
            ) : (
              <div className="space-y-4">
                <Step icon={Monitor} text={<>Open your browser menu (three dots in the top-right corner).</>} />
                <Step icon={Download} text={<>Tap <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</>} />
                <p className="text-center text-xs text-muted-foreground">
                  For the best experience, use Chrome or Edge on Android/desktop.
                </p>
              </div>
            )}

            {deferredPrompt && (
              <button
                onClick={handleInstall}
                className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90"
              >
                Install now
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function Step({ icon: Icon, text }: { icon: any; text: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="size-5 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}
