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

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const reviewUrl = origin ? `${origin}/r/${slug}` : `/r/${slug}`

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
      const res = await api.qr.generate(businessId)
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
    navigator.clipboard?.writeText(reviewUrl)
    toast.success("Review link copied")
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
    const text = encodeURIComponent(`Hi! We would love to hear your feedback on your recent visit to ${businessName}. Please take 1 minute to share it here: ${reviewUrl}`)
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
      <Card className="p-6 flex flex-col items-center text-center justify-between">
        <div>
          <h2 className="font-semibold text-lg text-foreground">In-Store QR & NFC</h2>
          <p className="text-sm text-muted-foreground">For table stands, checkouts, or programmable NFC tags</p>
        </div>
        <div className="my-5 rounded-2xl border border-border bg-white p-4">
          <canvas ref={canvasRef} aria-label={`QR code for ${businessName} reviews`} />
        </div>
        <div className="flex flex-col w-full gap-2 mt-auto">
          <div className="flex gap-2">
            <Button className="flex-1" onClick={download}>
              <Download className="size-4" />
              Download PNG
            </Button>
            <Button variant="outline" className="flex-1" onClick={copyLink}>
              <Copy className="size-4" />
              Copy link
            </Button>
          </div>
          <Button variant="secondary" onClick={handleGenerate} disabled={generating} className="w-full flex items-center justify-center gap-2">
            {generating ? <Loader2 className="size-4 animate-spin" /> : <QrIcon className="size-4" />}
            {generating ? "Saving…" : "Save QR code to account"}
          </Button>
          <Button variant="ghost" className="w-full flex items-center justify-center gap-2" onClick={programNfcInstructions}>
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
