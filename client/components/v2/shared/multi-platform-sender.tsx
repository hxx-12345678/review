"use client"

import { useState } from "react"
import {
  Send,
  Smartphone,
  MessageSquare,
  Mail,
  Clock,
  Loader2,
  Check,
  ChevronDown,
} from "lucide-react"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Props {
  businessId: string
  businessName: string
}

const channelMeta = {
  sms: { label: "SMS", icon: Smartphone, color: "bg-purple-500/10 text-purple-600" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "bg-green-500/10 text-green-600" },
  email: { label: "Email", icon: Mail, color: "bg-orange-500/10 text-orange-600" },
}

export function MultiPlatformSender({ businessId, businessName }: Props) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [email, setEmail] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["sms"])
  const [mode, setMode] = useState<"parallel" | "sequential">("parallel")
  const [sending, setSending] = useState(false)

  function toggleChannel(channel: string) {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    )
  }

  async function send() {
    if (selectedChannels.length === 0) {
      toast.error("Select at least one channel")
      return
    }
    setSending(true)
    try {
      if (mode === "parallel") {
        const res = await api.v2.multiPlatform.send({
          businessId,
          channels: selectedChannels,
          phoneNumber: phoneNumber.trim() || undefined,
          email: email.trim() || undefined,
          customerName: customerName.trim() || undefined,
          customMessage: customMessage.trim() || undefined,
        })
        toast.success(`Sent via ${res.channelsSent} channel(s)`)
      } else {
        const res = await api.v2.multiPlatform.sendSequential({
          businessId,
          phoneNumber: phoneNumber.trim() || undefined,
          email: email.trim() || undefined,
          customerName: customerName.trim() || undefined,
          delayMinutes: 1440,
        })
        toast.success(res.message)
      }
    } catch {
      toast.error("Failed to send review request")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {(["parallel", "sequential"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "parallel" ? "Send all at once" : "Sequential (SMS → WhatsApp → Email)"}
          </button>
        ))}
      </div>

      <Card className="p-5 space-y-4">
        {/* Channels */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Channels</p>
          <div className="flex gap-2">
            {Object.entries(channelMeta).map(([key, meta]) => {
              const active = selectedChannels.includes(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleChannel(key)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground/40"
                  }`}
                >
                  <meta.icon className="size-4" />
                  {meta.label}
                  {active && <Check className="size-3" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Contact details */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Phone number</label>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 98200 12345"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Customer name (optional)</label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Rohan Mehta"
            />
          </div>
        </div>

        {/* Custom message */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Custom message (optional — uses template if empty)
          </label>
          <Textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder={`Hi {{customer_name}}, how was your experience at ${businessName}? Share your feedback: {{review_url}}`}
            rows={2}
          />
        </div>

        <Button onClick={send} disabled={sending || selectedChannels.length === 0} className="w-full">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {mode === "parallel" ? "Send review request" : "Start sequential flow"}
        </Button>

        {mode === "sequential" && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            SMS now → WhatsApp in 24h → Email in 48h
          </p>
        )}
      </Card>
    </div>
  )
}
