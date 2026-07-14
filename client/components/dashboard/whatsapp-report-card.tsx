"use client"

import { useState } from "react"
import { MessageSquare, Loader2, Send } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface Props {
  businessId: string
}

export function WhatsAppReportCard({ businessId }: Props) {
  const [enabled, setEnabled] = useState(false)
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly")
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await api.communications.whatsappReport({
        businessId,
        frequency: enabled ? frequency : "none",
      })
      toast.success("WhatsApp report settings saved")
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      await api.communications.whatsappReport({
        businessId,
        frequency,
        test: true,
      })
      toast.success("Test report sent! Check your WhatsApp.")
    } catch (err: any) {
      toast.error(err.message || "Failed to send test report")
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" />
          <CardTitle>WhatsApp Report Delivery</CardTitle>
        </div>
        <CardDescription>
          Receive automated review performance reports on WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-foreground">Enable weekly/monthly reports</span>
        </label>

        {enabled && (
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="frequency"
                value="weekly"
                checked={frequency === "weekly"}
                onChange={() => setFrequency("weekly")}
                className="size-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">Weekly</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="frequency"
                value="monthly"
                checked={frequency === "monthly"}
                onChange={() => setFrequency("monthly")}
                className="size-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">Monthly</span>
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "Saving..." : "Save"}
          </Button>
          {enabled && (
            <Button onClick={handleTest} disabled={testing} variant="outline" size="sm">
              {testing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {testing ? "Sending..." : "Send test report"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
