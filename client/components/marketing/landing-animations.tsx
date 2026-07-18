"use client"

import { useEffect } from "react"

export function LandingAnimations() {
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) {
      document.querySelectorAll(".reveal, .reveal-scale, .reveal-left, .reveal-right, .reveal-clip, .line-reveal").forEach((el) => el.classList.add("in-view"))
      return
    }

    // ── Scroll Reveal ──────────────────────────────────────────────
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view")
            revealObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.06, rootMargin: "0px 0px -40px 0px" }
    )

    document.querySelectorAll(".reveal, .reveal-scale, .reveal-left, .reveal-right, .reveal-clip, .line-reveal").forEach((el) => {
      revealObserver.observe(el)
    })

    requestAnimationFrame(() => {
      document.querySelectorAll(".reveal:not(.in-view), .reveal-scale:not(.in-view), .reveal-left:not(.in-view), .reveal-right:not(.in-view), .reveal-clip:not(.in-view), .line-reveal:not(.in-view)").forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add("in-view")
          revealObserver.unobserve(el)
        }
      })
    })

    // ── Animated Counter ────────────────────────────────────────────
    const counters = document.querySelectorAll<HTMLElement>(".counter-value")
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const target = parseFloat(el.dataset.target || "0")
            const suffix = el.dataset.suffix || ""
            const prefix = el.dataset.prefix || ""
            const duration = 1800
            const startTime = performance.now()

            const animate = (now: number) => {
              const elapsed = now - startTime
              const progress = Math.min(elapsed / duration, 1)
              const eased = 1 - Math.pow(1 - progress, 3)
              const current = eased * target

              if (target % 1 !== 0) {
                el.textContent = prefix + current.toFixed(1) + suffix
              } else {
                el.textContent = prefix + Math.round(current) + suffix
              }

              if (progress < 1) {
                requestAnimationFrame(animate)
              }
            }

            requestAnimationFrame(animate)
            counterObserver.unobserve(el)
          }
        })
      },
      { threshold: 0.5 }
    )

    counters.forEach((el) => counterObserver.observe(el))

    // ── 3D Tilt Cards ───────────────────────────────────────────────
    const tiltCards = document.querySelectorAll<HTMLElement>("[data-tilt]")
    const tiltHandlers: Array<{ el: HTMLElement; move: (e: MouseEvent) => void; leave: () => void }> = []

    tiltCards.forEach((card) => {
      const maxTilt = parseFloat(card.dataset.tilt || "12")
      const scale = parseFloat(card.dataset.tiltScale || "1")
      const shine = card.querySelector<HTMLElement>(".tilt-shine")

      const handleMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const rotateX = ((y - centerY) / centerY) * -maxTilt
        const rotateY = ((x - centerX) / centerX) * maxTilt

        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`

        if (shine) {
          const shineX = (x / rect.width) * 100
          const shineY = (y / rect.height) * 100
          shine.style.setProperty("--shine-x", `${shineX}%`)
          shine.style.setProperty("--shine-y", `${shineY}%`)
        }
      }

      const handleLeave = () => {
        card.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)`
        card.style.transition = "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
        setTimeout(() => {
          card.style.transition = "transform 0.15s ease-out"
        }, 500)
      }

      card.addEventListener("mousemove", handleMove)
      card.addEventListener("mouseleave", handleLeave)
      tiltHandlers.push({ el: card, move: handleMove, leave: handleLeave })
    })

    // ── Spotlight Mouse Tracking ─────────────────────────────────────
    const spotlightElements = document.querySelectorAll<HTMLElement>(".spotlight")
    const handleSpotlight = (e: MouseEvent) => {
      spotlightElements.forEach((el) => {
        const rect = el.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        el.style.setProperty("--mouse-x", `${x}%`)
        el.style.setProperty("--mouse-y", `${y}%`)
      })
    }
    document.addEventListener("mousemove", handleSpotlight, { passive: true })

    // ── Magnetic Cursor on CTAs ──────────────────────────────────────
    const magneticWraps = document.querySelectorAll<HTMLElement>(".magnetic-wrap")
    const magneticHandlers: Array<{ el: HTMLElement; move: (e: MouseEvent) => void; leave: () => void }> = []

    magneticWraps.forEach((wrap) => {
      const child = wrap.querySelector<HTMLElement>(".magnetic-child")
      if (!child) return

      const handleMove = (e: MouseEvent) => {
        const rect = wrap.getBoundingClientRect()
        const x = e.clientX - rect.left - rect.width / 2
        const y = e.clientY - rect.top - rect.height / 2
        child.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`
      }

      const handleLeave = () => {
        child.style.transform = "translate(0px, 0px)"
      }

      wrap.addEventListener("mousemove", handleMove)
      wrap.addEventListener("mouseleave", handleLeave)
      magneticHandlers.push({ el: wrap, move: handleMove, leave: handleLeave })
    })

    // ── Cleanup ──────────────────────────────────────────────────────
    return () => {
      revealObserver.disconnect()
      counterObserver.disconnect()
      tiltHandlers.forEach(({ el, move, leave }) => {
        el.removeEventListener("mousemove", move)
        el.removeEventListener("mouseleave", leave)
      })
      document.removeEventListener("mousemove", handleSpotlight)
      magneticHandlers.forEach(({ el, move, leave }) => {
        el.removeEventListener("mousemove", move)
        el.removeEventListener("mouseleave", leave)
      })
    }
  }, [])

  return null
}
