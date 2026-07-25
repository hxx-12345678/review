"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/lib/business-context";

export function BusinessGuard({ children }: { children: ReactNode }) {
  const { isLoading, hasBusinesses, loadError } = useBusiness();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !hasBusinesses && !loadError) {
      router.replace("/onboarding");
    }
  }, [isLoading, hasBusinesses, loadError, router]);

  return <>{children}</>;
}
