"use client"

import { useEffect } from "react"

export function GlobalInstallCapture() {
  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      window.__installReady = true
      return
    }

    // If already captured by inline script, dispatch ready event
    if (window.__deferredPrompt) {
      window.dispatchEvent(new CustomEvent("beyondvyu:install-ready"))
    }

    const handler = (e: Event) => {
      e.preventDefault()
      window.__deferredPrompt = e as any
      window.__installReady = true
      window.dispatchEvent(new CustomEvent("beyondvyu:install-ready"))
    }

    window.addEventListener("beforeinstallprompt", handler)

    const onAppInstalled = () => {
      window.__deferredPrompt = null
      window.__installReady = true
      window.dispatchEvent(new CustomEvent("beyondvyu:app-installed"))
    }

    window.addEventListener("appinstalled", onAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      window.removeEventListener("appinstalled", onAppInstalled)
    }
  }, [])

  return null
}
