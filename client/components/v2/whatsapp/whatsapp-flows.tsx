"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Info,
  Link2,
  Loader2,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Wallet,
  XCircle,
  Ban,
  Radio,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { META_SIGNUP_HTTPS_MESSAGE, canUseMetaSignup } from "@/lib/meta-signup"
import { toast } from "sonner"
import { WhatsAppInbox } from "./whatsapp-inbox"
import { WhatsAppAutomations } from "./whatsapp-automations"
import { WhatsAppTemplateLibrary, type LibraryTemplate } from "./whatsapp-template-library"

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

interface Connection {
  id: string
  wabaId: string
  phoneNumberId: string
  displayPhoneNumber: string | null
  verifiedName: string | null
  status: string
  tokenExpiresAt: string | null
  webhookSubscribed: boolean
  numberRegistered: boolean
  paymentMethodConfirmedAt: string | null
  qualityRating: string | null
  lastSyncedAt: string | null
  lastError: string | null
  connectedAt: string
}

interface Template {
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
  rejectedReason: string | null
  updatedAt: string
}

interface Contact {
  id: string
  phone: string
  name: string | null
  consentStatus: string
  consentSource: string | null
  marketingOptIn: boolean
  marketingOptOut: boolean
  lastInboundAt: string | null
  lastOutboundAt: string | null
  updatedAt: string
}

interface WhatsAppMessage {
  id: string
  direction: string
  messageType: string
  templateName: string | null
  templateCategory: string | null
  status: string
  bodyPreview: string | null
  errorMessage: string | null
  pricing: any
  createdAt: string
  contact?: { id: string; phone: string; name: string | null } | null
}

interface Automation {
  id: string
  status: string
  purpose: string | null
  scheduledAt: string
  sentAt: string | null
  error: string | null
  variables: string[]
  contact?: { id: string; phone: string; name: string | null } | null
  template?: { id: string; name: string; status: string } | null
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
  connection: Connection | null
  templates: Template[]
  contacts: { total: number; optedIn: number; marketingOptedIn: number; list: Contact[] }
  messages: WhatsAppMessage[]
  automations: Automation[]
  stats: {
    outboundSent: number
    delivered: number
    read: number
    failed: number
    inbound: number
  }
  pricing: any
  billing?: {
    meta: {
      currency: string | null
      monthStart: string
      estimatedSpend: number
      deliveredBillable: number
      deliveredFree: number
      byCategory: Record<string, { deliveredBillable: number; deliveredFree: number; estimated: number }>
      sourceOfTruthUrl: string
      disclaimer: string
    }
    platform: {
      note: string
      manageUrl: string
      metaBillingUrl: string
      metaManagerUrl: string
    }
  }
}

type Tab = "send" | "inbox" | "templates" | "contacts" | "automations" | "scheduled" | "activity"

const TABS: { id: Tab; label: string }[] = [
  { id: "send", label: "Send" },
  { id: "inbox", label: "Inbox" },
  { id: "templates", label: "Templates" },
  { id: "contacts", label: "Contacts" },
  { id: "automations", label: "Automations" },
  { id: "scheduled", label: "Scheduled" },
  { id: "activity", label: "Activity" },
]

const USE_CASES = [
  { id: "REVIEW_REQUEST", label: "Review request" },
  { id: "PAYMENT_REMINDER", label: "Payment reminder" },
  { id: "OFFER", label: "Offer / promotion" },
  { id: "FEEDBACK", label: "Post-purchase feedback" },
  { id: "OWNER_REPORT", label: "Owner report" },
  { id: "CUSTOM", label: "Custom" },
]

function formatDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const value = status.toUpperCase()
  if (value === "APPROVED" || value === "DELIVERED" || value === "READ" || value === "SENT") return "default"
  if (value === "REJECTED" || value === "FAILED" || value === "DISABLED") return "destructive"
  if (value === "PENDING" || value === "SCHEDULED" || value === "PROCESSING") return "secondary"
  return "outline"
}

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

function BadgeFor({ status }: { status: string }) {
  return <Badge variant={statusVariant(status)}>{status.replaceAll("_", " ").toLowerCase()}</Badge>
}

export function WhatsAppFlows({ businessId, businessName }: Props) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("send")
  const [action, setAction] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [isHttps, setIsHttps] = useState(true)
  const [pin, setPin] = useState("")

  const [tplName, setTplName] = useState("")
  const [tplLanguage, setTplLanguage] = useState("en")
  const [tplCategory, setTplCategory] = useState<"MARKETING" | "UTILITY" | "AUTHENTICATION">("UTILITY")
  const [tplUseCase, setTplUseCase] = useState("REVIEW_REQUEST")
  const [tplHeader, setTplHeader] = useState("")
  const [tplBody, setTplBody] = useState("")
  const [tplFooter, setTplFooter] = useState("")
  const [tplExamples, setTplExamples] = useState("")
  const [tplHeaderExample, setTplHeaderExample] = useState("")
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  const [contactPhone, setContactPhone] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactConsent, setContactConsent] = useState(false)
  const [contactMarketing, setContactMarketing] = useState(false)
  const [contactNote, setContactNote] = useState("")
  const [copiedOptIn, setCopiedOptIn] = useState(false)
  const [optInUrl, setOptInUrl] = useState("")

  const [bulkInput, setBulkInput] = useState("")
  const [bulkMarketing, setBulkMarketing] = useState(false)
  const [bulkConsent, setBulkConsent] = useState(false)
  const [bulkImporting, setBulkImporting] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [copiedWaChat, setCopiedWaChat] = useState(false)

  const [sendContactId, setSendContactId] = useState("")
  const [sendPhone, setSendPhone] = useState("")
  const [sendName, setSendName] = useState("")
  const [sendConsent, setSendConsent] = useState(false)
  const [sendMarketing, setSendMarketing] = useState(false)
  const [sendTemplateId, setSendTemplateId] = useState("")
  const [sendVars, setSendVars] = useState<string[]>([])
  const [sendHeaderVars, setSendHeaderVars] = useState<string[]>([])
  const [scheduleAt, setScheduleAt] = useState("")

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
    if (typeof window !== "undefined") {
      setIsHttps(canUseMetaSignup(window.location.protocol))
    }
  }, [])

  useEffect(() => {
    return () => clearConnectTimeout()
  }, [clearConnectTimeout])

  useEffect(() => {
    if (overview?.business?.slug && typeof window !== "undefined") {
      setOptInUrl(`${window.location.origin}/w/${overview.business.slug}`)
    }
  }, [overview?.business?.slug])

  async function copyOptInLink() {
    if (!optInUrl) return
    try {
      await navigator.clipboard.writeText(optInUrl)
      setCopiedOptIn(true)
      toast.success("WhatsApp sign-up link copied")
      setTimeout(() => setCopiedOptIn(false), 2000)
    } catch {
      toast.error("Could not copy. Select and copy the link manually.")
    }
  }

  const waChatUrl = useMemo(() => {
    const phone = String(overview?.connection?.displayPhoneNumber || "").replace(/\D/g, "")
    if (!phone) return ""
    const text = `Hi ${businessName}, I'd like to hear about updates.`
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
  }, [overview?.connection?.displayPhoneNumber, businessName])

  async function copyWaChatLink() {
    if (!waChatUrl) return
    try {
      await navigator.clipboard.writeText(waChatUrl)
      setCopiedWaChat(true)
      toast.success("Click-to-chat link copied")
      setTimeout(() => setCopiedWaChat(false), 2000)
    } catch {
      toast.error("Could not copy. Select and copy the link manually.")
    }
  }

  async function handleBulkImport() {
    if (!bulkConsent) {
      toast.error("Confirm that every customer gave permission before importing.")
      return
    }
    const lines = bulkInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (!lines.length) {
      toast.error("Paste at least one customer number.")
      return
    }
    const contacts = lines.slice(0, 1000).map((line) => {
      const parts = line.split(/[,\t;]/).map((part) => part.trim())
      const phone = parts[0] || ""
      const name = parts.slice(1).join(" ").trim() || undefined
      return {
        phone,
        name,
        marketingConsent: bulkMarketing,
        note: "Imported in bulk; owner confirmed consent",
      }
    })
    if (!contacts.some((contact) => contact.phone)) {
      toast.error("No valid numbers found. Put one number per line.")
      return
    }
    setBulkImporting(true)
    try {
      const result = await api.v2.whatsapp.bulkAddContacts({
        businessId,
        consentConfirmed: true,
        contacts,
      })
      toast.success(
        `${result.added} customer(s) added${result.skipped ? `, ${result.skipped} skipped` : ""}.`,
      )
      if (result.errors?.length) toast.warning(result.errors.join(" · "))
      setBulkInput("")
      setBulkConsent(false)
      setBulkMarketing(false)
      setShowBulkImport(false)
      await loadOverview()
    } catch (err: any) {
      toast.error(err?.message || "Could not import customers")
    } finally {
      setBulkImporting(false)
    }
  }

  const approvedTemplates = useMemo(
    () => (overview?.templates || []).filter((template) => template.status === "APPROVED"),
    [overview?.templates],
  )
  const optedInContacts = useMemo(
    () => (overview?.contacts.list || []).filter((contact) => contact.consentStatus === "OPTED_IN"),
    [overview?.contacts.list],
  )
  const selectedSendTemplate = useMemo(
    () => approvedTemplates.find((template) => template.id === sendTemplateId) || null,
    [approvedTemplates, sendTemplateId],
  )

  useEffect(() => {
    setSendVars(Array.from({ length: selectedSendTemplate?.parameterCount || 0 }, () => ""))
    setSendHeaderVars(Array.from({ length: selectedSendTemplate?.headerParameterCount || 0 }, () => ""))
  }, [
    selectedSendTemplate?.id,
    selectedSendTemplate?.parameterCount,
    selectedSendTemplate?.headerParameterCount,
  ])

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
      toast.success("WhatsApp connected to this business.")
      if (Array.isArray(result?.warnings) && result.warnings.length) {
        toast.warning(result.warnings.join(" "))
      }
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
        pendingCodeRef.current = null
        pendingDataRef.current = null
        connectingRef.current = false
        connectAttemptRef.current = false
        setConnecting(false)
        toast.error("WhatsApp connection was cancelled before it finished.")
        return
      }
      if (data.event === "ERROR") {
        clearConnectTimeout()
        pendingCodeRef.current = null
        pendingDataRef.current = null
        connectingRef.current = false
        connectAttemptRef.current = false
        setConnecting(false)
        toast.error(data?.data?.error_message || "Meta reported an error during WhatsApp setup.")
        return
      }

      const payload = data?.data || {}
      const coexistenceEvent =
        data?.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" || payload?.coexistence === true
      if (!payload?.waba_id && !payload?.phone_number_id) return
      if (!payload?.phone_number_id && !coexistenceEvent) {
        clearConnectTimeout()
        toast.error(
          "Meta completed the flow without a phone number. Reconnect and add a WhatsApp business number.",
        )
        connectingRef.current = false
        connectAttemptRef.current = false
        setConnecting(false)
        return
      }
      pendingDataRef.current = {
        wabaId: payload.waba_id ? String(payload.waba_id) : undefined,
        phoneNumberId: payload.phone_number_id ? String(payload.phone_number_id) : undefined,
        businessId: payload.business_id ? String(payload.business_id) : undefined,
        coexistence: coexistenceEvent,
      }
      finishConnect()
    }

    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [clearConnectTimeout, finishConnect])

  async function handleConnect() {
    if (!overview?.platform.configured) return
    if (typeof window !== "undefined" && !canUseMetaSignup(window.location.protocol)) {
      toast.error(META_SIGNUP_HTTPS_MESSAGE)
      return
    }
    clearConnectTimeout()
    connectAttemptRef.current = true
    setConnecting(true)
    connectTimeoutRef.current = window.setTimeout(() => {
      if (!connectAttemptRef.current) return
      pendingCodeRef.current = null
      pendingDataRef.current = null
      connectingRef.current = false
      connectAttemptRef.current = false
      setConnecting(false)
      toast.error(
        "Meta signup timed out. Close any Meta popup, then click Connect WhatsApp again.",
      )
    }, 4 * 60 * 1000)
    try {
      const FB = await loadFacebookSdk(overview.platform.appId, overview.platform.graphVersion)
      pendingCodeRef.current = null
      pendingDataRef.current = null
      const extras: Record<string, unknown> = {
        setup: {},
        sessionInfoVersion: "3",
      }
      if (overview.platform.esFeatureType) {
        extras.featureType = overview.platform.esFeatureType
      }
      // In-app browsers suppress the popup and fall back to a redirect. Meta
      // only completes that redirect when the exact page URI is saved in
      // Facebook Login for Business > Valid OAuth Redirect URIs. Sending it
      // explicitly avoids the SDK guessing a different URL.
      const fallbackRedirectUri = `${window.location.origin}/dashboard/whatsapp`
      FB.login(
        (response: any) => {
          const code = response?.authResponse?.code
          if (!code) {
            clearConnectTimeout()
            connectingRef.current = false
            connectAttemptRef.current = false
            setConnecting(false)
            toast.error("Meta did not return an authorization code. Please try again.")
            return
          }
          pendingCodeRef.current = code
          finishConnect()
        },
        {
          config_id: overview.platform.configId,
          response_type: "code",
          override_default_response_type: true,
          fallback_redirect_uri: fallbackRedirectUri,
          extras,
        },
      )
    } catch (err: any) {
      clearConnectTimeout()
      connectingRef.current = false
      connectAttemptRef.current = false
      setConnecting(false)
      toast.error(err?.message || "Could not open Meta's WhatsApp signup.")
    }
  }

  async function runAction(key: string, fn: () => Promise<any>, successMessage: string) {
    setAction(key)
    try {
      const result = await fn()
      if (Array.isArray(result?.warnings) && result.warnings.length) {
        toast.warning(result.warnings.join(" "))
      }
      toast.success(successMessage)
      await loadOverview()
      return result
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.")
      return null
    } finally {
      setAction(null)
    }
  }

  async function handleRegister() {
    if (!/^\d{6}$/.test(pin)) {
      toast.error("Enter the 6-digit WhatsApp two-step verification PIN.")
      return
    }
    const result = await runAction(
      "register",
      () => api.v2.whatsapp.register({ businessId, pin }),
      "Number registration confirmed.",
    )
    if (result) setPin("")
  }

  function applyPreset(useCase: string) {
    setEditingTemplateId(null)
    setTplUseCase(useCase)
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    const reviewUrl = `${baseUrl}/r/${overview?.business.slug || ""}`

    if (useCase === "REVIEW_REQUEST") {
      setTplCategory("UTILITY")
      setTplName("review_request")
      setTplBody(
        "Hi {{1}}, thank you for visiting {{2}}. Would you share an honest review of your experience? {{3}}",
      )
      setTplExamples(`${"there"}, ${businessName}, ${reviewUrl}`)
      setTplFooter("Reply STOP to opt out of messages.")
      setTplHeader("")
      setTplHeaderExample("")
    } else if (useCase === "PAYMENT_REMINDER") {
      setTplCategory("UTILITY")
      setTplName("payment_reminder")
      setTplBody(
        "Hi {{1}}, this is a reminder that payment for your recent order at {{2}} is pending. Reply here if you need help.",
      )
      setTplExamples(`there, ${businessName}`)
      setTplFooter("")
      setTplHeader("")
      setTplHeaderExample("")
    } else if (useCase === "OFFER") {
      setTplCategory("MARKETING")
      setTplName("special_offer")
      setTplBody("Hi {{1}}, {{2}} has a special offer for you: {{3}}. Reply STOP to opt out.")
      setTplExamples(`there, ${businessName}, 10% off this week`)
      setTplFooter("")
      setTplHeader("")
      setTplHeaderExample("")
    } else if (useCase === "FEEDBACK") {
      setTplCategory("UTILITY")
      setTplName("post_purchase_feedback")
      setTplBody(
        "Hi {{1}}, we are following up on your recent order at {{2}}. Was everything okay? Reply here and our team will help.",
      )
      setTplExamples(`there, ${businessName}`)
      setTplFooter("")
      setTplHeader("")
      setTplHeaderExample("")
    } else if (useCase === "OWNER_REPORT") {
      setTplCategory("UTILITY")
      setTplName("owner_report")
      setTplBody("Reputation report for {{1}}: {{2}}")
      setTplExamples(`${businessName}, weekly reputation summary`)
      setTplFooter("")
      setTplHeader("")
      setTplHeaderExample("")
    }
  }

  function applyLibraryTemplate(libTpl: LibraryTemplate) {
    setEditingTemplateId(null)
    setTplUseCase(libTpl.useCase)
    setTplCategory(libTpl.category)
    setTplName(libTpl.name)
    setTplHeader(libTpl.header || "")
    setTplBody(libTpl.body)
    setTplFooter(
      libTpl.footer ||
        (libTpl.category === "MARKETING" ? "Reply STOP to opt out of promotional messages." : "")
    )
    setTplExamples(libTpl.examples)
    setTplHeaderExample("")
    toast.info(
      `Loaded "${libTpl.title}" template! You can now customize any text, name, or variables below before submitting to Meta.`,
    )
  }

  const previewBody = useMemo(() => {
    if (!tplBody) return ""
    const examples = tplExamples.split(/[,;\n]/).map((e) => e.trim()).filter(Boolean)
    return tplBody.replace(/\{\{(\d+)\}\}/g, (_match, num) => {
      const idx = parseInt(num, 10) - 1
      return examples[idx] || `[Variable {{${num}}}]`
    })
  }, [tplBody, tplExamples])

  const previewHeader = useMemo(() => {
    if (!tplHeader) return ""
    if (tplHeaderExample.trim()) {
      return tplHeader.replace(/\{\{(\d+)\}\}/g, tplHeaderExample.trim())
    }
    return tplHeader
  }, [tplHeader, tplHeaderExample])

  function onUseCaseChange(value: string) {
    setTplUseCase(value)
    if (value === "OFFER") {
      setTplCategory("MARKETING")
      if (!tplFooter) setTplFooter("Reply STOP to opt out of promotional messages.")
    } else if (value !== "CUSTOM") {
      setTplCategory("UTILITY")
    }
  }

  function resetTemplateForm() {
    setEditingTemplateId(null)
    setTplName("")
    setTplBody("")
    setTplFooter("")
    setTplHeader("")
    setTplExamples("")
    setTplHeaderExample("")
  }

  function handleEditTemplate(template: Template) {
    setEditingTemplateId(template.id)
    setTplName(template.name)
    setTplLanguage(template.language)
    setTplCategory(template.category as "MARKETING" | "UTILITY" | "AUTHENTICATION")
    setTplUseCase(template.useCase || "CUSTOM")
    setTplHeader(template.headerText || "")
    setTplBody(template.bodyText || "")
    setTplFooter(template.footerText || "")
    // Meta does not return example values reliably. Re-enter them when editing
    // a template that contains variables.
    setTplExamples("")
    setTplHeaderExample("")
  }

  async function handleSubmitTemplate() {
    if (!tplBody.trim()) {
      toast.error("Enter the template body text.")
      return
    }
    if (!editingTemplateId && !tplName.trim()) {
      toast.error("Enter a template name.")
      return
    }
    const examples = tplExamples
      .split(/[,;\n]/)
      .map((value) => value.trim())
      .filter(Boolean)

    const result = await runAction(
      editingTemplateId ? "update-template" : "create-template",
      () =>
        editingTemplateId
          ? api.v2.whatsapp.updateTemplate(editingTemplateId, {
              businessId,
              category:
                overview?.templates.find((template) => template.id === editingTemplateId)?.status ===
                "APPROVED"
                  ? undefined
                  : tplCategory,
              useCase: tplUseCase as any,
              headerText: tplHeader.trim() || undefined,
              bodyText: tplBody.trim(),
              footerText: tplFooter.trim() || undefined,
              bodyExamples: examples.length ? examples : undefined,
              headerExample: tplHeaderExample.trim() || undefined,
            })
          : api.v2.whatsapp.createTemplate({
              businessId,
              name: tplName.trim().toLowerCase(),
              language: tplLanguage.trim() || "en",
              category: tplCategory,
              useCase: tplUseCase as any,
              headerText: tplHeader.trim() || undefined,
              bodyText: tplBody.trim(),
              footerText: tplFooter.trim() || undefined,
              bodyExamples: examples.length ? examples : undefined,
              headerExample: tplHeaderExample.trim() || undefined,
            }),
      editingTemplateId
        ? "Template edit submitted to Meta. It is pending re-approval."
        : "Template submitted to Meta for review.",
    )
    if (result) resetTemplateForm()
  }

  async function handleAddContact() {
    if (!contactConsent) {
      toast.error("Confirm that the customer gave you permission to message them.")
      return
    }
    const result = await runAction(
      "add-contact",
      () =>
        api.v2.whatsapp.addContact({
          businessId,
          phone: contactPhone.trim(),
          name: contactName.trim() || undefined,
          consentConfirmed: true,
          marketingConsent: contactMarketing,
          consentSource: "owner_attested",
          consentNote: contactNote.trim() || undefined,
        }),
      "Customer added with WhatsApp consent.",
    )
    if (result) {
      setContactPhone("")
      setContactName("")
      setContactNote("")
      setContactConsent(false)
      setContactMarketing(false)
    }
  }

  async function handleSend() {
    if (!sendTemplateId) {
      toast.error("Choose an approved template.")
      return
    }
    if (!sendContactId && !sendPhone.trim()) {
      toast.error("Choose a customer or enter their WhatsApp number.")
      return
    }
    if (!sendContactId && !sendConsent) {
      toast.error("Confirm that this customer opted in to WhatsApp messages.")
      return
    }
    if (
      !sendContactId &&
      selectedSendTemplate?.category === "MARKETING" &&
      !sendMarketing
    ) {
      toast.error("Marketing messages need separate opt-in for offers and promotions.")
      return
    }

    const payload: any = {
      businessId,
      templateId: sendTemplateId,
      variables: sendVars,
      headerVariables: sendHeaderVars,
    }
    if (sendContactId) {
      payload.contactId = sendContactId
    } else {
      payload.phone = sendPhone.trim()
      payload.name = sendName.trim() || undefined
      payload.consentConfirmed = true
      payload.marketingConsent = sendMarketing
      payload.consentSource = "owner_attested"
    }

    const result = await runAction(
      "send",
      () => api.v2.whatsapp.send(payload),
      "Message accepted by Meta. Delivery status will update from the webhook.",
    )
    if (result) {
      setSendPhone("")
      setSendName("")
      setSendConsent(false)
      setSendMarketing(false)
    }
  }

  async function handleSchedule() {
    if (!sendContactId) {
      toast.error("Add this customer to Contacts before scheduling a message.")
      return
    }
    if (!sendTemplateId || !scheduleAt) {
      toast.error("Choose an approved template and a date/time.")
      return
    }
    const scheduled = new Date(scheduleAt)
    if (Number.isNaN(scheduled.getTime())) {
      toast.error("Choose a valid date and time.")
      return
    }
    await runAction(
      "schedule",
      () =>
        api.v2.whatsapp.schedule({
          businessId,
          contactId: sendContactId,
          templateId: sendTemplateId,
          variables: sendVars,
          headerVariables: sendHeaderVars,
          purpose: selectedSendTemplate?.useCase || "CUSTOM",
          scheduledAt: scheduled.toISOString(),
        }),
      "Message scheduled. Consent is re-checked at send time.",
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading WhatsApp automation…
        </CardContent>
      </Card>
    )
  }

  if (loadError || !overview) {
    return (
      <Card>
        <CardContent className="space-y-3 py-8">
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>{loadError || "WhatsApp automation is unavailable."}</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadOverview}>
            <RefreshCw className="size-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const connection = overview.connection
  const pricing = overview.pricing

  const isMetaPaymentError = /131042/.test(connection?.lastError ?? "")
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const httpsDashboardUrl = configuredAppUrl?.startsWith("https://")
    ? `${configuredAppUrl.replace(/\/$/, "")}/dashboard/whatsapp`
    : "https://beyondvyu.com/dashboard/whatsapp"

  return (
    <div className="space-y-6">
      {!overview.platform.configured && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <CardTitle>WhatsApp automation is not enabled yet</CardTitle>
            </div>
            <CardDescription>
              This deployment has not finished Meta Tech Provider setup. Until an administrator connects
              the platform to Meta, businesses cannot link their own WhatsApp number here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              When enabled, each business connects its own WhatsApp Business Account and phone number,
              keeps ownership of the number, and pays Meta directly for delivered messages.
            </p>
          </CardContent>
        </Card>
      )}

      {!isHttps && overview.platform.configured && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Connecting WhatsApp requires HTTPS</p>
            <p className="text-xs text-amber-800">
              This page is open over HTTP, so Meta will not open the Embedded Signup popup. Open the
              deployed HTTPS URL or a secure HTTPS tunnel to connect or change a number. Sending,
              templates, contacts, automations, and the inbox still work locally.{" "}
              <a
                className="font-medium underline underline-offset-2"
                href={httpsDashboardUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open the HTTPS dashboard
              </a>
              .
            </p>
          </div>
        </div>
      )}

      {connection ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-5 text-primary" />
                  <CardTitle>Your WhatsApp number</CardTitle>
                  <BadgeFor status={connection.status} />
                </div>
                <CardDescription>
                  {connection.verifiedName || businessName} ·{" "}
                  {connection.displayPhoneNumber || "Connected number"}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={action === "sync"}
                  onClick={() =>
                    runAction("sync", () => api.v2.whatsapp.sync(businessId), "Connection and templates synced.")
                  }
                >
                  {action === "sync" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Sync
                </Button>
                <Button variant="outline" size="sm" disabled={connecting} onClick={handleConnect}>
                  {connecting ? <Loader2 className="size-4 animate-spin" /> : <Phone className="size-4" />}
                  Reconnect / change number
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {connection.lastError && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p>{connection.lastError}</p>
                </div>
                {isMetaPaymentError && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
                    <Wallet className="size-4 shrink-0" />
                    <p className="flex-1">
                      Meta bills your business directly for WhatsApp messages. Add funds (UPI prepaid) or
                      update your card (invoiced) in Meta Billing to resume delivery. This account's payment
                      mode is fixed by Meta the first time you set it.
                    </p>
                    <a
                      href={overview.platform.billingUrl || "https://business.facebook.com/billing_hub/accounts/"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium underline"
                    >
                      Open Meta Billing <ExternalLink className="size-3" />
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={action === "payment-confirmed"}
                      onClick={() =>
                        runAction(
                          "payment-confirmed",
                          () => api.v2.whatsapp.confirmPaymentMethod(businessId),
                          "Payment-method step marked complete.",
                        )
                      }
                    >
                      I updated Meta Billing
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Webhook</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                  {connection.webhookSubscribed ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <XCircle className="size-4 text-amber-600" />
                  )}
                  {connection.webhookSubscribed ? "Subscribed" : "Not subscribed"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Number registration</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                  {connection.numberRegistered ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="size-4 text-amber-600" />
                  )}
                  {connection.numberRegistered ? "Registered" : "PIN may be required"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Meta payment method</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                  {connection.paymentMethodConfirmedAt ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <Wallet className="size-4 text-amber-600" />
                  )}
                  {connection.paymentMethodConfirmedAt ? "Confirmed by owner" : "Add in Meta Billing"}
                </p>
              </div>
            </div>

            {!connection.numberRegistered && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">Register this number for Cloud API</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Meta may ask for the 6-digit two-step verification PIN you set for this WhatsApp number.
                  We do not store the PIN.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit PIN"
                    inputMode="numeric"
                    className="max-w-40"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={action === "register"}
                    onClick={handleRegister}
                  >
                    {action === "register" ? <Loader2 className="size-4 animate-spin" /> : null}
                    Register number
                  </Button>
                </div>
              </div>
            )}

            {!connection.paymentMethodConfirmedAt && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <Wallet className="size-4 shrink-0" />
                <p className="flex-1">
                  Add a payment method to your own Meta Messaging account. In India you can choose UPI
                  prepaid balance or an invoiced card; Meta fixes that choice on the first payment setup.
                  Meta bills you directly and BEYONDVYU does not add a per-message markup.
                </p>
                <a
                  href={overview.platform.billingUrl || "https://business.facebook.com/billing_hub/accounts/"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium underline"
                >
                  Open Meta Billing <ExternalLink className="size-3" />
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={action === "payment-confirmed"}
                  onClick={() =>
                    runAction(
                      "payment-confirmed",
                      () => api.v2.whatsapp.confirmPaymentMethod(businessId),
                      "Payment-method step marked complete.",
                    )
                  }
                >
                  I added a payment method
                </Button>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              Last synced: {formatDate(connection.lastSyncedAt)}
              {connection.tokenExpiresAt
                ? ` · Access token expires ${formatDate(connection.tokenExpiresAt)} — reconnect before then.`
                : " · Access token does not expire automatically; reconnect if Meta revokes access."}
            </p>
          </CardContent>
        </Card>
      ) : (
        overview.platform.configured && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="size-5 text-primary" />
                <CardTitle>Connect your business WhatsApp</CardTitle>
              </div>
              <CardDescription>
                Use your own WhatsApp Business Account and phone number. Customers see your business
                number, not a shared BEYONDVYU number.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleConnect} disabled={connecting || !overview.platform.configured}>
                  {connecting ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />}
                  {connecting ? "Opening Meta…" : "Connect WhatsApp"}
                </Button>
                <p className="max-w-xl text-xs text-muted-foreground">
                  You can finish Meta signup without a payment method. Add billing in Meta before sending;
                  otherwise Meta blocks messages with error 131042. If you already created a business in
                  Meta, choose the existing business in the popup instead of creating another one.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  Sign in to Meta and select or create your WhatsApp Business Account.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  Keep ownership of your number and your customer conversations.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  Add your own payment method in Meta Billing (UPI prepaid or card invoiced). Meta charges
                  you directly for delivered messages; BEYONDVYU never pays or marks up that bill.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  We only send Meta-approved templates to customers who opted in. Replies are free-form
                  only inside the 24-hour service window.
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                After connecting, the Send, Templates, Contacts, Automations, Scheduled, Inbox, and
                Activity tabs appear here.
              </p>
            </CardContent>
          </Card>
        )
      )}

      {connection && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wallet className="size-5 text-primary" />
                <CardTitle>Meta message pricing</CardTitle>
              </div>
              <CardDescription>
                Your business pays Meta directly from its own WhatsApp Business Account. BEYONDVYU does not
                mark up Meta message fees.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {pricing?.currency === "INR" ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Marketing</p>
                      <p className="mt-1 font-semibold">
                        ₹{Number(pricing?.perDeliveredMessage?.MARKETING ?? 0).toFixed(4)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">per delivered message</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Utility, Authentication, Service</p>
                      <p className="mt-1 font-semibold">
                        ₹{Number(pricing?.perDeliveredMessage?.UTILITY ?? 0).toFixed(4)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">per delivered message</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Official Meta India rates effective {pricing?.effectiveFrom}; verified{" "}
                    {pricing?.verifiedOn}. First{" "}
                    {Number(pricing?.freeServiceMessagesPerMonth || 0).toLocaleString()} delivered service
                    messages per business phone number per month are free. User-initiated messages are
                    free. Meta may change rates.
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Meta charges your business per delivered message in your account currency. See the
                  official rate card for current amounts. User-initiated messages are free; business-
                  initiated template messages are billed when delivered.
                </p>
              )}
              <a
                href={pricing?.source || "https://developers.facebook.com/docs/whatsapp/pricing"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline"
              >
                Official Meta WhatsApp pricing <ExternalLink className="size-3" />
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wallet className="size-5 text-primary" />
                <CardTitle>Who pays what</CardTitle>
              </div>
              <CardDescription>
                Two separate bills. BEYONDVYU never collects, bundles, or marks up your Meta message
                charges.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-sm font-semibold">Meta WhatsApp charges</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Paid by {businessName} directly to Meta from its own Messaging account. Meta charges per
                  delivered business-initiated message; user-initiated messages are free.
                </p>
                <p className="mt-3 text-2xl font-semibold">
                  {overview.billing?.meta?.currency === "INR"
                    ? `₹${Number(overview.billing?.meta?.estimatedSpend || 0).toFixed(2)}`
                    : "See Meta Billing"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  estimated this month · {overview.billing?.meta?.deliveredBillable || 0} billable delivered
                  {overview.billing?.meta?.deliveredFree
                    ? ` · ${overview.billing?.meta?.deliveredFree} free service`
                    : ""}
                </p>
                <a
                  href={
                    overview.billing?.meta?.sourceOfTruthUrl ||
                    overview.platform.billingUrl ||
                    "https://business.facebook.com/billing_hub/accounts/"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary underline"
                >
                  Open your Meta Billing <ExternalLink className="size-3" />
                </a>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-semibold">BEYONDVYU subscription</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Paid to BEYONDVYU through the billing portal for the dashboard, automation, templates,
                  inbox, and reports. This is separate from Meta and does not include message fees.
                </p>
                <a
                  href={overview.billing?.platform?.manageUrl || "/dashboard/billing"}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary underline"
                >
                  Manage BEYONDVYU plan <ExternalLink className="size-3" />
                </a>
              </div>
              {overview.billing?.meta?.disclaimer && (
                <p className="text-[11px] leading-relaxed text-muted-foreground sm:col-span-2">
                  {overview.billing.meta.disclaimer}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Sent", value: overview.stats.outboundSent },
              { label: "Delivered", value: overview.stats.delivered },
              { label: "Read", value: overview.stats.read },
              { label: "Inbound", value: overview.stats.inbound },
              { label: "Opted in", value: overview.contacts.optedIn },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-lg font-semibold">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Info className="size-4" />
              <span>How your business connects with customers on WhatsApp</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 text-muted-foreground">
              <div className="rounded-lg bg-background/80 p-2.5 border">
                <p className="font-medium text-foreground mb-1">1. Collecting Customer Numbers</p>
                <p>
                  When customers leave feedback via your QR code, they can opt in with one tap on the thank-you screen.
                  You can also share your link{" "}
                  <code className="text-primary font-mono text-[10px]">/w/{overview.business.slug}</code> or add them manually in Contacts.
                </p>
              </div>
              <div className="rounded-lg bg-background/80 p-2.5 border">
                <p className="font-medium text-foreground mb-1">2. Customizing Templates</p>
                <p>
                  Pick any message from the Template Library (Diwali, New Year, Offers, Reviews, Payments, etc.).
                  Customize every word and variable, preview live, and submit to Meta for quick approval.
                </p>
              </div>
              <div className="rounded-lg bg-background/80 p-2.5 border">
                <p className="font-medium text-foreground mb-1">3. Automated &amp; Broadcast Sends</p>
                <p>
                  Set up automated review follow-ups after customer feedback, send 1-on-1 messages in Send, or broadcast
                  promotions/festival wishes to all opted-in customers from the Automations tab.
                </p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Owner digest: open Settings → WhatsApp Reputation Pulse to save a weekly/monthly preference
              and send a test digest through an approved Owner report Utility template.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 border-b pb-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  tab === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "send" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Send className="size-5 text-primary" />
                  <CardTitle>Send an approved template</CardTitle>
                </div>
                <CardDescription>
                  Template messages work outside the 24-hour service window. Marketing templates need
                  opt-in and may cost more than Utility templates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {approvedTemplates.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <p className="font-medium">No approved templates yet.</p>
                    <p className="mt-1">
                      Create a template in the Templates tab and wait for Meta to approve it. Only approved
                      templates can be sent.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setTab("templates")}
                    >
                      Create a template
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                      <div>
                        <p className="font-semibold text-foreground">Looking to broadcast to all your customers at once?</p>
                        <p className="text-muted-foreground">
                          Use Group Campaigns in Automations to send festival greetings, offers, or announcements to all{" "}
                          <span className="font-semibold text-foreground">{overview.contacts.optedIn} opted-in customers</span>.
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setTab("automations")} className="shrink-0 gap-1.5">
                        <Radio className="size-3.5" />
                        Group Broadcasts →
                      </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Customer</label>
                        <select
                          value={sendContactId}
                          onChange={(event) => setSendContactId(event.target.value)}
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                        >
                          <option value="">New customer (consent required)</option>
                          {optedInContacts.map((contact) => (
                            <option key={contact.id} value={contact.id}>
                              {contact.name ? `${contact.name} · ` : ""}+{contact.phone}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Approved template</label>
                        <select
                          value={sendTemplateId}
                          onChange={(event) => setSendTemplateId(event.target.value)}
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                        >
                          <option value="">Choose a template</option>
                          {approvedTemplates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name} · {template.category.toLowerCase()}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {!sendContactId && (
                      <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">WhatsApp number</label>
                          <Input
                            value={sendPhone}
                            onChange={(event) => setSendPhone(event.target.value)}
                            placeholder="e.g. 98200 12345"
                            inputMode="tel"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Customer name (optional)</label>
                          <Input
                            value={sendName}
                            onChange={(event) => setSendName(event.target.value)}
                            placeholder="Riya"
                          />
                        </div>
                        <label className="flex items-start gap-2 text-xs text-muted-foreground sm:col-span-2">
                          <input
                            type="checkbox"
                            checked={sendConsent}
                            onChange={(event) => setSendConsent(event.target.checked)}
                            className="mt-0.5 size-4 rounded border-border"
                          />
                          I confirm this customer gave this business permission to send them WhatsApp
                          messages. I am not importing a purchased or scraped list.
                        </label>
                        {selectedSendTemplate?.category === "MARKETING" && (
                          <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 sm:col-span-2">
                            <input
                              type="checkbox"
                              checked={sendMarketing}
                              onChange={(event) => setSendMarketing(event.target.checked)}
                              className="mt-0.5 size-4 rounded border-border"
                            />
                            This customer separately agreed to receive offers and promotions from this
                            business. Marketing consent is not inferred from a service message.
                          </label>
                        )}
                      </div>
                    )}

                    {selectedSendTemplate && selectedSendTemplate.headerParameterCount > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Header variable</label>
                        <Input
                          value={sendHeaderVars[0] || ""}
                          onChange={(event) =>
                            setSendHeaderVars([event.target.value])
                          }
                          placeholder="Value for the header variable"
                        />
                      </div>
                    )}

                    {selectedSendTemplate && selectedSendTemplate.parameterCount > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Body variables ({selectedSendTemplate.parameterCount})
                        </label>
                        {sendVars.map((value, index) => (
                          <Input
                            key={index}
                            value={value}
                            onChange={(event) => {
                              const next = [...sendVars]
                              next[index] = event.target.value
                              setSendVars(next)
                            }}
                            placeholder={`{{${index + 1}}}`}
                          />
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-end gap-3">
                      <Button onClick={handleSend} disabled={action === "send"}>
                        {action === "send" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        Send now
                      </Button>
                      <div className="flex items-end gap-2">
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Schedule for</label>
                          <Input
                            type="datetime-local"
                            value={scheduleAt}
                            onChange={(event) => setScheduleAt(event.target.value)}
                            className="w-56"
                          />
                        </div>
                        <Button
                          variant="outline"
                          onClick={handleSchedule}
                          disabled={action === "schedule" || !sendContactId}
                        >
                          {action === "schedule" ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <CalendarClock className="size-4" />
                          )}
                          Schedule
                        </Button>
                      </div>
                    </div>
                    {!sendContactId && (
                      <p className="text-[11px] text-muted-foreground">
                        To schedule, add the customer in Contacts first so consent can be re-checked at send
                        time.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {tab === "inbox" && <WhatsAppInbox businessId={businessId} />}

          {tab === "automations" && (
            <WhatsAppAutomations
              businessId={businessId}
              templates={approvedTemplates}
              optedInCount={overview.contacts.optedIn}
              marketingOptedInCount={overview.contacts.marketingOptedIn}
              pricing={overview.pricing}
              onChanged={loadOverview}
            />
          )}

          {tab === "templates" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>
                        {editingTemplateId ? "Edit a Meta template" : "Create a Meta template"}
                      </CardTitle>
                      <CardDescription>
                        Meta reviews every template. Utility templates must be non-promotional and specific
                        to a transaction or request. Marketing requires separate opt-in. Name and language
                        cannot be changed after submission.
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={action === "sync-templates"}
                      onClick={() =>
                        runAction(
                          "sync-templates",
                          () => api.v2.whatsapp.syncTemplates(businessId),
                          "Templates synced from Meta.",
                        )
                      }
                    >
                      {action === "sync-templates" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                      Sync from Meta
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Rich Template Library */}
                  <WhatsAppTemplateLibrary onUse={applyLibraryTemplate} businessName={businessName} />

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
                    <span className="text-xs font-medium text-muted-foreground">Quick presets:</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyPreset("REVIEW_REQUEST")}>
                      Review request
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyPreset("PAYMENT_REMINDER")}>
                      Payment reminder
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyPreset("OFFER")}>
                      Offer
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyPreset("FEEDBACK")}>
                      Post-purchase feedback
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyPreset("OWNER_REPORT")}>
                      Owner report
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={tplName}
                        onChange={(event) => setTplName(event.target.value)}
                        placeholder="review_request"
                        disabled={Boolean(editingTemplateId)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Lowercase letters, numbers, and underscores only.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Language</label>
                      <Input
                        value={tplLanguage}
                        onChange={(event) => setTplLanguage(event.target.value)}
                        placeholder="en"
                        disabled={Boolean(editingTemplateId)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Purpose</label>
                      <select
                        value={tplUseCase}
                        onChange={(event) => onUseCaseChange(event.target.value)}
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                      >
                        {USE_CASES.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Meta category</label>
                      <select
                        value={tplCategory}
                        onChange={(event) => {
                          const nextCat = event.target.value as "MARKETING" | "UTILITY" | "AUTHENTICATION"
                          setTplCategory(nextCat)
                          if (nextCat === "MARKETING" && !tplFooter) {
                            setTplFooter("Reply STOP to opt out of promotional messages.")
                          }
                        }}
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                      >
                        <option value="UTILITY">Utility</option>
                        <option value="MARKETING">Marketing</option>
                        <option value="AUTHENTICATION">Authentication</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Header (optional, 60 characters)</label>
                    <Input
                      value={tplHeader}
                      onChange={(event) => setTplHeader(event.target.value)}
                      placeholder="A short header"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-sm font-medium">Body</label>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span>Insert variable:</span>
                        {[1, 2, 3, 4].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setTplBody((b) => `${b}{{${n}}}`)}
                            className="rounded border bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono hover:bg-muted"
                          >
                            +{"{{"}{n}{"}}"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      value={tplBody}
                      onChange={(event) => setTplBody(event.target.value)}
                      placeholder="Hi {{1}}, thank you for visiting {{2}}…"
                      rows={4}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Use {"{{1}}"}, {"{{2}}"} in order. You can edit every word and customize the base template.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Footer (optional, 60 characters)</label>
                    <Input
                      value={tplFooter}
                      onChange={(event) => setTplFooter(event.target.value)}
                      placeholder="Reply STOP to opt out of messages."
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Example values</label>
                      <Input
                        value={tplExamples}
                        onChange={(event) => setTplExamples(event.target.value)}
                        placeholder="Riya, Sunrise Cafe, https://…"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        One value per variable, separated by commas. Meta requires examples.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Header example (optional)</label>
                      <Input
                        value={tplHeaderExample}
                        onChange={(event) => setTplHeaderExample(event.target.value)}
                        placeholder="Example header value"
                      />
                    </div>
                  </div>

                  {/* Live Customer Preview */}
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                        <MessageSquare className="size-3.5 text-emerald-600" />
                        Live WhatsApp Customer Preview
                      </p>
                      <span className="text-[10px] text-muted-foreground">Preview of edited template</span>
                    </div>
                    <div className="mx-auto max-w-sm rounded-2xl bg-muted/60 p-3 border">
                      <div className="rounded-xl bg-[#e1fec6] dark:bg-[#005c4b] p-3 text-[12px] leading-relaxed text-[#111] dark:text-emerald-50 shadow-sm space-y-1 font-sans">
                        {previewHeader && (
                          <p className="font-bold text-xs text-[#075e54] dark:text-emerald-300 border-b border-black/10 dark:border-white/10 pb-1">
                            {previewHeader}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{previewBody || "Your message body text will appear here as you type…"}</p>
                        {tplFooter && (
                          <p className="text-[10px] text-gray-500 dark:text-gray-300 pt-1">
                            {tplFooter}
                          </p>
                        )}
                        <div className="text-right text-[9px] text-gray-400 dark:text-gray-400 flex items-center justify-end gap-1">
                          <span>12:00</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓✓</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-[10px] text-muted-foreground">
                      Variables like <code className="font-mono">{"{{1}}"}</code> are replaced with the example values provided above.
                    </p>
                  </div>

                  {editingTemplateId && (
                    <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                      Meta only allows edits to approved, rejected, or paused templates. If the template
                      has variables, re-enter example values. Meta re-reviews the content, and it cannot be
                      sent again until it is approved.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleSubmitTemplate}
                      disabled={action === "create-template" || action === "update-template"}
                    >
                      {action === "create-template" || action === "update-template" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : editingTemplateId ? (
                        <Pencil className="size-4" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                      {editingTemplateId ? "Save changes" : "Submit to Meta"}
                    </Button>
                    {editingTemplateId && (
                      <Button variant="outline" onClick={resetTemplateForm}>
                        Cancel edit
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Review requests cannot offer discounts, gifts, rewards, or ask only for positive
                    reviews. Those guards are enforced by the server.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your templates</CardTitle>
                  <CardDescription>
                    Only APPROVED templates can be sent. Pending templates usually take minutes to hours;
                    rejected templates show Meta's reason.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {overview.templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No templates synced yet.</p>
                  ) : (
                    overview.templates.map((template) => (
                      <div key={template.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{template.name}</p>
                          <Badge variant="outline">{template.language}</Badge>
                          <Badge variant="outline">{template.category.toLowerCase()}</Badge>
                          {template.useCase && (
                            <Badge variant="secondary">{template.useCase.replaceAll("_", " ").toLowerCase()}</Badge>
                          )}
                          <BadgeFor status={template.status} />
                        </div>
                        {template.bodyText && (
                          <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                            {template.bodyText}
                          </p>
                        )}
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {template.parameterCount} body variable(s)
                          {template.headerParameterCount > 0 ? ` · ${template.headerParameterCount} header variable(s)` : ""}
                          {" · updated "}
                          {formatDate(template.updatedAt)}
                        </p>
                        {template.rejectedReason && (
                          <p className="mt-2 rounded-md border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive">
                            {template.rejectedReason}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {template.status === "APPROVED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSendTemplateId(template.id)
                                setTab("send")
                              }}
                            >
                              Use in Send
                            </Button>
                          )}
                          {["APPROVED", "REJECTED", "PAUSED"].includes(template.status) &&
                            template.metaTemplateId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTemplate(template)}
                              >
                                <Pencil className="size-3.5" /> Edit
                              </Button>
                            )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "contacts" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Link2 className="size-5 text-primary" />
                    <CardTitle>Customer sign-up link</CardTitle>
                  </div>
                  <CardDescription>
                    Share this link or print it as a QR code at the counter. Customers add their own number
                    and choose whether to receive service messages and optional offers. Every sign-up is
                    recorded with consent, so you never have to guess who agreed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input value={optInUrl} readOnly className="min-w-0 flex-1 font-mono text-xs" />
                    <Button variant="outline" size="sm" onClick={copyOptInLink} disabled={!optInUrl}>
                      {copiedOptIn ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                      {copiedOptIn ? "Copied" : "Copy link"}
                    </Button>
                    {optInUrl && (
                      <a
                        href={optInUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary underline"
                      >
                        Preview <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Also available from the feedback thank-you page, where customers can opt in right after
                    submitting feedback. Do not add people from purchased or scraped lists.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-5 text-primary" />
                    <CardTitle>Click-to-chat link</CardTitle>
                  </div>
                  <CardDescription>
                    Share this on your website, Google profile, Instagram bio, or printed QR. The customer
                    sends the first message, so their number appears in your Inbox automatically — you
                    never type it yourself.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={waChatUrl}
                      readOnly
                      placeholder="Connect a WhatsApp number to create this link"
                      className="min-w-0 flex-1 font-mono text-xs"
                    />
                    <Button variant="outline" size="sm" onClick={copyWaChatLink} disabled={!waChatUrl}>
                      {copiedWaChat ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                      {copiedWaChat ? "Copied" : "Copy link"}
                    </Button>
                    {waChatUrl && (
                      <a
                        href={waChatUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary underline"
                      >
                        Open <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    A customer-initiated chat opens the 24-hour service window, so you can reply with
                    free-form text. Their number is captured for replies, but marketing still needs
                    separate opt-in. Reply STOP always works.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="size-5 text-primary" />
                    <CardTitle>Add many customers</CardTitle>
                  </div>
                  <CardDescription>
                    Paste numbers you already have permission to message — one per line, optionally
                    followed by a name. This is for your own consented customers, not purchased or scraped
                    lists.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!showBulkImport ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="outline" onClick={() => setShowBulkImport(true)}>
                        <Upload className="size-4" />
                        Paste multiple numbers
                      </Button>
                      <p className="text-[11px] text-muted-foreground">
                        Up to 1,000 per import. WhatsApp Business app contacts sync automatically when you
                        connect with coexistence.
                      </p>
                    </div>
                  ) : (
                    <>
                      <Textarea
                        value={bulkInput}
                        onChange={(event) => setBulkInput(event.target.value)}
                        rows={6}
                        placeholder={"98200 12345, Riya\n+91 98765 43210, Amit\n90000 11111"}
                        className="font-mono text-xs"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {bulkInput.split(/\r?\n/).filter((line) => line.trim()).length} line(s). Separators:
                        comma, tab, or semicolon.
                      </p>
                      <label className="flex items-start gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={bulkConsent}
                          onChange={(event) => setBulkConsent(event.target.checked)}
                          className="mt-0.5 size-4 rounded border-border"
                        />
                        I confirm every person in this list gave this business permission to receive
                        WhatsApp messages. I am not using a purchased, scraped, or shared list.
                      </label>
                      <label className="flex items-start gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={bulkMarketing}
                          onChange={(event) => setBulkMarketing(event.target.checked)}
                          className="mt-0.5 size-4 rounded border-border"
                        />
                        These customers separately agreed to offers and promotions. Leave unchecked for
                        service/review messages only.
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={handleBulkImport} disabled={bulkImporting}>
                          {bulkImporting ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Upload className="size-4" />
                          )}
                          Import customers
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setShowBulkImport(false)}
                          disabled={bulkImporting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="size-5 text-primary" />
                    <CardTitle>Add a customer with consent</CardTitle>
                  </div>
                  <CardDescription>
                    Only add people who gave this business permission to message them on WhatsApp. Do not
                    import purchased, scraped, or shared lists.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">WhatsApp number</label>
                      <Input
                        value={contactPhone}
                        onChange={(event) => setContactPhone(event.target.value)}
                        placeholder="e.g. 98200 12345"
                        inputMode="tel"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Name (optional)</label>
                      <Input
                        value={contactName}
                        onChange={(event) => setContactName(event.target.value)}
                        placeholder="Riya"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Consent note (optional)</label>
                    <Input
                      value={contactNote}
                      onChange={(event) => setContactNote(event.target.value)}
                      placeholder="e.g. Opted in at billing counter on 17 Nov"
                    />
                  </div>
                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={contactConsent}
                      onChange={(event) => setContactConsent(event.target.checked)}
                      className="mt-0.5 size-4 rounded border-border"
                    />
                    I confirm this customer gave permission to receive WhatsApp messages from{" "}
                    {businessName}, and I understand marketing messages need separate consent under
                    applicable law.
                  </label>
                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={contactMarketing}
                      onChange={(event) => setContactMarketing(event.target.checked)}
                      className="mt-0.5 size-4 rounded border-border"
                    />
                    This customer separately agreed to receive offers and promotions. Leave this unchecked
                    for service or review messages only.
                  </label>
                  <Button onClick={handleAddContact} disabled={action === "add-contact"}>
                    {action === "add-contact" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Add customer
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Customers</CardTitle>
                  <CardDescription>
                    STOP or unsubscribe replies automatically switch a customer to opted out. Marketing
                    opt-outs from WhatsApp's Offers and announcements setting are respected separately.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {overview.contacts.list.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No WhatsApp customers yet.</p>
                  ) : (
                    overview.contacts.list.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {contact.name || "Customer"} · +{contact.phone}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Last inbound: {formatDate(contact.lastInboundAt)} · Last outbound:{" "}
                            {formatDate(contact.lastOutboundAt)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <BadgeFor status={contact.consentStatus} />
                          {contact.marketingOptIn && !contact.marketingOptOut && (
                            <Badge variant="secondary">offers opted in</Badge>
                          )}
                          {contact.marketingOptOut && (
                            <Badge variant="outline">
                              <Ban className="size-3" /> marketing stopped
                            </Badge>
                          )}
                          {contact.consentStatus !== "OPTED_OUT" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={action === `opt-out-${contact.id}`}
                              onClick={() =>
                                runAction(
                                  `opt-out-${contact.id}`,
                                  () => api.v2.whatsapp.optOutContact(businessId, contact.id),
                                  "Customer marked as opted out.",
                                )
                              }
                            >
                              Mark opted out
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "scheduled" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="size-5 text-primary" />
                  <CardTitle>Scheduled messages</CardTitle>
                </div>
                <CardDescription>
                  Scheduled sends re-check consent and template approval at send time. If a customer has
                  opted out, the message is skipped.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {overview.automations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
                ) : (
                  overview.automations.map((automation) => (
                    <div
                      key={automation.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {automation.template?.name || "Template"} →{" "}
                          {automation.contact?.name || automation.contact?.phone || "Customer"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(automation.scheduledAt)}
                          {automation.purpose ? ` · ${automation.purpose.replaceAll("_", " ").toLowerCase()}` : ""}
                        </p>
                        {automation.error && (
                          <p className="mt-1 text-[11px] text-destructive">{automation.error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <BadgeFor status={automation.status} />
                        {automation.status === "SCHEDULED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={action === `cancel-${automation.id}`}
                            onClick={() =>
                              runAction(
                                `cancel-${automation.id}`,
                                () => api.v2.whatsapp.cancelAutomation(businessId, automation.id),
                                "Scheduled message cancelled.",
                              )
                            }
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {tab === "activity" && (
            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>
                  Delivery and read statuses come from Meta's webhook. Pricing is copied from Meta; your
                  business pays Meta directly in WhatsApp Manager.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {overview.messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                ) : (
                  overview.messages.map((message) => (
                    <div key={message.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={message.direction === "INBOUND" ? "secondary" : "outline"}>
                          {message.direction.toLowerCase()}
                        </Badge>
                        <p className="text-sm font-medium">
                          {message.contact?.name || message.contact?.phone || "Customer"}
                        </p>
                        <BadgeFor status={message.status} />
                        {message.templateName && <Badge variant="outline">{message.templateName}</Badge>}
                        {message.templateCategory && (
                          <Badge variant="outline">{message.templateCategory.toLowerCase()}</Badge>
                        )}
                      </div>
                      {message.bodyPreview && (
                        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                          {message.bodyPreview}
                        </p>
                      )}
                      {message.errorMessage && (
                        <p className="mt-1 text-[11px] text-destructive">{message.errorMessage}</p>
                      )}
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {formatDate(message.createdAt)}
                        {message.pricing?.category
                          ? ` · Meta category: ${String(message.pricing.category).toLowerCase()}`
                          : ""}
                        {typeof message.pricing?.billable === "boolean"
                          ? ` · ${message.pricing.billable ? "billable" : "not billable"}`
                          : ""}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
