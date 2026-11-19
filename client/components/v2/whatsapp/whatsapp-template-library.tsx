"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronUp, Search, Sparkles } from "lucide-react"

export interface LibraryTemplate {
  id: string
  title: string
  description: string
  category: "MARKETING" | "UTILITY"
  useCase: string
  group: string
  groupEmoji: string
  name: string        // snake_case template name for Meta
  header: string
  body: string
  footer: string
  examples: string   // comma-separated example values for {{1}}, {{2}} …
}

const TEMPLATE_LIBRARY: LibraryTemplate[] = [
  // ── Festivals & Occasions ────────────────────────────────────────────────
  {
    id: "diwali",
    group: "Festivals & Occasions",
    groupEmoji: "🎉",
    title: "Diwali Wishes",
    description: "Warm Diwali greetings to all your customers",
    category: "MARKETING",
    useCase: "CUSTOM",
    name: "diwali_wishes",
    header: "Happy Diwali! 🪔",
    body: "Happy Diwali {{1}}! May this festival bring joy, prosperity, and good health to you and your family. Warm wishes from all of us at {{2}}.\n\nWe are grateful for your trust and support. 🙏",
    footer: "Reply STOP to opt out of promotional messages.",
    examples: "Riya, Sunrise Cafe",
  },
  {
    id: "new_year",
    group: "Festivals & Occasions",
    groupEmoji: "🎉",
    title: "New Year Wishes",
    description: "Ring in the New Year with your customers",
    category: "MARKETING",
    useCase: "CUSTOM",
    name: "new_year_wishes",
    header: "Happy New Year! 🎊",
    body: "Wishing you a joyful and prosperous New Year {{1}}! 🎆 Thank you for being a valued customer of {{2}} this year. We look forward to serving you even better in the year ahead.",
    footer: "Reply STOP to opt out of promotional messages.",
    examples: "Riya, Sunrise Cafe",
  },
  {
    id: "eid",
    group: "Festivals & Occasions",
    groupEmoji: "🎉",
    title: "Eid Mubarak",
    description: "Warm Eid greetings for your customers",
    category: "MARKETING",
    useCase: "CUSTOM",
    name: "eid_mubarak",
    header: "Eid Mubarak! 🌙",
    body: "Eid Mubarak {{1}}! 🌙 May this Eid bring happiness, blessings, and peace to you and your loved ones. Warm wishes from all of us at {{2}}.",
    footer: "Reply STOP to opt out of promotional messages.",
    examples: "Riya, Sunrise Cafe",
  },
  {
    id: "holi",
    group: "Festivals & Occasions",
    groupEmoji: "🎉",
    title: "Holi Wishes",
    description: "Colourful Holi greetings for your customers",
    category: "MARKETING",
    useCase: "CUSTOM",
    name: "holi_wishes",
    header: "Happy Holi! 🎨",
    body: "Happy Holi {{1}}! 🎨 Wishing you a colourful and joyful celebration. May this Holi fill your life with vibrant colours and happiness. With love from {{2}}.",
    footer: "Reply STOP to opt out of promotional messages.",
    examples: "Riya, Sunrise Cafe",
  },
  {
    id: "christmas",
    group: "Festivals & Occasions",
    groupEmoji: "🎉",
    title: "Christmas Wishes",
    description: "Season's greetings for your customers",
    category: "MARKETING",
    useCase: "CUSTOM",
    name: "christmas_wishes",
    header: "Merry Christmas! 🎄",
    body: "Merry Christmas {{1}}! 🎄 Wishing you and your family a season full of warmth, joy, and togetherness. Season's greetings from all of us at {{2}}.",
    footer: "Reply STOP to opt out of promotional messages.",
    examples: "Riya, Sunrise Cafe",
  },
  {
    id: "birthday",
    group: "Festivals & Occasions",
    groupEmoji: "🎉",
    title: "Birthday Wishes",
    description: "Make customers feel special on their birthday",
    category: "MARKETING",
    useCase: "CUSTOM",
    name: "birthday_wishes",
    header: "Happy Birthday! 🎂",
    body: "Happy Birthday {{1}}! 🎂 The team at {{2}} wishes you a wonderful birthday and an amazing year ahead. Thank you for being a valued customer — we are glad to have you with us!",
    footer: "Reply STOP to opt out of promotional messages.",
    examples: "Riya, Sunrise Cafe",
  },

  // ── Offers & Promotions ──────────────────────────────────────────────────
  {
    id: "special_offer",
    group: "Offers & Promotions",
    groupEmoji: "💰",
    title: "Special Offer",
    description: "Share an exclusive deal with opted-in customers",
    category: "MARKETING",
    useCase: "OFFER",
    name: "special_offer",
    header: "",
    body: "Hi {{1}}, here's an exclusive offer from {{2}} just for you!\n\n🎁 {{3}}\n\nValid till {{4}}. Visit us or reply to know more.",
    footer: "Reply STOP to opt out of promotional messages.",
    examples: "Riya, Sunrise Cafe, 20% off on all orders, 30 Nov 2026",
  },
  {
    id: "weekend_special",
    group: "Offers & Promotions",
    groupEmoji: "💰",
    title: "Weekend Special",
    description: "Drive weekend footfall with a special deal",
    category: "MARKETING",
    useCase: "OFFER",
    name: "weekend_special",
    header: "Weekend Deal 🌟",
    body: "Hi {{1}}! This weekend only — {{3}} at {{2}}. Don't miss out! Drop in between {{4}}.",
    footer: "Reply STOP to opt out of promotional messages.",
    examples: "Riya, Sunrise Cafe, Buy 1 Get 1 free on desserts, Sat–Sun 11am to 8pm",
  },
  {
    id: "loyalty_reward",
    group: "Offers & Promotions",
    groupEmoji: "💰",
    title: "Loyalty Reward",
    description: "Reward your loyal, returning customers",
    category: "MARKETING",
    useCase: "OFFER",
    name: "loyalty_reward",
    header: "You've earned a reward! 🏆",
    body: "Hi {{1}}, as a valued customer of {{2}}, you've earned {{3}}! 🎉\n\nVisit us to redeem your reward. Thank you for your continued support!",
    footer: "Reply STOP to opt out of promotional messages.",
    examples: "Riya, Sunrise Cafe, a free dessert on your next visit",
  },
  {
    id: "flash_sale",
    group: "Offers & Promotions",
    groupEmoji: "💰",
    title: "Flash Sale",
    description: "Create urgency with a limited-time flash sale",
    category: "MARKETING",
    useCase: "OFFER",
    name: "flash_sale",
    header: "⚡ Flash Sale — Today Only!",
    body: "Hi {{1}}! ⚡ Flash sale at {{2}} — {{3}}. Today only. First come, first served!\n\nSee you soon.",
    footer: "Reply STOP to opt out of promotional messages.",
    examples: "Riya, Sunrise Cafe, 30% off on all beverages",
  },

  // ── Review Requests ──────────────────────────────────────────────────────
  {
    id: "review_request",
    group: "Review Requests",
    groupEmoji: "⭐",
    title: "Review Request",
    description: "Invite customers to share honest feedback",
    category: "UTILITY",
    useCase: "REVIEW_REQUEST",
    name: "review_request",
    header: "",
    body: "Hi {{1}}, thank you for visiting {{2}}. Would you share an honest review of your experience? It helps others and helps us improve.\n\n{{3}}",
    footer: "Reply STOP to opt out of messages.",
    examples: "Riya, Sunrise Cafe, https://beyondvyu.com/r/sunrise-cafe",
  },
  {
    id: "post_service_review",
    group: "Review Requests",
    groupEmoji: "⭐",
    title: "Post-Service Review",
    description: "Follow up after a specific visit or service date",
    category: "UTILITY",
    useCase: "REVIEW_REQUEST",
    name: "post_service_review",
    header: "",
    body: "Hi {{1}}, we hope your recent visit to {{2}} on {{3}} was wonderful! Your review means a lot to us and helps future customers.\n\nShare your experience here: {{4}}",
    footer: "Reply STOP to opt out of messages.",
    examples: "Riya, Sunrise Cafe, 15 Nov, https://beyondvyu.com/r/sunrise-cafe",
  },

  // ── Owner Reports ─────────────────────────────────────────────────────────
  {
    id: "owner_weekly_digest",
    group: "Owner Reports",
    groupEmoji: "📊",
    title: "Weekly Reputation Digest",
    description: "Send the owner a weekly feedback and rating summary on WhatsApp",
    category: "UTILITY",
    useCase: "OWNER_REPORT",
    name: "owner_weekly_digest",
    header: "Weekly Reputation Pulse",
    body: "Your weekly WhatsApp reputation digest is ready.\n\n{{1}}\n\nReply here if you want help with any follow-up.",
    footer: "Sent to the business owner who opted in.",
    examples: "Feedback 12 · Rating 4.6 · Open issues 2",
  },

  // ── Appointment & Booking ────────────────────────────────────────────────
  {
    id: "appt_confirmation",
    group: "Appointments & Bookings",
    groupEmoji: "📅",
    title: "Appointment Confirmed",
    description: "Confirm a customer's upcoming appointment",
    category: "UTILITY",
    useCase: "CUSTOM",
    name: "appointment_confirmed",
    header: "Appointment Confirmed ✅",
    body: "Hi {{1}}, your appointment at {{2}} is confirmed!\n\n📅 Date: {{3}}\n🕐 Time: {{4}}\n\nPlease arrive a few minutes early. Reply here if you need to reschedule.",
    footer: "",
    examples: "Riya, Sunrise Salon, Monday 18 Nov, 2:30 PM",
  },
  {
    id: "appt_reminder",
    group: "Appointments & Bookings",
    groupEmoji: "📅",
    title: "Appointment Reminder",
    description: "Send a reminder the day before",
    category: "UTILITY",
    useCase: "CUSTOM",
    name: "appointment_reminder",
    header: "Reminder: Appointment Tomorrow ⏰",
    body: "Hi {{1}}, just a reminder that you have an appointment at {{2}} tomorrow — {{3}} at {{4}}. We look forward to seeing you!\n\nReply here if you need to reschedule.",
    footer: "",
    examples: "Riya, Sunrise Salon, Tuesday 19 Nov, 11:00 AM",
  },
  {
    id: "appt_followup",
    group: "Appointments & Bookings",
    groupEmoji: "📅",
    title: "Post-Appointment Follow-up",
    description: "Check in after the appointment",
    category: "UTILITY",
    useCase: "FEEDBACK",
    name: "appt_followup",
    header: "",
    body: "Hi {{1}}, thank you for your appointment at {{2}} on {{3}}. We hope everything went well! Reply here if you have any questions or feedback — we're always happy to help.",
    footer: "",
    examples: "Riya, Sunrise Salon, 18 Nov",
  },

  // ── Payments & Collection ────────────────────────────────────────────────
  {
    id: "payment_reminder",
    group: "Payments & Collection",
    groupEmoji: "💳",
    title: "Payment Reminder",
    description: "Gentle reminder for a pending payment",
    category: "UTILITY",
    useCase: "PAYMENT_REMINDER",
    name: "payment_reminder",
    header: "Payment Due 📋",
    body: "Hi {{1}}, a gentle reminder from {{2}}.\n\n💰 Amount due: ₹{{3}}\n📅 Due date: {{4}}\n\nPlease clear the outstanding payment at your earliest convenience. Reply here if you need help.",
    footer: "",
    examples: "Riya, Sunrise Gym, 2500, 25 Nov 2026",
  },
  {
    id: "payment_received",
    group: "Payments & Collection",
    groupEmoji: "💳",
    title: "Payment Confirmation",
    description: "Confirm that payment was received",
    category: "UTILITY",
    useCase: "CUSTOM",
    name: "payment_received",
    header: "Payment Received ✅",
    body: "Hi {{1}}, we have received your payment of ₹{{2}} at {{3}}. Thank you!\n\nYour receipt number is {{4}}. Please keep this for your records.",
    footer: "",
    examples: "Riya, 2500, Sunrise Gym, RCP-2026-001",
  },
  {
    id: "outstanding_balance",
    group: "Payments & Collection",
    groupEmoji: "💳",
    title: "Outstanding Balance",
    description: "Inform customer of an outstanding amount",
    category: "UTILITY",
    useCase: "PAYMENT_REMINDER",
    name: "outstanding_balance",
    header: "Outstanding Balance",
    body: "Hi {{1}}, this is a reminder from {{2}} that you have an outstanding balance of ₹{{3}}.\n\nPlease contact us at your earliest convenience to settle this. Reply here or call us directly.",
    footer: "",
    examples: "Riya, Sunrise Gym, 1500",
  },

  // ── Thank You & Appreciation ─────────────────────────────────────────────
  {
    id: "thank_you_visit",
    group: "Thank You & Appreciation",
    groupEmoji: "🙏",
    title: "Thank You for Visiting",
    description: "Show gratitude after a customer visit",
    category: "UTILITY",
    useCase: "FEEDBACK",
    name: "thank_you_visit",
    header: "",
    body: "Hi {{1}}, thank you for visiting {{2}} on {{3}}! 🙏\n\nIt was a pleasure serving you. We hope to see you again very soon.",
    footer: "",
    examples: "Riya, Sunrise Cafe, 17 Nov",
  },
  {
    id: "thank_you_loyalty",
    group: "Thank You & Appreciation",
    groupEmoji: "🙏",
    title: "Thank You for Your Loyalty",
    description: "Appreciate your most returning customers",
    category: "MARKETING",
    useCase: "CUSTOM",
    name: "loyalty_appreciation",
    header: "Thank You! 🙏",
    body: "Hi {{1}}, you are one of our most valued customers at {{2}}. We truly appreciate your continued trust and support.\n\nThank you for choosing us — we're here for you always!",
    footer: "Reply STOP to opt out of promotional messages.",
    examples: "Riya, Sunrise Cafe",
  },
  {
    id: "welcome_back",
    group: "Thank You & Appreciation",
    groupEmoji: "🙏",
    title: "Welcome Back",
    description: "Greet a returning customer warmly",
    category: "UTILITY",
    useCase: "FEEDBACK",
    name: "welcome_back",
    header: "Great to have you back! 👋",
    body: "Welcome back {{1}}! 👋 It's wonderful to see you at {{2}} again. Let us know if there's anything special we can do for you — your satisfaction is our priority!",
    footer: "",
    examples: "Riya, Sunrise Cafe",
  },

  // ── Order & Service Updates ──────────────────────────────────────────────
  {
    id: "order_ready",
    group: "Order & Service Updates",
    groupEmoji: "📦",
    title: "Order Ready for Pickup",
    description: "Notify customer their order is ready",
    category: "UTILITY",
    useCase: "CUSTOM",
    name: "order_ready",
    header: "Your order is ready! 🛍️",
    body: "Hi {{1}}, great news! Your order at {{2}} (Order #{{3}}) is ready for pickup.\n\nPlease collect it at your convenience during our working hours. See you soon!",
    footer: "",
    examples: "Riya, Sunrise Sweets, ORD-1042",
  },
  {
    id: "service_complete",
    group: "Order & Service Updates",
    groupEmoji: "📦",
    title: "Service Completed",
    description: "Inform that a service job is done",
    category: "UTILITY",
    useCase: "CUSTOM",
    name: "service_complete",
    header: "Service Complete ✅",
    body: "Hi {{1}}, your {{3}} at {{2}} is now complete and ready for collection! 🔧\n\nTotal: ₹{{4}}. Thank you for choosing us.",
    footer: "",
    examples: "Riya, Sunrise Auto, bike service, 850",
  },
  {
    id: "delivery_update",
    group: "Order & Service Updates",
    groupEmoji: "📦",
    title: "Delivery Update",
    description: "Let customers know about their delivery status",
    category: "UTILITY",
    useCase: "CUSTOM",
    name: "delivery_update",
    header: "Your order is on the way! 🚚",
    body: "Hi {{1}}, your order from {{2}} is on its way! 🚚\n\nExpected delivery: {{3}}.\n\nTrack it here: {{4}}",
    footer: "",
    examples: "Riya, Sunrise Store, Today by 7 PM, https://track.example.com/abc",
  },
]

const GROUPS = Array.from(new Set(TEMPLATE_LIBRARY.map((t) => t.group)))

function categoryColor(category: "MARKETING" | "UTILITY") {
  return category === "MARKETING"
    ? "bg-purple-100 text-purple-800 border-purple-200"
    : "bg-blue-100 text-blue-800 border-blue-200"
}

function TemplatePreview({ body, header, footer }: { body: string; header?: string; footer?: string }) {
  return (
    <div className="rounded-xl bg-[#e1fec6] p-3 text-[12px] leading-relaxed text-[#111] shadow-sm w-full max-w-xs font-sans">
      {header && <p className="font-semibold mb-1">{header}</p>}
      <p className="whitespace-pre-wrap">{body}</p>
      {footer && <p className="mt-2 text-[10px] text-gray-500">{footer}</p>}
      <div className="mt-1.5 text-right text-[9px] text-gray-400">12:00 ✓✓</div>
    </div>
  )
}

interface TemplateLibraryProps {
  onUse: (template: LibraryTemplate) => void
  businessName?: string
}

export function WhatsAppTemplateLibrary({ onUse, businessName }: TemplateLibraryProps) {
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState("")
  const [preview, setPreview] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<"ALL" | "MARKETING" | "UTILITY">("ALL")

  const filtered = TEMPLATE_LIBRARY.filter((t) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.group.toLowerCase().includes(q) ||
      t.body.toLowerCase().includes(q)
    const matchCategory = filterCategory === "ALL" || t.category === filterCategory
    return matchSearch && matchCategory
  })

  const visibleGroups = GROUPS.filter((g) => filtered.some((t) => t.group === g))

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-left text-sm font-medium text-primary transition hover:bg-primary/10"
      >
        <Sparkles className="size-4 shrink-0" />
        <span>Start from a template — browse {TEMPLATE_LIBRARY.length} ready-made messages</span>
        <ChevronDown className="ml-auto size-4 shrink-0 opacity-60" />
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-muted/30 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <p className="text-sm font-semibold">Template Library</p>
          <span className="text-[11px] text-muted-foreground">{TEMPLATE_LIBRARY.length} templates</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronUp className="size-3.5" /> Collapse
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="pl-8 h-8 text-xs"
          />
        </div>
        {(["ALL", "MARKETING", "UTILITY"] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterCategory(cat)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filterCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {cat === "ALL" ? "All" : cat === "MARKETING" ? "Marketing 💰" : "Utility ⚙️"}
          </button>
        ))}
      </div>

      {/* Template groups */}
      {visibleGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No templates match your search.</p>
      ) : (
        <div className="space-y-5 max-h-[600px] overflow-y-auto pr-1">
          {visibleGroups.map((group) => {
            const templates = filtered.filter((t) => t.group === group)
            const emoji = templates[0]?.groupEmoji || ""
            return (
              <div key={group}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {emoji} {group}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {templates.map((tpl) => {
                    const isPreview = preview === tpl.id
                    // Personalise preview: replace {{1}} → customer name, {{2}} → business name
                    const previewBody = tpl.body
                      .replace(/\{\{1\}\}/g, "Riya")
                      .replace(/\{\{2\}\}/g, businessName || "Your Business")
                      .replace(/\{\{3\}\}/g, tpl.examples.split(",")[2]?.trim() || "...")
                      .replace(/\{\{4\}\}/g, tpl.examples.split(",")[3]?.trim() || "...")
                    const previewHeader = tpl.header
                      .replace(/\{\{1\}\}/g, "Riya")
                      .replace(/\{\{2\}\}/g, businessName || "Your Business")
                    return (
                      <div
                        key={tpl.id}
                        className="rounded-xl border bg-card p-3 flex flex-col gap-2 hover:border-primary/40 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold leading-tight">{tpl.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{tpl.description}</p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${categoryColor(tpl.category)}`}
                          >
                            {tpl.category === "MARKETING" ? "Marketing" : "Utility"}
                          </span>
                        </div>

                        {isPreview && (
                          <TemplatePreview
                            body={previewBody}
                            header={previewHeader || undefined}
                            footer={tpl.footer || undefined}
                          />
                        )}

                        <div className="flex gap-2 flex-wrap mt-auto">
                          <button
                            type="button"
                            onClick={() => setPreview(isPreview ? null : tpl.id)}
                            className="text-[11px] text-primary underline underline-offset-2"
                          >
                            {isPreview ? "Hide preview" : "Preview"}
                          </button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-auto h-7 text-xs"
                            onClick={() => {
                              onUse(tpl)
                              setExpanded(false)
                              setPreview(null)
                            }}
                          >
                            Use this template
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Templates are starting points — you can edit every field before submitting to Meta. Marketing templates
        require customer opt-in and include an opt-out footer per Meta policy.
      </p>
    </div>
  )
}
