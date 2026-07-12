"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";

function GoogleAuthSuccessHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("beyondvyu_token", token);
      window.dispatchEvent(new Event("storage"));
      router.replace("/dashboard");
    } else {
      setError("Authentication failed — no token received");
    }
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen min-w-0 items-center justify-center">
      <div className="text-center">
        <Logo />
        {error ? (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        ) : (
          <>
            <Loader2 className="mx-auto mt-6 size-6 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Signing you in...</p>
          </>
        )}
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
