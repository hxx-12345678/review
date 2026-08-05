"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";

export function BusinessGuard({ children }: { children: ReactNode }) {
  const { isLoading, hasBusinesses, loadError, onboardingDismissed } = useBusiness();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || !user) return;
    // Only force onboarding when the user has no business AND hasn't dismissed it.
    if (!isLoading && !hasBusinesses && !loadError && !onboardingDismissed) {
      router.replace("/onboarding");
    }
  }, [isLoading, hasBusinesses, loadError, router, user, authLoading, onboardingDismissed]);

  return <>{children}</>;
}
