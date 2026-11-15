/**
 * Turn customer feedback into an actionable operational issue.
 *
 * The classifier is deliberately keyword/ID based rather than AI-based:
 *   - it runs synchronously inside feedback submission,
 *   - it is deterministic and auditable,
 *   - it works for every plan, including when AI credits are exhausted.
 *
 * Restaurant classification is preserved exactly. Other industries use the
 * same deterministic approach with their own option IDs and a cross-industry
 * text fallback, so a repair shop never inherits restaurant buckets.
 */

import { normalizeReviewIndustry, type ReviewIndustry } from "./review-options";

export const TASK_CATEGORIES = [
  "safety",
  "food_quality",
  "product_quality",
  "workmanship",
  "service",
  "cleanliness",
  "speed",
  "takeaway",
  "ordering",
  "billing",
  "booking",
  "communication",
  "stock",
  "facilities",
  "comfort",
  "ambience",
  "value",
  "drinks",
  "after_sales",
  "expertise",
  "care_quality",
  "education_quality",
  "data_privacy",
  "other",
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  safety: "Safety / allergen",
  food_quality: "Food quality",
  product_quality: "Product quality",
  workmanship: "Workmanship & repair",
  service: "Service",
  cleanliness: "Cleanliness",
  speed: "Speed / wait",
  takeaway: "Takeaway & packaging",
  ordering: "Ordering & billing",
  billing: "Billing & payments",
  booking: "Booking & appointment",
  communication: "Communication & updates",
  stock: "Stock & availability",
  facilities: "Facilities & maintenance",
  comfort: "Room & comfort",
  ambience: "Ambience",
  value: "Value for money",
  drinks: "Drinks & bar",
  after_sales: "After-sales & warranty",
  expertise: "Expertise & advice",
  care_quality: "Care quality",
  education_quality: "Teaching & learning",
  data_privacy: "Data & privacy",
  other: "Other",
};

interface IdRule {
  category: TaskCategory;
  idPrefixes?: string[];
  exactIds?: string[];
}

/** Restaurant rules are unchanged from Release 1. */
const RESTAURANT_ID_RULES: IdRule[] = [
  { category: "food_quality", idPrefixes: ["food_"] },
  {
    category: "cleanliness",
    idPrefixes: ["amb_"],
    exactIds: ["amb_cleanliness", "home_cleanliness", "fit_cleanliness"],
  },
  {
    category: "speed",
    idPrefixes: ["op_"],
    exactIds: ["op_wait", "op_wait_time", "op_timeliness"],
  },
  {
    category: "takeaway",
    idPrefixes: ["op_"],
    exactIds: ["op_takeout", "op_takeaway", "op_packaging", "op_delivery"],
  },
  { category: "ordering", idPrefixes: ["op_"] },
  { category: "service", idPrefixes: ["service_"] },
  { category: "ambience", idPrefixes: ["amb_"] },
  { category: "value", idPrefixes: ["value_"] },
  { category: "drinks", idPrefixes: ["drink_"] },
];

const exact = (category: TaskCategory, ids: string[]): IdRule => ({ category, exactIds: ids });

const INDUSTRY_ID_RULES: Partial<Record<ReviewIndustry, IdRule[]>> = {
  CAFE: [
    exact("cleanliness", ["cafe_cleanliness"]),
    exact("speed", ["cafe_speed"]),
    exact("service", ["cafe_friendly", "cafe_accuracy"]),
    exact("ambience", ["cafe_seating", "cafe_wifi", "cafe_noise"]),
    exact("food_quality", [
      "cafe_coffee",
      "cafe_tea",
      "cafe_cold",
      "cafe_consistency",
      "cafe_food_quality",
      "cafe_freshness",
      "cafe_portions",
      "cafe_dietary",
    ]),
    exact("expertise", ["cafe_knowledge"]),
    exact("value", ["cafe_pricing", "cafe_loyalty"]),
  ],
  BAKERY: [
    exact("cleanliness", ["bakery_cleanliness"]),
    exact("takeaway", ["bakery_storage", "bakery_packaging"]),
    exact("food_quality", [
      "bakery_freshness",
      "bakery_taste",
      "bakery_variety",
      "bakery_custom",
      "bakery_portions",
    ]),
    exact("service", ["bakery_friendly", "bakery_accuracy", "bakery_speed"]),
    exact("value", ["bakery_pricing"]),
  ],
  QUICK_SERVICE: [
    exact("cleanliness", ["qs_seating", "qs_restroom", "qs_counter"]),
    exact("speed", ["qs_order_time", "qs_served_time"]),
    exact("ordering", ["qs_order_accuracy", "qs_customization"]),
    exact("takeaway", ["qs_packaging", "qs_spill", "qs_delivery"]),
    exact("food_quality", ["qs_taste", "qs_freshness", "qs_temperature", "qs_portion"]),
    exact("value", ["qs_pricing", "qs_combo"]),
  ],
  HOTEL: [
    exact("cleanliness", ["hotel_cleanliness"]),
    exact("facilities", [
      "hotel_ac",
      "hotel_maintenance",
      "hotel_wifi",
      "hotel_parking",
      "hotel_pool",
      "hotel_gym",
    ]),
    exact("comfort", ["hotel_bed", "hotel_bathroom", "hotel_noise"]),
    exact("booking", ["hotel_booking", "hotel_checkin", "hotel_checkout"]),
    exact("service", [
      "hotel_front_desk",
      "hotel_housekeeping",
      "hotel_responsiveness",
      "hotel_requests",
    ]),
    exact("food_quality", ["hotel_breakfast"]),
    exact("billing", ["hotel_price", "hotel_extra_charges"]),
  ],
  DENTAL: [
    exact("cleanliness", ["dent_cleanliness"]),
    exact("facilities", ["dent_equipment", "dent_waiting"]),
    exact("speed", ["dent_wait_time"]),
    exact("booking", ["dent_booking", "dent_reminders"]),
    exact("communication", ["dent_explanation", "dent_options", "dent_followup"]),
    exact("care_quality", [
      "dent_pain",
      "dent_comfort",
      "dent_thorough",
      "dent_results",
      "dent_dentist",
      "dent_hygienist",
    ]),
    exact("service", ["dent_front_desk"]),
    exact("billing", ["dent_insurance", "dent_pricing", "dent_payment"]),
  ],
  MEDICAL: [
    exact("cleanliness", ["med_cleanliness"]),
    exact("facilities", ["med_equipment", "med_comfort"]),
    exact("speed", ["med_wait_time"]),
    exact("booking", ["med_booking", "med_telehealth"]),
    exact("communication", ["med_explanation", "med_followup", "med_results"]),
    exact("care_quality", ["med_doctor", "med_bedside", "med_thorough", "med_expertise"]),
    exact("service", ["med_front_desk", "med_support"]),
    exact("billing", ["med_insurance", "med_pricing", "med_billing"]),
  ],
  SALON: [
    exact("cleanliness", ["salon_cleanliness"]),
    exact("ambience", ["salon_decor", "salon_music", "salon_relax"]),
    exact("speed", ["salon_wait"]),
    exact("booking", ["salon_booking", "salon_availability"]),
    exact("communication", ["salon_listening", "salon_advice"]),
    exact("workmanship", [
      "salon_haircut",
      "salon_color",
      "salon_nails",
      "salon_skincare",
      "salon_massage",
      "salon_skill",
      "salon_consistency",
    ]),
    exact("value", ["salon_pricing", "salon_membership", "salon_products"]),
  ],
  FITNESS: [
    exact("cleanliness", ["fit_gym_clean", "fit_locker_room", "fit_bathroom"]),
    exact("facilities", [
      "fit_availability",
      "fit_condition",
      "fit_variety",
      "fit_crowded",
      "fit_temp",
      "fit_amenities",
    ]),
    exact("service", [
      "fit_instructor",
      "fit_variety_classes",
      "fit_schedule",
      "fit_trainers",
      "fit_front_desk",
      "fit_knowledge",
    ]),
    exact("ambience", ["fit_music"]),
    exact("value", ["fit_pricing"]),
  ],
  AUTO: [
    exact("workmanship", [
      "auto_repair",
      "auto_diagnostics",
      "auto_inspection",
      "auto_technician",
    ]),
    exact("service", ["auto_honesty", "auto_front_desk"]),
    exact("communication", ["auto_explanation", "auto_updates", "auto_recommendations"]),
    exact("speed", ["auto_turnaround", "auto_punctual"]),
    exact("billing", ["auto_transparency", "auto_fairness", "auto_warranty"]),
    exact("cleanliness", ["auto_cleanliness"]),
    exact("facilities", ["auto_waiting"]),
  ],
  AUTO_DEALER: [
    exact("service", [
      "dealer_salesperson",
      "dealer_no_pressure",
      "dealer_transparency",
      "dealer_test_drive",
      "dealer_responsive",
    ]),
    exact("stock", ["dealer_variety", "dealer_condition", "dealer_availability"]),
    exact("billing", [
      "dealer_price_fairness",
      "dealer_negotiation",
      "dealer_financing",
      "dealer_trade_in",
    ]),
    exact("ordering", ["dealer_paperwork", "dealer_delivery", "dealer_after_sales"]),
    exact("after_sales", ["dealer_warranty", "dealer_servicing"]),
  ],
  ELECTRONICS: [
    exact("product_quality", [
      "elec_quality",
      "elec_authenticity",
      "elec_selection",
    ]),
    exact("stock", ["elec_availability"]),
    exact("service", ["elec_knowledge", "elec_helpfulness", "elec_honesty"]),
    exact("workmanship", ["elec_repair_quality", "elec_diagnostics", "elec_genuine_parts"]),
    exact("speed", ["elec_turnaround"]),
    exact("billing", ["elec_price_fairness", "elec_quote", "elec_warranty"]),
    exact("after_sales", ["elec_support", "elec_returns", "elec_followup"]),
  ],
  ELECTRONICS_REPAIR: [
    exact("workmanship", ["erep_quality", "erep_diagnostics", "erep_parts"]),
    exact("billing", ["erep_quote", "erep_final_bill"]),
    exact("speed", ["erep_turnaround"]),
    exact("communication", ["erep_updates"]),
    exact("data_privacy", ["erep_data_privacy", "erep_device_safety"]),
    exact("after_sales", ["erep_warranty", "erep_rework"]),
    exact("service", ["erep_front_desk", "erep_communication"]),
  ],
  ELECTRICAL: [
    exact("workmanship", ["electric_workmanship", "electric_completion", "electric_testing"]),
    exact("safety", ["electric_safety", "electric_certified", "electric_earthing"]),
    exact("speed", ["electric_punctuality", "electric_responsiveness"]),
    exact("communication", ["electric_updates"]),
    exact("billing", ["electric_quote", "electric_final_bill", "electric_value"]),
    exact("cleanliness", ["electric_cleanup", "electric_damage"]),
    exact("after_sales", ["electric_warranty", "electric_callback"]),
  ],
  ELECTRICAL_RETAIL: [
    exact("product_quality", [
      "elecshop_genuine",
      "elecshop_brands",
      "elecshop_quality",
    ]),
    exact("stock", ["elecshop_stock", "elecshop_availability"]),
    exact("expertise", ["elecshop_guidance", "elecshop_load_advice"]),
    exact("billing", ["elecshop_price", "elecshop_quote", "elecshop_bulk", "elecshop_billing"]),
    exact("service", ["elecshop_staff", "elecshop_wait"]),
    exact("after_sales", ["elecshop_warranty", "elecshop_returns", "elecshop_delivery"]),
  ],
  HOME_SERVICES: [
    exact("workmanship", ["home_craftsmanship", "home_thorough", "home_results"]),
    exact("service", ["home_technician", "home_professionalism", "home_friendly"]),
    exact("communication", ["home_updates", "home_explanation", "home_scheduling"]),
    exact("speed", ["home_punctuality", "home_duration", "home_responsive"]),
    exact("billing", ["home_transparency", "home_fairness", "home_value"]),
    exact("cleanliness", ["home_clean_work", "home_respect"]),
  ],
  RETAIL: [
    exact("product_quality", [
      "retail_range",
      "retail_quality",
      "retail_authenticity",
    ]),
    exact("stock", ["retail_stock"]),
    exact("cleanliness", ["retail_cleanliness"]),
    exact("ambience", ["retail_layout", "retail_signage", "retail_comfort"]),
    exact("service", [
      "retail_greeting",
      "retail_knowledge",
      "retail_courtesy",
      "retail_response",
    ]),
    exact("speed", ["retail_wait"]),
    exact("billing", ["retail_billing", "retail_payment"]),
    exact("after_sales", ["retail_returns", "retail_warranty", "retail_delivery"]),
    exact("value", ["retail_pricing", "retail_offers"]),
  ],
  EDUCATION: [
    exact("safety", ["edu_safety", "edu_bullying", "edu_supervision"]),
    exact("education_quality", [
      "edu_teaching",
      "edu_curriculum",
      "edu_homework",
      "edu_progress",
      "edu_extracurricular",
      "edu_sports",
      "edu_arts",
    ]),
    exact("communication", ["edu_updates", "edu_teacher_access", "edu_concerns"]),
    exact("facilities", [
      "edu_classrooms",
      "edu_library",
      "edu_transport",
      "edu_cleanliness",
    ]),
    exact("billing", ["edu_fees"]),
    exact("ordering", ["edu_admissions", "edu_paperwork"]),
  ],
  PET_CARE: [
    exact("care_quality", ["pet_handling", "pet_vet_care", "pet_treatment", "pet_outcome"]),
    exact("communication", ["pet_explanation", "pet_options", "pet_followup"]),
    exact("cleanliness", ["pet_cleanliness"]),
    exact("facilities", ["pet_equipment", "pet_boarding"]),
    exact("booking", ["pet_booking", "pet_emergency"]),
    exact("speed", ["pet_wait"]),
    exact("billing", ["pet_pricing", "pet_estimates"]),
  ],
  REAL_ESTATE: [
    exact("service", ["re_agent", "re_responsiveness", "re_availability"]),
    exact("expertise", ["re_market", "re_pricing", "re_advice"]),
    exact("communication", ["re_communication"]),
    exact("ordering", ["re_paperwork", "re_timeline", "re_negotiation"]),
    exact("workmanship", ["re_listing", "re_handover"]),
    exact("after_sales", ["re_after_sale"]),
    exact("billing", ["re_fees", "re_value"]),
  ],
  PROFESSIONAL_SERVICES: [
    exact("expertise", ["prof_expertise", "prof_advice", "prof_solution"]),
    exact("communication", ["prof_clarity", "prof_responsiveness", "prof_updates"]),
    exact("workmanship", ["prof_quality", "prof_timeline", "prof_scope"]),
    exact("service", ["prof_trust", "prof_courtesy"]),
    exact("billing", ["prof_fees", "prof_value"]),
  ],
  OTHER: [{ category: "service", idPrefixes: ["other_"] }],
};

/** Restaurant free-text rules are unchanged from Release 1. */
const RESTAURANT_TEXT_RULES: { category: TaskCategory; text: RegExp }[] = [
  {
    category: "cleanliness",
    text: /\b(clean|cleanliness|dirty|hygiene|hygienic|restroom|washroom|toilet|smell|smelly|odou?r|sticky|grimy|hair\s*in)\b/i,
  },
  {
    category: "speed",
    text: /\b(wait|waited|waiting|slow|delay|delayed|late|timing|took\s+(?:so\s+)?long|quick|fast|speed)\b/i,
  },
  {
    category: "takeaway",
    text: /\b(takeaway|take-away|take\s*out|parcel|delivery|packag|container|leak|spill)\b/i,
  },
  {
    category: "ordering",
    text: /\b(order|ordered|wrong|missing|forgot|incorrect|billing|bill|invoice|charge)\b/i,
  },
  {
    category: "service",
    text: /\b(service|staff|waiter|waitress|manager|rude|behavio?ur|attitude|friendly|attentive|ignored|unprofessional|hospitality)\b/i,
  },
  {
    category: "value",
    text: /\b(price|pricing|cost|costly|expensive|overpriced|value|worth|cheap)\b/i,
  },
  {
    category: "drinks",
    text: /\b(drink|drinks|cocktail|cocktails|mocktail|wine|beer|beverage|bar|whisk(?:y|ey)|spirits)\b/i,
  },
  {
    category: "ambience",
    text: /\b(ambience|ambiance|atmosphere|music|noise|noisy|lighting|light|seating|comfort|chair|table|decor|crowded)\b/i,
  },
  {
    // Food-specific attributes only. Generic words like "food" are handled
    // afterwards so "waited for the food" classifies as speed, not food.
    category: "food_quality",
    text: /\b(taste|tasty|flavour|flavor|seasoning|portion|stale|cold|undercooked|overcooked|raw|bland|cooked|fresh|freshness|presentation)\b/i,
  },
];

const SAFETY_TEXT =
  /\b(unsafe|safety|hazard|injur(?:y|ed)|shock|electrocut|fire|burn(?:ed|t)?|allerg(?:y|ic|en)|food\s*poison|poisoning|contaminat|data\s*(?:breach|leak|loss)|privacy|stolen|theft|assault|harass|abuse)\b/i;

const GENERAL_TEXT_RULES: { category: TaskCategory; text: RegExp }[] = [
  { category: "safety", text: SAFETY_TEXT },
  {
    category: "cleanliness",
    text: /\b(clean|cleanliness|dirty|filthy|hygiene|hygienic|restroom|washroom|toilet|smell|smelly|odou?r|stain|dust|grimy|mess|debris|untidy)\b/i,
  },
  {
    category: "data_privacy",
    text: /\b(data|privacy|photos?|files?|backup|wiped|deleted|confidential|personal information|account)\b/i,
  },
  {
    category: "after_sales",
    text: /\b(warranty|guarantee|return|returned|exchange|refund|replacement|after[- ]?sales|rework|not fixed again|same problem)\b/i,
  },
  {
    category: "stock",
    text: /\b(out of stock|not in stock|unavailable|availability|didn'?t have|no stock|sold out|size not available|ordered it)\b/i,
  },
  {
    category: "booking",
    text: /\b(booking|booked|appointment|reschedul|check[- ]?in|check[- ]?out|reservation|slot|availability)\b/i,
  },
  {
    category: "billing",
    text: /\b(bill|billing|invoice|charged|overcharged|extra charge|hidden fee|refund|payment|quote|estimate|final price|price was different)\b/i,
  },
  {
    category: "workmanship",
    text: /\b(repair|repaired|fix(?:ed)?|not working|still broken|broken|faulty|defective|loose|leak(?:ing|ed)?|short circuit|wiring|installation|installed|workmanship|finish|craftsmanship|quality of work|didn'?t work)\b/i,
  },
  {
    category: "product_quality",
    text: /\b(quality|genuine|original|authentic|fake|counterfeit|duplicate|damaged|expired|stale|poor quality|material)\b/i,
  },
  {
    category: "facilities",
    text: /\b(ac|air conditioning|heating|lift|elevator|escalator|parking|wifi|wi-fi|internet|equipment|machine|facility|maintenance|swimming pool|gym|breakfast buffet|tv|hot water)\b/i,
  },
  {
    category: "comfort",
    text: /\b(bed|mattress|pillow|sleep|noise|noisy|quiet|soundproof|comfortable|uncomfortable|room temperature|too hot|too cold)\b/i,
  },
  {
    category: "education_quality",
    text: /\b(teaching|teacher|curriculum|syllabus|homework|lesson|class quality|progress|learning|exam|assessment|extracurricular|sports|arts)\b/i,
  },
  {
    category: "care_quality",
    text: /\b(doctor|nurse|dentist|hygienist|vet|veterinarian|treatment|diagnosis|exam|care|handling|consultation|procedure)\b/i,
  },
  {
    category: "speed",
    text: /\b(wait|waited|waiting|slow|delay|delayed|late|timing|took\s+(?:so\s+)?long|quick|fast|speed|queue|line|turnaround|deadline|respon(?:se|siveness))\b/i,
  },
  {
    category: "communication",
    text: /\b(explain|explained|explanation|update|updated|informed|notified|call(?:ed)?|communication|respond|response|ignored|no reply|kept in the loop|clear|unclear)\b/i,
  },
  {
    category: "expertise",
    text: /\b(knowledge|knowledgeable|expertise|advice|advised|guidance|recommend(?:ed|ation)?|solution|diagnos(?:is|tic))\b/i,
  },
  {
    category: "ordering",
    text: /\b(order|ordered|wrong|missing|forgot|incorrect|paperwork|documentation|process|handover|delivery|timeline|negotiation|scope|included)\b/i,
  },
  {
    category: "service",
    text: /\b(service|staff|team|manager|rude|behavio?ur|attitude|friendly|attentive|ignored|unprofessional|hospitality|greeting|courtesy|polite|front desk|reception)\b/i,
  },
  {
    category: "value",
    text: /\b(price|pricing|cost|costly|expensive|overpriced|value|worth|cheap|fee|fees|commission|fair)\b/i,
  },
  {
    category: "food_quality",
    text: /\b(taste|tasty|flavour|flavor|seasoning|portion|stale|cold|undercooked|overcooked|raw|bland|cooked|fresh|freshness|presentation|watery|burnt|soggy)\b/i,
  },
  {
    category: "ambience",
    text: /\b(ambience|ambiance|atmosphere|music|lighting|seating|decor|crowded|layout|signage|organized|easy to find)\b/i,
  },
];

const RESTAURANT_GENERIC_FOOD_TEXT = /\b(food|meal|dish|cuisine)\b/i;
const GENERIC_FOOD_TEXT = /\b(food|meal|dish|cuisine|drink|coffee|tea|cake|pastry|breakfast)\b/i;

export interface ClassifyFeedbackInput {
  rating: number;
  selectedIds?: string[] | null;
  text?: string | null;
  isCriticalSafety?: boolean;
  /** Prisma Industry value. Absent/unknown keeps Release 1 restaurant behaviour. */
  industry?: string | null;
}

export interface FeedbackClassification {
  category: TaskCategory;
  label: string;
  /** Stable key used to merge recurring issues of the same category. */
  issueKey: string;
}

function result(category: TaskCategory): FeedbackClassification {
  return {
    category,
    label: TASK_CATEGORY_LABELS[category],
    issueKey: category,
  };
}

function matchIds(ids: string[], rules: IdRule[]): TaskCategory | null {
  for (const rule of rules) {
    const matched = ids.some((id) => {
      if (rule.exactIds?.includes(id)) return true;
      // When a rule has exact IDs it must not claim every sibling prefix
      // (e.g. `op_` belongs to ordering only after wait/takeaway checks).
      if (rule.exactIds) return false;
      return (rule.idPrefixes || []).some((prefix) => id.startsWith(prefix));
    });
    if (matched) return rule.category;
  }
  return null;
}

function fallbackRating(input: ClassifyFeedbackInput): FeedbackClassification | null {
  const text = (input.text || "").trim();
  if (input.rating <= 2 && !text) {
    return { category: "other", label: "Low rating (no detail)", issueKey: "low_rating_no_detail" };
  }
  return null;
}

function classifyRestaurant(input: ClassifyFeedbackInput): FeedbackClassification {
  if (input.isCriticalSafety) return result("safety");

  const ids = (input.selectedIds || []).filter((id) => typeof id === "string");
  const byId = matchIds(ids, RESTAURANT_ID_RULES);
  if (byId) return result(byId);

  const text = (input.text || "").trim();
  if (text) {
    for (const rule of RESTAURANT_TEXT_RULES) {
      if (rule.text.test(text)) return result(rule.category);
    }
    if (RESTAURANT_GENERIC_FOOD_TEXT.test(text)) return result("food_quality");
  }

  return fallbackRating(input) || result("other");
}

function classifyByIndustry(
  input: ClassifyFeedbackInput,
  industry: ReviewIndustry,
): FeedbackClassification {
  if (input.isCriticalSafety) return result("safety");

  const ids = (input.selectedIds || []).filter((id) => typeof id === "string");
  const byId = matchIds(ids, INDUSTRY_ID_RULES[industry] || []);
  if (byId) return result(byId);

  const text = (input.text || "").trim();
  if (text) {
    for (const rule of GENERAL_TEXT_RULES) {
      if (rule.text.test(text)) return result(rule.category);
    }
    if (["RESTAURANT", "CAFE", "BAKERY", "QUICK_SERVICE", "HOTEL"].includes(industry)) {
      if (GENERIC_FOOD_TEXT.test(text)) return result("food_quality");
    }
  }

  return fallbackRating(input) || result("other");
}

export function classifyFeedback(input: ClassifyFeedbackInput): FeedbackClassification {
  // Missing industry is the Release 1 restaurant path, so existing callers and
  // tests keep exactly the same behaviour.
  const industry: ReviewIndustry =
    input.industry == null || String(input.industry).trim() === ""
      ? "RESTAURANT"
      : normalizeReviewIndustry(String(input.industry));

  if (industry === "RESTAURANT") return classifyRestaurant(input);
  return classifyByIndustry(input, industry);
}
