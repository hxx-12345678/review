"use client"

import { useState } from "react"
import { Send, MessageSquare, Star, Check, Clock, Loader2, Phone, User } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface Flow {
  id: string
  customerPhone: string
  customerName: string | null
  status: string
  sentAt: string
  completedAt: string | null
  response?: {
    rating: number
    liked: string | null
    improvement: string | null
    customerName: string | null
  } | null
}

interface Props {
  businessId: string
  businessName: string
}

export function WhatsAppFlows({ businessId, businessName }: Props) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [sending, setSending] = useState(false)
  const [flows, setFlows] = useState<Flow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [stats, setStats] = useState<{ totalFlows: number; completedFlows: number; completionRate: number; averageRating: number | null } | null>(null)

  async function loadFlows() {
    try {
      const [flowRes, statsRes] = await Promise.all([
        api.v2.whatsappFlows.list(businessId),
        api.v2.whatsappFlows.stats(businessId),
      ])
      setFlows(flowRes.flows)
      setStats(statsRes)
    } catch {}
    setLoaded(true)
  }

  if (!loaded) { loadFlows() }

  async function sendFlow() {
    if (!phoneNumber.trim()) {
      toast.error("Phone number is required")
      return
    }
    setSending(true)
    try {
      const res = await api.v2.whatsappFlows.sendFlow({
        businessId,
        phoneNumber: phoneNumber.trim(),
        customerName: customerName.trim() || undefined,
      })
      if (res.success) {
        toast.success("WhatsApp flow sent!")
        setPhoneNumber("")
        setCustomerName("")
        loadFlows()
      } else {
        toast.error("Failed to send flow")
      }
    } catch {
      toast.error("Failed to send WhatsApp flow")
    } finally {
      setSending(false)
    }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case "COMPLETED": return "bg-green-500/10 text-green-600 border-green-200"
      case "OPENED": return "bg-blue-500/10 text-blue-600 border-blue-200"
      case "SENT": return "bg-yellow-500/10 text-yellow-600 border-yellow-200"
      default: return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      {/* Send Flow Card */}
      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold flex items-center gap-2">
          <Send className="size-4" />
          Send Review Request via WhatsApp Flow
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="size-4 text-muted-foreground shrink-0" />
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Phone number (e.g. 919820012345)"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground shrink-0" />
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name (optional)"
              className="flex-1"
            />
          </div>
          <Button onClick={sendFlow} disabled={sending || !phoneNumber.trim()} className="w-full">
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {sending ? "Sending..." : "Send WhatsApp Review Flow"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Customer receives an interactive flow to rate their experience. 88% avg. completion rate.
          </p>
        </div>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalFlows}</p>
            <p className="text-xs text-muted-foreground">Total Sent</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.completionRate}%</p>
            <p className="text-xs text-muted-foreground">Completion Rate</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.completedFlows}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.averageRating ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Avg Rating</p>
          </Card>
        </div>
      )}

      {/* Flow History */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Recent Flows</h4>
        {flows.length === 0 ? (
          <Card className="p-6 text-center">
            <MessageSquare className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No flows sent yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {flows.map((flow) => (
              <Card key={flow.id} className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {flow.customerName || flow.customerPhone}
                    </span>
                    <Badge variant="outline" className={`text-xs ${statusColor(flow.status)}`}>
                      {flow.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <Clock className="size-3 inline mr-1" />
                    {new Date(flow.sentAt).toLocaleDateString()}
                  </p>
                  {flow.response && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Star className="size-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{flow.response.rating}/5</span>
                      {flow.response.liked && (
                        <span className="text-muted-foreground truncate">· {flow.response.liked}</span>
                      )}
                    </div>
                  )}
                </div>
                {flow.status === "COMPLETED" && (
                  <Check className="size-5 text-green-500 shrink-0 mt-1" />
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
