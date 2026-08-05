"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";
import { useAuth } from "./auth-context";

interface Business {
  id: string;
  name: string;
  slug: string;
  industry: string;
  googleReviewUrl: string | null;
  googlePlaceId: string | null;
  location: string | null;
  phoneNumber: string | null;
  website: string | null;
  promptTopics: string[];
  createdAt: string;
  _count?: { feedback: number; qrCodes: number; reviewClicks: number };
}

interface BusinessContextType {
  businesses: Business[];
  currentBusiness: Business | null;
  isLoading: boolean;
  businessLimit: number;
  switchBusiness: (id: string) => void;
  refreshBusinesses: () => Promise<void>;
  canAddBusiness: boolean;
  hasBusinesses: boolean;
  loadError: boolean;
  onboardingDismissed: boolean;
  dismissOnboarding: () => void;
  showOnboarding: () => void;
}

const STORAGE_KEY = "beyondvyu_active_business";
const ONBOARDING_DISMISSED_KEY = "beyondvyu_onboarding_dismissed";

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [businessLimit, setBusinessLimit] = useState(1);
  const [loadError, setLoadError] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const { token, loading: authLoading } = useAuth();

  const dismissOnboarding = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
    } catch {
      /* noop */
    }
    setOnboardingDismissed(true);
  }, []);

  const showOnboarding = useCallback(() => {
    try {
      localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    } catch {
      /* noop */
    }
    setOnboardingDismissed(false);
  }, []);

  // Read the dismissed flag once on mount (before auth loads).
  useEffect(() => {
    try {
      if (localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "1") {
        setOnboardingDismissed(true);
      }
    } catch {
      /* noop */
    }
  }, []);

  // Once a business exists, onboarding is never needed — clear the flag.
  useEffect(() => {
    if (businesses.length > 0 && onboardingDismissed) {
      try {
        localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
      } catch {
        /* noop */
      }
      setOnboardingDismissed(false);
    }
  }, [businesses.length, onboardingDismissed]);

  const refreshBusinesses = useCallback(async () => {
    setLoadError(false);
    try {
      const [bizRes, subRes] = await Promise.all([
        api.businesses.list(),
        api.payments.subscription().catch(() => null),
      ]);
      const list = bizRes.businesses || [];
      setBusinesses(list);

      if (subRes?.subscription?.businessLimit) {
        setBusinessLimit(subRes.subscription.businessLimit);
      } else {
        const planRes = await api.payments.plans().catch(() => null);
        const freePlan = planRes?.plans?.find((p: any) => p.slug === "free");
        setBusinessLimit(freePlan?.businessLimit ?? 1);
      }

      if (list.length === 0) {
        setCurrentBusiness(null);
        return;
      }

      const savedId = localStorage.getItem(STORAGE_KEY);
      const target = savedId ? list.find((b: Business) => b.id === savedId) : null;

      if (target) {
        setCurrentBusiness(target);
      } else {
        localStorage.setItem(STORAGE_KEY, list[0].id);
        setCurrentBusiness(list[0]);
      }
    } catch (err) {
      console.error("Failed to refresh businesses:", err);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Don't do anything until AuthProvider has determined auth state
  useEffect(() => {
    if (authLoading) return;

    if (token) {
      setIsLoading(true);
      refreshBusinesses();
    } else {
      setBusinesses([]);
      setCurrentBusiness(null);
      setIsLoading(false);
    }
  }, [token, refreshBusinesses, authLoading]);

  const switchBusiness = useCallback((id: string) => {
    const target = businesses.find((b) => b.id === id);
    if (target) {
      localStorage.setItem(STORAGE_KEY, target.id);
      setCurrentBusiness(target);
    }
  }, [businesses]);

  useEffect(() => {
    if (!isLoading && currentBusiness && !businesses.find((b) => b.id === currentBusiness.id)) {
      const next = businesses.length > 0 ? businesses[0] : null;
      if (next) {
        localStorage.setItem(STORAGE_KEY, next.id);
        setCurrentBusiness(next);
      }
    }
  }, [isLoading, businesses, currentBusiness]);

  const canAddBusiness = businesses.length < businessLimit;

  return (
      <BusinessContext.Provider
        value={{
          businesses,
          currentBusiness,
          isLoading,
          businessLimit,
          switchBusiness,
          refreshBusinesses,
          canAddBusiness,
          hasBusinesses: businesses.length > 0,
          loadError,
          onboardingDismissed,
          dismissOnboarding,
          showOnboarding,
        }}
      >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider");
  return ctx;
}
