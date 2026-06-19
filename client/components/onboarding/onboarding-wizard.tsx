"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, ArrowLeft, Check, Plus, X } from "lucide-react"
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

const INDUSTRIES: { value: string; label: string; topics: string[] }[] = [
  { value: "DENTAL", label: "Dental practice", topics: ["Your dentist or hygienist", "Office cleanliness", "Wait time", "How treatment felt"] },
  { value: "SALON", label: "Salon / Spa", topics: ["Your stylist", "The result", "Atmosphere", "Booking experience"] },
  { value: "RESTAURANT", label: "Restaurant", topics: ["A standout dish", "Service & staff", "Atmosphere", "Value"] },
  { value: "MEDICAL", label: "Medical clinic", topics: ["Your provider", "Front desk staff", "Wait time", "How you were treated"] },
  { value: "AUTO", label: "Auto services", topics: ["The technician", "Quality of work", "Pricing transparency", "Turnaround time"] },
  { value: "FITNESS", label: "Gym / Fitness", topics: ["Your trainer or class", "Equipment & facilities", "Cleanliness", "Community"] },
  { value: "GYM", label: "Gym", topics: ["Equipment", "Classes", "Cleanliness", "Staff"] },
  { value: "HOME_SERVICES", label: "Home services", topics: ["The technician", "Quality of work", "Punctuality", "Communication"] },
  { value: "OTHER", label: "Other", topics: ["The staff", "Quality", "Value", "Overall experience"] },
]

const STEPS = ["Business", "Industry", "Google link", "Done"]

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [industry, setIndustry] = useState<string>("")
  const [googleUrl, setGoogleUrl] = useState("")
  const [topics, setTopics] = useState<string[]>([])
  const [newTopic, setNewTopic] = useState("")

  const progress = ((step + 1) / STEPS.length) * 100

  function selectIndustry(value: string) {
    setIndustry(value)
    const found = INDUSTRIES.find((i) => i.value === value)
    setTopics(found ? found.topics : [])
  }

  function canAdvance() {
    if (step === 0) return name.trim().length > 1
    if (step === 1) return industry !== ""
    if (step === 2) return googleUrl.trim().length > 4
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

  async function finish() {
    try {
      await api.businesses.create({
        name: name.trim(),
        industry,
        googleReviewUrl: googleUrl.trim() || undefined,
        promptTopics: topics,
      });
      toast.success("Your ReviewOS workspace is ready");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to create business");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <Link href="/" aria-label="ReviewOS home">
          <Logo />
        </Link>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          Skip for now
        </Link>
      </div>

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
          <StepShell title="What's your business name?" subtitle="This is what customers will see when they leave a review.">
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
            title="Connect your Google review link"
            subtitle="This is the most critical step. Having a direct Google review link bypasses standard Maps navigation, taking customers straight to the 'Write a Review' box, which boosts conversions by up to 300%."
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 text-sm text-teal-800 dark:text-teal-200">
                <span className="font-semibold block mb-1">💡 How to find your direct review link:</span>
                <ol className="list-decimal pl-4 space-y-1 text-xs text-muted-foreground">
                  <li>Go to Google Search or Maps and search for your business.</li>
                  <li>If logged into your business account, tap the <strong>"Get more reviews"</strong> or <strong>"Ask for reviews"</strong> card.</li>
                  <li>Copy the shortened Google link (looks like <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">https://g.page/r/...</code> or <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">https://g.co/kgs/...</code>).</li>
                </ol>
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

              <div className="rounded-lg border bg-card p-3.5 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">🔗 Supported Formats & Workarounds:</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>Official: <code className="bg-muted px-1 py-0.2 rounded font-mono">https://g.page/r/[BusinessID]/review</code></li>
                  <li>Maps Search URL: <code className="bg-muted px-1 py-0.2 rounded font-mono">https://maps.google.com/?cid=[ID]</code></li>
                  <li>Local Search Write-Review (bypasses Maps): <code className="bg-muted px-1 py-0.2 rounded font-mono">https://search.google.com/local/writereview?placeid=[PlaceID]</code></li>
                </ul>
                <p className="text-[10px] text-orange-600/90 dark:text-orange-400">
                  ⚠️ Service area businesses or D2C brands: Search your business name on the Google Place ID Finder website or construct using your Google Maps Place ID.
                </p>
              </div>
            </div>
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
                  <Check className="size-4 text-primary" /> Google review link connected
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-primary" /> Compliant AI talking points enabled
                </li>
              </ul>
            </div>
          </StepShell>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
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
          <Button onClick={finish}>
            Go to dashboard
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
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
