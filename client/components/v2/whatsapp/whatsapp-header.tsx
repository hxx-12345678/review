"use client"

import { useState } from "react"
import { CheckCircle2, ExternalLink, RefreshCw, Settings, ShieldCheck, Sparkles, Users, MessageSquare, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Props {
  businessName: string
  connection: {
    displayPhoneNumber: string | null
    verifiedName: string | null
    status: string
    wabaId: string
    phoneNumberId: string
    numberRegistered: boolean
    paymentMethodConfirmedAt: string | null
    qualityRating: string | null
  } | null
  stats: {
    optedIn: number
    delivered: number
    approvedTemplates: number
  }
  platformBillingUrl?: string
  onSync: () => Promise<void>
}

export function WhatsAppHeader({
  businessName,
  connection,
  stats,
  platformBillingUrl,
  onSync,
}: Props) {
  const [syncing, setSyncing] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  async function handleSync() {
    setSyncing(true)
    try {
      await onSync()
    } finally {
      setSyncing(false)
    }
  }

  const isConnected = connection && connection.status === "CONNECTED"

  return (
    <div className="rounded-2xl border border-emerald-900/10 bg-gradient-to-r from-emerald-50/60 via-white to-emerald-50/30 dark:from-emerald-950/20 dark:via-background dark:to-emerald-950/10 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Connection & Identity */}
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
            💬
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                {businessName} WhatsApp Hub
              </h2>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-semibold">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected · {connection.displayPhoneNumber || "Active"}
                </span>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                  Setup Required
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Official WhatsApp Business Cloud API · Direct Meta delivery &amp; zero markup
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-800 dark:hover:bg-emerald-950/50"
            disabled={syncing}
            onClick={handleSync}
          >
            <RefreshCw className={`size-3.5 ${syncing ? "animate-spin text-emerald-600" : ""}`} />
            {syncing ? "Syncing Meta…" : "Sync Status"}
          </Button>

          {/* Settings Modal (Tucks away developer WABA details) */}
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-9 px-2.5 text-muted-foreground hover:text-foreground">
                <Settings className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>WhatsApp Business Connection</DialogTitle>
                <DialogDescription>
                  Your Meta WhatsApp Business Account (WABA) technical properties.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-sm">
                <div className="rounded-lg border p-3 bg-muted/20 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Verified Name:</span>
                    <span className="font-semibold text-xs">{connection?.verifiedName || businessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Phone Number:</span>
                    <span className="font-mono text-xs">{connection?.displayPhoneNumber || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Phone ID:</span>
                    <span className="font-mono text-[11px]">{connection?.phoneNumberId || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">WABA ID:</span>
                    <span className="font-mono text-[11px]">{connection?.wabaId || "—"}</span>
                  </div>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">Billing &amp; Payments</p>
                  <p>
                    Meta bills message fees directly to your payment method (card or UPI). BEYONDVYU charges ₹0 markup.
                  </p>
                  <a
                    href={platformBillingUrl || "https://business.facebook.com/billing_hub/accounts/"}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-primary font-medium underline"
                  >
                    Manage Meta Billing Card/UPI <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Hero Metric Pills */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-emerald-900/10">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Users className="size-4" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Audience</p>
            <p className="text-sm sm:text-base font-bold text-foreground">
              {stats.optedIn} <span className="text-[11px] font-normal text-muted-foreground">Customers</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
            <Send className="size-4" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Delivered</p>
            <p className="text-sm sm:text-base font-bold text-foreground">
              {stats.delivered} <span className="text-[11px] font-normal text-muted-foreground">Messages</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-4" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Templates</p>
            <p className="text-sm sm:text-base font-bold text-foreground">
              {stats.approvedTemplates} <span className="text-[11px] font-normal text-muted-foreground">Ready</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
