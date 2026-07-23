"use client"

import { useState, useEffect, useRef } from "react"
import { ExternalLink, Sparkles, Loader2, Check, MessageSquareHeart, ArrowRight, ArrowLeft, Stethoscope, Scissors, Dumbbell, Home, Utensils, Car, ShieldCheck, Lock, Award, Star, ThumbsUp, Meh, Frown, PenLine, RefreshCw, Lightbulb, SmilePlus, ChevronDown, Wrench, Clock, Wine, UserCheck, Users, Building, Calendar, MessageSquare, MapPin, Music } from "lucide-react"
import { getReviewStepConfig, scoreAuthenticity, type AuthenticityResult } from "@/lib/compliance"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { StarRatingInput } from "@/components/star-rating"
import { Logo } from "@/components/logo"
import { BrandedLoading } from "@/components/feedback/branded-loading"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { handleAiError } from "@/lib/ai-error-handler"
import { getCategoriesForIndustry } from "@/lib/industry-categories"

type Step = "loading" | "rate" | "language" | "mcq" | "review" | "done"

export function FeedbackFlow({ business, slug, demo: isDemo = false }: { business: any; slug?: string; demo?: boolean }) {
  const [step, setStep] = useState<Step>("loading")
  const [rating, setRating] = useState(0)
  const [highlights, setHighlights] = useState("")
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [selectedSubOptions, setSelectedSubOptions] = useState<string[]>([])
  const [specialMention, setSpecialMention] = useState("")
  const [language, setLanguage] = useState<string>("english")
  const [combinedInput, setCombinedInput] = useState("")
  const [talkingPoints, setTalkingPoints] = useState<string[]>([])
  const [loadingPoints, setLoadingPoints] = useState(false)
  const [lastFetchedInput, setLastFetchedInput] = useState("")
  const [authenticity, setAuthenticity] = useState<AuthenticityResult | null>(null)
  const [privateDone, setPrivateDone] = useState(false)
  const [feedbackId, setFeedbackId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [customerReview, setCustomerReview] = useState("")
  const [showRedirectPopup, setShowRedirectPopup] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(3)

  const config = getReviewStepConfig(rating || 5)

  // Inject brand colors as CSS custom properties for the entire review flow
  useEffect(() => {
    const root = document.documentElement
    if (business.primaryColor) root.style.setProperty("--brand-primary", business.primaryColor)
    if (business.backgroundColor) root.style.setProperty("--brand-bg", business.backgroundColor)
    root.style.setProperty("--brand-name", `"${business.name}"`)
    return () => {
      root.style.removeProperty("--brand-primary")
      root.style.removeProperty("--brand-bg")
      root.style.removeProperty("--brand-name")
    }
  }, [business])

  function toggleTopic(topic: string) {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    )
  }

  function toggleSubOption(id: string) {
    setSelectedSubOptions((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  async function handleMCQContinue() {
    const subLabels = getCategoriesForIndustry(business.industry)
      .flatMap((c) => c.subOptions)
      .filter((s) => selectedSubOptions.includes(s.id))
      .map((s) => s.label)
    const subText = subLabels.length > 0 ? subLabels.join(", ") : ""
    const specialText = specialMention.trim()
    const combined = [subText, specialText].filter(Boolean).join(". ")

    setCombinedInput(combined)
    setSelectedTopics([...subLabels])
    setAuthenticity(scoreAuthenticity(combined))

    if (!feedbackId) {
      const id = await submitFeedback({
        liked: specialText || undefined,
        selectedSubOptions: selectedSubOptions.length > 0 ? selectedSubOptions : undefined,
      })
      if (!id) return
    }

    setStep("review")

    if (combined.length >= 3 && combined !== lastFetchedInput) {
      setLoadingPoints(true)
      try {
        const res = await fetch("/api/talking-points", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            highlights: combined,
            selectedTopics: [...subLabels],
            businessName: business.name,
            promptTopics: business.promptTopics || [],
            rating,
            language,
          }),
        })
        if (!res.ok) throw new Error("API error")
        const data = await res.json()
        setTalkingPoints(Array.isArray(data.talkingPoints) ? data.talkingPoints : [])
        setLastFetchedInput(combined)
      } catch (err) {
        handleAiError(err)
        setTalkingPoints([])
      } finally {
        setLoadingPoints(false)
      }
    }
  }

  const [redirectContent, setRedirectContent] = useState("")

  function getGoogleReviewUrl(): string | null {
    const raw = (business.googleReviewUrl || "").trim()
    if (!raw) return null
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  }

  function handlePostToGoogle(content: string) {
    if (content.trim()) {
      navigator.clipboard.writeText(content.trim())
    }
    setRedirectContent(content)
    setShowRedirectPopup(true)
    setRedirectCountdown(3)

    // Open URL synchronously during the user click gesture to bypass popup blockers
    const url = getGoogleReviewUrl()
    if (url && !isDemo) {
      const opened = window.open(url, "_blank", "noopener,noreferrer")
      if (!opened) {
        window.location.href = url
      }
    } else if (!url && !isDemo) {
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(business.name)}`
      const opened = window.open(searchUrl, "_blank", "noopener,noreferrer")
      if (!opened) {
        window.location.href = searchUrl
      }
    }
  }

  async function confirmGooglePost() {
    // Fire-and-forget: fetch fresh URL for trackClick logging only
    const freshSlug = slug || business.slug
    let freshUrl: string | null = null
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
      const res = await fetch(`${baseUrl}/feedback/public/${freshSlug}`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        freshUrl = ((data.business?.googleReviewUrl || "").trim()) || null
      }
    } catch {}

    setShowRedirectPopup(false)
    setStep("done")

    if (!isDemo && feedbackId) {
      api.reviews.trackClick({ feedbackId, content: redirectContent || undefined }).catch(() => {})
    }
  }

  async function submitFeedback(data: {
    purchaseInfo?: string
    liked?: string
    improvement?: string
    customerName?: string
    customerEmail?: string
    privateNote?: string
    selectedSubOptions?: string[]
  }) {
    if (submitting) return null

    // DEMO MODE: never write to real database
    if (isDemo) {
      const fakeId = "demo_" + Math.random().toString(36).slice(2, 10)
      setFeedbackId(fakeId)
      return fakeId
    }

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

  // Auto-redirect popup timer
  useEffect(() => {
    if (!showRedirectPopup) return
    if (redirectCountdown <= 0) {
      confirmGooglePost()
      return
    }
    const timer = setTimeout(() => setRedirectCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [showRedirectPopup, redirectCountdown])

  // Brand colors are injected via useEffect above
  // Loading is handled by BrandedLoading component with onReady callback

  const STEP_ORDER: Step[] = ["rate", "language", "mcq", "review"]
  const stepIndex = STEP_ORDER.indexOf(step)
  const showProgress = stepIndex >= 0
  const progressPct = showProgress ? ((stepIndex + 1) / STEP_ORDER.length) * 100 : 0

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6 justify-center">
      {step !== "loading" && (
        <header className="mb-4 flex flex-col items-center gap-3">
          <Logo />
          {showProgress && (
            <div className="w-full space-y-1">
              <div className="flex justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-0.5">
                <span>Step {stepIndex + 1} of {STEP_ORDER.length}</span>
                <span>{["Rate", "Language", "Details", "Review"][stepIndex]}</span>
              </div>
              <div className="h-1 w-full rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor: business.primaryColor || undefined,
                  }}
                />
              </div>
            </div>
          )}
        </header>
      )}

      <Card className="relative flex flex-1 flex-col p-6 overflow-hidden min-h-[480px] justify-between shadow-xl border border-border bg-card">
        {step === "loading" && (
          <BrandedLoading
            business={business}
            onReady={() => setStep("rate")}
            minDuration={1500}
          />
        )}
        {step === "rate" && <RateStep business={business} onRate={(v) => { setRating(v); setStep("language") }} />}
        {step === "language" && (
          <LanguageStep
            business={business}
            language={language}
            setLanguage={setLanguage}
            onContinue={() => setStep("mcq")}
            onBack={() => setStep("rate")}
          />
        )}
        {step === "mcq" && (
          <MCQStep
            business={business}
            rating={rating}
            selectedSubOptions={selectedSubOptions}
            toggleSubOption={toggleSubOption}
            specialMention={specialMention}
            onSpecialMentionChange={setSpecialMention}
            onContinue={handleMCQContinue}
            onBack={() => setStep("language")}
            submitting={submitting}
          />
        )}
        {step === "review" && (
          <ReviewStep
            config={config}
            talkingPoints={talkingPoints}
            loadingPoints={loadingPoints}
            combinedInput={combinedInput}
            rawHighlights={highlights}
            selectedTopics={selectedTopics}
            authenticity={authenticity}
            submitting={submitting}
            onPostToGoogle={handlePostToGoogle}
            onBack={() => { setStep("mcq"); setCustomerReview("") }}
            businessName={business.name}
            promptTopics={business.promptTopics || []}
            language={language}
            rating={rating}
            customerReview={customerReview}
            onReviewChange={setCustomerReview}
            businessSlug={slug || business.slug}
          />
        )}
        {step === "done" && <DoneStep business={business} demo={isDemo} />}

        {showRedirectPopup && (
          <RedirectPopup
            business={business}
            rating={rating}
            reviewContent={redirectContent}
            countdown={redirectCountdown}
            onConfirm={confirmGooglePost}
            demo={isDemo}
          />
        )}
      </Card>

      {step !== "loading" && (
        <footer className="mt-6 text-center text-xs text-muted-foreground">
          <p className="text-pretty">
            A helpful draft based on what you shared — <span className="font-semibold text-foreground/70">you&apos;re in control</span>. Edit
            freely, regenerate, or write from scratch. Your review, your voice.
          </p>
          {business.showPoweredBy !== false && (
            <p className="mt-2 text-[10px] text-muted-foreground/40 select-none">
              powered by <span className="font-extrabold text-foreground/50 tracking-tight">BEYONDVYU</span>
            </p>
          )}
        </footer>
      )}
    </div>
  )
}

function WelcomeStep({ business, onStart }: { business: any; onStart: () => void }) {
  const getBranding = (industry: string) => {
    switch (industry) {
      case "DENTAL":
        return { gradient: "from-cyan-500 to-blue-600 dark:from-cyan-600 dark:to-blue-700", icon: <Stethoscope className="size-10 text-white" />, tagline: "Your smile is our absolute priority. Share your experience with us!" }
      case "MEDICAL":
        return { gradient: "from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700", icon: <Stethoscope className="size-10 text-white" />, tagline: "We value your health and care. Let us know how we did today." }
      case "SALON":
        return { gradient: "from-pink-500 to-rose-600 dark:from-pink-600 dark:to-rose-700", icon: <Scissors className="size-10 text-white" />, tagline: "Love your new style? We'd love to hear your thoughts!" }
      case "GYM":
      case "FITNESS":
        return { gradient: "from-amber-500 to-red-600 dark:from-amber-600 dark:to-red-700", icon: <Dumbbell className="size-10 text-white" />, tagline: "How was your workout? Help us keep improving!" }
      case "HOME_SERVICES":
        return { gradient: "from-orange-500 to-amber-600 dark:from-orange-600 dark:to-amber-700", icon: <Home className="size-10 text-white" />, tagline: "We take pride in our work. Share your review!" }
      case "RESTAURANT":
        return { gradient: "from-red-500 to-orange-600 dark:from-red-600 dark:to-orange-700", icon: <Utensils className="size-10 text-white" />, tagline: "Crafted with care. How was your meal?" }
      case "AUTO":
        return { gradient: "from-slate-600 to-zinc-800 dark:from-slate-700 dark:to-zinc-900", icon: <Car className="size-10 text-white" />, tagline: "How was your vehicle service today?" }
      default:
        return { gradient: "from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700", icon: <Sparkles className="size-10 text-white" />, tagline: "We are committed to excellence. Help us serve you better!" }
    }
  }
  const brand = getBranding(business.industry)
  return (
    <div className="flex flex-1 flex-col items-center justify-between text-center py-6 animate-fade-in">
      <div className="flex flex-col items-center space-y-6 mt-6 animate-fade-in-up">
        <div className={cn("flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg animate-pulse-subtle", brand.gradient)}>
          {brand.icon}
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{business.name}</h1>
          {business.location && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{business.location}</p>}
        </div>
        <p className="max-w-xs text-muted-foreground text-sm leading-relaxed px-4">{brand.tagline}</p>
      </div>
      <div className="w-full space-y-6 mt-8 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <Button onClick={onStart} size="lg" className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary text-primary-foreground font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
          Share Feedback
          <ArrowRight className="ml-2 size-5" />
        </Button>
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground/50 select-none" style={{ animationDelay: "400ms" }}>
          <span>powered by</span>
          <span className="font-extrabold text-foreground tracking-tight bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">BEYONDVYU</span>
        </div>
      </div>
    </div>
  )
}

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

type MoodTagKey = "positive" | "neutral" | "negative"
function getMoodKey(rating: number): MoodTagKey {
  if (rating >= 4) return "positive"
  if (rating === 3) return "neutral"
  return "negative"
}

const MOOD_TAGS: Record<string, { icon: React.ReactNode; label: string; positive: string[]; neutral: string[]; negative: string[] }> = {
  service: {
    icon: <ThumbsUp className="size-4" />, label: "Service",
    positive: ["Friendly staff", "Quick service", "Knowledgeable", "Attentive"],
    neutral: ["Okay service", "Average help", "Decent response", "Standard experience"],
    negative: ["Slow service", "Rude staff", "Unhelpful", "Unattentive"],
  },
  quality: {
    icon: <Star className="size-4" />, label: "Quality",
    positive: ["Top quality", "Clean facility", "Great results", "Well maintained"],
    neutral: ["Average quality", "Mixed results", "Some good some bad", "Decent enough"],
    negative: ["Poor quality", "Unclean", "Bad results", "Outdated"],
  },
  value: {
    icon: <SmilePlus className="size-4" />, label: "Value",
    positive: ["Fair pricing", "Worth it", "Good value", "Transparent"],
    neutral: ["Fair enough", "Reasonable pricing", "Decent value", "Okay for the price"],
    negative: ["Overpriced", "Hidden fees", "Not worth it", "Expensive"],
  },
  experience: {
    icon: <Sparkles className="size-4" />, label: "Experience",
    positive: ["Welcoming", "Comfortable", "Exceeded expectations", "Enjoyable"],
    neutral: ["Average experience", "Nothing special", "It was okay", "Could be better"],
    negative: ["Uncomfortable", "Rushed", "Disappointing", "Stressful"],
  },
}

function LanguageStep({ business, language, setLanguage, onContinue, onBack }: { business: any; language: string; setLanguage: (v: string) => void; onContinue: () => void; onBack: () => void }) {
  const options = [
    { value: "english", label: "English", flag: "🇬🇧", sub: "Standard English" },
    { value: "hinglish", label: "Hinglish", flag: "🇮🇳", sub: "Hindi + English" },
    { value: "gujlish", label: "Gujlish", flag: "🇮🇳", sub: "Gujarati + English" },
    { value: "hindi", label: "हिंदी", flag: "🇮🇳", sub: "Hindi" },
    { value: "gujarati", label: "ગુજરાતી", flag: "🇮🇳", sub: "Gujarati" },
  ]

  return (
    <div className="flex flex-1 flex-col animate-fade-in-up">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Choose your language</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pick how you'd like your review to be written.</p>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLanguage(opt.value)}
            className={cn(
              "flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
              language === opt.value
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border/60 bg-card hover:border-foreground/30"
            )}
          >
            <span className="text-3xl">{opt.flag}</span>
            <div>
              <span className="text-base font-bold text-foreground">{opt.label}</span>
              <p className="text-xs text-muted-foreground">{opt.sub}</p>
            </div>
            {language === opt.value && (
              <div className="ml-auto flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3.5" />
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="mt-auto flex gap-3 pt-6">
        <Button variant="outline" onClick={onBack} className="flex-1 rounded-xl py-6 font-semibold bg-card">
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
        <Button onClick={onContinue} className="flex-[2] rounded-xl py-6 font-semibold bg-gradient-to-r from-primary to-primary/95 hover:from-primary/95 hover:to-primary text-primary-foreground shadow-md hover:shadow-lg transition-all transform active:scale-95">
          Continue <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    </div>
  )
}

function MCQStep({
  business, rating, selectedSubOptions, toggleSubOption, specialMention, onSpecialMentionChange, onContinue, onBack, submitting,
}: {
  business: any; rating: number; selectedSubOptions: string[]; toggleSubOption: (id: string) => void; specialMention: string; onSpecialMentionChange: (v: string) => void; onContinue: () => void; onBack: () => void; submitting: boolean
}) {
  const moodKey = getMoodKey(rating)
  const [specialDismissed, setSpecialDismissed] = useState(false)

  const categories = getCategoriesForIndustry(business.industry)

  const allSubLabels = categories.flatMap((c) => c.subOptions).filter((s) => selectedSubOptions.includes(s.id)).map((s) => s.label)
  const canContinue = selectedSubOptions.length > 0 || specialMention.trim().length > 0

  const ICON_MAP: Record<string, any> = {
    Utensils, ThumbsUp, Sparkles, SmilePlus, Wine,
    Stethoscope, Users, Building, Calendar, MessageSquare, ShieldCheck,
    Scissors, UserCheck,
    Wrench, Clock,
    Dumbbell, Music,
    MapPin, Home, Star,
  }

  function getIcon(iconName: string) {
    const Icon = ICON_MAP[iconName]
    return Icon ? <Icon className="size-4" /> : <Sparkles className="size-4" />
  }

  return (
    <div className="flex flex-1 flex-col animate-fade-in-up gap-0 overflow-y-auto">
      <div className="text-center mb-3">
        <div className={cn("inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold",
          moodKey === "positive" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
          moodKey === "neutral" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
          "bg-red-500/10 text-red-600 dark:text-red-400")}>
          {moodKey === "positive" ? <ThumbsUp className="size-4" /> : moodKey === "neutral" ? <Meh className="size-4" /> : <Frown className="size-4" />}
          {moodKey === "positive" ? "What did you love?" : moodKey === "neutral" ? "What was just okay?" : "What went wrong?"}
        </div>
      </div>

      {selectedSubOptions.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {allSubLabels.map((label) => (
            <span key={label} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-2.5 py-1 border border-primary/20">
              <Check className="size-2.5" />
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {categories.map((category) => {
          const selectedCount = category.subOptions.filter((s) => selectedSubOptions.includes(s.id)).length

          return (
            <div key={category.id} className="rounded-xl border border-border/60 bg-card/50 overflow-hidden transition-all duration-200">
              <div className="flex w-full items-center justify-between px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-muted-foreground">{getIcon(category.icon)}</span>
                  <span className="text-sm font-semibold text-foreground">{category.label}</span>
                  {selectedCount > 0 && (
                    <span className="inline-flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                      {selectedCount}
                    </span>
                  )}
                </div>
              </div>
              <div className="border-t border-border/40 px-3.5 py-2.5">
                <div className="flex flex-wrap gap-2">
                  {category.subOptions.map((sub) => {
                    const isSelected = selectedSubOptions.includes(sub.id)
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => toggleSubOption(sub.id)}
                        aria-pressed={isSelected}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-95",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border/60 bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                        )}
                      >
                        {sub.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── SPECIAL MENTION SECTION ── */}
      <div className="mt-4 border-t border-border/60 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenLine className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              Anything else to mention?
            </span>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal uppercase tracking-wider border">
              Optional
            </Badge>
          </div>
          {!specialDismissed && specialMention.trim().length > 0 && (
            <span className={cn("text-[10px] font-bold tabular-nums", specialMention.length > 450 ? "text-destructive" : "text-muted-foreground")}>
              {specialMention.length}/500
            </span>
          )}
        </div>

        {specialDismissed ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 px-3.5 py-2.5">
            <Check className="size-3.5 text-muted-foreground/60 shrink-0" />
            <span className="text-xs text-muted-foreground/60">Nothing else to add</span>
            <button
              type="button"
              onClick={() => setSpecialDismissed(false)}
              className="ml-auto text-xs font-medium text-primary hover:underline"
            >
              Add details
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground/80">
              {moodKey === "positive"
                ? "What made your experience special? Share a highlight..."
                : moodKey === "neutral"
                  ? "What could have been better or stood out?"
                  : "What went wrong? Help the business understand and improve..."}
            </label>
            <textarea
              value={specialMention}
              onChange={(e) => onSpecialMentionChange(e.target.value)}
              placeholder={
                moodKey === "positive"
                  ? "Any specific moments, people, or details that made it great..."
                  : moodKey === "neutral"
                    ? "Any specifics that come to mind — good or bad..."
                    : "Describe what happened so the business can address it..."
              }
              className="w-full min-h-[60px] resize-none rounded-xl border-2 border-muted-foreground/30 bg-card p-3 text-xs leading-relaxed transition-all duration-200 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none"
              maxLength={500}
              rows={2}
            />
            <div className="flex items-start justify-between gap-4">
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                Your own words help the AI craft a more authentic review. Be as specific as you like.
              </p>
              <button
                type="button"
                onClick={() => { onSpecialMentionChange(""); setSpecialDismissed(true) }}
                className="shrink-0 text-[10px] font-medium text-muted-foreground/60 hover:text-foreground whitespace-nowrap hover:underline transition-colors"
              >
                Nothing else to add
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto flex gap-3 pt-6">
        <Button variant="outline" onClick={onBack} disabled={submitting} className="flex-1 rounded-xl py-6 font-semibold bg-card">
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
        <Button onClick={onContinue} disabled={!canContinue || submitting} className="flex-[2] rounded-xl py-6 font-semibold bg-gradient-to-r from-primary to-primary/95 hover:from-primary/95 hover:to-primary text-primary-foreground shadow-md hover:shadow-lg transition-all transform active:scale-95">
          {submitting ? (
            <><Loader2 className="mr-2 size-4 animate-spin" />Processing...</>
          ) : (
            <><span>Continue to Draft</span><ArrowRight className="ml-2 size-4" /></>
          )}
        </Button>
      </div>
    </div>
  )
}

function ReviewStep({
  config, talkingPoints, loadingPoints, combinedInput, rawHighlights, selectedTopics, authenticity, submitting, onPostToGoogle, onBack, businessName, promptTopics, language, rating, customerReview, onReviewChange, businessSlug,
}: {
  config: ReturnType<typeof getReviewStepConfig>
  talkingPoints: string[]
  loadingPoints: boolean
  combinedInput: string
  rawHighlights: string
  selectedTopics: string[]
  authenticity: AuthenticityResult | null
  submitting: boolean
  onPostToGoogle: (content: string) => void
  onBack: () => void
  businessName: string
  promptTopics: string[]
  language: string
  rating: number
  customerReview: string
  onReviewChange: (v: string) => void
  businessSlug?: string
}) {
  const [generatingReview, setGeneratingReview] = useState(false)
  const [reviewGenerated, setReviewGenerated] = useState(false)
  const [talkingPointsExpanded, setTalkingPointsExpanded] = useState(true)
  const [copiedReview, setCopiedReview] = useState(false)
  const [buttonCooldown, setButtonCooldown] = useState(0)
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Track last generated input to avoid redundant generations when user goes back and forth
  const lastGeneratedRef = useRef<string | null>(null)
  // Track if auto-generation is pending (waiting for talking points)
  const autoGenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
      if (autoGenTimerRef.current) clearTimeout(autoGenTimerRef.current)
    }
  }, [])

  const hasReminders = talkingPoints.length > 0

  /** Build a stable fingerprint of the current input for change detection */
  function inputFingerprint() {
    return `${rawHighlights || combinedInput}|${selectedTopics.sort().join(",")}|${rating}|${language}`
  }

  /** Core fetch logic — shared between auto-gen and manual click */
  async function performGenerateReview() {
    if (!combinedInput && !hasReminders && !rawHighlights) return
    setGeneratingReview(true)
    try {
      const res = await fetch("/api/generate-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          highlights: rawHighlights || combinedInput,
          selectedTopics,
          businessName,
          promptTopics,
          rating,
          language,
          talkingPoints,
          businessSlug,
        }),
      })
      if (!res.ok) throw new Error("API error")
      const data = await res.json()
      if (data.review) {
        onReviewChange(data.review)
        setReviewGenerated(true)
        lastGeneratedRef.current = inputFingerprint()
      }
    } catch (err) {
      handleAiError(err)
    } finally {
      setGeneratingReview(false)
    }
  }

  /** Manual button click — includes a 10s client-side cooldown */
  async function handleGenerateClick() {
    if (buttonCooldown > 0 || generatingReview) return
    setButtonCooldown(10)
    cooldownTimerRef.current = setInterval(() => {
      setButtonCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    await performGenerateReview()
  }

  // Auto-generate review on mount only if input has actually changed
  useEffect(() => {
    const fp = inputFingerprint()
    // If we already generated for this exact input, skip auto-generation
    if (lastGeneratedRef.current === fp) return
    // If user already typed something, don't overwrite
    if (customerReview) return

    if (combinedInput || hasReminders) {
      // If talking points are still loading, wait up to 3s for them
      if (loadingPoints) {
        autoGenTimerRef.current = setTimeout(() => {
          performGenerateReview()
        }, 3000)
      } else {
        autoGenTimerRef.current = setTimeout(() => {
          performGenerateReview()
        }, 400)
      }
      return () => {
        if (autoGenTimerRef.current) clearTimeout(autoGenTimerRef.current)
      }
    }
  }, [combinedInput, selectedTopics, rating, language, loadingPoints])

  function copyReviewText() {
    if (!customerReview.trim()) return
    navigator.clipboard.writeText(customerReview)
    setCopiedReview(true)
    toast.success("Review copied! Paste it on Google and make any final edits.")
    setTimeout(() => setCopiedReview(false), 2000)
  }

  const hasContent = customerReview.trim().length > 0

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-center mb-3">
        <h2 className="text-balance text-lg font-semibold tracking-tight text-foreground">
          {config.headline}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{config.subhead}</p>
      </div>

      {/* MAIN REVIEW TEXTAREA */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className={cn("size-3.5", reviewGenerated && "text-primary")} />
            Your Review
          </label>
          <div className="flex items-center gap-2">
            {reviewGenerated && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal uppercase tracking-wider border">
                <Sparkles className="size-2.5 mr-0.5" />
                AI draft
              </Badge>
            )}
            {hasContent && (
              <button
                type="button"
                onClick={copyReviewText}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
              >
                {copiedReview ? <Check className="size-3" /> : <PenLine className="size-3" />}
                {copiedReview ? "Copied" : "Copy"}
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={customerReview}
            onChange={(e) => onReviewChange(e.target.value)}
            placeholder={
              generatingReview
                ? "Crafting your review draft..."
                : hasReminders
                  ? "Write your review here, or tap \"Generate with AI\" for a draft..."
                  : "Start typing your review in your own words..."
            }
            className={cn(
              "min-h-[140px] resize-none rounded-xl border-2 p-4 text-sm leading-relaxed transition-all duration-200",
              "focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none",
              hasContent
                ? "border-primary/40 bg-card shadow-sm"
                : "border-dashed border-muted-foreground/30 bg-muted/20",
              generatingReview && "animate-pulse"
            )}
            maxLength={2000}
            disabled={generatingReview}
          />
          {generatingReview && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                Generating your review draft...
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] text-muted-foreground">
            {hasContent
              ? "Edit freely or regenerate for a new version"
              : "Write your own or let AI help you start"}
          </span>
          <span className={cn("text-[10px] font-bold tabular-nums", customerReview.length > 1900 ? "text-destructive" : "text-muted-foreground")}>
            {customerReview.length}/2000
          </span>
        </div>
      </div>

      {/* GENERATE / REGENERATE BUTTON */}
      <div className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={hasContent ? "outline" : "default"}
            size="sm"
            onClick={handleGenerateClick}
            disabled={generatingReview || (!combinedInput && !hasReminders) || buttonCooldown > 0}
            className={cn(
              "rounded-lg text-xs h-9 px-3 transition-all",
              !hasContent && !generatingReview && buttonCooldown === 0 && "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-sm hover:shadow-md"
            )}
          >
            {generatingReview ? (
              <Loader2 className="size-3.5 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className={cn("size-3.5 mr-1.5", !hasContent && !generatingReview && buttonCooldown === 0 && "text-primary-foreground")} />
            )}
            {generatingReview
              ? "Generating..."
              : buttonCooldown > 0
                ? `Wait ${buttonCooldown}s...`
                : hasContent
                  ? "Regenerate with AI"
                  : "Generate with AI"}
          </Button>

          {authenticity && authenticity.warnings.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[10px] text-amber-700 dark:text-amber-300">
              <Lightbulb className="size-3 shrink-0" />
              <span>{authenticity.warnings[0]}</span>
            </div>
          )}
        </div>
      </div>

      {/* TALKING POINTS REFERENCE */}
      {hasReminders && (
        <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => setTalkingPointsExpanded(!talkingPointsExpanded)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquareHeart className="size-3.5 text-primary shrink-0" />
              <span>Your talking points</span>
            </div>
            <ChevronDown className={cn("size-3.5 transition-transform", talkingPointsExpanded && "rotate-180")} />
          </button>
          {talkingPointsExpanded && (
            <div className="px-4 pb-3 animate-fade-in-up border-t border-border/40 pt-2.5">
              <ul className="space-y-1.5">
                {talkingPoints.map((point, i) => (
                  <li key={i} className="flex gap-2 text-xs text-foreground/80">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-muted-foreground italic leading-relaxed">
                These are reminders from what you told us. Weave them into your review naturally.
              </p>
            </div>
          )}
        </div>
      )}

      {/* LOADING SKELETON FOR TALKING POINTS */}
      {loadingPoints && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 text-primary animate-spin" />
            <span className="text-sm font-medium text-foreground">AI is preparing your talking points...</span>
          </div>
          <div className="mt-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-primary/10 rounded animate-pulse" style={{ width: `${60 + i * 15}%`, animationDelay: `${i * 200}ms` }} />
            ))}
          </div>
        </div>
      )}

      {/* ALREADY REVIEWED NOTE */}
      <div className="mt-4 rounded-xl border border-muted-foreground/20 bg-muted/20 px-3.5 py-2.5">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Already reviewed this place before? Google allows only one review per account — but you can{' '}
          <a
            href="https://support.google.com/maps/answer/6230175"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            edit your existing review
          </a>
          {' '}with your new experience instead of posting a new one.
        </p>
      </div>

      {/* ACTION BUTTONS */}
      <div className="mt-auto flex flex-col gap-3 pt-6">
        <Button
          onClick={() => onPostToGoogle(customerReview)}
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          disabled={submitting}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
          {submitting ? "Just a moment..." : "Post your review on Google"}
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

function PrivateStep({
  business, rating, combinedInput, customerReview, selectedTopics, done, slug, onSubmit, onBackToReview,
}: {
  business: any; rating: number; combinedInput: string; customerReview?: string; selectedTopics: string[]; done: boolean; slug?: string; onSubmit: (data: { purchaseInfo?: string; liked?: string; improvement?: string; customerName?: string; customerEmail?: string; privateNote?: string }) => Promise<void>; onBackToReview: () => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState(customerReview || combinedInput)
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (done) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check className="size-7" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">Thank you</h2>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">{business.name} received your note and will follow up if needed.</p>
        <Button variant="outline" className="mt-6" onClick={onBackToReview}>Back</Button>
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
        customerEmail: email.trim() && email.includes("@") ? email.trim() : undefined,
        privateNote: message.trim(),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="text-balance text-lg font-semibold tracking-tight text-foreground">Send private feedback</h2>
      <p className="mt-1 text-sm text-muted-foreground text-pretty">This goes straight to the owner of {business.name} — it is not posted publicly.</p>

      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="pf-name">Name (optional)</Label>
          <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={100} autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-email">Email (optional)</Label>
          <Input id="pf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" maxLength={200} autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-message">Your feedback</Label>
          <Textarea id="pf-message" value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-28 resize-none" placeholder="Tell us what happened so we can make it right." maxLength={2000} />
        </div>
        <div className="flex items-start gap-2">
          <input type="checkbox" id="pf-consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-4 rounded border-gray-300 text-primary focus:ring-primary" />
          <Label htmlFor="pf-consent" className="text-xs text-muted-foreground leading-relaxed">
            I consent to BEYONDVYU processing my feedback and sharing it with {business.name}. See our{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a>.
          </Label>
        </div>
      </div>

      <div className="mt-auto flex gap-3 pt-6">
        <Button variant="outline" onClick={onBackToReview} className="flex-1">Back</Button>
        <Button onClick={handleSubmit} disabled={message.trim().length < 3 || !consent || submitting} className="flex-1">
          {submitting ? <><Loader2 className="size-4 animate-spin" />Sending...</> : "Send feedback"}
        </Button>
      </div>
    </div>
  )
}

function RedirectPopup({
  business, rating, reviewContent, countdown, onConfirm, demo,
}: {
  business: any; rating: number; reviewContent: string; countdown: number; onConfirm: () => void; demo?: boolean
}) {
  useEffect(() => {
    if (reviewContent.trim()) {
      navigator.clipboard.writeText(reviewContent.trim())
    }
  }, [])

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center text-center p-8 max-w-sm">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500 text-white animate-scale-in shadow-lg">
          <Check className="size-8" strokeWidth={3} />
        </div>
        <h2 className="mt-4 text-xl font-extrabold tracking-tight text-foreground">✓ Copied to clipboard!</h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Redirecting to Google in <span className="font-bold text-foreground">{countdown}</span>...
        </p>
        <div className="mt-4 h-1.5 w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-linear"
            style={{ width: `${((3 - countdown) / 3) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function DoneStep({ business, demo }: { business: any; demo?: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center space-y-4 py-4 animate-fade-in">
      <div className="relative flex size-20 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-30" />
        <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30">
          <Check className="size-9 text-primary" strokeWidth={2.5} />
        </div>
      </div>
      <div className="space-y-2 animate-fade-in-up">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">You're amazing!</h2>
        <p className="text-sm text-muted-foreground text-pretty max-w-xs mx-auto leading-relaxed">
          {demo ? "This is a preview of how your customers will see the review flow." : `Your honest review helps ${business.name} grow and helps future customers make better decisions.`}
        </p>
      </div>
      {!demo && (
        <>
          <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            <Check className="size-3.5" />
            Google review tab opened
          </div>
          <div className="flex gap-1 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <svg key={s} className="size-5 fill-amber-400 text-amber-400" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <div className="mt-4 animate-fade-in-up" style={{ animationDelay: "450ms" }}>
            <p className="text-[10px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
              If you've reviewed this place before — you can{' '}
              <a
                href="https://support.google.com/maps/answer/6230175"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                edit your existing review
              </a>
              {' '}on Google to reflect your new experience instead of posting a second one.
            </p>
          </div>
        </>
      )}
      {demo && (
        <div className="mt-2 space-y-3 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <div className="rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary">
            <Check className="size-3.5 inline mr-1" />
            Preview mode — nothing was saved
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
            This was a demo preview. No data was written to the database. Close this tab to return to the dashboard.
          </p>
        </div>
      )}
    </div>
  )
}

function isGoogleUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    const ALLOWED = ["google.com", "g.co", "maps.google.com", "goo.gl"]
    return ALLOWED.some((d) => hostname === d || hostname.endsWith(`.${d}`))
  } catch {
    return false
  }
}
