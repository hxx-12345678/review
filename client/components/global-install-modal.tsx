"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { Download, X, Share2, Monitor, Smartphone, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function GlobalInstallModal() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [canInstall, setCanInstall] = useState<boolean | null>(null)
  const [installing, setInstalling] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream)

    window.__openInstallModal = () => setOpen(true)

    return () => {
      window.__openInstallModal = undefined
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    const handler = () => setOpen(true)
    window.addEventListener("beyondvyu:open-install", handler)
    const interval = setInterval(() => {
      if (window.__showInstallModal) {
        setOpen(true)
        window.__showInstallModal = false
      }
    }, 200)

    return () => {
      window.removeEventListener("beyondvyu:open-install", handler)
      clearInterval(interval)
    }
  }, [mounted])

  const closeModal = useCallback(() => {
    setOpen(false)
    setCanInstall(null)
    setChecked(false)
    setInstalling(false)
  }, [])

  useEffect(() => {
    if (!open) return

    if (window.__deferredPrompt) {
      setCanInstall(true)
      setChecked(true)
      return
    }

    const onInstallReady = () => {
      setCanInstall(true)
      setChecked(true)
    }

    const onAppInstalled = () => {
      setCanInstall(false)
      setChecked(true)
      closeModal()
    }

    window.addEventListener("beforeinstallprompt", onInstallReady)
    window.addEventListener("beyondvyu:install-ready", onInstallReady)
    window.addEventListener("appinstalled", onAppInstalled)
    window.addEventListener("beyondvyu:app-installed", onAppInstalled)

    const timeout = setTimeout(() => {
      setChecked(true)
      setCanInstall(!!window.__deferredPrompt)
    }, 3000)

    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallReady)
      window.removeEventListener("beyondvyu:install-ready", onInstallReady)
      window.removeEventListener("appinstalled", onAppInstalled)
      window.removeEventListener("beyondvyu:app-installed", onAppInstalled)
      clearTimeout(timeout)
    }
  }, [open, closeModal])

  const handleInstall = useCallback(async () => {
    // Priority 1: Web Install API (Chrome/Edge 148+, origin trial)
    if ((navigator as any).install) {
      setInstalling(true)
      try {
        await (navigator as any).install()
        closeModal()
        return
      } catch {
        // rejected — fall through to BIP
      } finally {
        setInstalling(false)
      }
    }

    // Priority 2: beforeinstallprompt (older Chrome)
    const prompt = window.__deferredPrompt
    if (prompt) {
      setInstalling(true)
      try {
        prompt.prompt()
        const { outcome } = await prompt.userChoice
        if (outcome === "accepted") {
          window.__deferredPrompt = null
          closeModal()
        }
        window.__deferredPrompt = null
        setCanInstall(false)
      } catch {
        // fall through
      } finally {
        setInstalling(false)
      }
    }
  }, [closeModal])

  if (!mounted || !open) return null

  const isSupported = canInstall === true || !!(navigator as any).install

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 top-[56px] sm:inset-0 z-[9999] flex items-end justify-center bg-black/50 sm:items-center"
      onClick={closeModal}
    >
      <div
        className={cn(
          "flex w-full flex-col bg-background shadow-2xl",
          "max-h-[85vh] sm:max-h-auto sm:max-w-md",
          "sm:rounded-2xl sm:border sm:border-border",
          "rounded-t-2xl border border-border pb-2 sm:pb-0",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </div>
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
          <button onClick={closeModal} className="rounded-lg p-1.5 hover:bg-muted -mr-1" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          {isIOS ? (
            <div className="space-y-3">
              <Step icon={Share2} text={<>Tap the <strong>Share</strong> button <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">⎔</span> in Safari&apos;s toolbar.</>} />
              <Step icon={Monitor} text={<>Scroll down and tap <strong>Add to Home Screen</strong>.</>} />
              <Step icon={Download} text={<>Tap <strong>Add</strong> in the top right corner.</>} />
              <p className="text-xs text-muted-foreground text-center pt-1">BEYONDVYU will appear on your home screen like a native app.</p>
            </div>
          ) : !isSupported && checked ? (
            <div className="space-y-3">
              <Step icon={AlertCircle} text={<>Chrome needs a moment to verify the app. Visit this page a couple of times, then check the browser menu.</>} />
              <Step icon={Smartphone} text={<>Use <strong>Chrome</strong> or <strong>Edge</strong> on Android or desktop.</>} />
              <Step icon={Monitor} text={<>Open browser menu (three dots) and tap <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</>} />
              <p className="text-xs text-muted-foreground text-center pt-1">Need help? Try refreshing the page or coming back later.</p>
              <button
                onClick={() => {
                  if (window.__deferredPrompt) {
                    setCanInstall(true)
                    setChecked(true)
                  } else {
                    setChecked(false)
                    setCanInstall(null)
                  }
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted py-2.5 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
              >
                <span className="size-3.5" />
                Check again
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <Step icon={Smartphone} text={<>Open Chrome or Edge on your device.</>} />
              <Step icon={Monitor} text={<>Tap the browser menu (three dots) in the top-right.</>} />
              <Step icon={Download} text={<>Select <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</>} />
              <p className="text-center text-xs text-muted-foreground pt-1">For the best experience, use Chrome or Edge on Android/desktop.</p>
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
    document.body,
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
