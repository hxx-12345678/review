"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, ExternalLink, LogOut } from "lucide-react";
import { SettingsForm } from "@/components/dashboard/settings-form"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const bizRes = await api.businesses.list();
        setBusiness(bizRes.businesses[0]);
      } catch {
        // handle
      } finally {
        setLoading(false);
      }
    }
    load();

    // Show toast after OAuth redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      toast.success("Google account connected successfully!");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("google") === "error") {
      toast.error("Failed to connect Google account. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your business profile, review link, and compliance guardrails."
      />

      {/* Mobile-only: Account & quick actions (replaces sidebar bottom on mobile) */}
      <div className="md:hidden px-4">
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {(business?.name || user?.name || "R").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{business?.name || user?.name || "BEYONDVYU"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href={business?.slug ? `/r/${business.slug}?demo=true` : "/r/brightsmile?demo=true"}
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

      <SettingsForm business={business} />
    </div>
  )
}
