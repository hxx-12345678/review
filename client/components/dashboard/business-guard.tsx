"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";

export function BusinessGuard({ children }: { children: ReactNode }) {
  const { isLoading, hasBusinesses, loadError } = useBusiness();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || !user) return;
    if (!isLoading && !hasBusinesses && !loadError) {
      router.replace("/onboarding");
    }
  }, [isLoading, hasBusinesses, loadError, router, user, authLoading]);

  return <>{children}</>;
}
