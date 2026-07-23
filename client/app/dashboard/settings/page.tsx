"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ExternalLink, LogOut, Building2, Plus, Trash2, Pencil, ArrowUpCircle, CreditCard, Check, Calendar, ArrowUpDown, Receipt } from "lucide-react";
import { SettingsForm } from "@/components/dashboard/settings-form"
import { WhatsAppReportCard } from "@/components/dashboard/whatsapp-report-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { OnboardingDialog } from "@/components/onboarding/onboarding-dialog";
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useBusiness } from "@/lib/business-context"
import { toast } from "sonner"

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { currentBusiness, businesses, businessLimit, refreshBusinesses, isLoading } = useBusiness();
  const router = useRouter();

  const [tab, setTab] = useState("profile");
  const [deleteDialog, setDeleteDialog] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<any>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "businesses") {
      setTab("businesses");
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("google") === "connected") {
      toast.success("Google account connected successfully!");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("google") === "error") {
      toast.error("Failed to connect Google account. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (tab === "billing") {
      api.payments.subscription().then((res) => {
        if (res?.subscription) setSubscription(res.subscription);
      }).catch(() => {});
    }
  }, [tab]);

  const handleDelete = useCallback(async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      await api.businesses.delete(deleteDialog.id);
      toast.success(`"${deleteDialog.name}" deleted`);
      setDeleteDialog(null);
      await refreshBusinesses();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete business");
    } finally {
      setDeleting(false);
    }
  }, [deleteDialog, refreshBusinesses]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your profile, businesses, and subscription."
      />

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Mobile-only: Account & quick actions */}
        <div className="md:hidden">
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {(currentBusiness?.name || user?.name || "R").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{currentBusiness?.name || user?.name || "BEYONDVYU"}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href={currentBusiness?.slug ? `/r/${currentBusiness.slug}?demo=true` : "/r/brightsmile?demo=true"}
                target="_blank"
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink className="size-4 shrink-0" />
                View customer flow
              </Link>
              <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2.5 text-xs text-primary">
                <ShieldCheck className="size-4 shrink-0" />
                Compliant mode active
              </div>
              <Button variant="ghost" className="justify-start gap-2 text-muted-foreground" onClick={logout}>
                <LogOut className="size-4" />
                Log out
              </Button>
            </div>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="businesses">Businesses</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6 space-y-6">
            {currentBusiness && <SettingsForm business={currentBusiness} />}
            {currentBusiness && <WhatsAppReportCard businessId={currentBusiness.id} />}
          </TabsContent>

          <TabsContent value="businesses" className="mt-6">
            <BusinessList
              businesses={businesses}
              businessLimit={businessLimit}
              currentBusinessId={currentBusiness?.id}
              onDelete={(biz) => setDeleteDialog(biz)}
              onEdit={(biz) => setEditingBusiness(biz)}
              onAdd={() => {
                if (businesses.length < businessLimit) {
                  setAddDialogOpen(true);
                } else {
                  router.push("/dashboard/billing");
                }
              }}
            />
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <BillingSummary
              subscription={subscription}
              businessLimit={businessLimit}
              businessesCount={businesses.length}
              onViewBilling={() => router.push("/dashboard/billing")}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add business dialog */}
      <OnboardingDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete business</DialogTitle>
            <DialogDescription>
              This will permanently delete all feedback, QR codes, reviews, and Google connections for <strong>{deleteDialog?.name}</strong>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline edit modal for business name/location */}
      {editingBusiness && (
        <BusinessEditDialog
          business={editingBusiness}
          onClose={() => setEditingBusiness(null)}
          onSaved={() => {
            setEditingBusiness(null);
            refreshBusinesses();
          }}
        />
      )}
    </>
  )
}

function BusinessList({
  businesses,
  businessLimit,
  currentBusinessId,
  onDelete,
  onEdit,
  onAdd,
}: {
  businesses: any[];
  businessLimit: number;
  currentBusinessId?: string;
  onDelete: (biz: any) => void;
  onEdit: (biz: any) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">My Businesses</h3>
          <p className="text-sm text-muted-foreground">
            {businesses.length} of {businessLimit} businesses used
          </p>
        </div>
        {businesses.length >= businessLimit ? (
          <Button onClick={onAdd} size="sm" variant="outline">
            <ArrowUpCircle className="size-4 mr-1.5" />
            Upgrade to add more
          </Button>
        ) : (
          <Button onClick={onAdd} size="sm">
            <Plus className="size-4 mr-1.5" />
            Add business
          </Button>
        )}
      </div>

      {/* Usage bar */}
      <div className="h-2 w-full rounded-full bg-secondary">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${Math.min((businesses.length / businessLimit) * 100, 100)}%` }}
        />
      </div>

      {businesses.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No businesses yet. Create your first one.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {businesses.map((biz) => (
            <Card key={biz.id} className={`p-4 ${biz.id === currentBusinessId ? "ring-1 ring-primary" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">{biz.name}</p>
                    {biz.id === currentBusinessId && (
                      <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {biz.industry} {biz.location ? `· ${biz.location}` : ""}
                  </p>
                  {biz._count && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {biz._count.feedback || 0} reviews · {biz._count.qrCodes || 0} QR codes
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-xs" onClick={() => onEdit(biz)} aria-label="Edit business">
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onDelete(biz)}
                    disabled={businesses.length <= 1}
                    aria-label="Delete business"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function BillingSummary({
  subscription,
  businessLimit,
  businessesCount,
  onViewBilling,
}: {
  subscription: any;
  businessLimit: number;
  businessesCount: number;
  onViewBilling: () => void;
}) {
  if (!subscription) {
    return (
      <Card className="p-6 text-center">
        <CreditCard className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Loading billing info...</p>
      </Card>
    );
  }

  const plan = subscription.plan;
  const formatPrice = (paise: number) => paise === 0 ? "Free" : `₹${(paise / 100).toLocaleString("en-IN")}`;
  const usagePercent = subscription.aiCallsLimit > 0
    ? Math.min(100, Math.round((subscription.aiCallsUsed / subscription.aiCallsLimit) * 100))
    : 0;
  const bizPercent = businessLimit > 0
    ? Math.min(100, Math.round((businessesCount / businessLimit) * 100))
    : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {plan.name}
                <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                  {subscription.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                {formatPrice(plan.price)}/{plan.interval}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onViewBilling}>
              <Receipt className="size-4 mr-1.5" />
              Full billing
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">AI Calls</span>
              <span className="font-medium">{subscription.aiCallsUsed} / {subscription.aiCallsLimit}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="size-3.5" />
                Businesses
              </span>
              <span className="font-medium">{businessesCount} / {businessLimit}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${bizPercent}%` }}
              />
            </div>
          </div>
          {subscription.currentPeriodEnd && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {subscription.cancelledAt ? "Access until" : "Next billing"}
              </span>
              <span className="font-medium">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BusinessEditDialog({ business, onClose, onSaved }: { business: any; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(business.name);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.businesses.update(business.id, { name: name.trim() });
      toast.success("Business updated");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit business</DialogTitle>
          <DialogDescription>Update the name of your business.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="edit-biz-name">Business name</Label>
          <Input id="edit-biz-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
