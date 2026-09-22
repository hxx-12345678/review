"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { toast } from "sonner";

type ConsentType = "data_processing" | "privacy_terms" | "marketing";

/**
 * DPDP Act: consent must be withdrawable with the same ease as it was given.
 * Required consents (data_processing, privacy_terms) keep the account working —
 * withdrawing them means deleting the account via privacy@ email. Marketing
 * consent is a free toggle here, no support ticket needed.
 */
export function PrivacyConsentCard() {
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ConsentType | null>(null);

  useEffect(() => {
    api.consent.status()
      .then((res) => {
        const map: Record<string, boolean> = {};
        for (const c of res.consents) map[c.type] = c.granted;
        setConsents(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggle(type: ConsentType, granted: boolean) {
    setSaving(type);
    try {
      await api.consent.save([{ type, granted, context: "settings" }]);
      setConsents((prev) => ({ ...prev, [type]: granted }));
      toast.success(granted ? "Consent granted" : "Consent withdrawn");
    } catch (err: any) {
      toast.error(err.message || "Failed to update consent");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-primary" />
        <h2 className="font-medium text-foreground">Privacy & consent</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Your data rights under India&apos;s DPDP Act, 2023. Withdraw any consent at
        any time —{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
          Privacy Policy
        </a>
        .
      </p>
      <div className="mt-5 space-y-1">
        {loading ? (
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Marketing updates</p>
                <p className="text-sm text-muted-foreground">Tips and product announcements. Optional.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {saving === "marketing" && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                <Switch
                  checked={consents.marketing === true}
                  onCheckedChange={(v) => toggle("marketing", v)}
                  disabled={saving !== null}
                  aria-label="Marketing consent (optional)"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Account data processing</p>
                <p className="text-sm text-muted-foreground">Required to run your account. Withdrawing means deleting your account — email privacy@beyondvyu.com.</p>
              </div>
              <Switch checked disabled aria-label="Data processing consent (required, locked on)" />
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Privacy & Terms acceptance</p>
                <p className="text-sm text-muted-foreground">Required to use the platform.</p>
              </div>
              <Switch checked disabled aria-label="Privacy terms consent (required, locked on)" />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
