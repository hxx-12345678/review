"use client"

import { useMemo, useState, useEffect } from "react"
import { AlertCircle, CheckCircle2, Clock, FastForward, HelpCircle, Info, Radio, Send, Sparkles, User, Users, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { WhatsAppPhonePreview } from "./whatsapp-phone-preview"

export interface Template {
  id: string
  metaTemplateId: string | null
  name: string
  language: string
  category: string
  status: string
  useCase: string | null
  headerText: string | null
  bodyText: string | null
  footerText: string | null
  parameterCount: number
  headerParameterCount: number
}

export interface Contact {
  id: string
  phone: string
  name: string | null
  consentStatus: string
  marketingOptIn: boolean
}

interface Props {
  businessId: string
  businessName: string
  businessSlug: string
  templates: Template[]
  contacts: Contact[]
  onSendSingle: (data: {
    contactId?: string
    phone?: string
    name?: string
    templateId: string
    variables: string[]
    headerVariables: string[]
  }) => Promise<void>
  onSendBroadcast: (data: {
    templateId: string
    audience: "ALL_OPTED_IN" | "MARKETING_OPT_IN"
    scheduledAt: string
    variables: string[]
    headerVariables: string[]
  }) => Promise<void>
  onSwitchToTemplates: () => void
}

export function WhatsAppSendComposer({
  businessId,
  businessName,
  businessSlug,
  templates,
  contacts,
  onSendSingle,
  onSendBroadcast,
  onSwitchToTemplates,
}: Props) {
  // Mode: single 1-on-1 vs group broadcast
  const [mode, setMode] = useState<"SINGLE" | "BROADCAST">("SINGLE")

  // Selected contact or custom phone
  const optedInContacts = useMemo(
    () => contacts.filter((c) => c.consentStatus === "OPTED_IN"),
    [contacts],
  )
  const [selectedContactId, setSelectedContactId] = useState<string>(
    optedInContacts[0]?.id || "",
  )
  const [manualPhone, setManualPhone] = useState("")
  const [manualName, setManualName] = useState("")

  // Template filter & selection
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>("ALL")
  
  // Available templates (show approved first, but keep pending visible with clear indicator)
  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      if (a.status === "APPROVED" && b.status !== "APPROVED") return -1
      if (b.status === "APPROVED" && a.status !== "APPROVED") return 1
      return 0
    })
  }, [templates])

  const filteredTemplates = useMemo(() => {
    if (templateCategoryFilter === "ALL") return sortedTemplates
    return sortedTemplates.filter((t) => t.category === templateCategoryFilter)
  }, [sortedTemplates, templateCategoryFilter])

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    sortedTemplates[0]?.id || "",
  )

  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || sortedTemplates[0] || null
  }, [templates, selectedTemplateId, sortedTemplates])

  // Variables state
  const [bodyVars, setBodyVars] = useState<string[]>([])
  const [headerVars, setHeaderVars] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  // Auto-initialize variables when template changes
  useEffect(() => {
    if (currentTemplate) {
      // Find selected contact name
      const contactObj = optedInContacts.find((c) => c.id === selectedContactId)
      const recipientName = contactObj?.name || manualName || "Het"
      const defaultUrl = `https://beyondvyu.com/r/${businessSlug}`

      // Smart defaults based on parameter index
      const defaultValues: string[] = []
      for (let i = 0; i < (currentTemplate.parameterCount || 0); i++) {
        if (i === 0) defaultValues.push(recipientName)
        else if (i === 1) defaultValues.push(businessName)
        else if (i === 2) defaultValues.push(defaultUrl)
        else defaultValues.push("Special Offer")
      }
      setBodyVars(defaultValues)
      setHeaderVars(Array.from({ length: currentTemplate.headerParameterCount || 0 }, () => businessName))
    }
  }, [currentTemplate?.id, selectedContactId, manualName, businessName, businessSlug, optedInContacts])

  function handleAutofillSample() {
    if (!currentTemplate) return
    const contactObj = optedInContacts.find((c) => c.id === selectedContactId)
    const recipientName = contactObj?.name || manualName || "Customer"
    const sampleVals = [recipientName, businessName, `https://beyondvyu.com/r/${businessSlug}`, "ORD-1082", "₹450"]
    setBodyVars(Array.from({ length: currentTemplate.parameterCount || 0 }, (_, i) => sampleVals[i] || `Value ${i + 1}`))
    toast.success("Autofilled realistic sample variables!")
  }

  // Submit Handler
  async function handleSend() {
    if (!currentTemplate) {
      toast.error("Please choose a message template.")
      return
    }

    if (currentTemplate.status !== "APPROVED") {
      toast.error(
        `Template "${currentTemplate.name}" is currently ${currentTemplate.status.toLowerCase()} at Meta. Only approved templates can be sent.`,
      )
      return
    }

    setSending(true)
    try {
      if (mode === "SINGLE") {
        if (!selectedContactId && !manualPhone.trim()) {
          toast.error("Select a customer or enter a WhatsApp phone number.")
          return
        }

        await onSendSingle({
          contactId: selectedContactId || undefined,
          phone: !selectedContactId ? manualPhone.trim() : undefined,
          name: !selectedContactId ? manualName.trim() : undefined,
          templateId: currentTemplate.id,
          variables: bodyVars,
          headerVariables: headerVars,
        })
        toast.success(`Message sent successfully via WhatsApp Cloud API!`)
      } else {
        // Broadcast mode
        await onSendBroadcast({
          templateId: currentTemplate.id,
          audience: currentTemplate.category === "MARKETING" ? "MARKETING_OPT_IN" : "ALL_OPTED_IN",
          scheduledAt: new Date().toISOString(),
          variables: bodyVars,
          headerVariables: headerVars,
        })
        toast.success(`Broadcast queued for ${optedInContacts.length} customers!`)
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send WhatsApp message")
    } finally {
      setSending(false)
    }
  }

  const isApproved = currentTemplate?.status === "APPROVED"

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Left: The Clean Send Composer */}
      <div className="space-y-5">
        {/* Mode Selector Card */}
        <div className="flex p-1 bg-muted/60 rounded-xl max-w-md border">
          <button
            type="button"
            onClick={() => setMode("SINGLE")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
              mode === "SINGLE"
                ? "bg-background text-foreground shadow-xs border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="size-3.5" />
            Send to One Customer
          </button>
          <button
            type="button"
            onClick={() => setMode("BROADCAST")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
              mode === "BROADCAST"
                ? "bg-background text-foreground shadow-xs border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Radio className="size-3.5" />
            Broadcast to Audience ({optedInContacts.length})
          </button>
        </div>

        {/* Step 1: Recipient Selection */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-xs font-bold">
                1
              </span>
              <CardTitle className="text-base font-semibold">
                {mode === "SINGLE" ? "Who are you sending to?" : "Target Audience"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {mode === "SINGLE" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Select from Contacts</label>
                  <select
                    value={selectedContactId}
                    onChange={(e) => {
                      setSelectedContactId(e.target.value)
                      if (e.target.value) setManualPhone("")
                    }}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Enter new phone number instead --</option>
                    {optedInContacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name ? `${contact.name} · ` : ""}+{contact.phone}
                      </option>
                    ))}
                  </select>
                </div>

                {!selectedContactId && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Or type new WhatsApp number
                    </label>
                    <Input
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      placeholder="e.g. 919737779007"
                      className="h-10 rounded-xl"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                    All Opted-in Customers
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Delivers to {optedInContacts.length} verified customers with consent.
                  </p>
                </div>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 border-emerald-300">
                  {optedInContacts.length} Recipients
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Choose Template */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-xs font-bold">
                  2
                </span>
                <CardTitle className="text-base font-semibold">Select Message Template</CardTitle>
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-1.5">
                {["ALL", "UTILITY", "MARKETING"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTemplateCategoryFilter(cat)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                      templateCategoryFilter === cat
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {cat === "ALL" ? "All" : cat === "UTILITY" ? "Utility ⚙️" : "Marketing 🏷️"}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredTemplates.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                <p>No templates found.</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={onSwitchToTemplates}>
                  Browse Template Library
                </Button>
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {filteredTemplates.map((tpl) => {
                  const isSelected = tpl.id === currentTemplate?.id
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`rounded-xl border p-3 text-left transition flex flex-col justify-between gap-2 ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-500"
                          : "border-border hover:border-emerald-300/60 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <p className="font-semibold text-xs tracking-tight text-foreground truncate">
                          {tpl.name.replaceAll("_", " ")}
                        </p>
                        {tpl.status === "APPROVED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold shrink-0">
                            ✓ Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold shrink-0">
                            ⏱ In Review
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {tpl.bodyText}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                        <span>Category: {tpl.category}</span>
                        <span>{tpl.parameterCount} variables</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Personalize Variables */}
        {currentTemplate && currentTemplate.parameterCount > 0 && (
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-xs font-bold">
                    3
                  </span>
                  <CardTitle className="text-base font-semibold">Personalize Message</CardTitle>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                  onClick={handleAutofillSample}
                >
                  <Sparkles className="size-3.5" />
                  Autofill Sample Data
                </Button>
              </div>
              <CardDescription className="text-xs">
                These tags match the placeholders in your template like <code className="text-[11px]">{"{{1}}"}</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: currentTemplate.parameterCount }).map((_, idx) => {
                  const label =
                    idx === 0
                      ? "Customer Name ({{1}})"
                      : idx === 1
                      ? "Business Name ({{2}})"
                      : idx === 2
                      ? "Link / Details ({{3}})"
                      : `Variable {{${idx + 1}}}`

                  return (
                    <div key={idx} className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">{label}</label>
                      <Input
                        value={bodyVars[idx] || ""}
                        onChange={(e) => {
                          const updated = [...bodyVars]
                          updated[idx] = e.target.value
                          setBodyVars(updated)
                        }}
                        placeholder={`Enter ${label}`}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Button & Meta Notice */}
        <div className="pt-2 space-y-3">
          {currentTemplate && !isApproved && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 dark:bg-amber-950/20 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <Clock className="size-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Meta is currently reviewing this template</p>
                <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                  Automated review typically takes 15–60 minutes. As soon as Meta approves it, you can send it immediately. Click <strong>"Sync Status"</strong> at the top to check if it's ready.
                </p>
              </div>
            </div>
          )}

          <Button
            size="lg"
            className="w-full h-12 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm shadow-md rounded-xl transition gap-2"
            disabled={sending || !isApproved}
            onClick={handleSend}
          >
            <Send className="size-4" />
            {sending
              ? "Sending via WhatsApp Cloud API…"
              : !isApproved
              ? "Waiting for Meta Approval"
              : mode === "SINGLE"
              ? "Send WhatsApp Message Now"
              : `Send Broadcast to ${optedInContacts.length} Customers`}
          </Button>
        </div>
      </div>

      {/* Right: The Live WhatsApp Mobile Mockup */}
      <div className="lg:sticky lg:top-20 self-start space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            📱 Live WhatsApp Preview
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Real-time update</span>
        </div>

        <WhatsAppPhonePreview
          businessName={businessName}
          headerText={currentTemplate?.headerText}
          bodyText={currentTemplate?.bodyText || "Select a template on the left to see live preview…"}
          footerText={currentTemplate?.footerText}
          variables={bodyVars}
          buttonText={currentTemplate?.useCase === "REVIEW_REQUEST" ? "⭐ Leave Google Review" : undefined}
        />
      </div>
    </div>
  )
}
