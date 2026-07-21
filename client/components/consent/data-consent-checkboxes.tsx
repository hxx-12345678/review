"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { saveConsent, hasRequiredConsent } from "@/lib/consent";

interface ConsentState {
  dataProcessing: boolean;
  privacyTerms: boolean;
  marketing: boolean;
}

interface DataConsentCheckboxesProps {
  onValidityChange: (valid: boolean) => void;
  onConsentChange?: (state: ConsentState) => void;
  showMarketing?: boolean;
  context?: string;
}

export function DataConsentCheckboxes({
  onValidityChange,
  onConsentChange,
  showMarketing = true,
  context = "signup",
}: DataConsentCheckboxesProps) {
  const [dataProcessing, setDataProcessing] = useState(false);
  const [privacyTerms, setPrivacyTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const valid = dataProcessing && privacyTerms;
    onValidityChange(valid);
    onConsentChange?.({ dataProcessing, privacyTerms, marketing });
    saveConsent("data_processing", dataProcessing, context);
    saveConsent("privacy_terms", privacyTerms, context);
    saveConsent("marketing", marketing, context);
  }, [dataProcessing, privacyTerms, marketing, onValidityChange, onConsentChange, context]);

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={dataProcessing}
          onChange={(e) => setDataProcessing(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 rounded border-border/70 text-primary focus:ring-primary/20 focus:ring-4 accent-primary cursor-pointer"
          required
        />
        <span className="text-xs leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors">
          I consent to BEYONDVYU collecting and processing my personal data (name, email, business
          information) to provide and improve review management services.
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={privacyTerms}
          onChange={(e) => setPrivacyTerms(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 rounded border-border/70 text-primary focus:ring-primary/20 focus:ring-4 accent-primary cursor-pointer"
          required
        />
        <span className="text-xs leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors">
          I have read and agree to the{" "}
          <Link href="/privacy" className="font-medium text-primary underline-offset-2 hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="font-medium text-primary underline-offset-2 hover:underline">
            Terms of Service
          </Link>
          .
        </span>
      </label>

      {showMarketing && (
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-border/70 text-primary focus:ring-primary/20 focus:ring-4 accent-primary cursor-pointer"
          />
          <span className="text-xs leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors">
            I agree to receive marketing updates, tips, and product announcements via email. (Optional —
            unsubscribe anytime.)
          </span>
        </label>
      )}
    </div>
  );
}
