"use client"

import { useState } from "react"
import { Save, ShieldCheck, Lock, MessageSquare, Mail } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { api } from "@/lib/api"

export function SettingsForm({ business }: { business: any }) {
  const [name, setName] = useState(business?.name || "")
  const [googleUrl, setGoogleUrl] = useState(business?.googleReviewUrl || "")
  const [location, setLocation] = useState(business?.location || "")
  const [phoneNumber, setPhoneNumber] = useState(business?.phoneNumber || "")
  const [website, setWebsite] = useState(business?.website || "")
  const [emailTemplate, setEmailTemplate] = useState(business?.emailTemplate || "")
  const [smsTemplate, setSmsTemplate] = useState(business?.smsTemplate || "")
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!business?.id) return
    setSaving(true)
    try {
      await api.businesses.update(business.id, {
        name,
        googleReviewUrl: googleUrl || undefined,
        location: location || undefined,
        phoneNumber: phoneNumber || undefined,
        website: website || undefined,
        emailTemplate: emailTemplate || undefined,
        smsTemplate: smsTemplate || undefined,
      })
      toast.success("Settings saved")
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <Card className="p-6">
        <h2 className="font-medium text-foreground">Business details</h2>
        <p className="text-sm text-muted-foreground">Shown to customers in your review flow.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="google">Google review URL</Label>
            <Input id="google" value={googleUrl} onChange={(e) => setGoogleUrl(e.target.value)} placeholder="https://g.co/kgs/..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="123 Main St, City" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1-555-0123" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
          </div>
        </div>
        <div className="mt-5">
          <Button onClick={save} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </Card>

      <Card className="border-primary/30 bg-primary/5 p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h2 className="font-medium text-foreground">Compliance guardrails</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          These protections keep your Google profile safe. They&apos;re locked on by design.
        </p>
        <div className="mt-5 space-y-1">
          <LockedToggle title="AI talking points only" body="The AI generates reminders, never finished reviews customers can paste." />
          <Separator />
          <LockedToggle title="No review gating" body="Every customer sees the same Google review link, regardless of rating." />
          <Separator />
          <LockedToggle title="Authenticity checks" body="Generic, templated text is flagged so reviews stay specific and real." />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-medium text-foreground flex items-center gap-2">
          <Mail className="size-5 text-amber-500" />
          Email review request template
        </h2>
        <p className="text-sm text-muted-foreground">
          Customize the message sent to customers when requesting reviews via email.
          Use {"{"}{"{"}business_name{"}"}{"}"} for business name and {"{"}{"{"}review_url{"}"}{"}"} for the review link.
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="email-template">Email body (max 500 characters)</Label>
          <textarea
            id="email-template"
            value={emailTemplate}
            onChange={(e) => setEmailTemplate(e.target.value)}
            maxLength={500}
            rows={5}
            className="w-full resize-none rounded-lg border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder={`Hi there,\n\nWe'd love to hear your feedback on your recent visit to {{business_name}}.\n\nPlease take 1 minute to share your experience here:\n{{review_url}}\n\nThank you!`}
          />
          <p className="text-xs text-muted-foreground text-right">{emailTemplate.length}/500</p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-medium text-foreground flex items-center gap-2">
          <MessageSquare className="size-5 text-indigo-500" />
          SMS review request template
        </h2>
        <p className="text-sm text-muted-foreground">
          Customize the SMS sent to customers. Keep it short — SMS has a 300 character limit.
          Use {"{"}{"{"}business_name{"}"}{"}"} and {"{"}{"{"}review_url{"}"}{"}"} placeholders.
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="sms-template">SMS text (max 300 characters)</Label>
          <textarea
            id="sms-template"
            value={smsTemplate}
            onChange={(e) => setSmsTemplate(e.target.value)}
            maxLength={300}
            rows={3}
            className="w-full resize-none rounded-lg border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder={`Share your feedback about {{business_name}}: {{review_url}}`}
          />
          <p className="text-xs text-muted-foreground text-right">{smsTemplate.length}/300</p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-medium text-foreground">Private feedback routing</h2>
        <p className="text-sm text-muted-foreground">
          Where unhappy customers&apos; private notes are sent. (Public reviews are never affected.)
        </p>
        <div className="mt-5 space-y-2">
          <Label htmlFor="notify">Notification email</Label>
          <Input id="notify" type="email" defaultValue={business?.user?.email || ""} />
        </div>
        <div className="mt-5">
          <Button variant="outline" onClick={save}>
            <Save className="size-4" />
            Save
          </Button>
        </div>
      </Card>
    </div>
  )
}

function LockedToggle({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Lock className="size-3.5 text-muted-foreground" />
        <Switch checked disabled aria-label={`${title} (locked on)`} />
      </div>
    </div>
  )
}
