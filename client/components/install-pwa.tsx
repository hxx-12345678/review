"use client"

import { useEffect, useState, useCallback } from "react"
import { Download, MonitorSmartphone } from "lucide-react"
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

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", handler)

    window.addEventListener("appinstalled", () => {
      setInstalled(true)
      setDeferredPrompt(null)
    })

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setInstalled(true)
      onInstall?.()
    }
    setDeferredPrompt(null)
  }, [deferredPrompt, onInstall])

  if (installed || !deferredPrompt) return null

  if (variant === "hero") {
    return (
      <button
        onClick={handleInstall}
        className="group magnetic-child inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-white/20 hover:shadow-lg squishy"
      >
        <Download className="size-4 transition-transform group-hover:-translate-y-0.5" />
        Download app
      </button>
    )
  }

  if (variant === "header") {
    return (
      <button
        onClick={handleInstall}
        className={cn(
          "hidden sm:inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
          "border border-zinc-700 text-zinc-300 hover:bg-white/10 hover:text-white",
        )}
      >
        <MonitorSmartphone className="size-4" />
        Install
      </button>
    )
  }

  if (variant === "cta") {
    return (
      <div className="magnetic-wrap">
        <button
          onClick={handleInstall}
          className="magnetic-child group inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-sm font-bold text-white transition-all duration-200 hover:bg-white/15 squishy"
        >
          <Download className="size-4" />
          Download app
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleInstall}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <Download className="size-4" />
      Download app
    </button>
  )
}
