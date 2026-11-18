"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarClock, Loader2, Megaphone, Plus, RefreshCw, Trash2, Zap } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface TemplateOption {
  id: string
  name: string
  category: string
  status: string
  useCase: string | null
  parameterCount: number
  headerParameterCount: number
}

interface Rule {
  id: string
  name: string
  trigger: string
  delayMinutes: number
  active: boolean
  variableMap: Array<{ type: "TOKEN" | "TEXT"; value: string }> | null
  headerVariableMap: Array<{ type: "TOKEN" | "TEXT"; value: string }> | null
  lastTriggeredAt: string | null
  template: TemplateOption
}

type Mapping = Array<{ type: "TOKEN" | "TEXT"; value: string }>

const TOKENS = [
  { value: "CUSTOMER_NAME", label: "Customer name" },
  { value: "BUSINESS_NAME", label: "Business name" },
  { value: "REVIEW_URL", label: "Review link" },
  { value: "RATING", label: "Feedback rating" },
  { value: "DATE", label: "Today's date" },
]

function defaultMapping(count: number, allowRating: boolean): Mapping {
  const order = allowRating
    ? ["CUSTOMER_NAME", "BUSINESS_NAME", "REVIEW_URL", "RATING", "DATE"]
    : ["CUSTOMER_NAME", "BUSINESS_NAME", "REVIEW_URL", "DATE"]
  return Array.from({ length: count }, (_, index) => ({
    type: "TOKEN" as const,
    value: order[index] || "DATE",
  }))
}

function MappingEditor({
  label,
  count,
  mapping,
  allowRating,
  onChange,
}: {
  label: string
  count: number
  mapping: Mapping
  allowRating: boolean
  onChange: (next: Mapping) => void
}) {
  if (count <= 0) return null
  const tokens = allowRating ? TOKENS : TOKENS.filter((token) => token.value !== "RATING")

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-medium">{label}</p>
      {Array.from({ length: count }).map((_, index) => {
        const entry = mapping[index] || { type: "TOKEN" as const, value: "DATE" }
        return (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <span className="w-10 text-[11px] text-muted-foreground">{`{{${index + 1}}}`}</span>
            <select
              value={entry.type === "TEXT" ? "TEXT" : entry.value}
              onChange={(event) => {
                const value = event.target.value
                const next = [...mapping]
                next[index] = value === "TEXT"
                  ? { type: "TEXT", value: "" }
                  : { type: "TOKEN", value }
                onChange(next)
              }}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            >
              {tokens.map((token) => (
                <option key={token.value} value={token.value}>
                  {token.label}
                </option>
              ))}
              <option value="TEXT">Fixed text…</option>
            </select>
            {entry.type === "TEXT" && (
              <Input
                value={entry.value}
                onChange={(event) => {
                  const next = [...mapping]
                  next[index] = { type: "TEXT", value: event.target.value }
                  onChange(next)
                }}
                placeholder="Fixed value"
                className="h-8 max-w-56 text-xs"
              />
            )}
          </div>
        )
      })}
      <p className="text-[10px] text-muted-foreground">
        Customer name, business name, review link, and date are filled automatically for each customer.
        Fixed text is the same for everyone.
      </p>
    </div>
  )
}

export function WhatsAppAutomations({
  businessId,
  templates,
  optedInCount,
  marketingOptedInCount,
  pricing,
  onChanged,
}: {
  businessId: string
  templates: TemplateOption[]
  optedInCount: number
  marketingOptedInCount: number
  pricing?: any
  onChanged: () => Promise<void> | void
}) {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [action, setAction] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [trigger, setTrigger] = useState<"FEEDBACK_RECEIVED" | "OPT_IN_RECEIVED">("FEEDBACK_RECEIVED")
  const [templateId, setTemplateId] = useState("")
  const [delayMinutes, setDelayMinutes] = useState("60")
  const [variableMap, setVariableMap] = useState<Mapping>([])
  const [headerVariableMap, setHeaderVariableMap] = useState<Mapping>([])

  const [campaignTemplateId, setCampaignTemplateId] = useState("")
  const [campaignAudience, setCampaignAudience] = useState<"ALL_OPTED_IN" | "MARKETING_OPT_IN">(
    "MARKETING_OPT_IN",
  )
  const [campaignAt, setCampaignAt] = useState("")
  const [campaignVars, setCampaignVars] = useState<Mapping>([])
  const [campaignHeaders, setCampaignHeaders] = useState<Mapping>([])
  const [campaigning, setCampaigning] = useState(false)

  const ruleTemplate = useMemo(
    () => templates.find((template) => template.id === templateId) || null,
    [templates, templateId],
  )
  const campaignTemplate = useMemo(
    () => templates.find((template) => template.id === campaignTemplateId) || null,
    [templates, campaignTemplateId],
  )

  const loadRules = useCallback(async () => {
    try {
      const data = await api.v2.whatsapp.listAutomationRules(businessId)
      setRules(data.rules || [])
    } catch (err: any) {
      toast.error(err?.message || "Could not load automations")
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  useEffect(() => {
    if (!ruleTemplate) {
      setVariableMap([])
      setHeaderVariableMap([])
      return
    }
    setVariableMap(defaultMapping(ruleTemplate.parameterCount, trigger === "FEEDBACK_RECEIVED"))
    setHeaderVariableMap(
      Array.from({ length: ruleTemplate.headerParameterCount }, () => ({
        type: "TOKEN" as const,
        value: "BUSINESS_NAME",
      })),
    )
  }, [ruleTemplate?.id, ruleTemplate?.parameterCount, ruleTemplate?.headerParameterCount, trigger])

  useEffect(() => {
    if (!campaignTemplate) {
      setCampaignVars([])
      setCampaignHeaders([])
      return
    }
    setCampaignVars(defaultMapping(campaignTemplate.parameterCount, false))
    setCampaignHeaders(
      Array.from({ length: campaignTemplate.headerParameterCount }, () => ({
        type: "TOKEN" as const,
        value: "BUSINESS_NAME",
      })),
    )
    setCampaignAudience(campaignTemplate.category === "MARKETING" ? "MARKETING_OPT_IN" : "ALL_OPTED_IN")
  }, [
    campaignTemplate?.id,
    campaignTemplate?.parameterCount,
    campaignTemplate?.headerParameterCount,
    campaignTemplate?.category,
  ])

  function validateMapping(mapping: Mapping, label: string): boolean {
    if (mapping.some((entry) => entry.type === "TEXT" && !entry.value.trim())) {
      toast.error(`Fill in every fixed value in the ${label}.`)
      return false
    }
    return true
  }

  async function createRule() {
    if (!name.trim()) {
      toast.error("Name the automation.")
      return
    }
    if (!templateId) {
      toast.error("Choose an approved template.")
      return
    }
    if (!validateMapping(variableMap, "body mapping") || !validateMapping(headerVariableMap, "header mapping")) {
      return
    }
    setSaving(true)
    try {
      await api.v2.whatsapp.createAutomationRule({
        businessId,
        name: name.trim(),
        trigger,
        templateId,
        delayMinutes: Number(delayMinutes) || 0,
        variableMap,
        headerVariableMap,
      })
      toast.success("Automation saved. It will run for new events.")
      setName("")
      setTemplateId("")
      await loadRules()
      await onChanged()
    } catch (err: any) {
      toast.error(err?.message || "Could not save the automation")
    } finally {
      setSaving(false)
    }
  }

  async function toggleRule(rule: Rule) {
    setAction(`toggle-${rule.id}`)
    try {
      await api.v2.whatsapp.toggleAutomationRule(rule.id, businessId, !rule.active)
      await loadRules()
    } catch (err: any) {
      toast.error(err?.message || "Could not update the automation")
    } finally {
      setAction(null)
    }
  }

  async function deleteRule(rule: Rule) {
    setAction(`delete-${rule.id}`)
    try {
      await api.v2.whatsapp.deleteAutomationRule(rule.id, businessId)
      toast.success("Automation deleted")
      await loadRules()
      await onChanged()
    } catch (err: any) {
      toast.error(err?.message || "Could not delete the automation")
    } finally {
      setAction(null)
    }
  }

  async function queueCampaign() {
    if (!campaignTemplateId) {
      toast.error("Choose an approved template.")
      return
    }
    if (!campaignAt) {
      toast.error("Choose when the campaign should start.")
      return
    }
    const when = new Date(campaignAt)
    if (Number.isNaN(when.getTime())) {
      toast.error("Choose a valid campaign date and time.")
      return
    }
    if (!validateMapping(campaignVars, "body mapping") || !validateMapping(campaignHeaders, "header mapping")) {
      return
    }
    setCampaigning(true)
    try {
      const result = await api.v2.whatsapp.createCampaign({
        businessId,
        templateId: campaignTemplateId,
        audience: campaignAudience,
        scheduledAt: when.toISOString(),
        variableMap: campaignVars,
        headerVariableMap: campaignHeaders,
      })
      toast.success(
        `Campaign queued for ${result.campaign.queued} customer(s). Sends are spaced 30 seconds apart.`,
      )
      await onChanged()
    } catch (err: any) {
      toast.error(err?.message || "Could not queue the campaign")
    } finally {
      setCampaigning(false)
    }
  }

  const marketingTemplates = templates.filter((template) => template.category === "MARKETING")

  const campaignAudienceCount =
    campaignTemplate?.category === "MARKETING" ? marketingOptedInCount : optedInCount
  const campaignSendCount = Math.min(campaignAudienceCount, 200)
  const campaignRate =
    pricing?.perDeliveredMessage?.[campaignTemplate?.category || "UTILITY"] ?? null
  const campaignEstimate =
    typeof campaignRate === "number" ? Number((campaignRate * campaignSendCount).toFixed(4)) : null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="size-5 text-primary" />
                <CardTitle>Event automations</CardTitle>
              </div>
              <CardDescription>
                Run an approved template after a real customer action. The server re-checks consent and
                template approval at send time. Nothing is sent to people who did not opt in.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadRules}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Automation name</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Thank-you / review follow-up"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">When this happens</label>
              <select
                value={trigger}
                onChange={(event) => setTrigger(event.target.value as any)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="FEEDBACK_RECEIVED">Customer submits feedback</option>
                <option value="OPT_IN_RECEIVED">Customer opts in on the WhatsApp link</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Approved template</label>
              <select
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="">Choose a template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {template.category.toLowerCase()}
                  </option>
                ))}
              </select>
              {templates.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Create and get a template approved in the Templates tab first.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Wait before sending</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={43200}
                  value={delayMinutes}
                  onChange={(event) => setDelayMinutes(event.target.value)}
                  className="w-28"
                />
                <span className="text-xs text-muted-foreground">minutes</span>
              </div>
            </div>
          </div>

          {ruleTemplate && (
            <>
              <MappingEditor
                label="Body variables"
                count={ruleTemplate.parameterCount}
                mapping={variableMap}
                allowRating={trigger === "FEEDBACK_RECEIVED"}
                onChange={setVariableMap}
              />
              <MappingEditor
                label="Header variable"
                count={ruleTemplate.headerParameterCount}
                mapping={headerVariableMap}
                allowRating={false}
                onChange={setHeaderVariableMap}
              />
              {ruleTemplate.category === "MARKETING" && (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                  This is a Marketing template. It will only send to customers with separate marketing
                  opt-in. Utility templates are cheaper and may be re-categorised by Meta if the content
                  is promotional.
                </p>
              )}
            </>
          )}

          <Button onClick={createRule} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Save automation
          </Button>

          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading automations…
            </div>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No event automations yet.</p>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{rule.name}</p>
                      <Badge variant={rule.active ? "default" : "outline"}>
                        {rule.active ? "active" : "paused"}
                      </Badge>
                      <Badge variant="outline">
                        {rule.trigger === "FEEDBACK_RECEIVED" ? "feedback received" : "opt-in received"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {rule.template?.name || "Template"} · waits {rule.delayMinutes} min · last triggered{" "}
                      {rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).toLocaleString() : "never"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={action === `toggle-${rule.id}`}
                      onClick={() => toggleRule(rule)}
                    >
                      {rule.active ? "Pause" : "Activate"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={action === `delete-${rule.id}`}
                      onClick={() => deleteRule(rule)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="size-5 text-primary" />
            <CardTitle>Send to a group</CardTitle>
          </div>
          <CardDescription>
            Queue one approved template to many opted-in customers at once. Sends are spaced 30 seconds
            apart to stay well inside Meta's rate limits. Marketing templates only go to customers with
            separate marketing opt-in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Approved template</label>
              <select
                value={campaignTemplateId}
                onChange={(event) => setCampaignTemplateId(event.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="">Choose a template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {template.category.toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Audience</label>
              <select
                value={campaignAudience}
                onChange={(event) => setCampaignAudience(event.target.value as any)}
                disabled={campaignTemplate?.category === "MARKETING"}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-70"
              >
                <option value="MARKETING_OPT_IN">
                  Marketing opt-in only ({marketingOptedInCount})
                </option>
                <option value="ALL_OPTED_IN">All opted-in customers ({optedInCount})</option>
              </select>
              {campaignTemplate?.category === "MARKETING" && (
                <p className="text-[11px] text-muted-foreground">
                  Marketing templates are limited to the {marketingOptedInCount} customer(s) who
                  separately agreed to offers.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start sending</label>
              <Input
                type="datetime-local"
                value={campaignAt}
                onChange={(event) => setCampaignAt(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Campaign type</label>
              <div className="flex h-9 items-center gap-2 rounded-lg border bg-muted/30 px-3 text-xs text-muted-foreground">
                <CalendarClock className="size-4" />
                {campaignTemplate?.category === "MARKETING" ? "Offer / promotion" : "Utility / service"}
              </div>
            </div>
          </div>

          {campaignTemplate && campaignEstimate !== null && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  Estimated Meta charge for {campaignSendCount} customer
                  {campaignSendCount === 1 ? "" : "s"}
                </span>
                <span className="text-base font-semibold">₹{campaignEstimate.toFixed(2)}</span>
              </div>
              <p className="mt-1 leading-relaxed">
                {campaignAudienceCount > 200
                  ? `Only the first 200 opted-in customers are queued per campaign. `
                  : ""}
                Charged by Meta directly to your own Messaging account, before tax and any volume-tier or
                free-window adjustments. BEYONDVYU does not add a markup.
              </p>
            </div>
          )}

          {campaignTemplate && (
            <>
              <MappingEditor
                label="Body variables"
                count={campaignTemplate.parameterCount}
                mapping={campaignVars}
                allowRating={false}
                onChange={setCampaignVars}
              />
              <MappingEditor
                label="Header variable"
                count={campaignTemplate.headerParameterCount}
                mapping={campaignHeaders}
                allowRating={false}
                onChange={setCampaignHeaders}
              />
            </>
          )}

          <Button onClick={queueCampaign} disabled={campaigning || templates.length === 0}>
            {campaigning ? <Loader2 className="size-4 animate-spin" /> : <Megaphone className="size-4" />}
            Queue campaign
          </Button>
          {marketingTemplates.length > 0 && marketingOptedInCount === 0 && (
            <p className="text-[11px] text-muted-foreground">
              No customers have marketing opt-in yet. Share the WhatsApp sign-up link from the Contacts
              tab and ask customers to tick the optional offers box.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
