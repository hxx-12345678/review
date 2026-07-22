"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";

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
}

const STORAGE_KEY = "beyondvyu_active_business";

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [businessLimit, setBusinessLimit] = useState(1);

  const refreshBusinesses = useCallback(async () => {
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
    } catch {
      // handle silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBusinesses();
  }, [refreshBusinesses]);

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
