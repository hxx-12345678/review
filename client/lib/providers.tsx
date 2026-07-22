"use client";

import { AuthProvider } from "@/lib/auth-context";
import { BusinessProvider } from "@/lib/business-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider><BusinessProvider>{children}</BusinessProvider></AuthProvider>;
}
