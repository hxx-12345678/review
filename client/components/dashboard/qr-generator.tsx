"use client"

import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import { Download, Copy, Link2, QrCode as QrIcon, Smartphone, Loader2, Send, MessageCircle, Mail, Nfc } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { api } from "@/lib/api"

export function QrGenerator({ slug, businessName, businessId }: { slug: string; businessName: string; businessId?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [origin, setOrigin] = useState("")
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  // Custom text triggers for multi-channel collection
  const [smsPhone, setSmsPhone] = useState("")
  const [waPhone, setWaPhone] = useState("")
  const [emailAddr, setEmailAddr] = useState("")
  const [sendingSms, setSendingSms] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  // Sub-QR attribution (Table or Waiter/Staff tracking)
  const [attributionType, setAttributionType] = useState<"general" | "table" | "staff">("general")
  const [attributionValue, setAttributionValue] = useState("")

  // Physical/digital placement. This is what the digest reports, separately
  // from the table/staff attribution above.
  const [touchpoint, setTouchpoint] = useState<
    "general" | "table" | "bill" | "packaging" | "reception" | "takeaway"
  >("general")

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const params = new URLSearchParams()
  if (touchpoint !== "general") params.set("touchpoint", touchpoint)
  if (attributionType === "table" && attributionValue.trim()) {
    params.set("table", attributionValue.trim())
  }
  if (attributionType === "staff" && attributionValue.trim()) {
    params.set("staff", attributionValue.trim())
  }
  const paramString = params.toString() ? `?${params.toString()}` : ""

  const reviewUrl = origin ? `${origin}/r/${slug}${paramString}` : `/r/${slug}${paramString}`

  function channelUrl(channel: "whatsapp" | "sms" | "email") {
    const channelParams = new URLSearchParams(params)
    channelParams.set("touchpoint", channel)
    const query = channelParams.toString()
    return origin ? `${origin}/r/${slug}?${query}` : `/r/${slug}?${query}`
  }

  useEffect(() => {
    if (canvasRef.current && origin) {
      QRCode.toCanvas(canvasRef.current, reviewUrl, {
        width: 240,
        margin: 2,
        color: { dark: "#1c3a35", light: "#ffffff" },
        errorCorrectionLevel: "H",
      }).catch(() => {})
    }
  }, [reviewUrl, origin])

  async function handleGenerate() {
    if (!businessId) return
    setGenerating(true)
    try {
      const res = await api.qr.generate(businessId, {
        touchpoint: touchpoint !== "general" ? touchpoint : undefined,
        table:
          attributionType === "table" && attributionValue.trim()
            ? attributionValue.trim()
            : undefined,
        staff:
          attributionType === "staff" && attributionValue.trim()
            ? attributionValue.trim()
            : undefined,
      })
      setPngDataUrl(res.pngDataUrl)
      toast.success("QR code saved to your account")
    } catch {
      toast.error("Failed to save QR code")
    } finally {
      setGenerating(false)
    }
  }

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement("a")
    link.download = `${slug}-review-qr.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
    toast.success("QR code downloaded")
  }

  function copyLink() {
    try {
      const p = navigator.clipboard?.writeText(reviewUrl)
      if (p && typeof p.catch === "function") {
        p.then(() => toast.success("Review link copied")).catch(() => toast.error("Copy failed — long-press the link to copy manually"))
        return
      }
      toast.success("Review link copied")
    } catch {
      toast.error("Copy failed — long-press the link to copy manually")
    }
  }

  // Multi-channel trigger functions (SMS, WA, Email, NFC)
  async function triggerSmsLink() {
    if (!smsPhone.trim()) {
      toast.error("Please enter a valid phone number")
      return
    }
    if (!businessId) {
      toast.error("Business not found")
      return
    }
    setSendingSms(true)
    try {
      await api.communications.sendSms({
        businessId,
        toPhone: smsPhone.replace(/\D/g, ""),
      })
      toast.success(`Review request SMS sent to ${smsPhone}`)
      setSmsPhone("")
    } catch (err: any) {
      toast.error(err.message || "Failed to send SMS")
    } finally {
      setSendingSms(false)
    }
  }

  function openWhatsAppLink() {
    if (!waPhone.trim()) {
      toast.error("Please enter a phone number")
      return
    }
    // Clean phone number
    const cleanedPhone = waPhone.replace(/\D/g, "")
    const whatsappUrl = channelUrl("whatsapp")
    const text = encodeURIComponent(`Hi! We would love to hear your feedback on your recent visit to ${businessName}. Please take 1 minute to share it here: ${whatsappUrl}`)
    window.open(`https://wa.me/${cleanedPhone}?text=${text}`, "_blank", "noopener,noreferrer")
    toast.success("WhatsApp web redirect opened successfully")
  }

  async function triggerEmailLink() {
    if (!emailAddr.trim() || !emailAddr.includes("@")) {
      toast.error("Please enter a valid email address")
      return
    }
    if (!businessId) {
      toast.error("Business not found")
      return
    }
    setSendingEmail(true)
    try {
      await api.communications.sendEmail({
        businessId,
        toEmail: emailAddr,
      })
      toast.success(`Review request email sent to ${emailAddr}`)
      setEmailAddr("")
    } catch (err: any) {
      toast.error(err.message || "Failed to send email")
    } finally {
      setSendingEmail(false)
    }
  }

  function programNfcInstructions() {
    toast.info("Program this link into any NTAG213 NFC chip using standard mobile apps like NFC Tools.", {
      description: reviewUrl,
      duration: 10000,
    })
  }

  return (
    <div className="grid gap-6 p-4 sm:p-8 lg:grid-cols-2">
      {/* QR & NFC card */}
      <Card className="flex flex-col items-center justify-between p-5 text-center sm:p-6">
        <div className="w-full text-center">
          <h2 className="font-semibold text-lg text-foreground">In-Store QR & NFC</h2>
          <p className="text-sm text-muted-foreground">For table stands, checkouts, staff badges, or programmable NFC tags</p>

          {/* Touchpoint placement — drives the digest's per-touchpoint funnel */}
          <div className="mt-4 flex flex-col gap-2 rounded-xl bg-muted/40 p-3 text-left border">
            <span className="text-xs font-semibold text-foreground">Where will this QR live?</span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "general", label: "General" },
                { id: "table", label: "Table stand" },
                { id: "bill", label: "Bill / checkout" },
                { id: "packaging", label: "Packaging" },
                { id: "reception", label: "Reception" },
                { id: "takeaway", label: "Takeaway" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTouchpoint(opt.id as any)}
                  className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all ${
                    touchpoint === opt.id
                      ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">
              We report feedback and Google-post taps per touchpoint, so you can see which placement works.
            </span>
          </div>

          {/* Quick Staff / Table Attribution Selector */}
          <div className="mt-4 flex flex-col gap-2 rounded-xl bg-muted/40 p-3 text-left border">
            <span className="text-xs font-semibold text-foreground">Target Attribution:</span>
            <div className="flex gap-2">
              {[
                { id: "general", label: "General" },
                { id: "table", label: "Table Specific" },
                { id: "staff", label: "Staff / Waiter" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setAttributionType(opt.id as any)
                    if (opt.id === "general") setAttributionValue("")
                  }}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all ${
                    attributionType === opt.id
                      ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {attributionType !== "general" && (
              <div className="mt-1 flex gap-2">
                <Input
                  placeholder={attributionType === "table" ? "e.g. Table 4, Booth A" : "e.g. Rahul, Sarah"}
                  value={attributionValue}
                  onChange={(e) => setAttributionValue(e.target.value)}
                  maxLength={attributionType === "table" ? 40 : 80}
                  className="h-8 text-xs bg-card"
                />
              </div>
            )}
            <span className="text-[10px] text-muted-foreground truncate">
              Preview URL: <span className="font-mono text-foreground font-medium">{reviewUrl}</span>
            </span>
          </div>
        </div>
        <div className="my-5 rounded-2xl border border-border bg-white p-4">
          <canvas ref={canvasRef} aria-label={`QR code for ${businessName} reviews`} />
        </div>
        <div className="mt-5 flex w-full flex-col gap-2 sm:mt-auto">
          <div className="flex gap-2">
            <Button className="flex-1" onClick={download}>
              <Download className="size-4" />
              <span className="hidden sm:inline">Download PNG</span>
              <span className="sm:hidden">Download</span>
            </Button>
            <Button variant="outline" className="flex-1" onClick={copyLink}>
              <Copy className="size-4" />
              Copy link
            </Button>
          </div>
          <Button variant="secondary" onClick={handleGenerate} disabled={generating} className="flex w-full items-center justify-center gap-2">
            {generating ? <Loader2 className="size-4 animate-spin" /> : <QrIcon className="size-4" />}
            {generating ? "Saving…" : "Save QR code to account"}
          </Button>
          <Button variant="ghost" className="flex w-full items-center justify-center gap-2" onClick={programNfcInstructions}>
            <Nfc className="size-4 text-emerald-600" />
            NFC Write Instructions
          </Button>
        </div>
      </Card>

      {/* Multi-channel Customer Triggers */}
      <div className="space-y-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="size-5 text-indigo-500" />
            <h2 className="font-semibold text-foreground">Send SMS review request</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sms-phone">Customer Phone (with country code)</Label>
            <div className="flex gap-2">
              <Input
                id="sms-phone"
                placeholder="+15550199"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
              />
              <Button onClick={triggerSmsLink} disabled={sendingSms} size="icon" className="shrink-0">
                {sendingSms ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-5 text-green-500" />
            <h2 className="font-semibold text-foreground">Share via WhatsApp</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wa-phone">Customer WhatsApp Number</Label>
            <div className="flex gap-2">
              <Input
                id="wa-phone"
                placeholder="15550199"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
              />
              <Button onClick={openWhatsAppLink} variant="outline" className="shrink-0 flex gap-2">
                Open Chat
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="size-5 text-amber-500" />
            <h2 className="font-semibold text-foreground">Send Email review request</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-addr">Customer Email address</Label>
            <div className="flex gap-2">
              <Input
                id="email-addr"
                type="email"
                placeholder="customer@example.com"
                value={emailAddr}
                onChange={(e) => setEmailAddr(e.target.value)}
              />
              <Button onClick={triggerEmailLink} disabled={sendingEmail} size="icon" className="shrink-0">
                {sendingEmail ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
