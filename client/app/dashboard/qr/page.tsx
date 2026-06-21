"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header"
import { QrGenerator } from "@/components/dashboard/qr-generator"
import { api } from "@/lib/api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function QrPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const bizRes = await api.businesses.list();
        const bizList = bizRes.businesses || [];
        setBusinesses(bizList);
        if (bizList.length > 0) {
          setSelectedBusinessId(bizList[0].id);
        }
      } catch {
        // handle
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId) || businesses[0];

  const handleBusinessChange = useCallback((value: string) => {
    setSelectedBusinessId(value);
  }, []);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!businesses.length) {
    return (
      <>
        <PageHeader
          title="QR & links"
          description="Share your QR code and link to start collecting reviews."
        />
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-12 text-center sm:px-12">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <AlertCircle className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No businesses found</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create a business first to generate QR codes and start collecting reviews.
          </p>
          <Button render={<Link href="/onboarding" />} nativeButton={false}>
            Create your first business
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="QR & links"
        description="Share your QR code and link to start collecting reviews."
      >
        {businesses.length > 1 && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Building2 className="size-4 shrink-0 text-muted-foreground" />
            <Select value={selectedBusinessId} onValueChange={(v) => v && handleBusinessChange(v)}>
              <SelectTrigger className="w-full min-w-0 sm:w-fit sm:min-w-[180px]">
                <SelectValue placeholder="Select business" />
              </SelectTrigger>
              <SelectContent>
                {businesses.map((biz) => (
                  <SelectItem key={biz.id} value={biz.id}>
                    <span className="flex items-center gap-2">
                      {biz.name}
                      <span className="text-[10px] text-muted-foreground">({biz.industry})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </PageHeader>
      {selectedBusiness && (
        <QrGenerator
          key={selectedBusiness.id}
          slug={selectedBusiness.slug}
          businessName={selectedBusiness.name}
          businessId={selectedBusiness.id}
        />
      )}
    </>
  )
}
