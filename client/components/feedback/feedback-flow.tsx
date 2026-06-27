"use client"

import { useState, useEffect, useRef } from "react"
import { ExternalLink, Sparkles, Loader2, Check, MessageSquareHeart, ArrowRight, ArrowLeft, Stethoscope, Scissors, Dumbbell, Home, Utensils, Car, ShieldCheck, Lock, Award, Star, ThumbsUp, Meh, Frown, PenLine, RefreshCw, Lightbulb, SmilePlus, ChevronDown } from "lucide-react"
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

type Step = "loading" | "welcome" | "rate" | "describe" | "review" | "private" | "redirect" | "done"

export function FeedbackFlow({ business, slug, demo: isDemo = false }: { business: any; slug?: string; demo?: boolean }) {
  const [step, setStep] = useState<Step>("loading")
  const [rating, setRating] = useState(0)
  const [highlights, setHighlights] = useState("")
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
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
    const text = highlights.trim()
    const combined = text || (selectedTopics.length > 0 ? selectedTopics.join(", ") : "")

    setCombinedInput(combined)
    setAuthenticity(scoreAuthenticity(text || selectedTopics.join(" ")))

    if (!feedbackId) {
      const id = await submitFeedback({ liked: text || undefined })
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
            selectedTopics,
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

  const [redirectContent, setRedirectContent] = useState("")

  function handlePostToGoogle(content: string) {
    if (content.trim()) {
      navigator.clipboard.writeText(content.trim())
    }
    setRedirectContent(content)
    setStep("redirect")
  }

  function confirmGooglePost() {
    const googleUrl = (business.googleReviewUrl || "").trim()
    let targetUrl = googleUrl
    if (targetUrl && !/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`
    }

    if (targetUrl && !isDemo) {
      window.open(targetUrl, "_blank", "noopener,noreferrer")
    }

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

  // Brand colors are injected via useEffect above
  // Loading is handled by BrandedLoading component with onReady callback

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

      <Card className="flex flex-1 flex-col p-6 overflow-hidden min-h-[480px] justify-between shadow-xl border border-border bg-card">
        {step === "loading" && (
          <BrandedLoading
            business={business}
            onReady={() => setStep("rate")}
            minDuration={1500}
          />
        )}
        {step === "welcome" && <WelcomeStep business={business} onStart={() => setStep("rate")} />}
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
            rawHighlights={highlights}
            selectedTopics={selectedTopics}
            authenticity={authenticity}
            submitting={submitting}
            onPostToGoogle={handlePostToGoogle}
            onPrivate={() => setStep("private")}
            onBack={() => { setStep("describe"); setCustomerReview("") }}
            businessName={business.name}
            language={language}
            rating={rating}
            customerReview={customerReview}
            onReviewChange={setCustomerReview}
          />
        )}
        {step === "private" && (
          <PrivateStep
            business={business}
            rating={rating}
            combinedInput={combinedInput || highlights}
            customerReview={customerReview}
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
        {step === "redirect" && (
          <RedirectStep
            business={business}
            rating={rating}
            reviewContent={redirectContent}
            onConfirm={confirmGooglePost}
            onSkip={() => setStep("done")}
            demo={isDemo}
          />
        )}
        {step === "done" && <DoneStep business={business} onPrivate={() => setStep("private")} demo={isDemo} />}
      </Card>

      {step !== "welcome" && step !== "loading" && (
        <footer className="mt-6 text-center text-xs text-muted-foreground">
          <p className="text-pretty">
            A helpful draft based on what you shared — <span className="font-semibold text-foreground/70">you&apos;re in control</span>. Edit
            freely, regenerate, or write from scratch. Your review, your voice.
          </p>
          {business.showPoweredBy !== false && (
            <p className="mt-2 text-[10px] text-muted-foreground/40 select-none">
              powered by <span className="font-extrabold text-foreground/50 tracking-tight">ReviewOS</span>
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
          <span className="font-extrabold text-foreground tracking-tight bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">ReviewOS</span>
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

function DescribeStep({
  business, rating, highlights, setHighlights, selectedTopics, toggleTopic, language, setLanguage, onContinue, onBack, submitting,
}: {
  business: any; rating: number; highlights: string; setHighlights: (v: string) => void; selectedTopics: string[]; toggleTopic: (t: string) => void; language: string; setLanguage: (v: string) => void; onContinue: () => void; onBack: () => void; submitting: boolean
}) {
  const config = getReviewStepConfig(rating)
  const canContinue = highlights.trim().length >= 3 || selectedTopics.length > 0
  const charCount = highlights.length
  const moodKey = getMoodKey(rating)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const quickTags = moodKey === "positive"
    ? ["Friendly staff", "Great service", "Clean environment", "Professional", "Highly skilled", "Convenient", "Good value", "Would come back"]
    : moodKey === "neutral"
      ? ["Decent service", "Average experience", "Okay but room to grow", "Not bad not great", "Some highlights some lows", "Fair enough", "Middle of the road", "Could improve"]
      : ["Slow service", "Rude staff", "Unclean", "Too expensive", "Long wait", "Unprofessional", "Misleading", "Would not return"]

  return (
    <div className="flex flex-1 flex-col animate-fade-in-up gap-0">
      <div className="text-center mb-4">
        <div className={cn("inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold",
          moodKey === "positive" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
          moodKey === "neutral" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
          "bg-red-500/10 text-red-600 dark:text-red-400")}>
          {moodKey === "positive" ? <ThumbsUp className="size-4" /> : moodKey === "neutral" ? <Meh className="size-4" /> : <Frown className="size-4" />}
          {moodKey === "positive" ? "You had a great experience!" : moodKey === "neutral" ? "Thanks for the honest feedback" : "We'd love to hear more"}
        </div>
      </div>

      <h2 className="text-balance text-xl font-bold tracking-tight text-foreground text-center">
        {config.describePrompt}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground text-pretty text-center">{config.describeHint}</p>

      <div className="mt-5 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <SmilePlus className="size-3.5 text-primary" />
          <span>Quick select what fits</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(MOOD_TAGS).map(([key, tag]) => {
            const isActive = activeCategory === key
            const tagTopics = tag[moodKey]
            const hasSelected = tagTopics.some(t => selectedTopics.includes(t))
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveCategory(isActive ? null : key)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm",
                  isActive
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                    : hasSelected
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-border bg-card/50 text-muted-foreground hover:border-foreground/30 hover:bg-card"
                )}
              >
                {tag.icon}
                <span className="flex-1 text-left">{tag.label}</span>
                {hasSelected && <Check className="size-3 text-primary shrink-0" />}
              </button>
            )
          })}
        </div>

          {activeCategory && (
          <div className="flex flex-wrap gap-1.5 mt-2 p-3 rounded-xl bg-muted/30 border border-border/50 animate-fade-in-up">
            {MOOD_TAGS[activeCategory][moodKey].map((topic) => {
              const isSelected = selectedTopics.includes(topic)
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  aria-pressed={isSelected}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-200 flex items-center gap-1",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  )}
                >
                  {isSelected && <Check className="size-3" />}
                  {topic}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {business.promptTopics && business.promptTopics.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <MessageSquareHeart className="size-3.5 text-primary" />
            <span>Or select what stood out</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {business.promptTopics.map((topic: string) => {
              const isSelected = selectedTopics.includes(topic)
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  aria-pressed={isSelected}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 shadow-sm",
                    isSelected
                      ? "border-primary bg-gradient-to-br from-primary/15 to-primary/5 text-primary scale-[1.03] ring-1 ring-primary/30"
                      : "border-border bg-card/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-card"
                  )}
                >
                  {isSelected && <Check className="size-3 text-primary animate-scale-in" />}
                  {topic}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-1.5 relative">
        <div className="flex justify-between items-center px-0.5">
          <label htmlFor="describe-highlights" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Share details in your own words
          </label>
          <span className={cn("text-[10px] font-bold tracking-tight", charCount > 450 ? "text-destructive" : charCount >= 3 ? "text-primary" : "text-muted-foreground")}>
            {charCount}/500
          </span>
        </div>
        <Textarea
          ref={textareaRef}
          id="describe-highlights"
          value={highlights}
          onChange={(e) => setHighlights(e.target.value)}
          placeholder={moodKey === "positive" ? "e.g. The quality was great and they really cared about getting it right." : moodKey === "neutral" ? "e.g. The service was decent but there's room for improvement in some areas." : "e.g. I had to wait much longer than expected and it wasn't a great experience."}
          className="min-h-24 resize-none rounded-xl border border-border bg-card/30 p-3 shadow-inner focus:bg-card focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-200"
          autoFocus
          maxLength={500}
        />
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground/80 bg-muted/40 border border-border/40 rounded-xl p-3 shadow-sm">
        <Lightbulb className="size-4 text-amber-500 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          {selectedTopics.length > 0
            ? "Great choices! We'll turn your selections into personalized talking points for your review."
            : "Select a few options or type your own details above to get started."}
        </span>
      </div>

      <div className="mt-4 space-y-1.5">
        <label htmlFor="language-select" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
          Preferred Language for Suggestions
        </label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full rounded-xl border border-border bg-card/60 px-3.5 py-2.5 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:bg-card outline-none transition-all shadow-sm cursor-pointer"
        >
          <option value="english">Standard English</option>
          <option value="hinglish">Hinglish (Hindi + English)</option>
          <option value="gujlish">Gujlish (Gujarati + English)</option>
          <option value="hindi">Hindi (हिंदी)</option>
          <option value="gujarati">Gujarati (ગુજરાતી)</option>
        </select>
      </div>

      <div className="mt-auto flex gap-3 pt-6">
        <Button variant="outline" onClick={onBack} disabled={submitting} className="flex-1 rounded-xl py-6 font-semibold">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button onClick={onContinue} disabled={!canContinue || submitting} className="flex-1 rounded-xl py-6 font-semibold bg-gradient-to-r from-primary to-primary/95 hover:from-primary/95 hover:to-primary text-primary-foreground shadow-md hover:shadow-lg transition-all transform active:scale-95">
          {submitting ? (
            <><Loader2 className="mr-2 size-4 animate-spin" />Continuing...</>
          ) : (
            <><span>Continue</span><ArrowRight className="size-4" /></>
          )}
        </Button>
      </div>
    </div>
  )
}

function ReviewStep({
  config, talkingPoints, loadingPoints, combinedInput, rawHighlights, selectedTopics, authenticity, submitting, onPostToGoogle, onPrivate, onBack, businessName, language, rating, customerReview, onReviewChange,
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
  onPrivate: () => void
  onBack: () => void
  businessName: string
  language: string
  rating: number
  customerReview: string
  onReviewChange: (v: string) => void
}) {
  const [generatingReview, setGeneratingReview] = useState(false)
  const [reviewGenerated, setReviewGenerated] = useState(false)
  const [talkingPointsExpanded, setTalkingPointsExpanded] = useState(true)
  const [copiedReview, setCopiedReview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasReminders = talkingPoints.length > 0

  async function generateReview() {
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
          rating,
          language,
          talkingPoints,
        }),
      })
      if (!res.ok) throw new Error("API error")
      const data = await res.json()
      if (data.review) {
        onReviewChange(data.review)
        setReviewGenerated(true)
      }
    } catch {
      // Fallback already handled by the API route
    } finally {
      setGeneratingReview(false)
    }
  }

  useEffect(() => {
    if (!reviewGenerated && !customerReview && (combinedInput || hasReminders)) {
      const timer = setTimeout(() => {
        generateReview()
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [])

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
            onClick={generateReview}
            disabled={generatingReview || (!combinedInput && !hasReminders)}
            className={cn(
              "rounded-lg text-xs h-9 px-3 transition-all",
              !hasContent && !generatingReview && "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-sm hover:shadow-md"
            )}
          >
            {generatingReview ? (
              <Loader2 className="size-3.5 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className={cn("size-3.5 mr-1.5", !hasContent && !generatingReview && "text-primary-foreground")} />
            )}
            {generatingReview
              ? "Generating..."
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
            I consent to ReviewOS processing my feedback and sharing it with {business.name}. See our{" "}
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

function RedirectStep({
  business, rating, reviewContent, onConfirm, onSkip, demo,
}: {
  business: any; rating: number; reviewContent: string; onConfirm: () => void; onSkip: () => void; demo?: boolean
}) {
  const [copiedAgain, setCopiedAgain] = useState(false)
  const [opening, setOpening] = useState(false)

  async function handleCopyAgain() {
    if (reviewContent.trim()) {
      await navigator.clipboard.writeText(reviewContent.trim())
      setCopiedAgain(true)
      toast.success("Review copied to clipboard!")
      setTimeout(() => setCopiedAgain(false), 2000)
    }
  }

  async function handleOpenGoogle() {
    setOpening(true)
    try {
      await navigator.clipboard.writeText(reviewContent.trim())
    } catch {}
    await new Promise((r) => setTimeout(r, 600))
    onConfirm()
  }

  return (
    <div className="flex flex-1 flex-col animate-fade-in py-2">
      <div className="flex flex-col items-center text-center mb-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary animate-scale-in">
          <Check className="size-7" strokeWidth={2.5} />
        </div>
        <h2 className="mt-3 text-xl font-extrabold tracking-tight text-foreground">Review copied!</h2>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty max-w-xs leading-relaxed">
          Your review is now on your clipboard. Follow the 2 steps below to post it on Google.
        </p>
      </div>

      <div className="space-y-3 mt-2">
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/50 p-3.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Open Google Maps</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Tap the button below to open <span className="font-medium text-foreground/80">{business.name}</span>&apos;s Google review page.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/50 p-3.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold">2</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Paste &amp; verify your rating</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Long-press the text box on Google and tap <span className="font-medium text-foreground/80">Paste</span>. Then set the rating to{' '}
              <span className="inline-flex items-center gap-0.5 align-middle">
                {rating} <Star className="size-3 fill-amber-400 text-amber-400" />
              </span>{' '}
              to match what you selected earlier.
            </p>
          </div>
        </div>
      </div>

      {reviewContent.trim() && (
        <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Your review</span>
            <button
              type="button"
              onClick={handleCopyAgain}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
            >
              {copiedAgain ? <Check className="size-3" /> : <PenLine className="size-3" />}
              {copiedAgain ? "Copied" : "Copy again"}
            </button>
          </div>
          <p className="text-xs text-foreground leading-relaxed line-clamp-3 select-all">{reviewContent}</p>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-6">
        <Button
          onClick={handleOpenGoogle}
          size="lg"
          disabled={opening}
          className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {opening ? (
            <><Loader2 className="size-4 animate-spin mr-2" />Opening Google...</>
          ) : (
            <><ExternalLink className="size-4 mr-2" />Open Google Maps &amp; paste review</>
          )}
        </Button>
        <Button onClick={onSkip} variant="outline" size="lg" className="w-full">
          I&apos;ll do this later
        </Button>
      </div>
    </div>
  )
}

function DoneStep({ business, onPrivate, demo }: { business: any; onPrivate: () => void; demo?: boolean }) {
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
          <button type="button" onClick={onPrivate} className="mt-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 animate-fade-in-up" style={{ animationDelay: "350ms" }}>
            Want to tell the owner something privately?
          </button>
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
