"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/lib/business-context";

export function BusinessGuard({ children }: { children: ReactNode }) {
  const { isLoading, hasBusinesses } = useBusiness();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !hasBusinesses) {
      router.replace("/onboarding");
    }
  }, [isLoading, hasBusinesses, router]);

  return <>{children}</>;
}
