"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, ArrowLeft, Construction } from "lucide-react";

export default function InboxPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  if (!ready) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 sm:p-8">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <Construction className="size-8 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">Review inbox is being updated</h1>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
        We are making improvements to the review inbox experience. Your reviews and replies are safe.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Link>
    </div>
  )
}
