"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { OAuthConsentScreen } from "@/components/consent/oauth-consent-screen";
import {
  fetchConsentStatus,
  hasRequiredServerConsent,
  saveConsentsToServer,
} from "@/lib/consent";

function GoogleAuthSuccessHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const [showConsent, setShowConsent] = useState(false);
  const [processing, setProcessing] = useState(true);
  const [userInfo, setUserInfo] = useState<{ email: string; name: string | null } | null>(null);
  const [storedToken, setStoredToken] = useState<string | null>(null);

  const completeAuth = useCallback((token: string) => {
    localStorage.setItem("beyondvyu_token", token);
    window.dispatchEvent(new Event("storage"));
    router.replace("/onboarding");
  }, [router]);

  const handleConsentGiven = useCallback(async () => {
    if (!storedToken) return;
    setProcessing(true);
    try {
      await saveConsentsToServer([
        { type: "data_processing", granted: true, context: "oauth" },
        { type: "privacy_terms", granted: true, context: "oauth" },
        { type: "marketing", granted: false, context: "oauth" },
      ]);
      completeAuth(storedToken);
    } catch {
      completeAuth(storedToken);
    }
  }, [storedToken, completeAuth]);

  const handleReject = useCallback(() => {
    router.replace("/signup?error=consent_required");
  }, [router]);

  useEffect(() => {
    const rawToken: string | null = searchParams.get("token");
    if (!rawToken) {
      setError("Authentication failed — no token received");
      setProcessing(false);
      return;
    }

    const token: string = rawToken;
    setStoredToken(token);

    // Store token temporarily for API calls, then check consent status
    localStorage.setItem("beyondvyu_token", token);

    async function checkConsent() {
      try {
        const consents = await fetchConsentStatus();
        if (hasRequiredServerConsent(consents)) {
          // Already consented on server — skip consent screen
          completeAuth(token);
          return;
        }

        // Need consent — show screen
        // Decode JWT payload to get user info
        try {
          const payloadBase64 = token.split(".")[1];
          const payload = JSON.parse(atob(payloadBase64));
          setUserInfo({
            email: payload.email || "your account",
            name: payload.name || null,
          });
        } catch {
          setUserInfo({ email: "your account", name: null });
        }
        setShowConsent(true);
        setProcessing(false);

        // Remove token from localStorage — will be stored properly after consent
        localStorage.removeItem("beyondvyu_token");
      } catch {
        // If API fails, allow through (don't block user)
        completeAuth(token);
      }
    }

    checkConsent();
  }, [searchParams, router, completeAuth]);

  if (error) {
    return (
      <div className="flex min-h-screen min-w-0 items-center justify-center">
        <div className="text-center">
          <Logo />
          <p className="mt-4 text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (showConsent && userInfo) {
    return (
      <OAuthConsentScreen
        email={userInfo.email}
        name={userInfo.name}
        onConsentGiven={handleConsentGiven}
        onReject={handleReject}
      />
    );
  }

  return (
    <div className="flex min-h-screen min-w-0 items-center justify-center">
      <div className="text-center">
        <Logo />
        <Loader2 className="mx-auto mt-6 size-6 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}

export default function GoogleAuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen min-w-0 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    }>
      <GoogleAuthSuccessHandler />
    </Suspense>
  );
}
