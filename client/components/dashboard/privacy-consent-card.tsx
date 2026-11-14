"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { toast } from "sonner";

type ConsentType = "data_processing" | "privacy_terms" | "marketing";

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
      toast.success(granted ? "Preferences updated" : "Consent withdrawn");
    } catch (err: any) {
      toast.error(err.message || "Failed to update preferences");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-primary" />
        <h2 className="font-medium text-foreground">Privacy & communication preferences</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your communication preferences and data privacy. You can update your preferences or withdraw consent at any time —{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
          Privacy Policy
        </a>.
      </p>
      <div className="mt-5 space-y-4">
        {loading ? (
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Marketing & product updates</p>
                <p className="text-sm text-muted-foreground">Receive periodic product tips, feature announcements, and insights.</p>
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
            <div className="border-t border-border pt-4 text-xs text-muted-foreground">
              To request personal data export or account deletion, contact our privacy desk at{" "}
              <a href="mailto:privacy@beyondvyu.com" className="text-primary hover:underline">
                privacy@beyondvyu.com
              </a>.
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
