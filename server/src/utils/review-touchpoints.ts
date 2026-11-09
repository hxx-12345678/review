/**
 * Physical/digital touchpoints a review QR or link can be deployed at.
 * These are placement labels only — never table numbers or staff names.
 */
export const REVIEW_TOUCHPOINTS = [
  "table",
  "bill",
  "packaging",
  "reception",
  "takeaway",
  "whatsapp",
  "sms",
  "email",
  "link",
  "other",
] as const;

export type ReviewTouchpoint = (typeof REVIEW_TOUCHPOINTS)[number];

export const TOUCHPOINT_LABELS: Record<ReviewTouchpoint, string> = {
  table: "Table",
  bill: "Bill / checkout",
  packaging: "Packaging",
  reception: "Reception",
  takeaway: "Takeaway counter",
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  link: "Shared link",
  other: "Other",
};

/** Normalise a query-string value; unknown values become null. */
export function normalizeTouchpoint(value?: string | null): ReviewTouchpoint | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  if ((REVIEW_TOUCHPOINTS as readonly string[]).includes(key)) {
    return key as ReviewTouchpoint;
  }
  // Common aliases from printed material / older links.
  if (key === "checkout" || key === "counter" || key === "billing") return "bill";
  if (key === "parcel" || key === "delivery") return "packaging";
  if (key === "front-desk" || key === "frontdesk") return "reception";
  return null;
}

export function touchpointLabel(value?: string | null): string | null {
  const key = normalizeTouchpoint(value);
  return key ? TOUCHPOINT_LABELS[key] : null;
}
