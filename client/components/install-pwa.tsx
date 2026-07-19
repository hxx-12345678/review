"use client"

import { useEffect, useState, useCallback } from "react"
import { Download, MonitorSmartphone, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    __deferredPrompt?: any
    __installReady?: boolean | null
    __showInstallModal?: boolean
    __openInstallModal?: () => void
  }
  interface Navigator {
    install?: (url?: string) => Promise<void>
  }
}

function showInstallModal() {
  window.__showInstallModal = true
  window.dispatchEvent(new CustomEvent("beyondvyu:open-install"))
  window.__openInstallModal?.()
}

interface InstallPWAProps {
  variant?: "default" | "hero" | "header" | "cta" | "mobile-menu"
  onInstall?: () => void
  onOpenChange?: (open: boolean) => void
}

export function InstallPWA({ variant = "default", onInstall, onOpenChange }: InstallPWAProps) {
  const [installed, setInstalled] = useState(false)
  const [installing, setInstalling] = useState(false)
  // null = still detecting, true = can install natively, false = use manual instructions
  const [canInstall, setCanInstall] = useState<boolean | null>(null)
  
  useEffect(() => {
    // Already in standalone / installed as PWA
    const standalone = window.matchMedia("(display-mode: standalone)").matches
    if (standalone || (window.navigator as any).standalone === true) {
      setInstalled(true)
      return
    }

    // Check if already captured before React mounted
    if (window.__deferredPrompt) {
      setCanInstall(true)
      return
    }

    // Also check navigator.install (Chrome 148+ origin trial)
    if ((navigator as any).install) {
      setCanInstall(true)
      return
    }

    const onInstallReady = () => {
      setCanInstall(true)
    }

    const onAppInstalled = () => {
      setInstalled(true)
      setCanInstall(false)
    }

    window.addEventListener("beforeinstallprompt", onInstallReady)
    window.addEventListener("beyondvyu:install-ready", onInstallReady)
    window.addEventListener("appinstalled", onAppInstalled)
    window.addEventListener("beyondvyu:app-installed", onAppInstalled)

    // After 5s, if still null, mark as not natively installable
    // (will show modal with manual instructions instead)
    const timeout = setTimeout(() => {
      setCanInstall((prev) => (prev === null ? false : prev))
    }, 5000)

    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallReady)
      window.removeEventListener("beyondvyu:install-ready", onInstallReady)
      window.removeEventListener("appinstalled", onAppInstalled)
      window.removeEventListener("beyondvyu:app-installed", onAppInstalled)
      clearTimeout(timeout)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    // Priority 1: Web Install API (Chrome/Edge 148+, origin trial)
    if ((navigator as any).install) {
      setInstalling(true)
      try {
        await (navigator as any).install()
        setInstalled(true)
        onInstall?.()
        return
      } catch {
        // navigator.install() rejected — fall through to BIP
      } finally {
        setInstalling(false)
      }
    }

    // Priority 2: beforeinstallprompt (older Chrome/Edge)
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
        // Fall through to modal
        showInstallModal()
        onOpenChange?.(true)
      } finally {
        setInstalling(false)
      }
      return
    }

    // Priority 3: Show install instructions modal (iOS, Firefox, etc.)
    showInstallModal()
    onOpenChange?.(true)
  }, [onInstall, onOpenChange])

  if (installed) return null

  // Determine icon and label
  const Icon = variant === "header" ? MonitorSmartphone : variant === "mobile-menu" ? Smartphone : Download
  const label = variant === "header" ? "Install app" : "Download app"

  const btnContent = (
    <>
      <Icon className="size-4" />
      {installing ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Installing...
        </span>
      ) : (
        label
      )}
    </>
  )

  const btn = (
    <button
      onClick={handleInstall}
      disabled={installing}
      aria-label={label}
      className={
        variant === "hero"
          ? "magnetic-child group inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-white/20 hover:shadow-lg squishy disabled:opacity-50"
          : variant === "header"
            ? cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                "border border-zinc-700 text-zinc-300 hover:bg-white/10 hover:text-white",
              )
            : variant === "cta"
              ? "magnetic-child group inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-sm font-bold text-white transition-all duration-200 hover:bg-white/15 squishy disabled:opacity-50"
              : variant === "mobile-menu"
                ? cn(
                    "flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all duration-200",
                    canInstall === true ? "bg-primary hover:bg-primary/90" : "bg-white/10 border border-white/20 hover:bg-white/15",
                  )
                : "flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      }
    >
      {btnContent}
    </button>
  )

  return variant === "hero" || variant === "cta" ? <div className="magnetic-wrap">{btn}</div> : btn
}
