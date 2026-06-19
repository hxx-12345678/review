"use client"

import { useState, useEffect } from "react"
import { ExternalLink, Sparkles, Loader2, Check, MessageSquareHeart, Copy, ArrowRight, ArrowLeft, Stethoscope, Scissors, Dumbbell, Home, Utensils, Car, ShieldCheck, Lock, Award } from "lucide-react"
import { getReviewStepConfig, scoreAuthenticity, type AuthenticityResult } from "@/lib/compliance"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { StarRatingInput } from "@/components/star-rating"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { api } from "@/lib/api"

type Step = "loading" | "welcome" | "rate" | "describe" | "review" | "private" | "done"

export function FeedbackFlow({ business, slug }: { business: any; slug?: string }) {
  const [step, setStep] = useState<Step>("loading")
  const [rating, setRating] = useState(0)
  const [highlights, setHighlights] = useState("")
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [language, setLanguage] = useState<string>("english")
  // combinedInput = customer's typed notes + topic chips, built in handleDescribeContinue.
  // Stored here so ReviewStep and PrivateStep both see the exact same text.
  const [combinedInput, setCombinedInput] = useState("")
  // talkingPoints = AI memory-joggers (bullet reminders) shown in Step 3.
  // The customer reads these and writes their own review in their own words on Google.
  // We NEVER post AI text directly — that would violate FTC and Google policy.
  const [talkingPoints, setTalkingPoints] = useState<string[]>([])
  const [loadingPoints, setLoadingPoints] = useState(false)
  const [lastFetchedInput, setLastFetchedInput] = useState("")
  const [authenticity, setAuthenticity] = useState<AuthenticityResult | null>(null)
  const [privateDone, setPrivateDone] = useState(false)
  const [feedbackId, setFeedbackId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const config = getReviewStepConfig(rating || 5)

  function handleRate(value: number) {
    setRating(value)
    setStep("describe")
  }

  function toggleTopic(topic: string) {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    )
  }

  async function handleDescribeContinue() {
    // Build the canonical combined string from text + selected topic chips.
    const combined = [
      highlights.trim(),
      selectedTopics.length ? `(${selectedTopics.join(", ")})` : "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim()

    setCombinedInput(combined)
    setAuthenticity(scoreAuthenticity(combined))

    // Submit feedback to the server before showing the Review step so the
    // Google button can open immediately without any async wait.
    if (!feedbackId) {
      const id = await submitFeedback({ liked: combined || undefined })
      if (!id) return
    }

    setStep("review")

    // Generate AI talking-point reminders AFTER navigating to Review step.
    // These are bullet-point memory-joggers shown to help the customer write
    // their review in their OWN words. We never auto-post AI text to Google
    // (that would violate FTC rules and Google's review policy).
    // The call is skipped if the input hasn't changed (back-and-forth navigation).
    if (combined.length >= 3 && combined !== lastFetchedInput) {
      setLoadingPoints(true)
      try {
        const res = await fetch("/api/talking-points", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            highlights: combined,
            businessName: business.name,
            rating,
            language,
          }),
        })
        if (!res.ok) throw new Error("API error")
        const data = await res.json()
        setTalkingPoints(Array.isArray(data.talkingPoints) ? data.talkingPoints : [])
        setLastFetchedInput(combined)
      } catch {
        setTalkingPoints([])
      } finally {
        setLoadingPoints(false)
      }
    }
  }

  /**
   * Opens Google review URL and records the click server-side.
   *
   * CRITICAL: window.open MUST be called synchronously inside a user-gesture
   * handler. Any await before it causes the browser to treat it as
   * non-user-initiated and popup-block it. So we open the URL FIRST, then
   * fire tracking as a best-effort background request.
   */
  function openGoogle() {
    // 1. Build & validate URL
    const googleUrl = (business.googleReviewUrl || "").trim()
    let targetUrl = googleUrl
    if (targetUrl && !/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`
    }

    // 2. Open synchronously in the click handler (avoids popup-blocker)
    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer")
    }

    // 3. Advance step immediately
    setStep("done")

    // 4. Fire tracking in background (best-effort, non-blocking)
    if (feedbackId) {
      api.reviews.trackClick({ feedbackId }).catch(() => {
        // Silently ignore - tracking is non-critical
      })
    }
  }

  /**
   * Submits the customer's feedback to the server.
   * Uses `combinedInput` (highlights + topics, built at handleDescribeContinue)
   * so the DB record always matches what the AI saw.
   */
  async function submitFeedback(data: {
    purchaseInfo?: string
    liked?: string
    improvement?: string
    customerName?: string
    customerEmail?: string
    privateNote?: string
  }) {
    if (submitting) return null
    setSubmitting(true)
    try {
      const res = await api.feedback.submit({
        businessSlug: slug || business.slug,
        rating,
        ...data,
      })
      setFeedbackId(res.feedback.id)
      return res.feedback.id
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feedback")
      return null
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (step === "loading") {
      const timer = setTimeout(() => {
        // Transit directly to rate step to reduce friction for scanning customers
        setStep("rate")
      }, 2200)
      return () => clearTimeout(timer)
    }
  }, [step])

  // Progress bar: which operational step number are we on (1-4)
  const STEP_ORDER: Step[] = ["rate", "describe", "review", "private"]
  const stepIndex = STEP_ORDER.indexOf(step)
  const showProgress = stepIndex >= 0
  const progressPct = showProgress ? ((stepIndex + 1) / STEP_ORDER.length) * 100 : 0

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6 justify-center">
      {step !== "welcome" && step !== "loading" && (
        <header className="mb-4 flex flex-col items-center gap-3">
          <Logo />
          {showProgress && (
            <div className="w-full space-y-1">
              <div className="flex justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-0.5">
                <span>Step {stepIndex + 1} of {STEP_ORDER.length}</span>
                <span>{["Rate", "Describe", "Review", "Private"][stepIndex]}</span>
              </div>
              <div className="h-1 w-full rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </header>
      )}

      <Card className="flex flex-1 flex-col p-6 overflow-hidden min-h-[480px] justify-between shadow-xl border border-border bg-card">
        {step === "loading" && (
          <LoadingStep business={business} />
        )}

        {step === "welcome" && (
          <WelcomeStep business={business} onStart={() => setStep("rate")} />
        )}

        {step === "rate" && <RateStep business={business} onRate={handleRate} />}

        {step === "describe" && (
          <DescribeStep
            business={business}
            rating={rating}
            highlights={highlights}
            setHighlights={setHighlights}
            selectedTopics={selectedTopics}
            toggleTopic={toggleTopic}
            language={language}
            setLanguage={setLanguage}
            onContinue={handleDescribeContinue}
            onBack={() => setStep("rate")}
            submitting={submitting}
          />
        )}

        {step === "review" && (
          <ReviewStep
            config={config}
            talkingPoints={talkingPoints}
            loadingPoints={loadingPoints}
            combinedInput={combinedInput}
            authenticity={authenticity}
            submitting={submitting}
            onOpenGoogle={openGoogle}
            onPrivate={() => setStep("private")}
            onBack={() => setStep("describe")}
          />
        )}

        {step === "private" && (
          <PrivateStep
            business={business}
            rating={rating}
            combinedInput={combinedInput || highlights}
            selectedTopics={selectedTopics}
            done={privateDone}
            slug={slug}
            onSubmit={async (data) => {
              const id = await submitFeedback(data)
              if (id) {
                setPrivateDone(true)
                toast.success("Thank you — your feedback was sent to the owner.")
              }
            }}
            onBackToReview={() => setStep("review")}
          />
        )}

        {step === "done" && <DoneStep business={business} onPrivate={() => setStep("private")} />}
      </Card>

      {step !== "welcome" && step !== "loading" && (
        <footer className="mt-6 text-center text-xs text-muted-foreground">
          <p className="text-pretty">
            ReviewOS never writes reviews for you. We only help you remember what to say — you write it in
            your own words.
          </p>
        </footer>
      )}
    </div>
  )
}


// ---------------------------------------------------------------------------
// Step: Loading (Scanning Splash Screen)
// ---------------------------------------------------------------------------

function LoadingStep({ business }: { business: any }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-between py-6 text-center animate-fade-in overflow-hidden">
      {/* Top spacer */}
      <div className="flex-1" />

      {/* Central branded animation */}
      <div className="flex flex-col items-center space-y-8">
        {/* Layered ring animation */}
        <div className="relative flex size-28 items-center justify-center">
          {/* Outermost slow pulse */}
          <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping opacity-20" style={{ animationDuration: "2s" }} />
          {/* Mid ring */}
          <div className="absolute -inset-3 rounded-full border border-primary/20 animate-spin opacity-60" style={{ animationDuration: "3s" }} />
          {/* Inner fast spinner */}
          <div className="absolute -inset-1 rounded-full border-2 border-transparent border-t-primary animate-spin" style={{ animationDuration: "0.9s" }} />
          {/* Logo core */}
          <div className="relative flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
            <Logo className="size-14 text-primary" />
          </div>
        </div>

        {/* Business identity */}
        <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Welcome to
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground leading-tight">
              {business.name}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground/70 font-medium tracking-wide">
            Setting up your review experience...
          </p>
        </div>
      </div>

      {/* Bottom trust section */}
      <div className="flex-1 flex flex-col justify-end w-full">
        {/* Animated dots progress */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="size-1.5 rounded-full bg-primary animate-pulse"
              style={{ animationDelay: `${i * 200}ms`, animationDuration: "1.2s" }}
            />
          ))}
        </div>

        {/* Trust badges */}
        <div className="w-full border-t border-border/50 pt-4 animate-fade-in-up" style={{ animationDelay: "600ms" }}>
          <div className="grid grid-cols-3 gap-3 px-1 text-center">
            <div className="flex flex-col items-center space-y-1.5">
              <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <ShieldCheck className="size-4 text-emerald-500" />
              </div>
              <span className="text-[9px] font-bold text-foreground/70 leading-tight uppercase tracking-wider">FTC Safe</span>
            </div>
            <div className="flex flex-col items-center space-y-1.5">
              <div className="flex size-9 items-center justify-center rounded-full bg-blue-500/10 ring-1 ring-blue-500/20">
                <Lock className="size-4 text-blue-500" />
              </div>
              <span className="text-[9px] font-bold text-foreground/70 leading-tight uppercase tracking-wider">Encrypted</span>
            </div>
            <div className="flex flex-col items-center space-y-1.5">
              <div className="flex size-9 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
                <Award className="size-4 text-amber-500" />
              </div>
              <span className="text-[9px] font-bold text-foreground/70 leading-tight uppercase tracking-wider">Verified</span>
            </div>
          </div>
        </div>

        {/* Powered by */}
        <div className="flex items-center justify-center gap-1 mt-4 text-[10px] text-muted-foreground/40 select-none">
          <span>powered by</span>
          <span className="font-extrabold text-foreground/60 tracking-tight">ReviewOS</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step: Welcome
// ---------------------------------------------------------------------------

function WelcomeStep({ business, onStart }: { business: any; onStart: () => void }) {
  const getBranding = (industry: string) => {
    switch (industry) {
      case "DENTAL":
        return {
          gradient: "from-cyan-500 to-blue-600 dark:from-cyan-600 dark:to-blue-700",
          icon: <Stethoscope className="size-10 text-white" />,
          tagline: "Your smile is our absolute priority. Share your experience with us!",
        }
      case "MEDICAL":
        return {
          gradient: "from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700",
          icon: <Stethoscope className="size-10 text-white" />,
          tagline: "We value your health and care. Let us know how we did today.",
        }
      case "SALON":
        return {
          gradient: "from-pink-500 to-rose-600 dark:from-pink-600 dark:to-rose-700",
          icon: <Scissors className="size-10 text-white" />,
          tagline: "Love your new style? We'd love to hear your thoughts!",
        }
      case "GYM":
      case "FITNESS":
        return {
          gradient: "from-amber-500 to-red-600 dark:from-amber-600 dark:to-red-700",
          icon: <Dumbbell className="size-10 text-white" />,
          tagline: "How was your workout and session? Help us keep improving!",
        }
      case "HOME_SERVICES":
        return {
          gradient: "from-orange-500 to-amber-600 dark:from-orange-600 dark:to-amber-700",
          icon: <Home className="size-10 text-white" />,
          tagline: "We take immense pride in our craftsmanship. Share your review!",
        }
      case "RESTAURANT":
        return {
          gradient: "from-red-500 to-orange-600 dark:from-red-600 dark:to-orange-700",
          icon: <Utensils className="size-10 text-white" />,
          tagline: "Crafted with care. Let us know how your meal was!",
        }
      case "AUTO":
        return {
          gradient: "from-slate-600 to-zinc-800 dark:from-slate-700 dark:to-zinc-900",
          icon: <Car className="size-10 text-white" />,
          tagline: "Keep driving safely. How was your vehicle service today?",
        }
      default:
        return {
          gradient: "from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700",
          icon: <Sparkles className="size-10 text-white" />,
          tagline: "We are committed to excellence. Help us serve you better!",
        }
    }
  }

  const brand = getBranding(business.industry)

  return (
    <div className="flex flex-1 flex-col items-center justify-between text-center py-6 animate-fade-in">
      {/* Brand Emblem */}
      <div className="flex flex-col items-center space-y-6 mt-6 animate-fade-in-up">
        <div className={cn(
          "flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg animate-pulse-subtle",
          brand.gradient
        )}>
          {brand.icon}
        </div>

        {/* Business Name */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {business.name}
          </h1>
          {business.location && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {business.location}
            </p>
          )}
        </div>

        {/* Tagline */}
        <p className="max-w-xs text-muted-foreground text-sm leading-relaxed px-4">
          {brand.tagline}
        </p>
      </div>

      {/* Button & Attribution */}
      <div className="w-full space-y-6 mt-8 animate-fade-in-up [animation-delay:200ms]">
        <Button
          onClick={onStart}
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary text-primary-foreground font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          Share Feedback
          <ArrowRight className="ml-2 size-5" />
        </Button>

        {/* Powered By Attribution */}
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground/50 select-none animate-fade-in [animation-delay:400ms]">
          <span>powered by</span>
          <span className="font-extrabold text-foreground tracking-tight bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">ReviewOS</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step: Rate
// ---------------------------------------------------------------------------

function RateStep({ business, onRate }: { business: any; onRate: (v: number) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <h1 className="text-balance text-xl font-semibold tracking-tight text-foreground">
        How was your visit to {business.name}?
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Tap a star to get started.</p>
      <div className="mt-8">
        <StarRatingInput onRate={onRate} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step: Describe
// ---------------------------------------------------------------------------

function DescribeStep({
  business,
  rating,
  highlights,
  setHighlights,
  selectedTopics,
  toggleTopic,
  language,
  setLanguage,
  onContinue,
  onBack,
  submitting,
}: {
  business: any
  rating: number
  highlights: string
  setHighlights: (v: string) => void
  selectedTopics: string[]
  toggleTopic: (t: string) => void
  language: string
  setLanguage: (v: string) => void
  onContinue: () => void
  onBack: () => void
  submitting: boolean
}) {
  const config = getReviewStepConfig(rating)
  // Enable Continue if there is enough text OR at least one topic selected.
  const canContinue = highlights.trim().length >= 3 || selectedTopics.length > 0

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="text-balance text-lg font-semibold tracking-tight text-foreground">
        {config.describePrompt}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground text-pretty">{config.describeHint}</p>

      {business.promptTopics && business.promptTopics.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {business.promptTopics.map((topic: string) => (
            <button
              key={topic}
              type="button"
              onClick={() => toggleTopic(topic)}
              aria-pressed={selectedTopics.includes(topic)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                selectedTopics.includes(topic)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30",
              )}
            >
              {topic}
            </button>
          ))}
        </div>
      )}

      <Textarea
        value={highlights}
        onChange={(e) => setHighlights(e.target.value)}
        placeholder="e.g. Dr. Lee explained everything before starting, and I barely waited."
        className="mt-4 min-h-24 resize-none"
        autoFocus
        maxLength={500}
      />

      {/* Language / Dialect Selection */}
      <div className="mt-4 space-y-1">
        <label htmlFor="language-select" className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block">
          Preferred Language for Suggestions
        </label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
        >
          <option value="english">Standard English</option>
          <option value="hinglish">Hinglish (Hindi + English)</option>
          <option value="gujlish">Gujlish (Gujarati + English)</option>
          <option value="hindi">Hindi (हिंदी)</option>
          <option value="gujarati">Gujarati (ગુજરાતી)</option>
        </select>
      </div>

      <div className="mt-auto flex gap-3 pt-6">
        <Button variant="outline" onClick={onBack} disabled={submitting} className="flex-1">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button onClick={onContinue} disabled={!canContinue || submitting} className="flex-1">
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Continuing...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step: Review (AI reminders + customer notes + open Google)
// ---------------------------------------------------------------------------

function ReviewStep({
  config,
  talkingPoints,
  loadingPoints,
  combinedInput,
  authenticity,
  submitting,
  onOpenGoogle,
  onPrivate,
  onBack,
}: {
  config: ReturnType<typeof getReviewStepConfig>
  talkingPoints: string[]
  loadingPoints: boolean
  combinedInput: string
  authenticity: AuthenticityResult | null
  submitting: boolean
  onOpenGoogle: () => void
  onPrivate: () => void
  onBack: () => void
}) {
  function copyReminders() {
    const text = talkingPoints.length > 0
      ? talkingPoints.map((p) => `• ${p}`).join("\n")
      : combinedInput
    navigator.clipboard.writeText(text)
    toast.success("Copied! Paste into Google and rewrite in your own words.")
  }

  const hasReminders = talkingPoints.length > 0
  const showBox = loadingPoints || hasReminders || combinedInput

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="text-balance text-lg font-semibold tracking-tight text-foreground">
        {config.headline}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground text-pretty">{config.subhead}</p>

      {/* Reminders box — AI bullet points or customer's own notes as fallback */}
      {showBox && (
        <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {loadingPoints ? "Building your reminders…" : "Things you mentioned"}
              </span>
            </div>
            {!loadingPoints && (
              <button
                type="button"
                onClick={copyReminders}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Copy className="size-3.5" />
                Copy
              </button>
            )}
          </div>

          {loadingPoints ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Pulling together your reminders…
            </div>
          ) : hasReminders ? (
            <>
              <ul className="mt-3 space-y-2">
                {talkingPoints.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground text-pretty">
                These are just reminders based on what you told us. Write your review in your own words on Google — it carries more weight when it's personal.
              </p>
            </>
          ) : combinedInput ? (
            <>
              <p className="mt-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                {combinedInput}
              </p>
              <p className="mt-3 text-xs text-muted-foreground text-pretty">
                Use this as inspiration and write your review in your own words on Google.
              </p>
            </>
          ) : null}
        </div>
      )}

      {authenticity && authenticity.warnings.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground text-pretty">{authenticity.warnings[0]}</p>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-6">
        {/* Primary CTA — opens Google SYNCHRONOUSLY inside the click handler.
            window.open after any await gets blocked by the browser popup-blocker. */}
        <Button
          onClick={onOpenGoogle}
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ExternalLink className="size-4" />
          )}
          {submitting ? "Just a moment…" : "Write your review on Google"}
        </Button>

        <Button onClick={onPrivate} variant="outline" size="lg" className="w-full">
          <MessageSquareHeart className="size-4" />
          {config.emphasizePrivateFeedback ? "Tell the owner privately" : "Send private feedback instead"}
        </Button>

        <button
          type="button"
          onClick={onBack}
          className="mt-1 inline-flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-3" />
          Edit my notes
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step: Private feedback
// ---------------------------------------------------------------------------

function PrivateStep({
  business,
  rating,
  combinedInput,
  selectedTopics,
  done,
  slug,
  onSubmit,
  onBackToReview,
}: {
  business: any
  rating: number
  combinedInput: string
  selectedTopics: string[]
  done: boolean
  slug?: string
  onSubmit: (data: {
    purchaseInfo?: string
    liked?: string
    improvement?: string
    customerName?: string
    customerEmail?: string
    privateNote?: string
  }) => Promise<void>
  onBackToReview: () => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState(combinedInput)
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (done) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check className="size-7" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">Thank you</h2>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          {business.name} received your note and will follow up if needed. You can still post a public
          review any time.
        </p>
        <Button variant="outline" className="mt-6" onClick={onBackToReview}>
          Back
        </Button>
      </div>
    )
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    try {
      await onSubmit({
        liked: combinedInput,
        improvement: "",
        customerName: name.trim() || undefined,
        // Only pass email if it looks valid — extra client-side guard.
        customerEmail: email.trim() && email.includes("@") ? email.trim() : undefined,
        privateNote: message.trim(),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="text-balance text-lg font-semibold tracking-tight text-foreground">
        Send private feedback
      </h2>
      <p className="mt-1 text-sm text-muted-foreground text-pretty">
        This goes straight to the owner of {business.name} — it is not posted publicly.
      </p>

      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="pf-name">Name (optional)</Label>
          <Input
            id="pf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={100}
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-email">Email (optional)</Label>
          <Input
            id="pf-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            maxLength={200}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-message">Your feedback</Label>
          <Textarea
            id="pf-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-28 resize-none"
            placeholder="Tell us what happened so we can make it right."
            maxLength={2000}
          />
        </div>
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="pf-consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 size-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <Label htmlFor="pf-consent" className="text-xs text-muted-foreground leading-relaxed">
            I consent to ReviewOS processing my feedback and sharing it with {business.name}. See our{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Privacy Policy
            </a>
            .
          </Label>
        </div>
      </div>

      <div className="mt-auto flex gap-3 pt-6">
        <Button variant="outline" onClick={onBackToReview} className="flex-1">
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={message.trim().length < 3 || !consent || submitting}
          className="flex-1"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send feedback"
          )}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step: Done
// ---------------------------------------------------------------------------

function DoneStep({ business, onPrivate }: { business: any; onPrivate: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center space-y-4 py-4 animate-fade-in">
      {/* Animated success emblem */}
      <div className="relative flex size-20 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-30" />
        <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30">
          <Check className="size-9 text-primary" strokeWidth={2.5} />
        </div>
      </div>

      <div className="space-y-2 animate-fade-in-up">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">You're amazing! 🎉</h2>
        <p className="text-sm text-muted-foreground text-pretty max-w-xs mx-auto leading-relaxed">
          Your honest review helps {business.name} grow and helps future customers make better decisions.
        </p>
      </div>

      {/* Confirmation badge */}
      <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary animate-fade-in-up [animation-delay:150ms]">
        <Check className="size-3.5" />
        Google review tab opened
      </div>

      {/* Stars decoration */}
      <div className="flex gap-1 animate-fade-in-up [animation-delay:250ms]">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg key={s} className="size-5 fill-amber-400 text-amber-400" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>

      <button
        type="button"
        onClick={onPrivate}
        className="mt-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 animate-fade-in-up [animation-delay:350ms]"
      >
        Want to tell the owner something privately?
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Validates that a URL belongs to a known Google domain before window.open.
 * Prevents open-redirect attacks where a malicious googleReviewUrl could send
 * the customer to a phishing page.
 */
function isGoogleUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    const ALLOWED = ["google.com", "g.co", "maps.google.com", "goo.gl"]
    return ALLOWED.some((d) => hostname === d || hostname.endsWith(`.${d}`))
  } catch {
    return false
  }
}
