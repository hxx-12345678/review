"use client";

import { useEffect, useState } from "react";
import { SettingsForm } from "@/components/dashboard/settings-form"
import { PageHeader } from "@/components/dashboard/page-header"
import { api } from "@/lib/api"

export default function SettingsPage() {
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
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your business profile, review link, and compliance guardrails."
      />
      <SettingsForm business={business} />
    </div>
  )
}
