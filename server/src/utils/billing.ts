/**
 * Billing helpers shared by the payment routes, webhooks and receipts.
 *
 * All money values are integer paise (₹1 = 100 paise), matching the DB schema
 * and Razorpay's API. Nothing here performs I/O except `allocateInvoiceNumber`,
 * which uses an atomic upsert so concurrent invoices never collide.
 */

/** Statuses that grant product entitlements (paid or in good standing). */
export const ENTITLED_STATUSES = ["active", "authenticated", "past_due"] as const;

/**
 * Statuses that mean "a paid/known subscription row exists" for UI display,
 * even though entitlements may not be granted (e.g. `created` = checkout not
 * completed, `paused`/`halted` = mandate suspended).
 */
export const BILLING_VISIBLE_STATUSES = [
  "active",
  "authenticated",
  "past_due",
  "paused",
  "created",
] as const;

/** Normalise a `SubscriptionPlan.interval` into an average number of months. */
export function intervalMonths(interval: string | null | undefined): number {
  switch ((interval || "month").toLowerCase()) {
    case "day":
      return 1 / 30;
    case "week":
      return 12 / 52;
    case "month":
      return 1;
    case "quarter":
      return 3;
    case "year":
      return 12;
    default:
      return 1;
  }
}

/**
 * Monthly-equivalent price in paise. Used to compare plans fairly across
 * billing intervals (a ₹1,200/year plan is ₹100/month, not "cheaper than" a
 * ₹249/month plan because 120000 < 24900 is false — raw price comparison was
 * the bug).
 */
export function monthlyEquivalentPaise(price: number, interval: string | null | undefined): number {
  const months = intervalMonths(interval);
  if (months <= 0) return price;
  return Math.round(price / months);
}

/**
 * Treat the collected amount as GST-inclusive and split out the tax component.
 * The amount actually collected via Razorpay is the plan price, and a tax
 * invoice must reconcile to the amount collected. Product copy therefore says
 * "prices include GST" (an exclusive-GST switch would silently raise prices by
 * 18% unless the plan table was repriced).
 */
export function computeTaxBreakup(totalPaise: number, ratePercent: number) {
  if (!Number.isFinite(totalPaise) || totalPaise <= 0 || !ratePercent || ratePercent <= 0) {
    return { taxableAmount: Math.max(0, totalPaise || 0), taxAmount: 0, cgst: 0, sgst: 0 };
  }
  const rate = ratePercent / 100;
  const taxableAmount = Math.round(totalPaise / (1 + rate));
  const taxAmount = totalPaise - taxableAmount;
  const cgst = Math.floor(taxAmount / 2);
  return { taxableAmount, taxAmount, cgst, sgst: taxAmount - cgst };
}

/** Indian financial year label (Apr–Mar), e.g. "2026-27". Uses IST so the FY
 *  rolls over at midnight India time regardless of the server's timezone. */
export function financialYearLabel(date: Date = new Date()): string {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth(); // 0 = January
  const startYear = month >= 3 ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

type CounterClient = {
  invoiceCounter: {
    upsert: (args: any) => Promise<{ value: number }>;
  };
};

/**
 * Allocate the next sequential invoice number for the current financial year.
 * Atomic by construction: `upsert` performs the increment in a single SQL
 * statement, so two concurrent callers get different values.
 */
export async function allocateInvoiceNumber(
  client: CounterClient,
  date: Date = new Date(),
): Promise<string> {
  const fy = financialYearLabel(date);
  const counter = await client.invoiceCounter.upsert({
    where: { id: `invoice:${fy}` },
    create: { id: `invoice:${fy}`, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `BV/${fy}/${String(counter.value).padStart(4, "0")}`;
}

/** Per-credit price (paise) when a quantity has no exact pack price. */
export const CREDITS_PRICE_PER_UNIT = 99; // ₹99 per 100 credits

/** Credit top-up packs (single source of truth for pricing + auto-recharge). */
export const CREDIT_PACKS: ReadonlyArray<{ credits: number; amount: number; label: string }> = [
  { credits: 100, amount: 9900, label: "100 Credits" },
  { credits: 500, amount: 44900, label: "500 Credits" },
  { credits: 1000, amount: 79900, label: "1,000 Credits" },
  { credits: 2500, amount: 179900, label: "2,500 Credits" },
];

export function getCreditPacks(): { credits: number; amount: number; label: string }[] {
  return CREDIT_PACKS.map((p) => ({ ...p }));
}

/** Price (paise) for a credit quantity: exact pack price, else the per-unit rate. */
export function priceForCredits(credits: number): number {
  const pack = getCreditPacks().find((p) => p.credits === credits);
  if (pack) return pack.amount;
  return Math.round(credits * CREDITS_PRICE_PER_UNIT);
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape a value for safe interpolation into HTML (receipts). */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/** Mask an email for display so a leaked receipt URL cannot dump full PII. */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}
