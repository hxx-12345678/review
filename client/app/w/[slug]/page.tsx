"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Check, Loader2, MessageSquareHeart, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function WhatsAppOptInPage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || "")
  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [consent, setConsent] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    api.v2.whatsapp
      .publicBusiness(slug)
      .then((res) => {
        if (!cancelled) setBusiness(res.business)
      })
      .catch(() => {
        if (!cancelled) toast.error("This WhatsApp sign-up link is not available.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) {
      toast.error("Enter your WhatsApp number")
      return
    }
    if (!consent) {
      toast.error("Please confirm you want WhatsApp messages from this business")
      return
    }
    setSaving(true)
    try {
      await api.v2.whatsapp.publicOptIn({
        businessSlug: slug,
        phone: phone.trim(),
        name: name.trim() || undefined,
        consent: true,
        marketingConsent: marketing,
        source: "public_optin_page",
        referrer: "qr_or_link",
      })
      setDone(true)
    } catch (err: any) {
      toast.error(err?.message || "Could not save your consent")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    )
  }

  if (!business) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm p-6 text-center">
          <p className="text-sm font-semibold">This link is not available</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Ask the business for a current WhatsApp sign-up link.
          </p>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="border-b bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <div className="flex items-center gap-3">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt=""
                className="size-12 rounded-xl border bg-white object-contain p-1"
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                {String(business.name || "B").slice(0, 1)}
              </div>
            )}
            <div>
              <h1 className="font-heading text-lg font-bold tracking-tight">{business.name}</h1>
              <p className="text-xs text-muted-foreground">WhatsApp updates</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {done ? (
            <div className="space-y-3 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-7" />
              </div>
              <h2 className="text-lg font-bold">You're on the list</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {business.name} can now reply about your visit and send the updates you agreed to.
                Reply STOP at any time to opt out.
              </p>
            </div>
          ) : !business.whatsappConnected ? (
            <div className="space-y-2 text-center">
              <MessageSquareHeart className="mx-auto size-8 text-muted-foreground" />
              <h2 className="text-base font-semibold">WhatsApp is not connected yet</h2>
              <p className="text-sm text-muted-foreground">
                {business.name} has not finished connecting its WhatsApp Business number. Please try
                again later.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Get updates on WhatsApp</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  This is optional. {business.name} will use WhatsApp to reply about your visit,
                  send review requests, and share only the updates you agree to. Message frequency
                  varies. Reply STOP to opt out.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">Your name (optional)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  autoComplete="name"
                  placeholder="e.g. Priya"
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs">WhatsApp number</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={30}
                  placeholder="+91 98765 43210"
                  className="h-10 text-sm"
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  Use the number that has WhatsApp, including the country code.
                </p>
              </div>

              <label className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                />
                <span>
                  I agree to receive WhatsApp messages from {business.name} about my visit,
                  feedback, service updates, and review requests.
                </span>
              </label>

              <label className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                />
                <span>
                  I also agree to receive offers and promotions from {business.name}. This is
                  optional.
                </span>
              </label>

              <Button type="submit" className="w-full gap-2" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                {saving ? "Saving..." : "Join WhatsApp updates"}
              </Button>
              <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
                Your number is used only for messages from {business.name}. It is not sold or shared
                with other businesses.
              </p>
            </form>
          )}
        </div>
      </Card>
    </main>
  )
}
