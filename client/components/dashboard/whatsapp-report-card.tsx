"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MessageSquare, Loader2, Send, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface Props {
  businessId: string
}

export function WhatsAppReportCard({ businessId }: Props) {
  const [enabled, setEnabled] = useState(false)
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly")
  const [ownerPhone, setOwnerPhone] = useState("")
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [deliveredVia, setDeliveredVia] = useState<string | null>(null)
  const [ownerConsent, setOwnerConsent] = useState(false)
  const [configuredReason, setConfiguredReason] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const s = await api.communications.whatsappReportStatus(businessId)
        if (cancelled) return
        setConfigured(s.whatsappConfigured)
        setConfiguredReason(s.whatsappReason ?? null)
        setDeliveredVia(s.deliveredVia)
        if (s.preference === "weekly" || s.preference === "monthly") {
          setEnabled(true)
          setFrequency(s.preference)
        }
      } catch {
        if (!cancelled) setConfigured(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [businessId])

  function validPhone(v: string) {
    const d = v.replace(/\D/g, "")
    return (
      d.length === 10 ||
      (d.length === 11 && (d.startsWith("0") || d.startsWith("1"))) ||
      (d.length === 12 && d.startsWith("91"))
    )
  }

  async function handleSave() {
    if (enabled && ownerPhone && !validPhone(ownerPhone)) {
      toast.error("Enter a valid mobile number with country code.")
      return
    }
    setSaving(true)
    try {
      const res = await api.communications.whatsappReport({
        businessId,
        frequency: enabled ? frequency : "none",
        ownerPhone: ownerPhone.trim() || undefined,
      })
      setConfigured(res.whatsappConfigured ?? null)
      toast.success(res.message)
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (ownerPhone && !validPhone(ownerPhone)) {
      toast.error("Enter a valid mobile number with country code.")
      return
    }
    setTesting(true)
    setPreview(null)
    try {
      const res = await api.communications.whatsappReport({
        businessId,
        frequency,
        test: true,
        ownerPhone: ownerPhone.trim() || undefined,
        ownerConsent,
      })
      setConfigured(res.whatsappConfigured ?? null)
      setDeliveredVia(res.deliveredVia ?? null)
      setPreview(res.report ?? null)
      if (res.deliveredVia === "whatsapp") toast.success("Test report delivered to WhatsApp.")
      else toast.success(res.message || "Preview generated. Nothing was sent to WhatsApp.")
    } catch (err: any) {
      toast.error(err.message || "Failed to generate preview")
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading WhatsApp settings…
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" />
          <CardTitle>WhatsApp Reputation Pulse</CardTitle>
        </div>
        <CardDescription>
          Weekly digest: feedback volume, review velocity, rating change, top praise/issues, follow-ups.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {configured === false && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              Preview mode. To deliver by WhatsApp, connect your business number in WhatsApp
              automation, add your own payment method in Meta Billing (UPI prepaid or card invoiced), and
              get an Owner report Utility template approved by Meta.
              {configuredReason ? ` ${configuredReason}` : ""}
            </p>
          </div>
        )}
        {configured === true && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <p>
              Your connected WhatsApp number and an approved Owner report template are ready. Add your
              number and confirm opt-in to send a test. Your business pays Meta directly for delivered
              messages.
            </p>
          </div>
        )}

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-foreground">Save weekly/monthly digest preference</span>
        </label>
        <p className="text-[11px] text-muted-foreground">
          This release saves the preference and lets you send a test digest through an approved Meta
          Utility template. Automatic WhatsApp delivery is not enabled yet, so nothing is sent on a
          schedule.
        </p>

        {enabled && (
          <>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="frequency" value="weekly" checked={frequency === "weekly"} onChange={() => setFrequency("weekly")} className="size-4 text-primary focus:ring-primary" />
                <span className="text-sm text-foreground">Weekly</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="frequency" value="monthly" checked={frequency === "monthly"} onChange={() => setFrequency("monthly")} className="size-4 text-primary focus:ring-primary" />
                <span className="text-sm text-foreground">Monthly</span>
              </label>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="wa-owner-phone" className="text-sm font-medium">Owner WhatsApp number (opt-in required)</label>
              <Input
                id="wa-owner-phone"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="e.g. 98200 12345"
                inputMode="tel"
              />
              <p className="text-[11px] text-muted-foreground">
                Your reputation digest includes rating velocity, review highlights, and actionable customer feedback.
              </p>
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={ownerConsent}
                onChange={(e) => setOwnerConsent(e.target.checked)}
                className="mt-0.5 size-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              I confirm this WhatsApp number belongs to me and I agree to receive reputation reports
              from this business.
            </label>
          </>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "Saving..." : "Save"}
          </Button>
          {enabled && (
            <Button onClick={handleTest} disabled={testing} variant="outline" size="sm">
              {testing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {testing ? "Generating..." : "Send test digest / preview"}
            </Button>
          )}
        </div>

        {preview && (
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-semibold text-foreground">
              {deliveredVia === "whatsapp" ? "Delivered to WhatsApp:" : "Preview (not sent to WhatsApp):"}
            </p>
            <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{preview}</pre>
          </div>
        )}

        <Link
          href="/dashboard/whatsapp"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary underline"
        >
          Manage WhatsApp connection and templates <ExternalLink className="size-3" />
        </Link>
      </CardContent>
    </Card>
  )
}
