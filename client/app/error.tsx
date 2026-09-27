"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary (Next.js App Router convention).
 * Without this file, ANY runtime crash renders a blank page that only a
 * manual reload fixes — this converts crashes into a one-tap recovery.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" />
      </div>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          This page hit an unexpected error. Your data is safe — try again, or go
          back home.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()}>
          <RotateCcw className="size-4" />
          Try again
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          <Home className="size-4" />
          Go home
        </Button>
      </div>
    </div>
  );
}
