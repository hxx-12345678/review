"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Download, MonitorSmartphone } from "lucide-react"
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
  const [canInstall, setCanInstall] = useState<boolean | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
    if (standalone || (window.navigator as any).standalone === true) {
      setInstalled(true)
      return
    }

    const check = () => {
      if (window.__deferredPrompt) {
        setCanInstall(true)
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        return true
      }
      if (window.__installReady === false) {
        setCanInstall(false)
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        return true
      }
      return false
    }

    if (check()) return

    pollRef.current = setInterval(check, 300)

    const timeout = setTimeout(() => {
      setCanInstall(!!window.__deferredPrompt)
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }, 8000)

    const onAppInstalled = () => { setInstalled(true); setCanInstall(false) }
    window.addEventListener("appinstalled", onAppInstalled)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      clearTimeout(timeout)
      window.removeEventListener("appinstalled", onAppInstalled)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    // Priority 1: Web Install API (Chrome/Edge 148+, origin trial)
    if (navigator.install) {
      setInstalling(true)
      try {
        await navigator.install()
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
        showInstallModal()
        onOpenChange?.(true)
      } finally {
        setInstalling(false)
      }
      return
    }

    // Priority 3: Show install instructions modal
    showInstallModal()
    onOpenChange?.(true)
  }, [onInstall, onOpenChange])

  if (installed) return null

  const isSupported = canInstall === true || !!navigator.install

  const btnContent = (
    <>
      {variant === "header" ? <MonitorSmartphone className="size-4" /> : <Download className="size-4" />}
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
                    isSupported ? "bg-primary hover:bg-primary/90" : "bg-white/10 border border-white/20 hover:bg-white/15",
                  )
                : "flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      }
    >
      {btnContent}
    </button>
  )

  return variant === "hero" || variant === "cta" ? <div className="magnetic-wrap">{btn}</div> : btn
}
