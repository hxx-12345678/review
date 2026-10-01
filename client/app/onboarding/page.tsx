"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { useAuth } from "@/lib/auth-context";
import { useBusiness } from "@/lib/business-context";

/**
 * /onboarding is an authenticated flow (it creates businesses via authed APIs).
 * - Logged out (or browser-back to a logged-out session) → /login, never the form.
 * - Logged in WITH businesses reaching here via browser-back → /dashboard
 *   (new businesses are added through the dashboard dialog instead).
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { businesses, isLoading: bizLoading } = useBusiness();

  useEffect(() => {
    if (authLoading || bizLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (businesses.length > 0) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, bizLoading, businesses.length, router]);

  if (authLoading || bizLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || businesses.length > 0) return null;

  return <OnboardingWizard />;
}
