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
  | "CAFE"
  | "BAKERY"
  | "QUICK_SERVICE"
  | "HOTEL"
  | "DENTAL"
  | "SALON"
  | "MEDICAL"
  | "AUTO"
  | "AUTO_DEALER"
  | "FITNESS"
  | "ELECTRONICS"
  | "ELECTRONICS_REPAIR"
  | "ELECTRICAL"
  | "ELECTRICAL_RETAIL"
  | "HOME_SERVICES"
  | "RETAIL"
  | "EDUCATION"
  | "PET_CARE"
  | "REAL_ESTATE"
  | "PROFESSIONAL_SERVICES"
  | "OTHER";

const INDUSTRY_ALIASES: Record<string, ReviewIndustry> = {
  RESTAURANT: "RESTAURANT",
  CAFE: "CAFE",
  COFFEE_SHOP: "CAFE",
  COFFEE: "CAFE",
  CAFETERIA: "CAFE",
  BAKERY: "BAKERY",
  DESSERT: "BAKERY",
  CAKE_SHOP: "BAKERY",
  PATISSERIE: "BAKERY",
  QUICK_SERVICE: "QUICK_SERVICE",
  QSR: "QUICK_SERVICE",
  FAST_FOOD: "QUICK_SERVICE",
  TAKEAWAY: "QUICK_SERVICE",
  HOTEL: "HOTEL",
  MOTEL: "HOTEL",
  RESORT: "HOTEL",
  LODGING: "HOTEL",
  HOMESTAY: "HOTEL",
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
  ELECTRONIC_SERVICE: "ELECTRONICS_REPAIR",
  MOBILE_REPAIR: "ELECTRONICS_REPAIR",
  PHONE_REPAIR: "ELECTRONICS_REPAIR",
  ELECTRONICS_REPAIR: "ELECTRONICS_REPAIR",
  ELECTRICAL: "ELECTRICAL",
  ELECTRICIAN: "ELECTRICAL",
  ELECTRICAL_RETAIL: "ELECTRICAL_RETAIL",
  ELECTRICAL_SHOP: "ELECTRICAL_RETAIL",
  ELECTRICALS: "ELECTRICAL_RETAIL",
  HOME_SERVICES: "HOME_SERVICES",
  RETAIL: "RETAIL",
  SHOP: "RETAIL",
  STORE: "RETAIL",
  EDUCATION: "EDUCATION",
  SCHOOL: "EDUCATION",
  COLLEGE: "EDUCATION",
  ACADEMY: "EDUCATION",
  TUITION: "EDUCATION",
  PET_CARE: "PET_CARE",
  VET: "PET_CARE",
  VETERINARY: "PET_CARE",
  PET_STORE: "PET_CARE",
  PET_GROOMING: "PET_CARE",
  REAL_ESTATE: "REAL_ESTATE",
  REAL_ESTATE_AGENCY: "REAL_ESTATE",
  REALTOR: "REAL_ESTATE",
  PROPERTY: "REAL_ESTATE",
  PROFESSIONAL_SERVICES: "PROFESSIONAL_SERVICES",
  CONSULTANT: "PROFESSIONAL_SERVICES",
  LAWYER: "PROFESSIONAL_SERVICES",
  ACCOUNTANT: "PROFESSIONAL_SERVICES",
  AGENCY: "PROFESSIONAL_SERVICES",
  OTHER: "OTHER",
};

/** All category IDs that exist for each industry (client taxonomy is the source of labels). */
export const INDUSTRY_CATEGORY_IDS: Record<ReviewIndustry, string[]> = {
  RESTAURANT: ["food", "service", "ambience", "value", "drinks", "operations"],
  CAFE: ["beverages", "food", "service", "space", "value"],
  BAKERY: ["products", "service", "hygiene", "value"],
  QUICK_SERVICE: ["food", "speed", "accuracy", "packaging", "cleanliness", "value"],
  HOTEL: ["booking", "room", "staff", "facilities", "value"],
  DENTAL: ["treatment", "staff", "facility", "scheduling", "communication", "value"],
  SALON: ["service_quality", "stylist", "atmosphere", "scheduling", "value"],
  MEDICAL: ["provider", "staff", "facility", "access", "communication", "value"],
  AUTO: ["work_quality", "staff", "communication", "timeliness", "pricing", "facility"],
  FITNESS: ["equipment", "classes", "cleanliness", "staff", "atmosphere", "value"],
  AUTO_DEALER: ["sales", "selection", "pricing", "process", "service"],
  ELECTRONICS: ["products", "staff", "repair", "pricing", "after_sales"],
  ELECTRONICS_REPAIR: ["repair", "quote", "turnaround", "data", "warranty", "service"],
  ELECTRICAL: ["work", "safety", "reliability", "pricing", "cleanliness", "warranty"],
  ELECTRICAL_RETAIL: ["products", "advice", "pricing", "service", "returns"],
  HOME_SERVICES: ["work_quality", "staff", "communication", "timeliness", "pricing", "cleanliness"],
  RETAIL: ["products", "store", "staff", "checkout", "after_sales", "value"],
  EDUCATION: ["teaching", "communication", "safety", "facilities", "activities", "admin"],
  PET_CARE: ["care", "communication", "facility", "access", "value"],
  REAL_ESTATE: ["service", "expertise", "process", "outcome", "value"],
  PROFESSIONAL_SERVICES: ["expertise", "communication", "delivery", "relationship", "value"],
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
  CAFE: {
    beverages: ["cafe_coffee", "cafe_tea", "cafe_cold", "cafe_consistency"],
    food: ["cafe_food_quality", "cafe_freshness", "cafe_portions", "cafe_dietary"],
    service: ["cafe_friendly", "cafe_speed", "cafe_accuracy", "cafe_knowledge"],
    space: ["cafe_seating", "cafe_wifi", "cafe_noise", "cafe_cleanliness"],
    value: ["cafe_pricing", "cafe_loyalty"],
  },
  BAKERY: {
    products: ["bakery_freshness", "bakery_taste", "bakery_variety", "bakery_custom"],
    service: ["bakery_friendly", "bakery_accuracy", "bakery_speed"],
    hygiene: ["bakery_cleanliness", "bakery_storage", "bakery_packaging"],
    value: ["bakery_pricing", "bakery_portions"],
  },
  QUICK_SERVICE: {
    food: ["qs_taste", "qs_freshness", "qs_temperature", "qs_portion"],
    speed: ["qs_order_time", "qs_served_time"],
    accuracy: ["qs_order_accuracy", "qs_customization"],
    packaging: ["qs_packaging", "qs_spill", "qs_delivery"],
    cleanliness: ["qs_seating", "qs_restroom", "qs_counter"],
    value: ["qs_pricing", "qs_combo"],
  },
  HOTEL: {
    booking: ["hotel_booking", "hotel_checkin", "hotel_checkout"],
    room: ["hotel_cleanliness", "hotel_bed", "hotel_bathroom", "hotel_noise", "hotel_ac", "hotel_maintenance"],
    staff: ["hotel_front_desk", "hotel_housekeeping", "hotel_responsiveness", "hotel_requests"],
    facilities: ["hotel_wifi", "hotel_parking", "hotel_pool", "hotel_gym", "hotel_breakfast"],
    value: ["hotel_price", "hotel_extra_charges"],
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
    products: ["elec_quality", "elec_authenticity", "elec_selection", "elec_availability"],
    staff: ["elec_knowledge", "elec_helpfulness", "elec_honesty"],
    repair: ["elec_repair_quality", "elec_turnaround", "elec_diagnostics", "elec_genuine_parts"],
    pricing: ["elec_price_fairness", "elec_quote", "elec_warranty"],
    after_sales: ["elec_support", "elec_returns", "elec_followup"],
  },
  ELECTRONICS_REPAIR: {
    repair: ["erep_quality", "erep_diagnostics", "erep_parts"],
    quote: ["erep_quote", "erep_final_bill"],
    turnaround: ["erep_turnaround", "erep_updates"],
    data: ["erep_data_privacy", "erep_device_safety"],
    warranty: ["erep_warranty", "erep_rework"],
    service: ["erep_front_desk", "erep_communication"],
  },
  ELECTRICAL: {
    work: ["electric_workmanship", "electric_completion", "electric_testing"],
    safety: ["electric_safety", "electric_certified", "electric_earthing"],
    reliability: ["electric_punctuality", "electric_responsiveness", "electric_updates"],
    pricing: ["electric_quote", "electric_final_bill", "electric_value"],
    cleanliness: ["electric_cleanup", "electric_damage"],
    warranty: ["electric_warranty", "electric_callback"],
  },
  ELECTRICAL_RETAIL: {
    products: ["elecshop_genuine", "elecshop_brands", "elecshop_stock", "elecshop_quality"],
    advice: ["elecshop_guidance", "elecshop_load_advice", "elecshop_availability"],
    pricing: ["elecshop_price", "elecshop_quote", "elecshop_bulk"],
    service: ["elecshop_staff", "elecshop_wait", "elecshop_billing"],
    returns: ["elecshop_warranty", "elecshop_returns", "elecshop_delivery"],
  },
  HOME_SERVICES: {
    work_quality: ["home_"],
    staff: ["home_"],
    communication: ["home_"],
    timeliness: ["home_"],
    pricing: ["home_"],
    cleanliness: ["home_"],
  },
  RETAIL: {
    products: ["retail_range", "retail_quality", "retail_stock", "retail_authenticity"],
    store: ["retail_cleanliness", "retail_layout", "retail_signage", "retail_comfort"],
    staff: ["retail_greeting", "retail_knowledge", "retail_courtesy", "retail_response"],
    checkout: ["retail_wait", "retail_billing", "retail_payment"],
    after_sales: ["retail_returns", "retail_warranty", "retail_delivery"],
    value: ["retail_pricing", "retail_offers"],
  },
  EDUCATION: {
    teaching: ["edu_teaching", "edu_curriculum", "edu_homework", "edu_progress"],
    communication: ["edu_updates", "edu_teacher_access", "edu_concerns"],
    safety: ["edu_safety", "edu_bullying", "edu_supervision"],
    facilities: ["edu_classrooms", "edu_library", "edu_transport", "edu_cleanliness"],
    activities: ["edu_extracurricular", "edu_sports", "edu_arts"],
    admin: ["edu_admissions", "edu_fees", "edu_paperwork"],
  },
  PET_CARE: {
    care: ["pet_handling", "pet_vet_care", "pet_treatment", "pet_outcome"],
    communication: ["pet_explanation", "pet_options", "pet_followup"],
    facility: ["pet_cleanliness", "pet_equipment", "pet_boarding"],
    access: ["pet_booking", "pet_wait", "pet_emergency"],
    value: ["pet_pricing", "pet_estimates"],
  },
  REAL_ESTATE: {
    service: ["re_agent", "re_responsiveness", "re_availability"],
    expertise: ["re_market", "re_pricing", "re_advice"],
    process: ["re_communication", "re_paperwork", "re_timeline", "re_negotiation"],
    outcome: ["re_listing", "re_handover", "re_after_sale"],
    value: ["re_fees", "re_value"],
  },
  PROFESSIONAL_SERVICES: {
    expertise: ["prof_expertise", "prof_advice", "prof_solution"],
    communication: ["prof_clarity", "prof_responsiveness", "prof_updates"],
    delivery: ["prof_quality", "prof_timeline", "prof_scope"],
    relationship: ["prof_trust", "prof_courtesy"],
    value: ["prof_fees", "prof_value"],
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
