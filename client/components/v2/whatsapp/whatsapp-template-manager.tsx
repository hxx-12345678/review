"use client"

import { useState } from "react"
import { CheckCircle2, Clock, Plus, Search, Sparkles, Send, ExternalLink, HelpCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { WhatsAppTemplateLibrary, type LibraryTemplate } from "./whatsapp-template-library"
import { WhatsAppPhonePreview } from "./whatsapp-phone-preview"
import { toast } from "sonner"

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

interface Props {
  businessName: string
  businessSlug: string
  templates: Template[]
  onCreateTemplate: (data: {
    name: string
    language: string
    category: "MARKETING" | "UTILITY"
    useCase: string
    headerText?: string
    bodyText: string
    footerText?: string
    bodyExamples?: string[]
  }) => Promise<void>
  onSelectForSend: (templateId: string) => void
  onSync: () => Promise<void>
}

export function WhatsAppTemplateManager({
  businessName,
  businessSlug,
  templates,
  onCreateTemplate,
  onSelectForSend,
  onSync,
}: Props) {
  const [filter, setFilter] = useState<"ALL" | "APPROVED" | "PENDING">("ALL")
  const [search, setSearch] = useState("")
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Creation form state
  const [name, setName] = useState("")
  const [category, setCategory] = useState<"MARKETING" | "UTILITY">("MARKETING")
  const [header, setHeader] = useState("")
  const [body, setBody] = useState("")
  const [footer, setFooter] = useState("Reply STOP to opt out.")
  const [examples, setExamples] = useState("Het, Caesars Palace, https://beyondvyu.com/r/caesars-palace")
  const [submitting, setSubmitting] = useState(false)

  const filtered = templates.filter((t) => {
    if (filter === "APPROVED" && t.status !== "APPROVED") return false
    if (filter === "PENDING" && t.status === "APPROVED") return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.bodyText?.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    return true
  })

  // Pre-fill creator from library
  function handleUseLibraryTemplate(lib: LibraryTemplate) {
    setName(lib.name)
    setCategory(lib.category)
    setHeader(lib.header || "")
    setBody(lib.body || "")
    setFooter(lib.footer || "")
    setExamples(lib.examples || "")
    setIsLibraryOpen(false)
    setIsCreateOpen(true)
  }

  async function handleCreateSubmit() {
    if (!name.trim()) {
      toast.error("Please enter a template name.")
      return
    }
    if (!body.trim()) {
      toast.error("Please enter template body text.")
      return
    }

    setSubmitting(true)
    try {
      await onCreateTemplate({
        name: name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
        language: "en",
        category,
        useCase: name.includes("review") ? "REVIEW_REQUEST" : "CUSTOM",
        headerText: header.trim() || undefined,
        bodyText: body.trim(),
        footerText: footer.trim() || undefined,
        bodyExamples: examples.split(",").map((s) => s.trim()).filter(Boolean),
      })
      toast.success("Template submitted to Meta! Review typically takes 15–30 minutes.")
      setIsCreateOpen(false)
      // reset
      setName("")
      setHeader("")
      setBody("")
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit template to Meta")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground">Message Templates</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pre-approved WhatsApp templates for review requests, offers, and receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Library Button */}
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 border-emerald-300 text-emerald-800 dark:text-emerald-300 dark:border-emerald-800"
            onClick={() => setIsLibraryOpen(true)}
          >
            <Sparkles className="size-3.5" />
            Template Library (25+)
          </Button>

          {/* New Custom Template Button */}
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold shadow-xs"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="size-4" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 self-start">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filter === "ALL"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All ({templates.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("APPROVED")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filter === "APPROVED"
                ? "bg-emerald-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Ready to Send ({templates.filter((t) => t.status === "APPROVED").length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("PENDING")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filter === "PENDING"
                ? "bg-amber-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            In Review ({templates.filter((t) => t.status !== "APPROVED").length})
          </button>
        </div>

        <div className="w-full sm:w-64">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="h-8 text-xs rounded-xl"
          />
        </div>
      </div>

      {/* Templates Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center space-y-3">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Search className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No templates match this view</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pick a ready-made template from our 25+ library to get started in 1 click.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setIsLibraryOpen(true)}>
            Open Template Library
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tpl) => {
            const isApproved = tpl.status === "APPROVED"

            return (
              <Card
                key={tpl.id}
                className="flex flex-col justify-between overflow-hidden shadow-xs hover:border-emerald-500/40 transition-all"
              >
                <CardHeader className="pb-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {tpl.category}
                    </span>

                    {isApproved ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                        ✓ Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                        <Clock className="size-3" /> In Meta Review
                      </span>
                    )}
                  </div>

                  <CardTitle className="text-sm font-bold text-foreground mt-1 truncate">
                    {tpl.name.replaceAll("_", " ")}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* WhatsApp Speech Bubble Graphic */}
                  <div className="rounded-xl bg-[#EFEAE2] dark:bg-[#0B141A] p-3 text-slate-800 dark:text-slate-100 text-xs">
                    <div className="rounded-lg bg-[#D9FDD3] dark:bg-[#005C4B] p-2.5 shadow-xs text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                      {tpl.headerText && (
                        <p className="font-bold text-slate-900 dark:text-white mb-1">
                          {tpl.headerText}
                        </p>
                      )}
                      <p>{tpl.bodyText}</p>
                      {tpl.footerText && (
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 italic">
                          {tpl.footerText}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>{tpl.parameterCount} variables</span>
                    <span>Language: {tpl.language}</span>
                  </div>

                  {/* Actions */}
                  <div className="pt-2">
                    {isApproved ? (
                      <Button
                        size="sm"
                        className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg gap-1.5"
                        onClick={() => onSelectForSend(tpl.id)}
                      >
                        <Send className="size-3.5" />
                        Send This Template
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs text-muted-foreground gap-1.5"
                        onClick={onSync}
                      >
                        Check Approval Status
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Library Dialog Modal */}
      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>25+ WhatsApp Starter Templates</DialogTitle>
            <DialogDescription>
              Pre-crafted for Diwali, New Year, review requests, discounts, and payment reminders.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <WhatsAppTemplateLibrary
              businessName={businessName}
              onUse={handleUseLibraryTemplate}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Customize Template Dialog with Live Phone Preview */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create WhatsApp Template</DialogTitle>
            <DialogDescription>
              Templates are submitted to Meta for approval. Once approved, they can be sent anytime.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-[1fr_300px] py-2">
            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Template Name (Unique identifier)</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. diwali_offer_2026 or review_request"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="MARKETING">Marketing (Offers, Wishes, Reviews)</option>
                    <option value="UTILITY">Utility (Receipts, Account Updates)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Header (Optional)</label>
                  <Input
                    value={header}
                    onChange={(e) => setHeader(e.target.value)}
                    placeholder="e.g. Special Diwali Offer! 🪔"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">
                  Body Text (Use {"{{1}}"}, {"{{2}}"} for placeholders)
                </label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  placeholder="Hi {{1}}, thank you for visiting {{2}}! Tap here: {{3}} to leave a review."
                  className="text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Important: Meta requires text after any link placeholder (do not end the template on a variable).
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Footer Text</label>
                <Input
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  placeholder="e.g. Reply STOP to opt out."
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Sample Variable Values (comma separated)</label>
                <Input
                  value={examples}
                  onChange={(e) => setExamples(e.target.value)}
                  placeholder="e.g. Het, Caesars Palace, https://beyondvyu.com/r/caesars-palace"
                  className="h-9 text-xs"
                />
              </div>

              <Button
                className="w-full h-10 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs shadow-xs"
                disabled={submitting}
                onClick={handleCreateSubmit}
              >
                {submitting ? "Submitting to Meta…" : "Submit to Meta for Approval"}
              </Button>
            </div>

            {/* Live Phone Preview on Right */}
            <div className="hidden md:block">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Live WhatsApp Preview
              </p>
              <WhatsAppPhonePreview
                businessName={businessName}
                headerText={header}
                bodyText={body}
                footerText={footer}
                variables={examples.split(",").map((s) => s.trim())}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
