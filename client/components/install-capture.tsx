"use client"

import { useEffect } from "react"

export function GlobalInstallCapture() {
  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      window.__installReady = true
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      window.__deferredPrompt = e as any
      window.__installReady = true
    }

    window.addEventListener("beforeinstallprompt", handler)

    window.addEventListener("appinstalled", () => {
      window.__deferredPrompt = null
      window.__installReady = true
    })

    const timeout = setTimeout(() => {
      if (window.__installReady === undefined) {
        window.__installReady = false
      }
    }, 5000)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      clearTimeout(timeout)
    }
  }, [])

  return null
}
