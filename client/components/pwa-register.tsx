"use client"

import { useEffect } from "react"

export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    if (process.env.NODE_ENV !== "production" && !isLocalhost) return

    let retries = 0
    const maxRetries = 3

    function register() {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => {
          reg.addEventListener("updatefound", () => {
            const installing = reg.installing
            if (installing) {
              installing.addEventListener("statechange", () => {
                if (installing.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("BEYONDVYU PWA: updated — reload for latest version")
                }
              })
            }
          })

          if (reg.active) {
            console.log("BEYONDVYU PWA: service worker active")
          }
        })
        .catch((err) => {
          console.warn("BEYONDVYU PWA: SW registration failed:", err)
          if (retries < maxRetries) {
            retries++
            setTimeout(register, 5000)
          }
        })
    }

    register()
  }, [])

  return null
}
