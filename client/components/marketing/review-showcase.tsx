"use client"

import { useEffect, useRef } from "react"
import {
  CheckCircle2,
  Languages,
  MessageSquareText,
  QrCode,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react"

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 34.6 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.5 5.5C37.1 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  )
}

function Stars({
  className = "size-3.5",
  filled = true,
}: {
  className?: string
  filled?: boolean
}) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label="Star rating control preview">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={`${className} ${filled ? "fill-amber-400 text-amber-400" : "fill-transparent text-amber-400"}`}
          strokeWidth={filled ? 0 : 1.8}
        />
      ))}
    </div>
  )
}

export function ReviewShowcase() {
  const sceneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    const card = scene.querySelector<HTMLElement>("[data-review-card]")
    if (!card) return

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (!finePointer.matches || reducedMotion.matches) return

    let frame = 0
    let lastX = 50
    let lastY = 50

    const handleMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return

      const rect = scene.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      const px = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
      const py = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
      lastX = px * 100
      lastY = py * 100

      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // Stay inside a small envelope: a premium card should feel alive,
        // not like it is being thrown around the page.
        card.style.setProperty("--rv-rx", `${((0.5 - py) * 10).toFixed(2)}deg`)
        card.style.setProperty("--rv-ry", `${((px - 0.5) * 14).toFixed(2)}deg`)
        card.style.setProperty("--rv-mx", `${lastX.toFixed(1)}%`)
        card.style.setProperty("--rv-my", `${lastY.toFixed(1)}%`)
        card.style.setProperty("--rv-glare", "1")
        card.classList.add("is-live")
      })
    }

    const handleLeave = () => {
      cancelAnimationFrame(frame)
      card.classList.remove("is-live")
      card.style.setProperty("--rv-rx", "0deg")
      card.style.setProperty("--rv-ry", "0deg")
      card.style.setProperty("--rv-mx", "50%")
      card.style.setProperty("--rv-my", "30%")
      card.style.setProperty("--rv-glare", "0")
    }

    scene.addEventListener("pointermove", handleMove)
    scene.addEventListener("pointerleave", handleLeave)

    return () => {
      cancelAnimationFrame(frame)
      scene.removeEventListener("pointermove", handleMove)
      scene.removeEventListener("pointerleave", handleLeave)
    }
  }, [])

  return (
    <div ref={sceneRef} className="rv-scene">
      <div className="rv-glow" aria-hidden="true" />
      <div className="rv-orbit rv-orbit--one" aria-hidden="true" />
      <div className="rv-orbit rv-orbit--two" aria-hidden="true" />

      <div className="rv-enter">
        <div className="rv-float">
          <div className="rv-sway">
            <div className="rv-stack rv-stack--one" aria-hidden="true" />
            <div className="rv-stack rv-stack--two" aria-hidden="true" />
            <article
            className="rv-card"
            data-review-card
            aria-label="Product preview of the guest review experience"
          >
            <div className="rv-surface" aria-hidden="true">
              <div className="rv-glare" />
              <div className="rv-sheen" />
            </div>

            <div className="rv-body">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-900/5">
                    <GoogleG className="size-5" />
                  </span>
                  <div>
                    <p className="text-[13px] font-bold tracking-tight text-slate-900">Google Review</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Product preview
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-teal-200/80 bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700">
                  <ShieldCheck className="size-3" />
                  Customer-owned
                </span>
              </div>

              <div className="mt-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  The guest rates the visit
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars className="size-4" filled={false} />
                  <span className="text-[10px] font-medium text-slate-400">
                    Any rating · same path
                  </span>
                </div>
              </div>

              <div className="my-4 h-px bg-gradient-to-r from-slate-200 via-slate-200 to-transparent" />

              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm ring-2 ring-white">
                  <UserRound className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-tight text-slate-900">Your guest&apos;s own words</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    No templates. No scripts. They edit and post it themselves.
                  </p>

                  <div className="mt-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-3">
                    <p className="text-[12px] leading-relaxed text-slate-500">
                      &ldquo;The review appears here — written by the customer, in the language they chose.&rdquo;
                    </p>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {["English", "हिंदी", "ગુજરાતી", "Hinglish"].map((language) => (
                      <span
                        key={language}
                        className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-500"
                      >
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                  <MessageSquareText className="size-3" />
                  Owner reply
                  <span className="font-medium normal-case tracking-normal text-emerald-700/50">optional</span>
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-emerald-900/70">
                  Respond publicly, or fix the issue privately first — your choice.
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-900/5">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                  <ShieldCheck className="size-3.5 text-teal-600" />
                  Same path for every guest
                </span>
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 ring-1 ring-slate-900/5">
                  No gating
                </span>
              </div>
            </div>

            <div className="rv-chip rv-chip--qr" aria-hidden="true">
              <span className="rv-chip-icon">
                <QrCode className="size-3.5" />
              </span>
              <span>
                <span className="rv-chip-title">QR at billing</span>
                <span className="rv-chip-sub">scan → review in ~60s</span>
              </span>
            </div>

            <div className="rv-chip rv-chip--language" aria-hidden="true">
              <span className="rv-chip-icon">
                <Languages className="size-3.5" />
              </span>
              <span>
                <span className="rv-chip-title">हिंदी → English</span>
                <span className="rv-chip-sub">guest&apos;s own words</span>
              </span>
            </div>

            <div className="rv-chip rv-chip--fix" aria-hidden="true">
              <span className="rv-chip-icon rv-chip-icon--emerald">
                <CheckCircle2 className="size-3.5" />
              </span>
              <span>
                <span className="rv-chip-title">Fix tracked after closure</span>
                <span className="rv-chip-sub">did the fix hold?</span>
              </span>
            </div>
          </article>
          </div>
        </div>
      </div>

      <p className="rv-caption">
        <span className="rv-live-dot" aria-hidden="true" />
        Product preview — your real reviews appear here
      </p>
    </div>
  )
}
