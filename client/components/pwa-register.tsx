"use client"

import { useEffect } from "react"

export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

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
                  console.log("BEYONDVYU updated — reload for latest version")
                }
              })
            }
          })
        })
        .catch((err) => {
          console.warn("SW registration failed:", err)
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
