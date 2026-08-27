"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, ArrowLeft, Check, Plus, X, Search, MapPin, Star, Loader2, AlertCircle, ChevronDown } from "lucide-react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useBusiness } from "@/lib/business-context"
import { INDUSTRY_OPTIONS } from "@/lib/industry-categories"

const INDUSTRIES: { value: string; label: string; topics: string[] }[] = INDUSTRY_OPTIONS

const STEPS = ["Business", "Industry", "Google link", "Done"]

type SearchResult = {
  placeId: string
  name: string
  address: string
  rating: number | null
  totalRatings: number | null
}

export function OnboardingWizard({ embedded, onComplete }: {
  embedded?: boolean;
  onComplete?: () => void;
}) {
  const router = useRouter()
  const { businesses, canAddBusiness, businessLimit, dismissOnboarding, refreshBusinesses } = useBusiness()
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [industry, setIndustry] = useState<string>("")
  const [googleUrl, setGoogleUrl] = useState("")
  const [googlePlaceId, setGooglePlaceId] = useState("")
  const [topics, setTopics] = useState<string[]>([])
  const [newTopic, setNewTopic] = useState("")

  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null)
  const [showManualInput, setShowManualInput] = useState(false)
  const searchAttempted = useRef(false)

  const progress = ((step + 1) / STEPS.length) * 100

  useEffect(() => {
    if (step === 2 && !searchAttempted.current && !selectedPlace && !showManualInput) {
      const query = [name, location].filter(Boolean).join(" ")
      if (query.length > 2) {
        searchAttempted.current = true
        doSearch(query)
      }
    }
  }, [step])

  function selectIndustry(value: string) {
    setIndustry(value)
    const found = INDUSTRIES.find((i) => i.value === value)
    setTopics(found ? found.topics : [])
  }

  function canAdvance() {
    if (step === 0) return name.trim().length > 1
    if (step === 1) return industry !== ""
    if (step === 2) return !!(googleUrl.trim().length > 4 || selectedPlace)
    return true
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
  }

  function addTopic() {
    const t = newTopic.trim()
    if (t && !topics.includes(t)) {
      setTopics((prev) => [...prev, t])
      setNewTopic("")
    }
  }

  async function doSearch(query: string) {
    setSearching(true)
    setSearchResults([])
    try {
      const res = await api.googlePlaces.search(query)
      setSearchResults(res.results)
    } catch (err: any) {
      toast.error(err.message || "Search failed")
    } finally {
      setSearching(false)
    }
  }

  function selectListing(place: SearchResult) {
    setSelectedPlace(place)
    setGooglePlaceId(place.placeId)
    setGoogleUrl(`https://search.google.com/local/writereview?placeid=${place.placeId}`)
  }

  function clearSelection() {
    setSelectedPlace(null)
    setGooglePlaceId("")
    setGoogleUrl("")
  }

  function switchToManual() {
    setShowManualInput(true)
    clearSelection()
  }

  const [finishing, setFinishing] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<{ matchType: string; business: any; isOwnBusiness: boolean } | null>(null)

  async function finish() {
    if (finishing) return
    setFinishing(true)
    try {
      // Pre-check duplicate via PlaceID to give friendly UX before 409
      if (googlePlaceId.trim()) {
        try {
          const dup = await api.businesses.checkDuplicate({ placeId: googlePlaceId.trim(), name: name.trim(), location: location.trim() })
          if (dup.matches && dup.matches.length > 0) {
            const m = dup.matches[0]
            if (m.matchType === "exact_placeid") {
              setDuplicateWarning(m)
              setFinishing(false)
              return
            }
          }
        } catch {}
      }
      await api.businesses.create({
        name: name.trim(),
        industry,
        googleReviewUrl: googleUrl.trim() || undefined,
        googlePlaceId: googlePlaceId.trim() || undefined,
        location: location.trim() || undefined,
        promptTopics: topics,
      });
      toast.success("Business added");
      if (onComplete) {
        onComplete();
      } else {
        await refreshBusinesses();
        router.push("/dashboard");
      }
    } catch (err: any) {
      // Handle backend duplicate guard (409 with code)
      if (err?.code === "PLACEID_ALREADY_OWNED_BY_YOU" || err?.code === "PLACEID_ALREADY_CLAIMED" || err?.status === 409) {
        toast.error(err.message)
        // Try to surface which business conflicts
        try {
          const dup = await api.businesses.checkDuplicate({ placeId: googlePlaceId.trim() })
          if (dup.matches?.[0]) setDuplicateWarning(dup.matches[0])
        } catch {}
      } else {
        toast.error(err.message || "Failed to create business");
      }
    } finally {
      setFinishing(false)
    }
  }

  if (!canAddBusiness && businesses.length > 0) {
    return (
      <div className={cn("mx-auto flex min-w-0 w-full max-w-xl flex-col overflow-hidden", embedded ? "py-2" : "min-h-screen px-4 py-8 sm:px-6")}>
        {!embedded && (
          <div className="flex items-center justify-between">
            <Link href="/" aria-label="BEYONDVYU home">
              <Logo />
            </Link>
          </div>
        )}
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <AlertCircle className="size-7" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Plan limit reached</h1>
          <p className="mt-2 text-muted-foreground">
            Your current plan allows {businessLimit} business{businessLimit !== 1 ? "es" : ""}. You&apos;ve used all {businessLimit}.
          </p>
          {businesses.length > businessLimit && (
            <p className="mt-1 text-sm text-muted-foreground">
              You have {businesses.length} businesses but your plan only covers {businessLimit}. Delete some businesses or upgrade to add more.
            </p>
          )}
          <div className="mt-8 flex gap-3">
            <Link href="/dashboard">
              <Button variant="outline">Go to dashboard</Button>
            </Link>
            <Link href="/dashboard/billing">
              <Button>Upgrade plan</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("mx-auto flex min-w-0 w-full max-w-xl flex-col overflow-hidden", embedded ? "py-2" : "min-h-screen px-4 py-8 sm:px-6")}>
      {!embedded && (
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="BEYONDVYU home">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={() => {
              dismissOnboarding();
              router.push("/dashboard");
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </button>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span>{STEPS[step]}</span>
        </div>
        <Progress value={progress} className="mt-2" />
      </div>

      <div className="mt-10 flex-1">
        {step === 0 && (
          <StepShell title="Tell us about your business" subtitle="We'll use this to find your Google listing automatically.">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="biz-name">Business name</Label>
                <Input
                  id="biz-name"
                  autoFocus
                  placeholder="e.g. Brightsmile Dental Studio"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canAdvance() && next()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-location">
                  City, State
                  <span className="ml-2 text-xs font-normal text-muted-foreground">(helps us find your exact listing)</span>
                </Label>
                <Input
                  id="biz-location"
                  placeholder="e.g. Austin, TX"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canAdvance() && next()}
                />
              </div>
            </div>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell title="What kind of business?" subtitle="We'll tailor the questions we ask your customers.">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select value={industry} onValueChange={(v) => v && selectIndustry(v)}>
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Select an industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {industry && (
              <div className="mt-6">
                <Label>Topics we'll ask customers about</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  These prompts jog your customers&apos; memory. Add or remove any.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {topics.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => setTopics((prev) => prev.filter((x) => x !== t))}
                        aria-label={`Remove ${t}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                {industry === "OTHER" && (
                  <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                    To get the most out of this, add topics that match your business and the things customers care about most.
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="Add a topic"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTopic())}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addTopic} aria-label="Add topic">
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </StepShell>
        )}

        {step === 2 && (
          <StepShell
            title="Find your Google listing"
            subtitle="Select your business from the search results so we can automatically connect your Google review link."
          >
            {selectedPlace ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-4">
                  <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
                    <Check className="size-5" />
                    <span className="font-medium">Connected</span>
                  </div>
                  <div className="mt-3 flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MapPin className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{selectedPlace.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedPlace.address}</p>
                      {selectedPlace.rating && (
                        <div className="mt-1 flex items-center gap-1.5 text-sm">
                          <Star className="size-4 fill-amber-400 text-amber-400" />
                          <span className="font-medium text-foreground">{selectedPlace.rating}</span>
                          {selectedPlace.totalRatings && (
                            <span className="text-muted-foreground">({selectedPlace.totalRatings} reviews)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your Google review URL will be: <code className="rounded bg-muted px-1 py-0.5 font-mono">https://search.google.com/local/writereview?placeid={selectedPlace.placeId.slice(0, 8)}...</code>
                </p>
                <Button variant="ghost" size="sm" onClick={clearSelection} className="text-xs text-muted-foreground">
                  Change selection
                </Button>
              </div>
            ) : showManualInput ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 text-sm text-teal-800 dark:text-teal-200">
                  <p className="font-semibold mb-1">Paste your Google review URL</p>
                  <p className="text-xs text-muted-foreground">
                    Find it in your Google Business Profile dashboard under &ldquo;Get more reviews&rdquo;.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google-url" className="font-semibold">Google Review URL</Label>
                  <Input
                    id="google-url"
                    autoFocus
                    placeholder="https://g.page/r/YOUR_BUSINESS_CUID/review"
                    value={googleUrl}
                    onChange={(e) => setGoogleUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && canAdvance() && next()}
                  />
                </div>
                <Button variant="link" size="sm" onClick={() => { setShowManualInput(false); searchAttempted.current = false; }} className="text-xs">
                  Try auto-search instead
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
                  <Search className="size-4 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Searching for: <strong className="text-foreground">{[name, location].filter(Boolean).join(", ")}</strong>
                  </span>
                </div>

                {searching && (
                  <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                    <Loader2 className="size-5 animate-spin" />
                    <span>Searching Google...</span>
                  </div>
                )}

                {!searching && searchResults.length === 0 && !searchAttempted.current && (
                  <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                    <Loader2 className="size-5 animate-spin" />
                    <span>Preparing search...</span>
                  </div>
                )}

                {!searching && searchResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Select your business:</p>
                    {searchResults.map((place) => (
                      <button
                        key={place.placeId}
                        type="button"
                        onClick={() => selectListing(place)}
                        className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <MapPin className="size-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground">{place.name}</p>
                            <p className="text-sm text-muted-foreground">{place.address}</p>
                            {place.rating && (
                              <div className="mt-1 flex items-center gap-1.5 text-sm">
                                <Star className="size-4 fill-amber-400 text-amber-400" />
                                <span className="font-medium text-foreground">{place.rating}</span>
                                {place.totalRatings && (
                                  <span className="text-muted-foreground">({place.totalRatings} reviews)</span>
                                )}
                              </div>
                            )}
                          </div>
                          <ChevronDown className="size-5 -rotate-90 text-muted-foreground shrink-0 mt-2" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!searching && searchResults.length === 0 && searchAttempted.current && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200">No results found</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          We couldn&apos;t find a matching Google listing. Try entering your URL manually.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!searching && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const query = [name, location].filter(Boolean).join(" ")
                        if (query.length > 2) {
                          searchAttempted.current = true
                          doSearch(query)
                        }
                      }}
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      Search again
                    </button>
                    <span className="mx-2 text-xs text-muted-foreground">or</span>
                    <button
                      type="button"
                      onClick={switchToManual}
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      Enter URL manually
                    </button>
                  </div>
                )}
              </div>
            )}
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title="You're all set" subtitle="Your review-collecting QR code and link are ready to share.">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="size-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{name || "Your business"}</p>
                  {location && <p className="text-sm text-muted-foreground">{location}</p>}
                  <p className="text-sm text-muted-foreground">
                    {INDUSTRIES.find((i) => i.value === industry)?.label ?? "Business"}
                  </p>
                </div>
              </div>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-primary" /> {topics.length} customer prompts configured
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-primary" /> {selectedPlace ? "Google listing connected" : "Google review link connected"}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-primary" /> Compliant AI talking points enabled
                </li>
              </ul>
            </div>
          </StepShell>
        )}
      </div>

      <div className={cn("flex items-center justify-between", embedded ? "mt-6" : "mt-8")}>
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className={step === 0 ? "invisible" : ""}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next} disabled={!canAdvance()}>
            Continue
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={finish} disabled={finishing}>
            {finishing ? <><Loader2 className="size-4 animate-spin" /> Adding...</> : <>{embedded ? "Add business" : "Go to dashboard"} <ArrowRight className="size-4" /></>}
          </Button>
        )}
      </div>
      {duplicateWarning && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {duplicateWarning.isOwnBusiness ? "You already have this business" : "This Google location is already registered"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {duplicateWarning.isOwnBusiness
                  ? `You already have "${duplicateWarning.business.name}" with the same Google Place ID. Please use the existing business or change the Google listing.`
                  : `"${duplicateWarning.business.name}" with this Google Place ID is already registered by another account. If this is your business on Google, connect your Google Business Profile in Settings to request ownership.`}
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setDuplicateWarning(null); setSelectedPlace(null); setGooglePlaceId(""); setGoogleUrl("")}}>
                  Change Google listing
                </Button>
                {!duplicateWarning.isOwnBusiness && <Link href="/dashboard/settings"><Button variant="ghost" size="sm">Go to Settings</Button></Link>}
                {duplicateWarning.isOwnBusiness && <Link href="/dashboard"><Button variant="ghost" size="sm">Go to dashboard</Button></Link>}
                <button onClick={() => setDuplicateWarning(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  )
}
