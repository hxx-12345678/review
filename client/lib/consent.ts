"use client";

import { api } from "./api";

export type ConsentType = "data_processing" | "privacy_terms" | "marketing";

export interface ConsentRecord {
  type: ConsentType;
  granted: boolean;
  timestamp: number;
  context?: string;
}

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

export interface ServerConsent {
  id: string;
  userId: string;
  type: string;
  granted: boolean;
  context: string | null;
  createdAt: string;
}

const CONSENT_KEY = "beyondvyu_consents";
const COOKIE_KEY = "beyondvyu_cookie_prefs";

// ── LocalStorage helpers (instant offline cache) ──────────────────────────

export function saveConsent(type: ConsentType, granted: boolean, context?: string): void {
  try {
    const stored = JSON.parse(localStorage.getItem(CONSENT_KEY) || "{}");
    stored[type] = { type, granted, timestamp: Date.now(), context };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(stored));
  } catch { /* noop */ }
}

export function getConsent(type: ConsentType): boolean {
  try {
    const stored = JSON.parse(localStorage.getItem(CONSENT_KEY) || "{}");
    return stored[type]?.granted === true;
  } catch {
    return false;
  }
}

export function hasRequiredConsent(): boolean {
  return getConsent("data_processing") && getConsent("privacy_terms");
}

export function saveCookiePreferences(prefs: Omit<CookiePreferences, "timestamp">): void {
  try {
    const record: CookiePreferences = { ...prefs, timestamp: Date.now() };
    localStorage.setItem(COOKIE_KEY, JSON.stringify(record));
  } catch { /* noop */ }
}

export function getCookiePreferences(): CookiePreferences | null {
  try {
    return JSON.parse(localStorage.getItem(COOKIE_KEY) || "null");
  } catch {
    return null;
  }
}

export function hasCookieConsent(): boolean {
  const prefs = getCookiePreferences();
  return prefs !== null;
}

// ── Server-side sync (persistent — survives browser clears) ───────────────

let serverConsentCache: ServerConsent[] | null = null;

export function getServerConsentCache(): ServerConsent[] | null {
  return serverConsentCache;
}

export async function fetchConsentStatus(): Promise<ServerConsent[]> {
  try {
    const data = await api.consent.status();
    serverConsentCache = data.consents;
    return data.consents;
  } catch {
    return [];
  }
}

export async function saveConsentsToServer(
  consents: { type: string; granted: boolean; context?: string }[]
): Promise<boolean> {
  try {
    const data = await api.consent.save(consents);
    serverConsentCache = data.consents;
    // Also sync localStorage cache
    for (const c of consents) {
      if (c.granted) {
        saveConsent(c.type as ConsentType, c.granted, c.context);
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function hasRequiredServerConsent(consents: ServerConsent[]): boolean {
  const types = new Set(consents.filter((c) => c.granted).map((c) => c.type));
  return types.has("data_processing") && types.has("privacy_terms");
}

export function clearConsentCache(): void {
  serverConsentCache = null;
}
