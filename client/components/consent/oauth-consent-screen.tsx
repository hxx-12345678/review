"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { DataConsentCheckboxes } from "./data-consent-checkboxes";

interface OAuthConsentScreenProps {
  email: string;
  name: string | null;
  onConsentGiven: () => void;
  onReject: () => void;
}

export function OAuthConsentScreen({
  email,
  name,
  onConsentGiven,
  onReject,
}: OAuthConsentScreenProps) {
  const [consentValid, setConsentValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleContinue() {
    if (!consentValid) return;
    setSubmitting(true);
    onConsentGiven();
  }

  return (
    <div className="relative flex min-h-screen min-w-0 items-center justify-center overflow-hidden bg-gradient-to-br from-muted/30 via-background to-muted/20 p-4">
      <div className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-amber-500/5 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo />
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
            One last step
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Please review how we handle your information
          </p>
        </div>

        <div className="glass-light rounded-2xl p-8">
          <div className="mb-5 rounded-xl bg-muted/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Signed in as
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{name || email}</p>
            {name && (
              <p className="text-xs text-muted-foreground">{email}</p>
            )}
          </div>

          <DataConsentCheckboxes
            onValidityChange={setConsentValid}
            showMarketing={true}
            context="oauth"
          />

          <div className="mt-6 flex flex-col gap-2">
            <Button
              className="squishy h-11 w-full rounded-xl text-sm font-bold"
              disabled={!consentValid || submitting}
              onClick={handleContinue}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Continuing...
                </>
              ) : (
                "Continue to dashboard"
              )}
            </Button>
            <Button
              variant="ghost"
              className="h-11 w-full rounded-xl text-sm"
              onClick={onReject}
            >
              Decline — create a new account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
