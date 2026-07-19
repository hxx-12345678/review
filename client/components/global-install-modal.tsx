"use client"

import { useEffect, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { Download, X, Share, Monitor, Smartphone, MoreVertical, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export function GlobalInstallModal() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | "other">("other")
  const [browser, setBrowser] = useState<"chrome" | "edge" | "safari" | "firefox" | "samsung" | "other">("other")
  const [canInstall, setCanInstall] = useState<boolean>(false)
  const [installing, setInstalling] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Detect platform
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    const isAndroid = /Android/.test(ua)
    if (isIOS) setPlatform("ios")
    else if (isAndroid) setPlatform("android")
    else if (/Win|Mac|Linux/.test(navigator.platform)) setPlatform("desktop")

    // Detect browser
    if (/SamsungBrowser/.test(ua)) setBrowser("samsung")
    else if (/Edg\//.test(ua)) setBrowser("edge")
    else if (/Chrome/.test(ua) && /Google Inc/.test(navigator.vendor)) setBrowser("chrome")
    else if (/Safari/.test(ua) && !/Chrome/.test(ua)) setBrowser("safari")
    else if (/Firefox/.test(ua)) setBrowser("firefox")

    // Check install availability
    if (window.__deferredPrompt || (navigator as any).install) {
      setCanInstall(true)
    }

    window.__openInstallModal = () => setOpen(true)

    return () => {
      window.__openInstallModal = undefined
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    const handler = () => setOpen(true)
    window.addEventListener("beyondvyu:open-install", handler)

    return () => {
      window.removeEventListener("beyondvyu:open-install", handler)
    }
  }, [mounted])

  // Listen for install readiness even after modal is shown
  useEffect(() => {
    const onReady = () => setCanInstall(true)
    const onInstalled = () => {
      setInstalled(true)
      setInstalling(false)
      setTimeout(() => setOpen(false), 1500)
    }
    window.addEventListener("beyondvyu:install-ready", onReady)
    window.addEventListener("beforeinstallprompt", onReady)
    window.addEventListener("appinstalled", onInstalled)
    window.addEventListener("beyondvyu:app-installed", onInstalled)
    return () => {
      window.removeEventListener("beyondvyu:install-ready", onReady)
      window.removeEventListener("beforeinstallprompt", onReady)
      window.removeEventListener("appinstalled", onInstalled)
      window.removeEventListener("beyondvyu:app-installed", onInstalled)
    }
  }, [])

  const closeModal = useCallback(() => {
    setOpen(false)
    setInstalling(false)
  }, [])

  const handleInstall = useCallback(async () => {
    // Priority 1: Web Install API (Chrome/Edge 148+)
    if ((navigator as any).install) {
      setInstalling(true)
      try {
        await (navigator as any).install()
        setInstalled(true)
        setTimeout(() => closeModal(), 1500)
        return
      } catch {
        // fall through
      } finally {
        setInstalling(false)
      }
    }

    // Priority 2: beforeinstallprompt
    const prompt = window.__deferredPrompt
    if (prompt) {
      setInstalling(true)
      try {
        prompt.prompt()
        const { outcome } = await prompt.userChoice
        if (outcome === "accepted") {
          window.__deferredPrompt = null
          setInstalled(true)
          setTimeout(() => closeModal(), 1500)
        } else {
          window.__deferredPrompt = null
          setCanInstall(false)
        }
      } catch {
        // ignore
      } finally {
        setInstalling(false)
      }
    }
  }, [closeModal])

  if (!mounted || !open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={closeModal}
    >
      <div
        className={cn(
          "flex w-full flex-col bg-background shadow-2xl overflow-hidden",
          "max-h-[90vh] sm:max-w-md sm:rounded-2xl sm:border sm:border-border",
          "rounded-t-2xl border-t border-x border-border",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Download className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Install BEYONDVYU</h3>
              <p className="text-xs text-muted-foreground">Add to your home screen — works offline</p>
            </div>
          </div>
          <button onClick={closeModal} className="rounded-lg p-1.5 hover:bg-muted -mr-1" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-3">
          {installed ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-green-500/10">
                <Download className="size-7 text-green-500" />
              </div>
              <p className="font-semibold text-green-600 dark:text-green-400">App Installed! 🎉</p>
              <p className="text-sm text-muted-foreground">BEYONDVYU has been added to your device.</p>
            </div>
          ) : platform === "ios" ? (
            // iOS / iPadOS — Safari only
            <>
              <p className="text-sm text-muted-foreground">Open this page in <strong>Safari</strong> and follow these steps:</p>
              <Step icon={Share} step={1} text={<>Tap the <strong>Share</strong> button <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-xs font-mono">⎗</span> at the bottom of Safari.</>} />
              <Step icon={Plus} step={2} text={<>Scroll down and tap <strong>Add to Home Screen</strong>.</>} />
              <Step icon={Monitor} step={3} text={<>Tap <strong>Add</strong> in the top-right corner.</>} />
              <p className="text-xs text-muted-foreground text-center pt-1">
                BEYONDVYU will appear on your home screen like a native app.
              </p>
            </>
          ) : canInstall ? (
            // Chrome/Edge — native install prompt available
            <>
              <p className="text-sm text-muted-foreground">
                Click <strong>Install now</strong> to add BEYONDVYU to your {platform === "android" ? "home screen" : "desktop"}.
              </p>
              <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/10 px-4 py-3.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Smartphone className="size-[18px] text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Works offline · No app store needed · Instant access</p>
              </div>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 active:scale-[0.98] transition-all"
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
            </>
          ) : browser === "firefox" ? (
            // Firefox — no BIP support
            <>
              <p className="text-sm text-muted-foreground">Firefox doesn&apos;t support automatic installation. Use Chrome or Edge for the best experience, or follow these steps:</p>
              <Step icon={MoreVertical} step={1} text={<>Open this page in <strong>Chrome</strong> or <strong>Edge</strong>.</>} />
              <Step icon={Download} step={2} text={<>Tap the menu (⋮) and select <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</>} />
            </>
          ) : (
            // Other / Chrome not ready yet
            <>
              <p className="text-sm text-muted-foreground">To install BEYONDVYU, use one of these methods:</p>
              <Step icon={Monitor} step={1} text={<>Open this page in <strong>Chrome</strong> or <strong>Edge</strong>.</>} />
              <Step icon={MoreVertical} step={2} text={<>Tap the browser menu <span className="font-mono text-xs bg-muted rounded px-1.5 py-0.5">⋮</span> in the top-right corner.</>} />
              <Step icon={Download} step={3} text={<>Select <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</>} />
              <p className="text-xs text-muted-foreground text-center pt-1">
                Supports Chrome, Edge, Samsung Internet &amp; Opera.
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Step({ icon: Icon, step, text }: { icon: any; step: number; text: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <span className="text-sm font-bold text-primary">{step}</span>
      </div>
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <p className="text-sm leading-snug text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}


