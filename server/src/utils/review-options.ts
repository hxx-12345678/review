/**
 * Server-side mirror of the review-option taxonomy.
 *
 * The customer UI owns the human-readable labels (`client/lib/industry-categories.ts`),
 * but the API must still be able to:
 *  - validate/limit which categories and custom topics an owner can save, and
 *  - reject selected sub-option IDs that do not belong to the business's industry
 *    or enabled categories.
 *
 * Keep the category IDs here in sync with the client taxonomy. The automated
 * test in `scripts/verify-review-options.ts` compares both sides.
 */

export type ReviewIndustry =
  | "RESTAURANT"
  | "DENTAL"
  | "SALON"
  | "MEDICAL"
  | "AUTO"
  | "AUTO_DEALER"
  | "FITNESS"
  | "ELECTRONICS"
  | "HOME_SERVICES"
  | "OTHER";

const INDUSTRY_ALIASES: Record<string, ReviewIndustry> = {
  RESTAURANT: "RESTAURANT",
  DENTAL: "DENTAL",
  SALON: "SALON",
  MEDICAL: "MEDICAL",
  CLINIC: "MEDICAL",
  AUTO: "AUTO",
  GARAGE: "AUTO",
  MECHANIC: "AUTO",
  CAR_REPAIR: "AUTO",
  AUTO_DEALER: "AUTO_DEALER",
  CAR_DEALER: "AUTO_DEALER",
  CAR_SHOWROOM: "AUTO_DEALER",
  AUTOMOBILE: "AUTO_DEALER",
  FITNESS: "FITNESS",
  GYM: "FITNESS",
  ELECTRONICS: "ELECTRONICS",
  ELECTRONIC: "ELECTRONICS",
  ELECTRONICS_STORE: "ELECTRONICS",
  ELECTRONIC_SERVICE: "ELECTRONICS",
  MOBILE_REPAIR: "ELECTRONICS",
  HOME_SERVICES: "HOME_SERVICES",
  OTHER: "OTHER",
};

/** All category IDs that exist for each industry (client taxonomy is the source of labels). */
export const INDUSTRY_CATEGORY_IDS: Record<ReviewIndustry, string[]> = {
  RESTAURANT: ["food", "service", "ambience", "value", "drinks", "operations"],
  DENTAL: ["treatment", "staff", "facility", "scheduling", "communication", "value"],
  SALON: ["service_quality", "stylist", "atmosphere", "scheduling", "value"],
  MEDICAL: ["provider", "staff", "facility", "access", "communication", "value"],
  AUTO: ["work_quality", "staff", "communication", "timeliness", "pricing", "facility"],
  FITNESS: ["equipment", "classes", "cleanliness", "staff", "atmosphere", "value"],
  AUTO_DEALER: ["sales", "selection", "pricing", "process", "service"],
  ELECTRONICS: ["products", "staff", "repair", "pricing", "after_sales"],
  HOME_SERVICES: ["work_quality", "staff", "communication", "timeliness", "pricing", "cleanliness"],
  OTHER: ["staff", "quality", "experience", "value", "communication", "convenience"],
};

/**
 * The "Drinks & Bar" category is opt-in for restaurants. Most Indian family
 * restaurants do not serve alcohol, so showing cocktails/wine/beer by default
 * is both off-brand and potentially awkward. Bars/pubs/breweries opt in via
 * settings, or are detected from their own name/signature items.
 */
const RESTAURANT_DEFAULT_CATEGORY_IDS = ["food", "service", "ambience", "value", "operations"];

/**
 * Which sub-option ID prefixes belong to each category. Used to reject
 * cross-industry IDs (e.g. a dental ID submitted against a restaurant).
 */
const CATEGORY_ID_PREFIXES: Record<ReviewIndustry, Record<string, string[]>> = {
  RESTAURANT: {
    food: ["food_"],
    service: ["service_"],
    ambience: ["amb_"],
    value: ["value_"],
    drinks: ["drink_"],
    operations: ["op_"],
  },
  DENTAL: {
    treatment: ["dent_"],
    staff: ["dent_"],
    facility: ["dent_"],
    scheduling: ["dent_"],
    communication: ["dent_"],
    value: ["dent_"],
  },
  SALON: {
    service_quality: ["salon_"],
    stylist: ["salon_"],
    atmosphere: ["salon_"],
    scheduling: ["salon_"],
    value: ["salon_"],
  },
  MEDICAL: {
    provider: ["med_"],
    staff: ["med_"],
    facility: ["med_"],
    access: ["med_"],
    communication: ["med_"],
    value: ["med_"],
  },
  AUTO: {
    work_quality: ["auto_"],
    staff: ["auto_"],
    communication: ["auto_"],
    timeliness: ["auto_"],
    pricing: ["auto_"],
    facility: ["auto_"],
  },
  FITNESS: {
    equipment: ["fit_"],
    classes: ["fit_"],
    cleanliness: ["fit_"],
    staff: ["fit_"],
    atmosphere: ["fit_"],
    value: ["fit_"],
  },
  AUTO_DEALER: {
    sales: ["dealer_"],
    selection: ["dealer_"],
    pricing: ["dealer_"],
    process: ["dealer_"],
    service: ["dealer_"],
  },
  ELECTRONICS: {
    products: ["elec_"],
    staff: ["elec_"],
    repair: ["elec_"],
    pricing: ["elec_"],
    after_sales: ["elec_"],
  },
  HOME_SERVICES: {
    work_quality: ["home_"],
    staff: ["home_"],
    communication: ["home_"],
    timeliness: ["home_"],
    pricing: ["home_"],
    cleanliness: ["home_"],
  },
  OTHER: {
    staff: ["other_"],
    quality: ["other_"],
    experience: ["other_"],
    value: ["other_"],
    communication: ["other_"],
    convenience: ["other_"],
  },
};

export function normalizeReviewIndustry(industry: string): ReviewIndustry {
  const key = (industry || "").toUpperCase().trim();
  return INDUSTRY_ALIASES[key] || "OTHER";
}

export function allCategoryIds(industry: string): string[] {
  return INDUSTRY_CATEGORY_IDS[normalizeReviewIndustry(industry)] || INDUSTRY_CATEGORY_IDS.OTHER;
}

/** True when the business itself advertises a bar / alcohol programme. */
const ALCOHOL_SIGNAL =
  /\b(bar|pub|brewery|brewhouse|brewpub|cocktail|mocktail bar|wine|beer|ipa|liquor|whisk(?:y|ey)|spirits|taproom)\b/i;

// "Beer Battered Fish" or "Cocktail Prawns" are dishes, not a bar programme.
const FOOD_CONTEXT =
  /\b(fish|chicken|prawns?|shrimps?|mutton|lamb|beef|pork|paneer|veg|burger|pizza|pasta|curry|rice|biryani|noodles?|sandwich|salad|soup|dessert|cake|tikka|kebab|wings?|fries|fry|batter|battered|grilled|roast|steak|masala|thali|dosa|idli|roll|wrap|platter|seafood)\b/i;

export function businessServesAlcohol(name?: string | null, promptTopics?: string[] | null): boolean {
  const businessName = name || "";
  if (ALCOHOL_SIGNAL.test(businessName) && !FOOD_CONTEXT.test(businessName)) {
    return true;
  }
  return (promptTopics || []).some((topic) => {
    const trimmed = topic.trim();
    return (
      trimmed.split(/\s+/).length <= 4 &&
      ALCOHOL_SIGNAL.test(trimmed) &&
      !FOOD_CONTEXT.test(trimmed)
    );
  });
}

export function defaultCategoryIds(
  industry: string,
  opts?: { name?: string | null; promptTopics?: string[] | null },
): string[] {
  const key = normalizeReviewIndustry(industry);
  if (key === "RESTAURANT") {
    return businessServesAlcohol(opts?.name, opts?.promptTopics)
      ? [...INDUSTRY_CATEGORY_IDS.RESTAURANT]
      : [...RESTAURANT_DEFAULT_CATEGORY_IDS];
  }
  return [...INDUSTRY_CATEGORY_IDS[key]];
}

/** Resolve empty/invalid owner config to the industry defaults. */
export function effectiveCategoryIds(
  industry: string,
  enabledCategories?: string[] | null,
  opts?: { name?: string | null; promptTopics?: string[] | null },
): string[] {
  const all = allCategoryIds(industry);
  const selected = (enabledCategories || []).filter((id) => all.includes(id));
  if (selected.length > 0) return Array.from(new Set(selected));
  return defaultCategoryIds(industry, opts);
}

/** Keep only IDs that belong to the industry. Empty means "use defaults". */
export function sanitizeEnabledCategories(industry: string, ids?: string[] | null): string[] {
  const all = allCategoryIds(industry);
  return Array.from(new Set((ids || []).map((id) => String(id).trim()).filter((id) => all.includes(id))));
}

const PERSON_LIKE_PATTERNS: RegExp[] = [
  /^(dr|mr|ms|mrs|miss|sir|madam)\b/i,
  /\bask\s+for\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s*$/i,
  /\bstaff\s+names?\b/i,
];

/** Google policy: never nudge customers to name individual staff members. */
export function isPersonLikePrompt(label: string): boolean {
  return PERSON_LIKE_PATTERNS.some((re) => re.test(label));
}

/** Same slug scheme as the client, so custom option IDs round-trip. */
export function customTopicId(label: string): string {
  const slug =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "topic";
  return `custom_topic_${slug}`;
}

/** Trim, de-duplicate and cap owner-defined custom review topics. */
export function sanitizeCustomReviewTopics(topics?: string[] | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of topics || []) {
    if (typeof raw !== "string") continue;
    const label = raw.trim().replace(/\s+/g, " ");
    if (label.length < 2 || label.length > 80) continue;
    if (isPersonLikePrompt(label)) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= 20) break;
  }
  return out;
}

/**
 * Filter customer-submitted sub-option IDs down to the options this business
 * actually exposes. Unknown, cross-industry and disabled-category IDs are
 * dropped instead of being persisted into analytics.
 */
export function sanitizeSelectedSubOptions(
  industry: string,
  enabledCategories: string[] | null | undefined,
  customReviewTopics: string[] | null | undefined,
  name: string | null | undefined,
  promptTopics: string[] | null | undefined,
  ids?: string[] | null,
): string[] {
  if (!ids || ids.length === 0) return [];

  const key = normalizeReviewIndustry(industry);
  const enabled = effectiveCategoryIds(industry, enabledCategories, { name, promptTopics });
  const prefixes = new Set<string>();
  for (const categoryId of enabled) {
    for (const prefix of CATEGORY_ID_PREFIXES[key]?.[categoryId] || []) prefixes.add(prefix);
  }

  const customIds = new Set(
    sanitizeCustomReviewTopics(customReviewTopics).map((topic) => customTopicId(topic)),
  );

  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    if (typeof raw !== "string") continue;
    const id = raw.trim().slice(0, 80);
    if (!id || seen.has(id)) continue;
    const isCustom = customIds.has(id);
    const matchesEnabledPrefix = Array.from(prefixes).some((prefix) => id.startsWith(prefix));
    if (!isCustom && !matchesEnabledPrefix) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 20) break;
  }
  return out;
}
