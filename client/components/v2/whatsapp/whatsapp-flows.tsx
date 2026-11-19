"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  MessageSquare,
  Radio,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  Users,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { META_SIGNUP_HTTPS_MESSAGE, canUseMetaSignup } from "@/lib/meta-signup"
import { toast } from "sonner"
import { WhatsAppHeader } from "./whatsapp-header"
import { WhatsAppSendComposer, type Template, type Contact } from "./whatsapp-send-composer"
import { WhatsAppInbox } from "./whatsapp-inbox"
import { WhatsAppTemplateManager } from "./whatsapp-template-manager"
import { WhatsAppAutomationsManager } from "./whatsapp-automations-manager"
import { WhatsAppContactsManager } from "./whatsapp-contacts-manager"

declare global {
  interface Window {
    FB?: any
    fbAsyncInit?: () => void
  }
}

interface Props {
  businessId: string
  businessName: string
}

interface Overview {
  business: { id: string; name: string; slug: string; country: string; currency: string }
  platform: {
    configured: boolean
    appId: string
    configId: string
    esVersion: string
    esFeatureType?: string
    graphVersion: string
    billingUrl?: string
    managerUrl?: string
  }
  connection: any
  templates: Template[]
  contacts: { total: number; optedIn: number; marketingOptedIn: number; list: Contact[] }
  messages: any[]
  automations: any[]
  stats: {
    outboundSent: number
    delivered: number
    read: number
    failed: number
    inbound: number
  }
}

type Tab = "send" | "inbox" | "templates" | "automations" | "contacts" | "activity"

const TABS: { id: Tab; label: string; icon: any; count?: (ov: Overview) => number }[] = [
  { id: "send", label: "Send & Broadcast", icon: Send },
  { id: "inbox", label: "Live Chat", icon: MessageSquare },
  {
    id: "templates",
    label: "Templates",
    icon: Sparkles,
    count: (ov) => ov.templates.filter((t) => t.status === "APPROVED").length,
  },
  {
    id: "automations",
    label: "Automations",
    icon: Zap,
    count: (ov) => ov.automations.filter((a) => a.active !== false).length,
  },
  {
    id: "contacts",
    label: "Audience & Contacts",
    icon: Users,
    count: (ov) => ov.contacts.optedIn,
  },
  { id: "activity", label: "Message Activity", icon: Clock },
]

function loadFacebookSdk(appId: string, version: string): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("Meta SDK is browser-only"))
  if (!canUseMetaSignup(window.location.protocol)) {
    return Promise.reject(new Error(META_SIGNUP_HTTPS_MESSAGE))
  }
  if (window.FB) {
    window.FB.init({ appId, version, xfbml: false, cookie: false })
    return Promise.resolve(window.FB)
  }

  return new Promise((resolve, reject) => {
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script")
      script.id = "facebook-jssdk"
      script.src = "https://connect.facebook.net/en_US/sdk.js"
      script.async = true
      script.defer = true
      script.crossOrigin = "anonymous"
      document.body.appendChild(script)
    }

    const started = Date.now()
    const timer = window.setInterval(() => {
      if (window.FB) {
        window.clearInterval(timer)
        window.FB.init({ appId, version, xfbml: false, cookie: false })
        resolve(window.FB)
      } else if (Date.now() - started > 15000) {
        window.clearInterval(timer)
        reject(new Error("Meta's signup script did not load. Check your connection and try again."))
      }
    }, 100)
  })
}

export function WhatsAppFlows({ businessId, businessName }: Props) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("send")
  const [connecting, setConnecting] = useState(false)

  const pendingCodeRef = useRef<string | null>(null)
  const pendingDataRef = useRef<{
    wabaId?: string
    phoneNumberId?: string
    businessId?: string
    coexistence?: boolean
  } | null>(null)
  const connectingRef = useRef(false)
  const connectAttemptRef = useRef(false)
  const connectTimeoutRef = useRef<number | null>(null)

  const clearConnectTimeout = useCallback(() => {
    if (connectTimeoutRef.current !== null) {
      window.clearTimeout(connectTimeoutRef.current)
      connectTimeoutRef.current = null
    }
  }, [])

  const loadOverview = useCallback(async () => {
    try {
      const data = await api.v2.whatsapp.overview(businessId)
      setOverview(data)
      setLoadError(null)
    } catch (err: any) {
      setLoadError(err?.message || "Could not load WhatsApp settings")
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  useEffect(() => {
    return () => clearConnectTimeout()
  }, [clearConnectTimeout])

  const finishConnect = useCallback(async () => {
    const code = pendingCodeRef.current
    const data = pendingDataRef.current
    if (!code || !data?.wabaId || connectingRef.current) return
    if (!data.phoneNumberId && !data.coexistence) return

    connectingRef.current = true
    setConnecting(true)
    clearConnectTimeout()
    try {
      const result = await api.v2.whatsapp.connect({
        businessId,
        code,
        wabaId: data.wabaId,
        phoneNumberId: data.phoneNumberId,
        businessPortfolioId: data.businessId || null,
        coexistence: data.coexistence,
      })
      toast.success("WhatsApp connected successfully.")
      await loadOverview()
    } catch (err: any) {
      toast.error(err?.message || "Could not finish WhatsApp connection.")
    } finally {
      clearConnectTimeout()
      pendingCodeRef.current = null
      pendingDataRef.current = null
      connectingRef.current = false
      connectAttemptRef.current = false
      setConnecting(false)
    }
  }, [businessId, clearConnectTimeout, loadOverview])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!event.origin.endsWith("facebook.com")) return
      let data: any
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data
      } catch {
        return
      }
      if (data?.type !== "WA_EMBEDDED_SIGNUP") return

      if (data.event === "CANCEL") {
        clearConnectTimeout()
        setConnecting(false)
        return
      }
      if (data.event === "ERROR") {
        clearConnectTimeout()
        setConnecting(false)
        toast.error(data?.data?.error_message || "Meta reported an error during signup.")
        return
      }

      const payload = data?.data || {}
      pendingDataRef.current = {
        wabaId: payload.waba_id ? String(payload.waba_id) : undefined,
        phoneNumberId: payload.phone_number_id ? String(payload.phone_number_id) : undefined,
        businessId: payload.business_id ? String(payload.business_id) : undefined,
        coexistence: data?.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
      }
      finishConnect()
    }

    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [clearConnectTimeout, finishConnect])

  async function handleConnect() {
    if (!overview?.platform.configured) return
    clearConnectTimeout()
    setConnecting(true)
    try {
      const FB = await loadFacebookSdk(overview.platform.appId, overview.platform.graphVersion)
      FB.login(
        (response: any) => {
          const code = response?.authResponse?.code
          if (!code) {
            setConnecting(false)
            return
          }
          pendingCodeRef.current = code
          finishConnect()
        },
        {
          config_id: overview.platform.configId,
          response_type: "code",
          override_default_response_type: true,
          extras: { setup: {}, sessionInfoVersion: "3" },
        },
      )
    } catch (err: any) {
      toast.error(err?.message || "Failed to initialize Meta signup")
      setConnecting(false)
    }
  }

  // Action: Single Send
  async function handleSendSingle(data: {
    contactId?: string
    phone?: string
    name?: string
    templateId: string
    variables: string[]
    headerVariables: string[]
  }) {
    await api.v2.whatsapp.send({
      businessId,
      contactId: data.contactId,
      phone: data.phone,
      name: data.name,
      templateId: data.templateId,
      variables: data.variables,
      headerVariables: data.headerVariables,
      consentConfirmed: true,
    })
    await loadOverview()
  }

  // Action: Broadcast
  async function handleSendBroadcast(data: {
    templateId: string
    audience: "ALL_OPTED_IN" | "MARKETING_OPT_IN"
    scheduledAt: string
    variables: string[]
    headerVariables: string[]
  }) {
    await api.v2.whatsapp.createCampaign({
      businessId,
      templateId: data.templateId,
      audience: data.audience,
      scheduledAt: data.scheduledAt,
      variableMap: data.variables.map((v) => ({ type: "TEXT", value: v })),
      headerVariableMap: data.headerVariables.map((v) => ({ type: "TEXT", value: v })),
    })
    await loadOverview()
  }

  // Action: Sync Templates with Meta
  async function handleSyncTemplates() {
    try {
      const res = await api.v2.whatsapp.syncTemplates(businessId)
      toast.success(`Synced with Meta! ${res.templates?.length || 0} templates found.`)
      await loadOverview()
    } catch (err: any) {
      toast.error(err?.message || "Could not sync templates from Meta")
    }
  }

  // Action: Create Template
  async function handleCreateTemplate(data: {
    name: string
    language: string
    category: "MARKETING" | "UTILITY"
    useCase: string
    headerText?: string
    bodyText: string
    footerText?: string
    bodyExamples?: string[]
  }) {
    await api.v2.whatsapp.createTemplate({
      businessId,
      name: data.name,
      language: data.language,
      category: data.category,
      useCase: data.useCase as any,
      headerText: data.headerText,
      bodyText: data.bodyText,
      footerText: data.footerText,
      bodyExamples: data.bodyExamples,
    })
    await loadOverview()
  }

  // Action: Add Contact
  async function handleAddContact(data: { phone: string; name?: string; marketingConsent?: boolean }) {
    await api.v2.whatsapp.addContact({
      businessId,
      phone: data.phone,
      name: data.name,
      consentSource: "owner_manual",
      consentConfirmed: true,
      marketingConsent: data.marketingConsent,
    })
    await loadOverview()
  }

  // Action: Bulk Add Contacts
  async function handleBulkAddContacts(contacts: Array<{ phone: string; name?: string; marketingConsent?: boolean }>) {
    const res = await api.v2.whatsapp.bulkAddContacts({
      businessId,
      contacts: contacts.map((c) => ({
        ...c,
        marketingConsent: c.marketingConsent !== false,
      })),
      consentConfirmed: true,
    })
    await loadOverview()
    return { added: res.added || 0, skipped: res.skipped || 0 }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[380px] gap-3">
        <Loader2 className="size-8 animate-spin text-[#25D366]" />
        <p className="text-xs text-muted-foreground font-medium">Loading WhatsApp Hub…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-8 text-center space-y-3">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button variant="outline" size="sm" onClick={loadOverview}>
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!overview) return null

  const isConnected = overview.connection && overview.connection.status === "CONNECTED"

  return (
    <div className="space-y-6">
      {/* 1. Sleek Command Header (Identity, Live Status & Stats) */}
      <WhatsAppHeader
        businessName={businessName}
        connection={overview.connection}
        stats={{
          optedIn: overview.contacts.optedIn,
          delivered: overview.stats.delivered,
          approvedTemplates: overview.templates.filter((t) => t.status === "APPROVED").length,
        }}
        platformBillingUrl={overview.platform.billingUrl}
        onSync={handleSyncTemplates}
      />

      {/* If Not Connected: Clean Connect Call-to-Action */}
      {!isConnected ? (
        <Card className="border-dashed border-2 shadow-xs">
          <CardContent className="py-12 text-center space-y-4 max-w-md mx-auto">
            <div className="size-14 rounded-3xl bg-[#25D366] text-white flex items-center justify-center text-3xl mx-auto shadow-sm">
              💬
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Connect your WhatsApp Business Account
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Send official review requests, festival wishes, and customer updates with zero markup. Connect in 2 minutes using Meta Embedded Signup.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs rounded-xl shadow-xs gap-2"
              disabled={connecting}
              onClick={handleConnect}
            >
              {connecting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {connecting ? "Connecting Meta…" : "Connect WhatsApp with Meta"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 2. Modern Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b">
            {TABS.map((item) => {
              const Icon = item.icon
              const count = item.count ? item.count(overview) : undefined
              const isActive = tab === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition ${
                    isActive
                      ? "bg-[#25D366] text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{item.label}</span>
                  {typeof count === "number" && count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-muted-foreground/15 text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* 3. Tab Contents */}
          <div className="pt-1">
            {/* Tab: Send & Broadcast */}
            {tab === "send" && (
              <WhatsAppSendComposer
                businessId={businessId}
                businessName={businessName}
                businessSlug={overview.business.slug}
                templates={overview.templates}
                contacts={overview.contacts.list}
                onSendSingle={handleSendSingle}
                onSendBroadcast={handleSendBroadcast}
                onSwitchToTemplates={() => setTab("templates")}
              />
            )}

            {/* Tab: Live Inbox */}
            {tab === "inbox" && <WhatsAppInbox businessId={businessId} />}

            {/* Tab: Templates */}
            {tab === "templates" && (
              <WhatsAppTemplateManager
                businessName={businessName}
                businessSlug={overview.business.slug}
                templates={overview.templates}
                onCreateTemplate={handleCreateTemplate}
                onSelectForSend={(tplId) => {
                  setTab("send")
                }}
                onSync={handleSyncTemplates}
              />
            )}

            {/* Tab: Automations */}
            {tab === "automations" && (
              <WhatsAppAutomationsManager
                businessId={businessId}
                businessName={businessName}
                templates={overview.templates}
                rules={overview.automations}
                onRefresh={loadOverview}
              />
            )}

            {/* Tab: Audience & Contacts */}
            {tab === "contacts" && (
              <WhatsAppContactsManager
                businessName={businessName}
                businessSlug={overview.business.slug}
                contacts={overview.contacts.list}
                onAddContact={handleAddContact}
                onBulkAddContacts={handleBulkAddContacts}
                onSelectForSend={(contactId) => {
                  setTab("send")
                }}
              />
            )}

            {/* Tab: Message Activity History */}
            {tab === "activity" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Message Activity Log</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Live status of every WhatsApp message sent from your business.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={loadOverview} className="h-8 gap-1.5 text-xs">
                    <RefreshCw className="size-3.5" /> Refresh Log
                  </Button>
                </div>

                <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b text-muted-foreground uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Recipient</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Message Preview</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {overview.messages.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            No messages sent yet. Head to "Send &amp; Broadcast" to send your first message.
                          </td>
                        </tr>
                      ) : (
                        overview.messages.map((msg: any) => (
                          <tr key={msg.id} className="hover:bg-muted/30 transition">
                            <td className="py-3 px-4 font-mono font-medium text-foreground">
                              {msg.contact?.phone ? `+${msg.contact.phone}` : "Customer"}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                {msg.messageType}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                              {msg.bodyPreview || "—"}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  msg.status === "DELIVERED" || msg.status === "READ"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                                    : msg.status === "FAILED"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300"
                                }`}
                              >
                                {msg.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
