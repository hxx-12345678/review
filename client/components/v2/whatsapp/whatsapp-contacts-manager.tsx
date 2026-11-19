"use client"

import { useState } from "react"
import { Check, Copy, FileSpreadsheet, Plus, QrCode, Search, Send, Upload, Users, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"

export interface Contact {
  id: string
  phone: string
  name: string | null
  consentStatus: string
  consentSource?: string | null
  marketingOptIn: boolean
  createdAt?: string
}

interface Props {
  businessName: string
  businessSlug: string
  contacts: Contact[]
  onAddContact: (data: { phone: string; name?: string; marketingConsent?: boolean }) => Promise<void>
  onBulkAddContacts: (contacts: Array<{ phone: string; name?: string; marketingConsent?: boolean }>) => Promise<{ added: number; skipped: number }>
  onSelectForSend: (contactId: string) => void
}

export function WhatsAppContactsManager({
  businessName,
  businessSlug,
  contacts,
  onAddContact,
  onBulkAddContacts,
  onSelectForSend,
}: Props) {
  const [search, setSearch] = useState("")
  const [copiedLink, setCopiedLink] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)

  // Single contact form
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [marketing, setMarketing] = useState(true)
  const [adding, setAdding] = useState(false)

  // Bulk import form
  const [bulkInput, setBulkInput] = useState("")
  const [bulkMarketing, setBulkMarketing] = useState(true)
  const [bulkImporting, setBulkImporting] = useState(false)

  const optInUrl = typeof window !== "undefined" ? `${window.location.origin}/w/${businessSlug}` : ""

  async function handleCopyLink() {
    if (!optInUrl) return
    try {
      await navigator.clipboard.writeText(optInUrl)
      setCopiedLink(true)
      toast.success("1-Tap WhatsApp Opt-in link copied to clipboard!")
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      toast.error("Could not copy automatically. Please copy the URL manually.")
    }
  }

  async function handleSingleSubmit() {
    if (!phone.trim()) {
      toast.error("Please enter a phone number.")
      return
    }

    setAdding(true)
    try {
      await onAddContact({ phone: phone.trim(), name: name.trim() || undefined, marketingConsent: marketing })
      toast.success("Customer added with WhatsApp opt-in consent.")
      setIsAddOpen(false)
      setPhone("")
      setName("")
    } catch (err: any) {
      toast.error(err?.message || "Failed to add contact")
    } finally {
      setAdding(false)
    }
  }

  async function handleBulkSubmit() {
    const lines = bulkInput
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    if (!lines.length) {
      toast.error("Please paste at least one phone number.")
      return
    }

    const parsed = lines.map((line) => {
      const parts = line.split(/[,\t;]/).map((p) => p.trim())
      const p = parts[0] || ""
      const n = parts.slice(1).join(" ").trim() || undefined
      return { phone: p, name: n, marketingConsent: bulkMarketing }
    })

    setBulkImporting(true)
    try {
      const res = await onBulkAddContacts(parsed)
      toast.success(`Imported ${res.added} contacts! ${res.skipped ? `(${res.skipped} skipped)` : ""}`)
      setIsBulkOpen(false)
      setBulkInput("")
    } catch (err: any) {
      toast.error(err?.message || "Failed to import contacts")
    } finally {
      setBulkImporting(false)
    }
  }

  const filtered = contacts.filter((c) => {
    if (!search) return true
    return (
      c.phone.includes(search) ||
      (c.name && c.name.toLowerCase().includes(search.toLowerCase()))
    )
  })

  return (
    <div className="space-y-6">
      {/* 1-Tap Opt-in Hero Card (No manual typing required from customers!) */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="size-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
            ⚡
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Frictionless 1-Tap WhatsApp Opt-in Link
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
              Customers tap this link on your bills, QR codes, or Instagram. It opens WhatsApp and automatically records their name and number without them having to type anything!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-xs shadow-xs"
            onClick={handleCopyLink}
          >
            {copiedLink ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copiedLink ? "Link Copied!" : "Copy 1-Tap Link"}
          </Button>
        </div>
      </div>

      {/* Audience Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground">Customer Contacts ({contacts.length})</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verified opt-in customer audience ready for review requests and broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk CSV Import Button */}
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 border-emerald-300 text-emerald-800 dark:text-emerald-300 dark:border-emerald-800 text-xs"
            onClick={() => setIsBulkOpen(true)}
          >
            <Upload className="size-3.5" />
            Import CSV
          </Button>

          {/* Add Single Contact Button */}
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="size-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name or phone number…"
          className="h-9 text-xs rounded-xl"
        />
      </div>

      {/* Contacts Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b text-muted-foreground uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">WhatsApp Number</th>
                <th className="py-3 px-4">Consent Status</th>
                <th className="py-3 px-4">Date Added</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No contacts found. Use "Import CSV" or "Add Customer" to get started.
                  </td>
                </tr>
              ) : (
                filtered.map((contact) => (
                  <tr key={contact.id} className="hover:bg-muted/30 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {(contact.name || contact.phone).slice(0, 1).toUpperCase()}
                        </div>
                        <span className="font-semibold text-foreground">
                          {contact.name || "Customer"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      +{contact.phone}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 px-2.5 py-0.5 text-[10px] font-bold">
                        <ShieldCheck className="size-3" />
                        Opted In
                      </span>
                    </td>

                    <td className="py-3 px-4 text-muted-foreground">
                      {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }) : "—"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1"
                        onClick={() => onSelectForSend(contact.id)}
                      >
                        <Send className="size-3" />
                        Send WhatsApp
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Single Customer Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Customer Contact</DialogTitle>
            <DialogDescription>
              Add a customer who gave consent to receive WhatsApp messages from your business.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Customer Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Het Patel"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">WhatsApp Number (with country code)</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 919737779007"
                className="h-9 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Enter without '+' or dashes. For India, start with 91 followed by the 10-digit mobile number.
              </p>
            </div>

            <Button
              className="w-full h-10 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs shadow-xs"
              disabled={adding}
              onClick={handleSingleSubmit}
            >
              {adding ? "Saving…" : "Save Contact"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk CSV Import Dialog */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Import Customers via CSV</DialogTitle>
            <DialogDescription>
              Paste numbers or spreadsheet rows (from your billing POS, Swiggy, Zomato, or Excel).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">
                Paste Phone Numbers &amp; Names (one per line)
              </label>
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                rows={6}
                placeholder="919737779007, Het Patel&#10;919820012345, Rahul Sharma&#10;919988776655, Priya Mehta"
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-muted-foreground">
                Format: <code className="text-primary font-mono">phone, name</code> (one customer per line).
              </p>
            </div>

            <Button
              className="w-full h-10 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs shadow-xs"
              disabled={bulkImporting}
              onClick={handleBulkSubmit}
            >
              {bulkImporting ? "Importing Contacts…" : "Import Customers to WhatsApp Audience"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
