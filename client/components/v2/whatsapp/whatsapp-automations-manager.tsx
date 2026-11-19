"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, Clock, Gift, ShieldAlert, Sparkles, Star, Zap, Trash2, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { api } from "@/lib/api"

interface Template {
  id: string
  name: string
  status: string
  category: string
  parameterCount: number
}

interface Rule {
  id: string
  name: string
  trigger: string
  delayMinutes: number
  active: boolean
  template: {
    id: string
    name: string
    status: string
  }
}

interface Props {
  businessId: string
  businessName: string
  templates: Template[]
  rules: Rule[]
  onRefresh: () => Promise<void>
}

export function WhatsAppAutomationsManager({
  businessId,
  businessName,
  templates,
  rules,
  onRefresh,
}: Props) {
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Turnkey recipes configuration
  const RECIPES = [
    {
      id: "RECIPE_REVIEW",
      title: "Google Review Invite Auto-Pilot",
      subtitle: "The #1 driver of 5-star Google ratings",
      description: "When a customer visits or submits positive feedback, automatically follow up on WhatsApp asking for an honest Google review.",
      icon: Star,
      iconColor: "text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200",
      trigger: "FEEDBACK_RECEIVED",
      defaultDelayMinutes: 60,
      badgeText: "Most Popular",
      keywords: ["review", "post_visit"],
    },
    {
      id: "RECIPE_NEGATIVE_SHIELD",
      title: "Unhappy Customer Shield",
      subtitle: "Stop negative Google reviews before they happen",
      description: "When a customer rates 1–3 stars, instantly send an automated owner apology message with private resolution before they post publicly.",
      icon: ShieldAlert,
      iconColor: "text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200",
      trigger: "FEEDBACK_RECEIVED",
      defaultDelayMinutes: 0,
      badgeText: "Reputation Saver",
      keywords: ["feedback", "customer"],
    },
    {
      id: "RECIPE_OPT_IN_WELCOME",
      title: "Instant Welcome & Coupon Delivery",
      subtitle: "Instant engagement when customer scans QR or clicks link",
      description: "When a customer opts in on your 1-tap WhatsApp link or QR code, immediately deliver their welcome coupon or loyalty points.",
      icon: Gift,
      iconColor: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200",
      trigger: "OPT_IN_RECEIVED",
      defaultDelayMinutes: 0,
      badgeText: "Engagement",
      keywords: ["offer", "welcome", "order"],
    },
  ]

  // Find existing rule matching trigger
  function getExistingRule(trigger: string) {
    return rules.find((r) => r.trigger === trigger)
  }

  // Toggle rule active status
  async function handleToggleRule(rule: Rule) {
    setTogglingId(rule.id)
    try {
      await api.v2.whatsapp.toggleAutomationRule(rule.id, businessId, !rule.active)
      toast.success(`Automation ${!rule.active ? "activated" : "paused"}`)
      await onRefresh()
    } catch (err: any) {
      toast.error(err?.message || "Failed to update automation")
    } finally {
      setTogglingId(null)
    }
  }

  // Quick 1-click activate for a turnkey recipe
  async function handleActivateRecipe(recipe: typeof RECIPES[0]) {
    // Find suitable template (prefer approved, then matching keywords, or first available)
    const matchingTemplate =
      templates.find((t) => t.status === "APPROVED" && recipe.keywords.some((k) => t.name.toLowerCase().includes(k))) ||
      templates.find((t) => t.status === "APPROVED") ||
      templates[0]

    if (!matchingTemplate) {
      toast.error("Please create a template first in the Templates tab.")
      return
    }

    if (matchingTemplate.status !== "APPROVED") {
      toast.error(`Meta is still reviewing "${matchingTemplate.name}". As soon as it's approved, this automation can be turned on.`)
      return
    }

    setCreating(true)
    try {
      // Build standard variable mapping (Customer Name, Business Name, Review URL)
      const mapping = [
        { type: "TOKEN" as const, value: "CUSTOMER_NAME" },
        { type: "TOKEN" as const, value: "BUSINESS_NAME" },
        { type: "TOKEN" as const, value: "REVIEW_URL" },
      ]

      await api.v2.whatsapp.createAutomationRule({
        businessId,
        name: recipe.title,
        trigger: recipe.trigger as "FEEDBACK_RECEIVED" | "OPT_IN_RECEIVED",
        templateId: matchingTemplate.id,
        delayMinutes: recipe.defaultDelayMinutes,
        variableMap: mapping.slice(0, matchingTemplate.parameterCount),
        headerVariableMap: [{ type: "TOKEN", value: "BUSINESS_NAME" }],
      })

      toast.success(`${recipe.title} is now ACTIVE! Messages will send automatically.`)
      await onRefresh()
    } catch (err: any) {
      toast.error(err?.message || "Could not activate automation")
    } finally {
      setCreating(false)
    }
  }

  // Delete rule
  async function handleDelete(ruleId: string) {
    try {
      await api.v2.whatsapp.deleteAutomationRule(ruleId, businessId)
      toast.success("Automation removed")
      await onRefresh()
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete automation")
    }
  }

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div>
        <h3 className="text-base font-bold text-foreground">Turnkey WhatsApp Automations</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Put review collection and customer retention on 100% autopilot. Powered by Meta Cloud API.
        </p>
      </div>

      {/* 3 Main Recipe Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {RECIPES.map((recipe) => {
          const Icon = recipe.icon
          const existing = getExistingRule(recipe.trigger)
          const isActive = existing?.active === true

          return (
            <Card
              key={recipe.id}
              className={`relative flex flex-col justify-between overflow-hidden transition-all shadow-xs ${
                isActive
                  ? "border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/10 ring-1 ring-emerald-500/30"
                  : "hover:border-border/80"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className={`size-10 rounded-xl flex items-center justify-center border ${recipe.iconColor}`}>
                    <Icon className="size-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-semibold tracking-wide">
                    {recipe.badgeText}
                  </Badge>
                </div>

                <CardTitle className="text-sm font-bold text-foreground mt-2 leading-tight">
                  {recipe.title}
                </CardTitle>
                <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  {recipe.subtitle}
                </p>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {recipe.description}
                </p>

                {/* Timing info */}
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                  <Clock className="size-3.5 text-slate-400" />
                  <span>
                    Timing: {recipe.defaultDelayMinutes === 0 ? "Instant" : `${recipe.defaultDelayMinutes / 60} hour delay`}
                  </span>
                </div>

                {/* Status & Action */}
                <div className="pt-2">
                  {existing ? (
                    <div className="flex items-center justify-between gap-2 bg-background p-2 rounded-xl border">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className={`size-2 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                        <span className="font-semibold text-xs">
                          {isActive ? "Active (Running)" : "Paused"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant={isActive ? "outline" : "default"}
                          className={`h-7 px-3 text-xs font-semibold rounded-lg ${
                            !isActive ? "bg-[#25D366] hover:bg-[#20ba59] text-white" : ""
                          }`}
                          disabled={togglingId === existing.id}
                          onClick={() => handleToggleRule(existing)}
                        >
                          {isActive ? "Pause" : "Turn ON"}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-foreground hover:text-red-500"
                          onClick={() => handleDelete(existing.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5"
                      disabled={creating}
                      onClick={() => handleActivateRecipe(recipe)}
                    >
                      <Zap className="size-3.5" />
                      Activate in 1-Click
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Active Rules List */}
      {rules.length > 0 && (
        <div className="mt-8 space-y-3 pt-6 border-t">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Configured Automation Pipelines ({rules.length})
          </h4>

          <div className="divide-y rounded-xl border bg-card overflow-hidden">
            {rules.map((rule) => (
              <div key={rule.id} className="p-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{rule.name}</p>
                    <Badge variant={rule.active ? "default" : "secondary"} className="text-[10px]">
                      {rule.active ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Trigger: <code className="text-[11px] font-mono text-primary">{rule.trigger}</code> · 
                    Template: <span className="font-medium text-foreground">{rule.template.name}</span> · 
                    Delay: {rule.delayMinutes} mins
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-medium"
                    onClick={() => handleToggleRule(rule)}
                    disabled={togglingId === rule.id}
                  >
                    {rule.active ? "Pause" : "Resume"}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(rule.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
