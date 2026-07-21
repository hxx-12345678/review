"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { saveCookiePreferences, hasCookieConsent, getCookiePreferences } from "@/lib/consent";

type View = "banner" | "customize";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<View>("banner");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const consented = hasCookieConsent();
    if (!consented) {
      timer = setTimeout(() => setVisible(true), 500);
    }

    function onOpenPrefs() {
      setVisible(true);
      setView("customize");
      const prefs = getCookiePreferences();
      if (prefs) {
        setAnalytics(prefs.analytics);
        setMarketing(prefs.marketing);
      }
    }
    window.addEventListener("beyondvyu:open-cookie-preferences", onOpenPrefs);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("beyondvyu:open-cookie-preferences", onOpenPrefs);
    };
  }, []);

  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  function handleAcceptAll() {
    saveCookiePreferences({ necessary: true, analytics: true, marketing: true });
    setVisible(false);
  }

  function handleRejectAll() {
    saveCookiePreferences({ necessary: true, analytics: false, marketing: false });
    setVisible(false);
  }

  function handleSavePreferences() {
    saveCookiePreferences({ necessary: true, analytics, marketing });
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/30 bg-background/95 backdrop-blur-md shadow-2xl"
      role="dialog"
      aria-label="Cookie preferences"
    >
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        {view === "banner" ? (
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl text-sm text-muted-foreground">
              <p>
                We use cookies and similar technologies to improve your experience, analyze traffic, and
                personalize content. See our{" "}
                <Link href="/privacy" className="font-medium text-primary underline-offset-2 hover:underline">
                  Privacy Policy
                </Link>{" "}
                for details.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setView("customize")}>
                Customize
              </Button>
              <Button variant="outline" size="sm" onClick={handleRejectAll}>
                Reject All
              </Button>
              <Button size="sm" onClick={handleAcceptAll}>
                Accept All
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-foreground">Cookie Preferences</h3>
            <p className="text-xs text-muted-foreground">
              Choose which cookies to allow. Necessary cookies are always enabled for basic functionality.
            </p>
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-medium text-foreground">Necessary</span>
                  <p className="text-xs text-muted-foreground">Required for the website to function properly. Cannot be disabled.</p>
                </div>
                <input type="checkbox" checked disabled className="size-4 accent-primary" />
              </label>
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <span className="text-sm font-medium text-foreground">Analytics</span>
                  <p className="text-xs text-muted-foreground">Help us understand how visitors interact with our website.</p>
                </div>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="size-4 accent-primary cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <span className="text-sm font-medium text-foreground">Marketing</span>
                  <p className="text-xs text-muted-foreground">Used to deliver relevant advertisements and track campaign performance.</p>
                </div>
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="size-4 accent-primary cursor-pointer"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setView("banner")}>
                Back
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRejectAll}>
                Reject All
              </Button>
              <Button size="sm" onClick={handleSavePreferences}>
                Save Preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
