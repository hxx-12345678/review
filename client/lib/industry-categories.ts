export interface SubOption {
  id: string
  label: string
  keywords: string[]
}

export interface Category {
  id: string
  label: string
  icon: string
  subOptions: SubOption[]
}

export type IndustryKey =
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
  | "OTHER"

const VALID_INDUSTRIES: IndustryKey[] = [
  "RESTAURANT",
  "CAFE",
  "BAKERY",
  "QUICK_SERVICE",
  "HOTEL",
  "DENTAL",
  "SALON",
  "MEDICAL",
  "AUTO",
  "AUTO_DEALER",
  "FITNESS",
  "ELECTRONICS",
  "ELECTRONICS_REPAIR",
  "ELECTRICAL",
  "ELECTRICAL_RETAIL",
  "HOME_SERVICES",
  "RETAIL",
  "EDUCATION",
  "PET_CARE",
  "REAL_ESTATE",
  "PROFESSIONAL_SERVICES",
  "OTHER",
]

export function normalizeIndustry(industry: string): IndustryKey {
  const upper = (industry || "").toUpperCase().trim()
  if (VALID_INDUSTRIES.includes(upper as IndustryKey)) return upper as IndustryKey
  if (upper === "CLINIC") return "MEDICAL"
  if (upper === "GYM") return "FITNESS"
  if (upper === "GARAGE" || upper === "MECHANIC" || upper === "CAR_REPAIR") return "AUTO"
  if (upper === "CAR_DEALER" || upper === "CAR_SHOWROOM" || upper === "AUTOMOBILE") return "AUTO_DEALER"
  if (upper === "ELECTRONIC" || upper === "ELECTRONICS_STORE") return "ELECTRONICS"
  if (upper === "ELECTRONIC_SERVICE" || upper === "MOBILE_REPAIR" || upper === "PHONE_REPAIR") return "ELECTRONICS_REPAIR"
  if (upper === "ELECTRICIAN") return "ELECTRICAL"
  if (upper === "ELECTRICAL_SHOP" || upper === "ELECTRICALS") return "ELECTRICAL_RETAIL"
  if (upper === "SHOP" || upper === "STORE") return "RETAIL"
  if (upper === "SCHOOL" || upper === "COLLEGE" || upper === "ACADEMY" || upper === "TUITION") return "EDUCATION"
  if (upper === "VET" || upper === "VETERINARY" || upper === "PET_STORE" || upper === "PET_GROOMING") return "PET_CARE"
  if (upper === "REAL_ESTATE_AGENCY" || upper === "REALTOR" || upper === "PROPERTY") return "REAL_ESTATE"
  if (upper === "CONSULTANT" || upper === "LAWYER" || upper === "ACCOUNTANT" || upper === "AGENCY") return "PROFESSIONAL_SERVICES"
  if (upper === "HOTEL" || upper === "MOTEL" || upper === "RESORT" || upper === "LODGING" || upper === "HOMESTAY") return "HOTEL"
  if (upper === "COFFEE_SHOP" || upper === "COFFEE" || upper === "CAFETERIA") return "CAFE"
  if (upper === "DESSERT" || upper === "CAKE_SHOP" || upper === "PATISSERIE") return "BAKERY"
  if (upper === "QSR" || upper === "FAST_FOOD" || upper === "TAKEAWAY") return "QUICK_SERVICE"
  return "OTHER"
}

const INDUSTRY_LABELS: Record<IndustryKey, string> = {
  RESTAURANT: "Restaurant",
  CAFE: "Café / Coffee shop",
  BAKERY: "Bakery / Desserts",
  QUICK_SERVICE: "Quick service / Takeaway",
  HOTEL: "Hotel / Lodging",
  DENTAL: "Dental practice",
  SALON: "Salon / Spa",
  MEDICAL: "Medical clinic",
  AUTO: "Auto repair / Garage",
  AUTO_DEALER: "Automobile showroom / Dealer",
  FITNESS: "Gym / Fitness",
  ELECTRONICS: "Electronics store",
  ELECTRONICS_REPAIR: "Electronics repair",
  ELECTRICAL: "Electrician / Electrical contractor",
  ELECTRICAL_RETAIL: "Electrical shop",
  HOME_SERVICES: "Home services",
  RETAIL: "Retail store",
  EDUCATION: "School / Education",
  PET_CARE: "Pet care / Veterinary",
  REAL_ESTATE: "Real estate",
  PROFESSIONAL_SERVICES: "Professional services",
  OTHER: "Other",
}

export function getIndustryLabel(industry: string): string {
  return INDUSTRY_LABELS[normalizeIndustry(industry)]
}

export interface IndustryOption {
  value: string
  label: string
  topics: string[]
}

export const INDUSTRY_OPTIONS: IndustryOption[] = [
  { value: "RESTAURANT", label: "Restaurant", topics: ["A standout dish", "Service speed", "Atmosphere", "Value"] },
  { value: "CAFE", label: "Café / Coffee shop", topics: ["Coffee or tea", "Food & pastries", "Seating & Wi-Fi", "Service speed"] },
  { value: "BAKERY", label: "Bakery / Desserts", topics: ["Freshness", "Taste", "Custom cakes & orders", "Packaging"] },
  { value: "QUICK_SERVICE", label: "Quick service / Takeaway", topics: ["Order accuracy", "Speed", "Packaging", "Value"] },
  { value: "HOTEL", label: "Hotel / Lodging", topics: ["Room cleanliness", "Check-in", "Staff & requests", "Breakfast"] },
  { value: "DENTAL", label: "Dental practice", topics: ["Explanation of treatment", "Office cleanliness", "Wait time", "How treatment felt"] },
  { value: "MEDICAL", label: "Medical clinic", topics: ["Explanation of care", "Front desk experience", "Wait time", "How you were treated"] },
  { value: "SALON", label: "Salon / Spa", topics: ["Haircut / colour result", "Hygiene & comfort", "Atmosphere", "Booking experience"] },
  { value: "FITNESS", label: "Gym / Fitness", topics: ["Training session quality", "Equipment & facilities", "Cleanliness", "Community"] },
  { value: "AUTO", label: "Auto repair / Garage", topics: ["Quality of work", "Pricing transparency", "Turnaround time", "Communication"] },
  { value: "AUTO_DEALER", label: "Automobile showroom / Dealer", topics: ["Test drive experience", "Vehicle selection", "Deal & pricing", "Delivery experience"] },
  { value: "ELECTRONICS", label: "Electronics store", topics: ["Product quality", "Product guidance", "Stock availability", "After-sales support"] },
  { value: "ELECTRONICS_REPAIR", label: "Electronics repair", topics: ["Repair quality", "Quote accuracy", "Turnaround time", "Data privacy"] },
  { value: "ELECTRICAL", label: "Electrician / Electrical contractor", topics: ["Quality of work", "Safety", "Punctuality", "Cleanup"] },
  { value: "ELECTRICAL_RETAIL", label: "Electrical shop", topics: ["Product authenticity", "Stock availability", "Product advice", "Returns & warranty"] },
  { value: "HOME_SERVICES", label: "Home services", topics: ["Quality of work", "Punctuality", "Pricing clarity", "Communication"] },
  { value: "RETAIL", label: "Retail store", topics: ["Product range", "Staff help", "Checkout speed", "Returns & exchanges"] },
  { value: "EDUCATION", label: "School / Education", topics: ["Teaching quality", "Communication", "Safety", "Facilities"] },
  { value: "PET_CARE", label: "Pet care / Veterinary", topics: ["Care & handling", "Vet explanation", "Wait time", "Cleanliness"] },
  { value: "REAL_ESTATE", label: "Real estate", topics: ["Communication", "Market knowledge", "Negotiation", "Paperwork"] },
  { value: "PROFESSIONAL_SERVICES", label: "Professional services", topics: ["Expertise", "Responsiveness", "Clarity", "Value"] },
  { value: "OTHER", label: "Other", topics: ["Quality", "Service speed", "Value", "Overall experience"] },
]

export const INDUSTRY_CATEGORIES: Record<IndustryKey, Category[]> = {
  RESTAURANT: [
    {
      id: "food",
      label: "Food Quality",
      icon: "Utensils",
      subOptions: [
        { id: "food_taste", label: "Taste & Flavor", keywords: ["taste", "flavor", "delicious", "yummy", "seasoning"] },
        { id: "food_freshness", label: "Freshness", keywords: ["fresh", "freshly", "quality ingredients"] },
        { id: "food_presentation", label: "Presentation", keywords: ["presentation", "plating", "looked", "arrangement"] },
        { id: "food_temperature", label: "Temperature", keywords: ["hot", "cold", "temperature", "warm", "chilled"] },
        { id: "food_portions", label: "Portion Size", keywords: ["portion", "serving", "generous", "small", "filling"] },
      ],
    },
    {
      id: "service",
      label: "Service",
      icon: "ThumbsUp",
      subOptions: [
        { id: "service_friendly", label: "Friendliness", keywords: ["friendly", "welcoming", "warm", "kind"] },
        { id: "service_speed", label: "Speed", keywords: ["fast", "quick", "slow", "wait", "prompt"] },
        { id: "service_knowledge", label: "Knowledge", keywords: ["knowledgeable", "informed", "recommendations", "explained"] },
        { id: "service_attentive", label: "Attentiveness", keywords: ["attentive", "checked", "refilled", "caring"] },
      ],
    },
    {
      id: "ambience",
      label: "Ambience",
      icon: "Sparkles",
      subOptions: [
        { id: "amb_lighting", label: "Lighting", keywords: ["lighting", "dim", "bright", "romantic", "mood"] },
        { id: "amb_music", label: "Music", keywords: ["music", "playlist", "volume", "background"] },
        { id: "amb_seating", label: "Seating", keywords: ["seating", "comfortable", "table", "booth"] },
        { id: "amb_cleanliness", label: "Cleanliness", keywords: ["clean", "hygienic", "spotless", "tidy"] },
        { id: "amb_decor", label: "Decor", keywords: ["decor", "interior", "design", "vibe", "ambiance"] },
        { id: "amb_temp", label: "Temperature", keywords: ["temperature", "ac", "heating", "warm", "cold"] },
      ],
    },
    {
      id: "value",
      label: "Value",
      icon: "SmilePlus",
      subOptions: [
        { id: "value_pricing", label: "Pricing", keywords: ["price", "expensive", "cheap", "reasonable"] },
        { id: "value_portion_price", label: "Portion vs Price", keywords: ["worth", "value", "overpriced", "bang"] },
        { id: "value_deals", label: "Deals & Offers", keywords: ["deal", "offer", "combo", "happy hour", "special"] },
      ],
    },
    {
      id: "drinks",
      label: "Drinks & Bar",
      icon: "Wine",
      subOptions: [
        { id: "drink_cocktails", label: "Cocktails", keywords: ["cocktail", "mix", "bartender", "drink"] },
        { id: "drink_wine", label: "Wine & Beer", keywords: ["wine", "beer", "draft", "bottle", "selection"] },
        { id: "drink_non_alcoholic", label: "Non-Alcoholic", keywords: ["soda", "juice", "mocktail", "soft drink"] },
        { id: "drink_coffee", label: "Coffee & Tea", keywords: ["coffee", "tea", "espresso", "cappuccino"] },
      ],
    },
    {
      id: "operations",
      label: "Order & Timeliness",
      icon: "Clock",
      subOptions: [
        { id: "op_wait_time", label: "Wait Time", keywords: ["wait", "seated", "line", "delay", "queue", "slow"] },
        { id: "op_accuracy", label: "Order Accuracy", keywords: ["correct", "missing", "wrong", "accurate", "special request"] },
        { id: "op_delivery", label: "Takeout / Delivery", keywords: ["packaging", "delivery", "takeout", "spill", "container"] },
      ],
    },
  ],

  DENTAL: [
    {
      id: "treatment",
      label: "Treatment Experience",
      icon: "Stethoscope",
      subOptions: [
        { id: "dent_pain", label: "Pain Management", keywords: ["pain", "comfortable", "numbing", "gentle", "sensitive"] },
        { id: "dent_comfort", label: "Comfort", keywords: ["comfortable", "relaxed", "anxious", "ease"] },
        { id: "dent_thorough", label: "Thoroughness", keywords: ["thorough", "detailed", "examined", "checked"] },
        { id: "dent_results", label: "Results", keywords: ["results", "looks", "feels", "satisfied", "outcome"] },
      ],
    },
    {
      id: "staff",
      label: "Staff",
      icon: "Users",
      subOptions: [
        { id: "dent_dentist", label: "Treatment experience", keywords: ["dentist", "doctor", "dr.", "specialist"] },
        { id: "dent_hygienist", label: "Cleaning experience", keywords: ["hygienist", "cleaning", "teeth cleaning"] },
        { id: "dent_front_desk", label: "Reception experience", keywords: ["front desk", "reception", "scheduler", "admin"] },
      ],
    },
    {
      id: "facility",
      label: "Facility",
      icon: "Building",
      subOptions: [
        { id: "dent_cleanliness", label: "Cleanliness", keywords: ["clean", "sterile", "hygienic", "spotless"] },
        { id: "dent_equipment", label: "Equipment", keywords: ["equipment", "modern", "tech", "digital", "x-ray"] },
        { id: "dent_waiting", label: "Waiting Area", keywords: ["waiting", "lobby", "comfortable", "seating"] },
      ],
    },
    {
      id: "scheduling",
      label: "Scheduling",
      icon: "Calendar",
      subOptions: [
        { id: "dent_wait_time", label: "Wait Time", keywords: ["wait", "on time", "delayed", "waiting", "prompt"] },
        { id: "dent_booking", label: "Booking Ease", keywords: ["booking", "appointment", "schedule", "easy"] },
        { id: "dent_reminders", label: "Reminders", keywords: ["reminder", "notification", "text", "email"] },
      ],
    },
    {
      id: "communication",
      label: "Communication",
      icon: "MessageSquare",
      subOptions: [
        { id: "dent_explanation", label: "Explanation", keywords: ["explained", "understood", "clear", "detail"] },
        { id: "dent_options", label: "Treatment Options", keywords: ["option", "alternative", "choice", "plan"] },
        { id: "dent_followup", label: "Follow-up", keywords: ["follow", "aftercare", "instructions", "check"] },
      ],
    },
    {
      id: "value",
      label: "Value & Insurance",
      icon: "ShieldCheck",
      subOptions: [
        { id: "dent_insurance", label: "Insurance Handling", keywords: ["insurance", "claim", "coverage", "accepted"] },
        { id: "dent_pricing", label: "Pricing", keywords: ["price", "cost", "expensive", "reasonable"] },
        { id: "dent_payment", label: "Payment Options", keywords: ["payment", "plan", "finance", "installment"] },
      ],
    },
  ],

  SALON: [
    {
      id: "service_quality",
      label: "Service Quality",
      icon: "Scissors",
      subOptions: [
        { id: "salon_haircut", label: "Haircut & Style", keywords: ["haircut", "style", "trim", "blowout", "cut"] },
        { id: "salon_color", label: "Color Services", keywords: ["color", "dye", "highlights", "bleach", "balayage"] },
        { id: "salon_nails", label: "Nail Services", keywords: ["nails", "manicure", "pedicure", "gel", "acrylic"] },
        { id: "salon_skincare", label: "Skincare & Facial", keywords: ["facial", "skin", "cleanse", "mask", "treatment"] },
        { id: "salon_massage", label: "Massage", keywords: ["massage", "relax", "therapist", "pressure"] },
      ],
    },
    {
      id: "stylist",
      label: "Service delivery",
      icon: "UserCheck",
      subOptions: [
        { id: "salon_skill", label: "Skill & Expertise", keywords: ["skilled", "expert", "talented", "professional"] },
        { id: "salon_listening", label: "Listening", keywords: ["listened", "understood", "asked", "consultation"] },
        { id: "salon_advice", label: "Advice", keywords: ["advice", "recommended", "suggestion", "guidance"] },
        { id: "salon_consistency", label: "Consistency", keywords: ["consistent", "always", "every time", "reliable"] },
      ],
    },
    {
      id: "atmosphere",
      label: "Atmosphere",
      icon: "Sparkles",
      subOptions: [
        { id: "salon_cleanliness", label: "Cleanliness", keywords: ["clean", "sanitary", "hygienic", "tidy"] },
        { id: "salon_decor", label: "Decor & Ambiance", keywords: ["decor", "ambiance", "vibe", "beautiful", "design"] },
        { id: "salon_music", label: "Music", keywords: ["music", "relaxing", "calm", "upbeat"] },
        { id: "salon_relax", label: "Relaxation", keywords: ["relax", "calm", "peaceful", "escape", "serene"] },
      ],
    },
    {
      id: "scheduling",
      label: "Scheduling",
      icon: "Calendar",
      subOptions: [
        { id: "salon_booking", label: "Booking Ease", keywords: ["booking", "appointment", "online", "easy"] },
        { id: "salon_wait", label: "Wait Time", keywords: ["wait", "on time", "delayed", "prompt"] },
        { id: "salon_availability", label: "Availability", keywords: ["available", "slot", "opening", "booked"] },
      ],
    },
    {
      id: "value",
      label: "Value & Products",
      icon: "SmilePlus",
      subOptions: [
        { id: "salon_pricing", label: "Pricing", keywords: ["price", "cost", "expensive", "reasonable", "worth"] },
        { id: "salon_membership", label: "Membership", keywords: ["membership", "package", "subscription"] },
        { id: "salon_products", label: "Retail Products", keywords: ["product", "shampoo", "conditioner", "retail"] },
      ],
    },
  ],

  MEDICAL: [
    {
      id: "provider",
      label: "Provider Care",
      icon: "Stethoscope",
      subOptions: [
        { id: "med_doctor", label: "Care experience", keywords: ["doctor", "nurse", "physician", "specialist"] },
        { id: "med_bedside", label: "Bedside Manner", keywords: ["bedside", "caring", "compassionate", "kind"] },
        { id: "med_thorough", label: "Thoroughness", keywords: ["thorough", "detailed", "examined", "listened"] },
        { id: "med_expertise", label: "Expertise", keywords: ["expert", "knowledgeable", "experienced"] },
      ],
    },
    {
      id: "staff",
      label: "Staff",
      icon: "Users",
      subOptions: [
        { id: "med_front_desk", label: "Reception experience", keywords: ["front desk", "reception", "check-in"] },
        { id: "med_support", label: "Helpfulness", keywords: ["staff", "assistant", "team", "helper"] },
      ],
    },
    {
      id: "facility",
      label: "Facility",
      icon: "Building",
      subOptions: [
        { id: "med_cleanliness", label: "Cleanliness", keywords: ["clean", "sanitary", "hygienic", "sterile"] },
        { id: "med_equipment", label: "Equipment", keywords: ["equipment", "modern", "facility"] },
        { id: "med_comfort", label: "Comfort", keywords: ["comfortable", "room", "bed", "chair"] },
      ],
    },
    {
      id: "access",
      label: "Access",
      icon: "Calendar",
      subOptions: [
        { id: "med_wait_time", label: "Wait Time", keywords: ["wait", "delayed", "on time", "prompt"] },
        { id: "med_booking", label: "Appointment Booking", keywords: ["appointment", "booking", "scheduling"] },
        { id: "med_telehealth", label: "Telehealth", keywords: ["telehealth", "virtual", "video", "online"] },
      ],
    },
    {
      id: "communication",
      label: "Communication",
      icon: "MessageSquare",
      subOptions: [
        { id: "med_explanation", label: "Explanation", keywords: ["explained", "clear", "understood"] },
        { id: "med_followup", label: "Follow-up", keywords: ["follow-up", "aftercare", "follow up"] },
        { id: "med_results", label: "Test Results", keywords: ["results", "report", "lab", "finding"] },
      ],
    },
    {
      id: "value",
      label: "Value & Billing",
      icon: "ShieldCheck",
      subOptions: [
        { id: "med_insurance", label: "Insurance", keywords: ["insurance", "coverage", "claim"] },
        { id: "med_pricing", label: "Pricing", keywords: ["price", "cost", "expensive", "reasonable"] },
        { id: "med_billing", label: "Billing", keywords: ["billing", "invoice", "payment", "bill"] },
      ],
    },
  ],

  AUTO: [
    {
      id: "work_quality",
      label: "Work Quality",
      icon: "Wrench",
      subOptions: [
        { id: "auto_repair", label: "Repair Quality", keywords: ["repair", "fixed", "quality work", "done right"] },
        { id: "auto_diagnostics", label: "Diagnostics", keywords: ["diagnosis", "diagnostic", "found", "identified"] },
        { id: "auto_inspection", label: "Inspection", keywords: ["inspection", "checked", "examined", "thorough"] },
      ],
    },
    {
      id: "staff",
      label: "Staff",
      icon: "Users",
      subOptions: [
        { id: "auto_technician", label: "Workmanship", keywords: ["technician", "mechanic", "tech", "expert"] },
        { id: "auto_honesty", label: "Honesty", keywords: ["honest", "trustworthy", "trust", "integrity"] },
        { id: "auto_front_desk", label: "Reception experience", keywords: ["front desk", "service advisor", "manager"] },
      ],
    },
    {
      id: "communication",
      label: "Communication",
      icon: "MessageSquare",
      subOptions: [
        { id: "auto_explanation", label: "Explanation", keywords: ["explained", "detail", "understood"] },
        { id: "auto_updates", label: "Updates", keywords: ["update", "kept informed", "called", "notified"] },
        { id: "auto_recommendations", label: "Recommendations", keywords: ["recommended", "suggested", "advised"] },
      ],
    },
    {
      id: "timeliness",
      label: "Timeliness",
      icon: "Clock",
      subOptions: [
        { id: "auto_turnaround", label: "Turnaround", keywords: ["turnaround", "done quickly", "ready", "fast"] },
        { id: "auto_punctual", label: "On-time", keywords: ["on time", "prompt", "scheduled", "delayed"] },
      ],
    },
    {
      id: "pricing",
      label: "Pricing",
      icon: "SmilePlus",
      subOptions: [
        { id: "auto_transparency", label: "Transparency", keywords: ["transparent", "upfront", "estimate", "clear"] },
        { id: "auto_fairness", label: "Fairness", keywords: ["fair", "reasonable", "competitive"] },
        { id: "auto_warranty", label: "Warranty", keywords: ["warranty", "guarantee", "coverage"] },
      ],
    },
    {
      id: "facility",
      label: "Facility",
      icon: "Building",
      subOptions: [
        { id: "auto_cleanliness", label: "Cleanliness", keywords: ["clean", "tidy", "organized"] },
        { id: "auto_waiting", label: "Waiting Area", keywords: ["waiting", "lobby", "comfortable"] },
      ],
    },
  ],

  FITNESS: [
    {
      id: "equipment",
      label: "Equipment",
      icon: "Dumbbell",
      subOptions: [
        { id: "fit_availability", label: "Availability", keywords: ["available", "crowded", "busy", "wait"] },
        { id: "fit_condition", label: "Condition", keywords: ["condition", "maintained", "broken", "working"] },
        { id: "fit_variety", label: "Variety", keywords: ["variety", "range", "selection", "options"] },
      ],
    },
    {
      id: "classes",
      label: "Classes",
      icon: "Users",
      subOptions: [
        { id: "fit_instructor", label: "Class quality", keywords: ["instructor", "trainer", "coach", "teacher"] },
        { id: "fit_variety_classes", label: "Variety", keywords: ["class variety", "schedule", "options"] },
        { id: "fit_schedule", label: "Schedule", keywords: ["schedule", "timing", "time slot"] },
      ],
    },
    {
      id: "cleanliness",
      label: "Cleanliness",
      icon: "Sparkles",
      subOptions: [
        { id: "fit_gym_clean", label: "Gym Floor", keywords: ["clean gym", "equipment clean", "wipes"] },
        { id: "fit_locker_room", label: "Locker Rooms", keywords: ["locker", "shower", "changing", "locker room"] },
        { id: "fit_bathroom", label: "Bathrooms", keywords: ["bathroom", "washroom", "restroom"] },
      ],
    },
    {
      id: "staff",
      label: "Staff",
      icon: "UserCheck",
      subOptions: [
        { id: "fit_trainers", label: "Coaching quality", keywords: ["trainer", "coach", "personal trainer"] },
        { id: "fit_front_desk", label: "Reception experience", keywords: ["front desk", "check-in", "staff"] },
        { id: "fit_knowledge", label: "Knowledge", keywords: ["knowledgeable", "helpful", "expert"] },
      ],
    },
    {
      id: "atmosphere",
      label: "Atmosphere",
      icon: "Music",
      subOptions: [
        { id: "fit_music", label: "Music", keywords: ["music", "playlist", "volume"] },
        { id: "fit_crowded", label: "Crowdedness", keywords: ["crowded", "busy", "packed", "empty"] },
        { id: "fit_temp", label: "Temperature", keywords: ["temperature", "ac", "ventilation"] },
      ],
    },
    {
      id: "value",
      label: "Value",
      icon: "SmilePlus",
      subOptions: [
        { id: "fit_pricing", label: "Membership Pricing", keywords: ["membership", "price", "fee", "cost"] },
        { id: "fit_amenities", label: "Amenities", keywords: ["amenities", "sauna", "pool", "towels"] },
      ],
    },
  ],

  // GYM merged into FITNESS (deduplicated 2026-08)

  AUTO_DEALER: [
    {
      id: "sales",
      label: "Sales Experience",
      icon: "Car",
      subOptions: [
        { id: "dealer_salesperson", label: "Sales experience", keywords: ["salesperson", "salesman", "representative", "consultant", "executive"] },
        { id: "dealer_no_pressure", label: "No Pressure", keywords: ["pressure", "pushy", "hassle", "rushed", "hard sell"] },
        { id: "dealer_transparency", label: "Transparency", keywords: ["transparent", "upfront", "honest", "hidden", "clear"] },
        { id: "dealer_test_drive", label: "Test Drive", keywords: ["test drive", "test ride", "demo", "trial", "drive"] },
      ],
    },
    {
      id: "selection",
      label: "Vehicle Selection",
      icon: "Car",
      subOptions: [
        { id: "dealer_variety", label: "Variety", keywords: ["variety", "range", "selection", "options", "models"] },
        { id: "dealer_condition", label: "Condition", keywords: ["condition", "quality", "inspection", "maintained", "showroom"] },
        { id: "dealer_availability", label: "Availability", keywords: ["available", "in stock", "delivery", "wait", "waiting"] },
      ],
    },
    {
      id: "pricing",
      label: "Pricing & Financing",
      icon: "SmilePlus",
      subOptions: [
        { id: "dealer_price_fairness", label: "Price Fairness", keywords: ["price", "fair", "reasonable", "expensive", "cost"] },
        { id: "dealer_negotiation", label: "Negotiation", keywords: ["negotiate", "deal", "discount", "bargain", "final price"] },
        { id: "dealer_financing", label: "Financing / EMI", keywords: ["finance", "loan", "emi", "interest", "down payment"] },
        { id: "dealer_trade_in", label: "Trade-in", keywords: ["trade", "exchange", "old car", "buy back", "resale"] },
      ],
    },
    {
      id: "process",
      label: "Process & Delivery",
      icon: "Calendar",
      subOptions: [
        { id: "dealer_paperwork", label: "Paperwork", keywords: ["paperwork", "documentation", "process", "smooth", "easy"] },
        { id: "dealer_delivery", label: "Delivery", keywords: ["delivery", "handover", "on time", "delayed", "registration"] },
        { id: "dealer_after_sales", label: "After-Sales", keywords: ["after-sales", "follow-up", "support", "contacted"] },
      ],
    },
    {
      id: "service",
      label: "After-Sales Service",
      icon: "Wrench",
      subOptions: [
        { id: "dealer_warranty", label: "Warranty", keywords: ["warranty", "guarantee", "coverage", "claim"] },
        { id: "dealer_servicing", label: "Servicing", keywords: ["service", "servicing", "maintenance", "repair", "workshop"] },
        { id: "dealer_responsive", label: "Responsiveness", keywords: ["responsive", "quick", "helpful", "resolved"] },
      ],
    },
  ],

  ELECTRONICS: [
    {
      id: "products",
      label: "Products",
      icon: "Smartphone",
      subOptions: [
        { id: "elec_quality", label: "Product Quality", keywords: ["quality", "genuine", "durable", "works", "brand new"] },
        { id: "elec_authenticity", label: "Authenticity", keywords: ["genuine", "original", "authentic", "sealed", "counterfeit"] },
        { id: "elec_selection", label: "Selection", keywords: ["variety", "range", "selection", "models", "brands"] },
        { id: "elec_availability", label: "Availability", keywords: ["in stock", "available", "out of stock", "ordered"] },
      ],
    },
    {
      id: "staff",
      label: "Staff",
      icon: "Users",
      subOptions: [
        { id: "elec_knowledge", label: "Product Knowledge", keywords: ["knowledgeable", "expert", "informed", "explained", "advice"] },
        { id: "elec_helpfulness", label: "Helpfulness", keywords: ["helpful", "assistance", "guided", "patient", "attentive"] },
        { id: "elec_honesty", label: "Honesty", keywords: ["honest", "transparent", "truthful", "upfront"] },
      ],
    },
    {
      id: "repair",
      label: "Repair Service",
      icon: "Wrench",
      subOptions: [
        { id: "elec_repair_quality", label: "Repair Quality", keywords: ["repair", "fixed", "working", "done right", "quality work"] },
        { id: "elec_turnaround", label: "Turnaround Time", keywords: ["turnaround", "quick", "ready", "fast", "took long"] },
        { id: "elec_diagnostics", label: "Diagnostics", keywords: ["diagnosis", "diagnostic", "found", "identified", "problem"] },
        { id: "elec_genuine_parts", label: "Genuine Parts", keywords: ["genuine part", "original part", "spare part", "component"] },
      ],
    },
    {
      id: "pricing",
      label: "Pricing",
      icon: "SmilePlus",
      subOptions: [
        { id: "elec_price_fairness", label: "Price Fairness", keywords: ["price", "fair", "reasonable", "expensive", "competitive"] },
        { id: "elec_quote", label: "Quote Accuracy", keywords: ["quote", "estimate", "upfront", "final price", "surprise"] },
        { id: "elec_warranty", label: "Warranty", keywords: ["warranty", "guarantee", "coverage", "claim"] },
      ],
    },
    {
      id: "after_sales",
      label: "After-Sales",
      icon: "MessageSquare",
      subOptions: [
        { id: "elec_support", label: "Support", keywords: ["support", "help", "resolved", "responsive"] },
        { id: "elec_returns", label: "Returns & Exchanges", keywords: ["return", "exchange", "refund", "replacement", "defective"] },
        { id: "elec_followup", label: "Follow-up", keywords: ["follow-up", "called", "informed", "updated"] },
      ],
    },
  ],

  HOME_SERVICES: [
    {
      id: "work_quality",
      label: "Work Quality",
      icon: "Wrench",
      subOptions: [
        { id: "home_craftsmanship", label: "Craftsmanship", keywords: ["craftsmanship", "quality", "finish", "well done"] },
        { id: "home_thorough", label: "Thoroughness", keywords: ["thorough", "detailed", "complete"] },
        { id: "home_results", label: "Results", keywords: ["results", "looks", "outcome", "satisfied"] },
      ],
    },
    {
      id: "staff",
      label: "Staff",
      icon: "Users",
      subOptions: [
        { id: "home_technician", label: "Workmanship", keywords: ["technician", "worker", "pro", "contractor"] },
        { id: "home_professionalism", label: "Professionalism", keywords: ["professional", "polite", "respectful"] },
        { id: "home_friendly", label: "Friendliness", keywords: ["friendly", "nice", "pleasant"] },
      ],
    },
    {
      id: "communication",
      label: "Communication",
      icon: "MessageSquare",
      subOptions: [
        { id: "home_updates", label: "Updates", keywords: ["update", "kept informed", "called", "notified"] },
        { id: "home_explanation", label: "Explanation", keywords: ["explained", "detail", "walked through"] },
        { id: "home_scheduling", label: "Scheduling", keywords: ["scheduling", "arranged", "coordinated"] },
      ],
    },
    {
      id: "timeliness",
      label: "Timeliness",
      icon: "Clock",
      subOptions: [
        { id: "home_punctuality", label: "Punctuality", keywords: ["on time", "punctual", "early", "delayed"] },
        { id: "home_duration", label: "Duration", keywords: ["took", "duration", "quick", "efficient"] },
        { id: "home_responsive", label: "Responsiveness", keywords: ["responsive", "quick reply", "fast"] },
      ],
    },
    {
      id: "pricing",
      label: "Pricing",
      icon: "SmilePlus",
      subOptions: [
        { id: "home_transparency", label: "Transparency", keywords: ["transparent", "upfront", "estimate"] },
        { id: "home_fairness", label: "Fairness", keywords: ["fair", "reasonable", "competitive"] },
        { id: "home_value", label: "Value", keywords: ["value", "worth", "money"] },
      ],
    },
    {
      id: "cleanliness",
      label: "Cleanliness",
      icon: "Sparkles",
      subOptions: [
        { id: "home_clean_work", label: "Worksite Cleanup", keywords: ["clean up", "mess", "tidy", "swept"] },
        { id: "home_respect", label: "Respect for Home", keywords: ["respect", "careful", "protected"] },
      ],
    },
  ],

  CAFE: [
    {
      id: "beverages",
      label: "Coffee & Drinks",
      icon: "Wine",
      subOptions: [
        { id: "cafe_coffee", label: "Coffee Quality", keywords: ["coffee", "espresso", "latte", "cappuccino", "americano"] },
        { id: "cafe_tea", label: "Tea & Other Drinks", keywords: ["tea", "chai", "matcha", "juice", "smoothie"] },
        { id: "cafe_cold", label: "Cold Drinks", keywords: ["cold brew", "iced", "frappe", "shaken", "cold coffee"] },
        { id: "cafe_consistency", label: "Consistency", keywords: ["consistent", "same every time", "watery", "weak", "strong"] },
      ],
    },
    {
      id: "food",
      label: "Food & Pastries",
      icon: "Utensils",
      subOptions: [
        { id: "cafe_food_quality", label: "Taste & Quality", keywords: ["taste", "flavour", "flavor", "delicious", "quality"] },
        { id: "cafe_freshness", label: "Freshness", keywords: ["fresh", "stale", "warm", "day-old"] },
        { id: "cafe_portions", label: "Portion Size", keywords: ["portion", "serving", "small", "filling"] },
        { id: "cafe_dietary", label: "Dietary Options", keywords: ["vegan", "vegetarian", "gluten-free", "oat milk", "dairy-free", "jain"] },
      ],
    },
    {
      id: "service",
      label: "Service",
      icon: "ThumbsUp",
      subOptions: [
        { id: "cafe_friendly", label: "Friendliness", keywords: ["friendly", "welcoming", "warm", "polite"] },
        { id: "cafe_speed", label: "Speed", keywords: ["fast", "quick", "slow", "wait", "queue"] },
        { id: "cafe_accuracy", label: "Order Accuracy", keywords: ["wrong", "missing", "correct", "customization", "order"] },
        { id: "cafe_knowledge", label: "Recommendations", keywords: ["recommended", "knowledgeable", "suggestion", "explained"] },
      ],
    },
    {
      id: "space",
      label: "Space & Comfort",
      icon: "MapPin",
      subOptions: [
        { id: "cafe_seating", label: "Seating", keywords: ["seating", "chair", "table", "comfortable", "space"] },
        { id: "cafe_wifi", label: "Wi-Fi & Power", keywords: ["wifi", "wi-fi", "internet", "charger", "plug", "socket"] },
        { id: "cafe_noise", label: "Noise", keywords: ["noise", "noisy", "quiet", "music", "volume"] },
        { id: "cafe_cleanliness", label: "Cleanliness", keywords: ["clean", "dirty", "tidy", "washroom", "table"] },
      ],
    },
    {
      id: "value",
      label: "Value",
      icon: "SmilePlus",
      subOptions: [
        { id: "cafe_pricing", label: "Pricing", keywords: ["price", "expensive", "reasonable", "worth", "value"] },
        { id: "cafe_loyalty", label: "Loyalty & Offers", keywords: ["loyalty", "stamp", "offer", "discount", "membership"] },
      ],
    },
  ],

  BAKERY: [
    {
      id: "products",
      label: "Bakes & Products",
      icon: "Utensils",
      subOptions: [
        { id: "bakery_freshness", label: "Freshness", keywords: ["fresh", "stale", "warm", "baked today"] },
        { id: "bakery_taste", label: "Taste & Texture", keywords: ["taste", "flavour", "flavor", "texture", "moist", "dry"] },
        { id: "bakery_variety", label: "Variety", keywords: ["variety", "selection", "options", "range", "flavours"] },
        { id: "bakery_custom", label: "Custom Cakes & Orders", keywords: ["custom cake", "birthday", "design", "order", "message"] },
      ],
    },
    {
      id: "service",
      label: "Service",
      icon: "ThumbsUp",
      subOptions: [
        { id: "bakery_friendly", label: "Friendliness", keywords: ["friendly", "welcoming", "polite", "helpful"] },
        { id: "bakery_accuracy", label: "Order Accuracy", keywords: ["wrong", "missing", "correct", "spelling", "order"] },
        { id: "bakery_speed", label: "Speed", keywords: ["fast", "quick", "slow", "wait", "queue"] },
      ],
    },
    {
      id: "hygiene",
      label: "Hygiene & Packaging",
      icon: "Sparkles",
      subOptions: [
        { id: "bakery_cleanliness", label: "Cleanliness", keywords: ["clean", "dirty", "hygienic", "display"] },
        { id: "bakery_storage", label: "Storage & Handling", keywords: ["stored", "handled", "covered", "temperature", "display case"] },
        { id: "bakery_packaging", label: "Packaging", keywords: ["packaging", "box", "bag", "damaged", "leaked", "smushed"] },
      ],
    },
    {
      id: "value",
      label: "Value",
      icon: "SmilePlus",
      subOptions: [
        { id: "bakery_pricing", label: "Pricing", keywords: ["price", "expensive", "reasonable", "worth", "cost"] },
        { id: "bakery_portions", label: "Size vs Price", keywords: ["size", "portion", "small", "value", "slice"] },
      ],
    },
  ],

  QUICK_SERVICE: [
    {
      id: "food",
      label: "Food Quality",
      icon: "Utensils",
      subOptions: [
        { id: "qs_taste", label: "Taste & Flavor", keywords: ["taste", "flavour", "flavor", "delicious", "seasoning"] },
        { id: "qs_freshness", label: "Freshness", keywords: ["fresh", "stale", "cold", "warm", "made fresh"] },
        { id: "qs_temperature", label: "Temperature", keywords: ["hot", "cold", "temperature", "lukewarm"] },
        { id: "qs_portion", label: "Portion Size", keywords: ["portion", "serving", "small", "filling"] },
      ],
    },
    {
      id: "speed",
      label: "Speed",
      icon: "Clock",
      subOptions: [
        { id: "qs_order_time", label: "Order Time", keywords: ["order time", "wait", "queue", "slow", "fast"] },
        { id: "qs_served_time", label: "Time to Receive", keywords: ["served", "ready", "took long", "quick", "delay"] },
      ],
    },
    {
      id: "accuracy",
      label: "Order Accuracy",
      icon: "ThumbsUp",
      subOptions: [
        { id: "qs_order_accuracy", label: "Correct Order", keywords: ["wrong", "missing", "correct", "incomplete", "order"] },
        { id: "qs_customization", label: "Customization", keywords: ["custom", "no onions", "extra", "spicy", "request"] },
      ],
    },
    {
      id: "packaging",
      label: "Packaging & Takeaway",
      icon: "Home",
      subOptions: [
        { id: "qs_packaging", label: "Packaging Quality", keywords: ["packaging", "box", "bag", "container", "sealed"] },
        { id: "qs_spill", label: "Leaks & Spills", keywords: ["leak", "spill", "mess", "soggy", "damaged"] },
        { id: "qs_delivery", label: "Delivery", keywords: ["delivery", "driver", "late", "arrived", "cold"] },
      ],
    },
    {
      id: "cleanliness",
      label: "Cleanliness",
      icon: "Sparkles",
      subOptions: [
        { id: "qs_seating", label: "Seating Area", keywords: ["table", "seat", "dirty", "clean", "tray"] },
        { id: "qs_restroom", label: "Restroom", keywords: ["washroom", "restroom", "toilet", "dirty"] },
        { id: "qs_counter", label: "Counter & Kitchen", keywords: ["counter", "kitchen", "open kitchen", "hygiene"] },
      ],
    },
    {
      id: "value",
      label: "Value",
      icon: "SmilePlus",
      subOptions: [
        { id: "qs_pricing", label: "Pricing", keywords: ["price", "expensive", "cheap", "reasonable", "worth"] },
        { id: "qs_combo", label: "Combos & Offers", keywords: ["combo", "deal", "offer", "meal", "discount"] },
      ],
    },
  ],

  HOTEL: [
    {
      id: "booking",
      label: "Booking & Check-in",
      icon: "Calendar",
      subOptions: [
        { id: "hotel_booking", label: "Booking Ease", keywords: ["booking", "reservation", "website", "confirmation", "rate"] },
        { id: "hotel_checkin", label: "Check-in", keywords: ["check-in", "check in", "reception", "arrival", "wait"] },
        { id: "hotel_checkout", label: "Check-out", keywords: ["check-out", "check out", "departure", "bill", "late"] },
      ],
    },
    {
      id: "room",
      label: "Room & Comfort",
      icon: "Building",
      subOptions: [
        { id: "hotel_cleanliness", label: "Room Cleanliness", keywords: ["clean", "dirty", "stain", "dust", "smell", "sheets"] },
        { id: "hotel_bed", label: "Bed & Sleep", keywords: ["bed", "mattress", "pillow", "sleep", "comfortable"] },
        { id: "hotel_bathroom", label: "Bathroom", keywords: ["bathroom", "shower", "toilet", "water", "towel", "drain"] },
        { id: "hotel_noise", label: "Noise", keywords: ["noise", "noisy", "quiet", "soundproof", "traffic"] },
        { id: "hotel_ac", label: "AC & Heating", keywords: ["ac", "air conditioning", "heating", "temperature", "ventilation"] },
        { id: "hotel_maintenance", label: "Maintenance", keywords: ["broken", "not working", "leak", "maintenance", "repair"] },
      ],
    },
    {
      id: "staff",
      label: "Staff & Requests",
      icon: "Users",
      subOptions: [
        { id: "hotel_front_desk", label: "Front Desk", keywords: ["front desk", "reception", "staff", "concierge"] },
        { id: "hotel_housekeeping", label: "Housekeeping", keywords: ["housekeeping", "cleaning", "room service", "towels"] },
        { id: "hotel_responsiveness", label: "Responsiveness", keywords: ["responsive", "quick", "ignored", "request", "help"] },
        { id: "hotel_requests", label: "Special Requests", keywords: ["request", "extra bed", "late checkout", "airport", "arrangement"] },
      ],
    },
    {
      id: "facilities",
      label: "Facilities & Amenities",
      icon: "MapPin",
      subOptions: [
        { id: "hotel_wifi", label: "Wi-Fi", keywords: ["wifi", "wi-fi", "internet", "connection", "speed"] },
        { id: "hotel_parking", label: "Parking", keywords: ["parking", "valet", "garage", "car"] },
        { id: "hotel_pool", label: "Pool & Spa", keywords: ["pool", "spa", "sauna", "jacuzzi", "swimming"] },
        { id: "hotel_gym", label: "Gym", keywords: ["gym", "fitness", "equipment", "workout"] },
        { id: "hotel_breakfast", label: "Breakfast", keywords: ["breakfast", "buffet", "food", "coffee", "options"] },
      ],
    },
    {
      id: "value",
      label: "Value & Billing",
      icon: "SmilePlus",
      subOptions: [
        { id: "hotel_price", label: "Price for Stay", keywords: ["price", "rate", "expensive", "value", "worth"] },
        { id: "hotel_extra_charges", label: "Extra Charges", keywords: ["extra charge", "hidden fee", "bill", "deposit", "invoice"] },
      ],
    },
  ],

  ELECTRONICS_REPAIR: [
    {
      id: "repair",
      label: "Repair Quality",
      icon: "Wrench",
      subOptions: [
        { id: "erep_quality", label: "Repair Quality", keywords: ["repair", "fixed", "working", "done right", "quality work"] },
        { id: "erep_diagnostics", label: "Diagnostics", keywords: ["diagnosis", "diagnostic", "found", "identified", "problem"] },
        { id: "erep_parts", label: "Parts Used", keywords: ["genuine part", "original part", "spare part", "component", "replacement"] },
      ],
    },
    {
      id: "quote",
      label: "Quote & Billing",
      icon: "SmilePlus",
      subOptions: [
        { id: "erep_quote", label: "Quote Accuracy", keywords: ["quote", "estimate", "upfront", "final price", "surprise"] },
        { id: "erep_final_bill", label: "Final Bill", keywords: ["bill", "invoice", "charge", "extra", "cost"] },
      ],
    },
    {
      id: "turnaround",
      label: "Turnaround & Updates",
      icon: "Clock",
      subOptions: [
        { id: "erep_turnaround", label: "Turnaround Time", keywords: ["turnaround", "ready", "fast", "took long", "delay"] },
        { id: "erep_updates", label: "Status Updates", keywords: ["update", "called", "informed", "notified", "status"] },
      ],
    },
    {
      id: "data",
      label: "Device & Data",
      icon: "ShieldCheck",
      subOptions: [
        { id: "erep_data_privacy", label: "Data Privacy", keywords: ["data", "privacy", "photos", "files", "wiped", "backup"] },
        { id: "erep_device_safety", label: "Device Safety", keywords: ["safe", "damaged", "scratch", "battery", "overheating"] },
      ],
    },
    {
      id: "warranty",
      label: "Warranty & Aftercare",
      icon: "MessageSquare",
      subOptions: [
        { id: "erep_warranty", label: "Warranty", keywords: ["warranty", "guarantee", "coverage", "claim"] },
        { id: "erep_rework", label: "Rework", keywords: ["again", "same problem", "returned", "rework", "not fixed"] },
      ],
    },
    {
      id: "service",
      label: "Service",
      icon: "Users",
      subOptions: [
        { id: "erep_front_desk", label: "Reception", keywords: ["front desk", "reception", "staff", "greeting"] },
        { id: "erep_communication", label: "Communication", keywords: ["explained", "clear", "communication", "response"] },
      ],
    },
  ],

  ELECTRICAL: [
    {
      id: "work",
      label: "Work Quality",
      icon: "Wrench",
      subOptions: [
        { id: "electric_workmanship", label: "Workmanship", keywords: ["workmanship", "quality", "neat", "proper", "well done"] },
        { id: "electric_completion", label: "Job Completion", keywords: ["completed", "finished", "left unfinished", "done"] },
        { id: "electric_testing", label: "Testing", keywords: ["tested", "checked", "load test", "working"] },
      ],
    },
    {
      id: "safety",
      label: "Safety",
      icon: "ShieldCheck",
      subOptions: [
        { id: "electric_safety", label: "Electrical Safety", keywords: ["safe", "shock", "spark", "short circuit", "fire", "hazard"] },
        { id: "electric_certified", label: "Certified Materials", keywords: ["certified", "isi", "standard", "quality material", "genuine"] },
        { id: "electric_earthing", label: "Earthing & Wiring", keywords: ["earthing", "grounding", "wiring", "mcb", "breaker"] },
      ],
    },
    {
      id: "reliability",
      label: "Reliability",
      icon: "Clock",
      subOptions: [
        { id: "electric_punctuality", label: "Punctuality", keywords: ["on time", "punctual", "late", "delayed", "scheduled"] },
        { id: "electric_responsiveness", label: "Responsiveness", keywords: ["answered", "call back", "responsive", "quick reply"] },
        { id: "electric_updates", label: "Updates", keywords: ["update", "informed", "notified", "explained"] },
      ],
    },
    {
      id: "pricing",
      label: "Pricing",
      icon: "SmilePlus",
      subOptions: [
        { id: "electric_quote", label: "Quote Accuracy", keywords: ["quote", "estimate", "upfront", "final bill", "surprise"] },
        { id: "electric_final_bill", label: "Final Bill", keywords: ["bill", "invoice", "charge", "extra", "cost"] },
        { id: "electric_value", label: "Value", keywords: ["value", "worth", "reasonable", "expensive", "fair"] },
      ],
    },
    {
      id: "cleanliness",
      label: "Cleanliness",
      icon: "Sparkles",
      subOptions: [
        { id: "electric_cleanup", label: "Worksite Cleanup", keywords: ["clean up", "mess", "debris", "dust", "tidy"] },
        { id: "electric_damage", label: "Care for Property", keywords: ["damage", "wall", "drill", "scratch", "protected"] },
      ],
    },
    {
      id: "warranty",
      label: "Warranty",
      icon: "MessageSquare",
      subOptions: [
        { id: "electric_warranty", label: "Work Warranty", keywords: ["warranty", "guarantee", "coverage", "after service"] },
        { id: "electric_callback", label: "Call-back Service", keywords: ["came back", "callback", "follow up", "fixed again"] },
      ],
    },
  ],

  ELECTRICAL_RETAIL: [
    {
      id: "products",
      label: "Products",
      icon: "Smartphone",
      subOptions: [
        { id: "elecshop_genuine", label: "Genuine Products", keywords: ["genuine", "original", "authentic", "duplicate", "fake"] },
        { id: "elecshop_brands", label: "Brands & Range", keywords: ["brand", "brands", "range", "variety", "selection"] },
        { id: "elecshop_stock", label: "Stock Availability", keywords: ["in stock", "available", "out of stock", "ordered", "stock"] },
        { id: "elecshop_quality", label: "Product Quality", keywords: ["quality", "durable", "works", "defective", "faulty"] },
      ],
    },
    {
      id: "advice",
      label: "Advice",
      icon: "MessageSquare",
      subOptions: [
        { id: "elecshop_guidance", label: "Product Guidance", keywords: ["guidance", "advice", "recommended", "explained", "knowledgeable"] },
        { id: "elecshop_load_advice", label: "Load & Safety Advice", keywords: ["load", "watt", "amps", "safety", "wiring", "mcb"] },
        { id: "elecshop_availability", label: "Availability Help", keywords: ["availability", "find", "order", "arrange", "source"] },
      ],
    },
    {
      id: "pricing",
      label: "Pricing",
      icon: "SmilePlus",
      subOptions: [
        { id: "elecshop_price", label: "Price Fairness", keywords: ["price", "expensive", "reasonable", "fair", "cost"] },
        { id: "elecshop_quote", label: "Quote Accuracy", keywords: ["quote", "estimate", "upfront", "final price"] },
        { id: "elecshop_bulk", label: "Bulk & Contractor Pricing", keywords: ["bulk", "contractor", "discount", "wholesale", "project"] },
      ],
    },
    {
      id: "service",
      label: "Store Service",
      icon: "Users",
      subOptions: [
        { id: "elecshop_staff", label: "Staff Helpfulness", keywords: ["staff", "helpful", "polite", "knowledgeable"] },
        { id: "elecshop_wait", label: "Wait Time", keywords: ["wait", "queue", "slow", "fast", "billing"] },
        { id: "elecshop_billing", label: "Billing", keywords: ["bill", "invoice", "gst", "payment", "charge"] },
      ],
    },
    {
      id: "returns",
      label: "Returns & Warranty",
      icon: "ShieldCheck",
      subOptions: [
        { id: "elecshop_warranty", label: "Warranty", keywords: ["warranty", "guarantee", "coverage", "claim"] },
        { id: "elecshop_returns", label: "Returns & Exchange", keywords: ["return", "exchange", "refund", "replacement", "defective"] },
        { id: "elecshop_delivery", label: "Delivery", keywords: ["delivery", "delivered", "late", "damaged", "installation"] },
      ],
    },
  ],

  RETAIL: [
    {
      id: "products",
      label: "Products",
      icon: "Smartphone",
      subOptions: [
        { id: "retail_range", label: "Range & Selection", keywords: ["range", "variety", "selection", "options", "brands"] },
        { id: "retail_quality", label: "Product Quality", keywords: ["quality", "durable", "works", "defective", "faulty"] },
        { id: "retail_stock", label: "Stock Availability", keywords: ["in stock", "available", "out of stock", "stock", "size"] },
        { id: "retail_authenticity", label: "Authenticity", keywords: ["genuine", "original", "authentic", "fake", "counterfeit"] },
      ],
    },
    {
      id: "store",
      label: "Store Experience",
      icon: "Building",
      subOptions: [
        { id: "retail_cleanliness", label: "Cleanliness", keywords: ["clean", "dirty", "tidy", "hygiene", "smell"] },
        { id: "retail_layout", label: "Layout", keywords: ["layout", "organized", "easy to find", "navigation", "crowded"] },
        { id: "retail_signage", label: "Signage", keywords: ["sign", "signage", "label", "price tag", "directions"] },
        { id: "retail_comfort", label: "Comfort", keywords: ["comfortable", "space", "temperature", "ac", "parking"] },
      ],
    },
    {
      id: "staff",
      label: "Staff",
      icon: "Users",
      subOptions: [
        { id: "retail_greeting", label: "Greeting", keywords: ["greeted", "welcome", "ignored", "attention"] },
        { id: "retail_knowledge", label: "Product Knowledge", keywords: ["knowledgeable", "explained", "advice", "expert"] },
        { id: "retail_courtesy", label: "Courtesy", keywords: ["polite", "rude", "friendly", "respectful"] },
        { id: "retail_response", label: "Responsiveness", keywords: ["helpful", "responsive", "quick", "assistance"] },
      ],
    },
    {
      id: "checkout",
      label: "Checkout & Billing",
      icon: "Clock",
      subOptions: [
        { id: "retail_wait", label: "Checkout Wait", keywords: ["checkout", "billing queue", "wait", "slow", "line"] },
        { id: "retail_billing", label: "Billing Accuracy", keywords: ["bill", "invoice", "charge", "wrong price", "gst"] },
        { id: "retail_payment", label: "Payment Options", keywords: ["payment", "card", "upi", "cash", "emi"] },
      ],
    },
    {
      id: "after_sales",
      label: "After-Sales",
      icon: "MessageSquare",
      subOptions: [
        { id: "retail_returns", label: "Returns & Exchanges", keywords: ["return", "exchange", "refund", "replacement"] },
        { id: "retail_warranty", label: "Warranty", keywords: ["warranty", "guarantee", "coverage", "claim"] },
        { id: "retail_delivery", label: "Delivery", keywords: ["delivery", "delivered", "late", "damaged", "installation"] },
      ],
    },
    {
      id: "value",
      label: "Value",
      icon: "SmilePlus",
      subOptions: [
        { id: "retail_pricing", label: "Pricing", keywords: ["price", "expensive", "reasonable", "cheap", "worth"] },
        { id: "retail_offers", label: "Offers & Loyalty", keywords: ["offer", "discount", "sale", "loyalty", "membership"] },
      ],
    },
  ],

  EDUCATION: [
    {
      id: "teaching",
      label: "Teaching & Learning",
      icon: "Users",
      subOptions: [
        { id: "edu_teaching", label: "Teaching Quality", keywords: ["teaching", "teacher", "lesson", "explained", "quality"] },
        { id: "edu_curriculum", label: "Curriculum", keywords: ["curriculum", "syllabus", "course", "learning", "homework"] },
        { id: "edu_homework", label: "Homework", keywords: ["homework", "assignments", "workload", "age-appropriate"] },
        { id: "edu_progress", label: "Progress", keywords: ["progress", "improvement", "results", "report card", "assessment"] },
      ],
    },
    {
      id: "communication",
      label: "Communication",
      icon: "MessageSquare",
      subOptions: [
        { id: "edu_updates", label: "Updates", keywords: ["update", "newsletter", "portal", "informed", "communication"] },
        { id: "edu_teacher_access", label: "Teacher Access", keywords: ["teacher access", "meeting", "parent teacher", "available"] },
        { id: "edu_concerns", label: "Concerns Addressed", keywords: ["concern", "complaint", "addressed", "response", "resolved"] },
      ],
    },
    {
      id: "safety",
      label: "Safety & Wellbeing",
      icon: "ShieldCheck",
      subOptions: [
        { id: "edu_safety", label: "Safety", keywords: ["safety", "secure", "playground", "supervision", "emergency"] },
        { id: "edu_bullying", label: "Bullying", keywords: ["bullying", "bully", "harassment", "inclusion", "wellbeing"] },
        { id: "edu_supervision", label: "Supervision", keywords: ["supervision", "attendance", "pickup", "drop-off", "care"] },
      ],
    },
    {
      id: "facilities",
      label: "Facilities",
      icon: "Building",
      subOptions: [
        { id: "edu_classrooms", label: "Classrooms", keywords: ["classroom", "seating", "ac", "space", "maintenance"] },
        { id: "edu_library", label: "Library & Labs", keywords: ["library", "lab", "computer", "resources", "books"] },
        { id: "edu_transport", label: "Transport", keywords: ["transport", "bus", "van", "route", "driver"] },
        { id: "edu_cleanliness", label: "Cleanliness", keywords: ["clean", "dirty", "hygiene", "washroom", "canteen"] },
      ],
    },
    {
      id: "activities",
      label: "Activities",
      icon: "Star",
      subOptions: [
        { id: "edu_extracurricular", label: "Extracurricular", keywords: ["extracurricular", "activities", "clubs", "events"] },
        { id: "edu_sports", label: "Sports", keywords: ["sports", "games", "coach", "physical education", "ground"] },
        { id: "edu_arts", label: "Arts & Music", keywords: ["arts", "music", "dance", "drama", "creative"] },
      ],
    },
    {
      id: "admin",
      label: "Admissions & Fees",
      icon: "SmilePlus",
      subOptions: [
        { id: "edu_admissions", label: "Admissions", keywords: ["admission", "enrollment", "process", "tour", "counselor"] },
        { id: "edu_fees", label: "Fees", keywords: ["fee", "fees", "price", "expensive", "value"] },
        { id: "edu_paperwork", label: "Paperwork", keywords: ["paperwork", "forms", "certificate", "records", "admin"] },
      ],
    },
  ],

  PET_CARE: [
    {
      id: "care",
      label: "Care Quality",
      icon: "Stethoscope",
      subOptions: [
        { id: "pet_handling", label: "Handling & Kindness", keywords: ["gentle", "kind", "handling", "calm", "comfortable"] },
        { id: "pet_vet_care", label: "Veterinary Care", keywords: ["vet", "doctor", "diagnosis", "treatment", "exam"] },
        { id: "pet_treatment", label: "Grooming & Boarding", keywords: ["grooming", "boarding", "kennel", "bath", "trim"] },
        { id: "pet_outcome", label: "Outcome", keywords: ["better", "recovered", "result", "healed", "healthy"] },
      ],
    },
    {
      id: "communication",
      label: "Communication",
      icon: "MessageSquare",
      subOptions: [
        { id: "pet_explanation", label: "Explanation", keywords: ["explained", "understood", "clear", "options"] },
        { id: "pet_options", label: "Treatment Options", keywords: ["options", "alternatives", "plan", "cost", "estimate"] },
        { id: "pet_followup", label: "Follow-up", keywords: ["follow-up", "aftercare", "called", "check"] },
      ],
    },
    {
      id: "facility",
      label: "Facility",
      icon: "Building",
      subOptions: [
        { id: "pet_cleanliness", label: "Cleanliness", keywords: ["clean", "dirty", "smell", "hygienic", "sterile"] },
        { id: "pet_equipment", label: "Equipment", keywords: ["equipment", "modern", "facility", "x-ray", "lab"] },
        { id: "pet_boarding", label: "Boarding Area", keywords: ["boarding", "kennel", "run", "cage", "space"] },
      ],
    },
    {
      id: "access",
      label: "Access",
      icon: "Calendar",
      subOptions: [
        { id: "pet_booking", label: "Booking", keywords: ["booking", "appointment", "schedule", "availability"] },
        { id: "pet_wait", label: "Wait Time", keywords: ["wait", "delayed", "on time", "queue"] },
        { id: "pet_emergency", label: "Emergency Care", keywords: ["emergency", "urgent", "critical", "after hours"] },
      ],
    },
    {
      id: "value",
      label: "Value",
      icon: "SmilePlus",
      subOptions: [
        { id: "pet_pricing", label: "Pricing", keywords: ["price", "cost", "expensive", "reasonable", "worth"] },
        { id: "pet_estimates", label: "Estimates", keywords: ["estimate", "quote", "bill", "surprise", "final cost"] },
      ],
    },
  ],

  REAL_ESTATE: [
    {
      id: "service",
      label: "Agent Service",
      icon: "Users",
      subOptions: [
        { id: "re_agent", label: "Agent", keywords: ["agent", "broker", "realtor", "representative"] },
        { id: "re_responsiveness", label: "Responsiveness", keywords: ["responsive", "quick", "replied", "follow up"] },
        { id: "re_availability", label: "Availability", keywords: ["available", "showed", "visits", "scheduling"] },
      ],
    },
    {
      id: "expertise",
      label: "Market Expertise",
      icon: "Star",
      subOptions: [
        { id: "re_market", label: "Market Knowledge", keywords: ["market", "locality", "pricing", "knowledge", "area"] },
        { id: "re_pricing", label: "Pricing Advice", keywords: ["valuation", "price", "pricing", "worth", "estimate"] },
        { id: "re_advice", label: "Advice", keywords: ["advice", "recommended", "guided", "suggestion"] },
      ],
    },
    {
      id: "process",
      label: "Process",
      icon: "Calendar",
      subOptions: [
        { id: "re_communication", label: "Communication", keywords: ["communication", "updates", "informed", "clear"] },
        { id: "re_paperwork", label: "Paperwork", keywords: ["paperwork", "documentation", "registration", "legal", "loan"] },
        { id: "re_timeline", label: "Timeline", keywords: ["timeline", "on time", "delay", "closing", "possession"] },
        { id: "re_negotiation", label: "Negotiation", keywords: ["negotiation", "deal", "price", "counteroffer", "terms"] },
      ],
    },
    {
      id: "outcome",
      label: "Outcome",
      icon: "Home",
      subOptions: [
        { id: "re_listing", label: "Listing Quality", keywords: ["listing", "photos", "marketing", "visibility", "showings"] },
        { id: "re_handover", label: "Handover", keywords: ["handover", "possession", "keys", "move in", "ready"] },
        { id: "re_after_sale", label: "After-Sale Support", keywords: ["after sale", "after-sales", "support", "follow up"] },
      ],
    },
    {
      id: "value",
      label: "Fees & Value",
      icon: "SmilePlus",
      subOptions: [
        { id: "re_fees", label: "Fees", keywords: ["fee", "commission", "charge", "cost", "expensive"] },
        { id: "re_value", label: "Value", keywords: ["value", "worth", "fair", "reasonable"] },
      ],
    },
  ],

  PROFESSIONAL_SERVICES: [
    {
      id: "expertise",
      label: "Expertise",
      icon: "Star",
      subOptions: [
        { id: "prof_expertise", label: "Expertise", keywords: ["expert", "knowledgeable", "experienced", "qualified"] },
        { id: "prof_advice", label: "Advice", keywords: ["advice", "recommended", "guided", "strategy", "solution"] },
        { id: "prof_solution", label: "Problem Solving", keywords: ["solved", "solution", "resolved", "outcome", "result"] },
      ],
    },
    {
      id: "communication",
      label: "Communication",
      icon: "MessageSquare",
      subOptions: [
        { id: "prof_clarity", label: "Clarity", keywords: ["clear", "explained", "understood", "jargon", "communication"] },
        { id: "prof_responsiveness", label: "Responsiveness", keywords: ["responsive", "replied", "quick", "call back", "available"] },
        { id: "prof_updates", label: "Updates", keywords: ["update", "informed", "notified", "kept in loop"] },
      ],
    },
    {
      id: "delivery",
      label: "Delivery",
      icon: "Clock",
      subOptions: [
        { id: "prof_quality", label: "Work Quality", keywords: ["quality", "work", "deliverable", "accurate", "thorough"] },
        { id: "prof_timeline", label: "Timeline", keywords: ["timeline", "deadline", "on time", "delay", "late"] },
        { id: "prof_scope", label: "Scope", keywords: ["scope", "expectations", "included", "extra", "brief"] },
      ],
    },
    {
      id: "relationship",
      label: "Relationship",
      icon: "Users",
      subOptions: [
        { id: "prof_trust", label: "Trust", keywords: ["trust", "honest", "transparent", "confidential"] },
        { id: "prof_courtesy", label: "Courtesy", keywords: ["polite", "respectful", "friendly", "professional"] },
      ],
    },
    {
      id: "value",
      label: "Fees & Value",
      icon: "SmilePlus",
      subOptions: [
        { id: "prof_fees", label: "Fees", keywords: ["fee", "fees", "price", "charge", "expensive", "cost"] },
        { id: "prof_value", label: "Value", keywords: ["value", "worth", "fair", "reasonable", "roi"] },
      ],
    },
  ],

  OTHER: [
    {
      id: "staff",
      label: "Staff",
      icon: "Users",
      subOptions: [
        { id: "other_friendly", label: "Friendliness", keywords: ["friendly", "welcoming", "nice", "kind"] },
        { id: "other_professional", label: "Professionalism", keywords: ["professional", "polite", "courteous"] },
        { id: "other_knowledge", label: "Knowledge", keywords: ["knowledgeable", "expert", "informed"] },
      ],
    },
    {
      id: "quality",
      label: "Quality",
      icon: "Star",
      subOptions: [
        { id: "other_results", label: "Results", keywords: ["results", "outcome", "satisfied"] },
        { id: "other_consistency", label: "Consistency", keywords: ["consistent", "reliable", "every time"] },
        { id: "other_detail", label: "Attention to Detail", keywords: ["detail", "thorough", "careful"] },
      ],
    },
    {
      id: "experience",
      label: "Experience",
      icon: "Sparkles",
      subOptions: [
        { id: "other_atmosphere", label: "Atmosphere", keywords: ["atmosphere", "vibe", "ambiance"] },
        { id: "other_comfort", label: "Comfort", keywords: ["comfortable", "relaxed", "pleasant"] },
        { id: "other_overall", label: "Overall", keywords: ["overall", "experience", "visit"] },
      ],
    },
    {
      id: "value",
      label: "Value",
      icon: "SmilePlus",
      subOptions: [
        { id: "other_pricing", label: "Pricing", keywords: ["price", "cost", "expensive", "cheap"] },
        { id: "other_worth", label: "Worth It", keywords: ["worth", "value", "fair"] },
      ],
    },
    {
      id: "communication",
      label: "Communication",
      icon: "MessageSquare",
      subOptions: [
        { id: "other_explanation", label: "Explanation", keywords: ["explained", "clear", "understood"] },
        { id: "other_updates", label: "Updates", keywords: ["update", "notified", "informed"] },
      ],
    },
    {
      id: "convenience",
      label: "Convenience",
      icon: "MapPin",
      subOptions: [
        { id: "other_location", label: "Location", keywords: ["location", "near", "close", "accessible"] },
        { id: "other_hours", label: "Hours", keywords: ["hours", "open", "schedule", "timing"] },
        { id: "other_parking", label: "Parking", keywords: ["parking", "park", "lot", "garage"] },
      ],
    },
  ],
}

export function getCategoriesForIndustry(industry: string): Category[] {
  const key = normalizeIndustry(industry)
  return INDUSTRY_CATEGORIES[key] || INDUSTRY_CATEGORIES.OTHER
}

/** All category IDs that exist for an industry (order follows the UI taxonomy). */
export function getAllCategoryIds(industry: string): string[] {
  return getCategoriesForIndustry(industry).map((c) => c.id)
}

/**
 * "Drinks & Bar" is opt-in for restaurants. Most Indian family restaurants do
 * not serve alcohol, so cocktails/wine/beer should not appear by default.
 * Bars/pubs/breweries opt in in settings, or are inferred from their own name
 * or signature items (e.g. "House IPA").
 */
const RESTAURANT_DEFAULT_CATEGORY_IDS = ["food", "service", "ambience", "value", "operations"]

const ALCOHOL_SIGNAL =
  /\b(bar|pub|brewery|brewhouse|brewpub|cocktail|wine|beer|ipa|liquor|whisk(?:y|ey)|spirits|taproom)\b/i

// A dish such as "Beer Battered Fish" or "Cocktail Prawns" contains an alcohol
// word without the business running a bar programme. Treat food-context phrases
// as non-signals so family restaurants keep the bar category hidden.
const FOOD_CONTEXT =
  /\b(fish|chicken|prawns?|shrimps?|mutton|lamb|beef|pork|paneer|veg|burger|pizza|pasta|curry|rice|biryani|noodles?|sandwich|salad|soup|dessert|cake|tikka|kebab|wings?|fries|fry|batter|battered|grilled|roast|steak|masala|thali|dosa|idli|roll|wrap|platter|seafood)\b/i

export function businessServesAlcohol(name?: string | null, promptTopics?: string[] | null): boolean {
  const businessName = name || ""
  if (ALCOHOL_SIGNAL.test(businessName) && !FOOD_CONTEXT.test(businessName)) {
    return true
  }
  return (promptTopics || []).some((topic) => {
    const trimmed = topic.trim()
    return (
      trimmed.split(/\s+/).length <= 4 &&
      ALCOHOL_SIGNAL.test(trimmed) &&
      !FOOD_CONTEXT.test(trimmed)
    )
  })
}

export function getDefaultCategoryIds(
  industry: string,
  opts?: { name?: string | null; promptTopics?: string[] | null },
): string[] {
  const key = normalizeIndustry(industry)
  if (key === "RESTAURANT") {
    return businessServesAlcohol(opts?.name, opts?.promptTopics)
      ? getAllCategoryIds(industry)
      : [...RESTAURANT_DEFAULT_CATEGORY_IDS]
  }
  return getAllCategoryIds(industry)
}

/**
 * Resolve the owner's saved selection against the current industry. Empty or
 * stale selections fall back to the industry defaults, so changing industry
 * never leaves a business with an empty questionnaire.
 */
export function getEffectiveCategoryIds(
  industry: string,
  enabledCategoryIds?: string[] | null,
  opts?: { name?: string | null; promptTopics?: string[] | null },
): string[] {
  const all = getAllCategoryIds(industry)
  const selected = (enabledCategoryIds || []).filter((id) => all.includes(id))
  if (selected.length > 0) return Array.from(new Set(selected))
  return getDefaultCategoryIds(industry, opts)
}

// Google policy: never prompt customers to mention individual staff names.
// Both patterns are narrow so legitimate prompts like "Ask for Jain options"
// still pass while "Ask for Rajesh" is dropped.
const PERSON_LIKE_PATTERNS: RegExp[] = [
  /^(dr|mr|ms|mrs|miss|sir|madam)\b/i,
  /\bask\s+for\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s*$/i,
  /\bstaff\s+names?\b/i,
]

export function isPersonLikePrompt(label: string): boolean {
  return PERSON_LIKE_PATTERNS.some((re) => re.test(label))
}

/**
 * Legacy onboarding stored generic question prompts ("A standout dish",
 * "Service speed", "Wait time") in the signature-items field. They are not
 * dishes, so keep them out of the one-tap dish chips.
 */
const LEGACY_GENERIC_TOPICS = new Set(
  [
    ...INDUSTRY_OPTIONS.flatMap((option) => option.topics),
    "quality",
    "friendly staff",
    "clean facility",
    "wait time",
    "pain management",
    "service & staff",
    "overall experience",
    "great service",
    "good food",
  ].map((label) => label.toLowerCase().trim()),
)

/**
 * Signature menu items / popular services. Unlike review-question topics,
 * these must be concrete things a guest actually experienced.
 */
export function getSignatureItems(topics?: string[] | null): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of topics || []) {
    if (typeof raw !== "string") continue
    const label = raw.trim().replace(/\s+/g, " ")
    if (label.length < 2 || label.length > 60) continue
    const key = label.toLowerCase()
    if (LEGACY_GENERIC_TOPICS.has(key) || seen.has(key) || isPersonLikePrompt(label)) continue
    seen.add(key)
    out.push(label)
    if (out.length >= 12) break
  }
  return out
}

/** Content-stable IDs: slug-based ids stay bound to the topic text. */
function customTopicSubOption(label: string, usedIds: Set<string>): SubOption {
  const slug =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "topic"
  let id = `custom_topic_${slug}`
  let n = 2
  while (usedIds.has(id)) id = `custom_topic_${slug}-${n++}`
  usedIds.add(id)
  return {
    id,
    label,
    keywords: label.toLowerCase().split(/\s+/).filter(Boolean),
  }
}

export interface MCQConfig {
  /** Category IDs the owner enabled. Empty/undefined = industry defaults. */
  enabledCategoryIds?: string[] | null
  /** Owner-defined extra options (e.g. "Jain options", "Parking"). */
  customTopics?: string[] | null
  /** Used to infer a bar programme for restaurants. */
  businessName?: string | null
  /** Signature items also help infer the restaurant format. */
  promptTopics?: string[] | null
}

/**
 * Builds the option list shown to a customer for one particular business:
 *  1. the industry taxonomy, narrowed to the categories this owner enabled;
 *  2. the owner's custom topics, appended as a final category.
 *
 * Generic signature items are never treated as question categories, and
 * custom topics never leak into the dish chips.
 */
export function getMCQCategories(industry: string, config: MCQConfig = {}): Category[] {
  const base = getCategoriesForIndustry(industry)
  const effectiveIds = getEffectiveCategoryIds(industry, config.enabledCategoryIds, {
    name: config.businessName,
    promptTopics: config.promptTopics,
  })
  const visible = base.filter((category) => effectiveIds.includes(category.id))
  // Never return an empty questionnaire, even if an old config is stale.
  const categories = visible.length > 0 ? visible : base

  const existingLabels = new Set(
    categories.flatMap((category) => [
      category.label.toLowerCase(),
      ...category.subOptions.map((sub) => sub.label.toLowerCase()),
    ]),
  )
  const usedIds = new Set(base.flatMap((category) => category.subOptions.map((sub) => sub.id)))
  const seenLabels = new Set<string>()
  const custom: SubOption[] = []

  for (const raw of config.customTopics || []) {
    if (typeof raw !== "string") continue
    const label = raw.trim().replace(/\s+/g, " ")
    if (label.length < 2 || label.length > 80) continue
    const key = label.toLowerCase()
    if (existingLabels.has(key) || seenLabels.has(key) || isPersonLikePrompt(label)) continue
    seenLabels.add(key)
    custom.push(customTopicSubOption(label, usedIds))
    if (custom.length >= 20) break
  }

  if (custom.length === 0) return categories

  return [
    ...categories,
    {
      id: "custom_topics",
      label: "Also worth mentioning",
      icon: "Sparkles",
      subOptions: custom,
    },
  ]
}

export function getAllSubOptionIds(industry: string): string[] {
  return getCategoriesForIndustry(industry).flatMap((c) => c.subOptions.map((s) => s.id))
}

export function getSubOptionsByIds(industry: string, ids: string[]): SubOption[] {
  return getCategoriesForIndustry(industry).flatMap((c) => c.subOptions).filter((s) => ids.includes(s.id))
}

export function flattenCategoryLabels(industry: string, selectedSubOptionIds: string[]): string[] {
  const allSubOptions = getCategoriesForIndustry(industry).flatMap((c) => c.subOptions)
  return selectedSubOptionIds.map((id) => allSubOptions.find((s) => s.id === id)?.label || id)
}

/**
 * Returns a short, comma-separated example string of custom review topics
 * appropriate for the given industry. Used in settings-form & onboarding
 * placeholder text so it always feels relevant rather than restaurant-centric.
 */
export function getCustomTopicExampleForIndustry(industry: string): string {
  const norm = normalizeIndustry(industry)
  switch (norm) {
    case "RESTAURANT":
      return '"Jain options", "Parking", "Rooftop seating"'
    case "CAFE":
      return '"Vegan milk", "Outdoor seating", "Board games"'
    case "BAKERY":
      return '"Eggless options", "Custom cake orders", "Gift wrapping"'
    case "QUICK_SERVICE":
      return '"Combo deals", "Jain options", "Drive-through"'
    case "HOTEL":
      return '"Early check-in", "Airport transfer", "Pool access"'
    case "DENTAL":
      return '"Child-friendly dentist", "Same-day appointments", "Sedation available"'
    case "MEDICAL":
      return '"Home visits", "Lab tests on-site", "Insurance accepted"'
    case "SALON":
      return '"Bridal packages", "Male grooming", "Home service"'
    case "FITNESS":
      return '"Personal training", "Zumba class", "Steam room"'
    case "AUTO":
      return '"Pickup & drop", "Weekend availability", "Free diagnostics"'
    case "AUTO_DEALER":
      return '"EMI options", "Exchange offer", "Free test drive"'
    case "ELECTRONICS":
      return '"EMI available", "Home demo", "Genuine warranty"'
    case "ELECTRONICS_REPAIR":
      return '"Same-day repair", "Data recovery", "Home pickup"'
    case "ELECTRICAL":
      return '"24/7 emergency", "AMC contracts", "Free estimate"'
    case "ELECTRICAL_RETAIL":
      return '"Bulk pricing", "Delivery available", "Project supply"'
    case "HOME_SERVICES":
      return '"Weekend slots", "Eco-friendly products", "Free estimate"'
    case "RETAIL":
      return '"Alteration service", "Gift wrapping", "Loyalty card"'
    case "EDUCATION":
      return '"Doubt sessions", "Online classes", "Scholarship available"'
    case "PET_CARE":
      return '"Emergency care", "Home grooming", "Pet boarding"'
    case "REAL_ESTATE":
      return '"Virtual tour", "Legal assistance", "Home loan tie-up"'
    case "PROFESSIONAL_SERVICES":
      return '"Free consultation", "Online calls", "Weekend availability"'
    default:
      return '"Parking", "Weekend hours", "Appointment booking"'
  }
}

export function getSignatureItemsLabel(industry: string): string {
  const norm = normalizeIndustry(industry)
  switch (norm) {
    case "RESTAURANT":
      return "Dishes you tried or loved:"
    case "CAFE":
      return "Drinks or food you ordered:"
    case "BAKERY":
      return "Bakes or custom orders you tried:"
    case "QUICK_SERVICE":
      return "Items you ordered:"
    case "HOTEL":
      return "Room, amenities, or services you used:"
    case "DENTAL":
      return "Treatments or procedures received:"
    case "SALON":
      return "Services or styling you had:"
    case "FITNESS":
      return "Workouts, classes, or amenities used:"
    case "AUTO":
      return "Repairs or services done:"
    case "AUTO_DEALER":
      return "Vehicles or models you explored:"
    case "MEDICAL":
      return "Consultations or care received:"
    case "ELECTRONICS":
      return "Products you checked:"
    case "ELECTRONICS_REPAIR":
      return "Devices repaired or checked:"
    case "ELECTRICAL":
      return "Electrical work completed:"
    case "ELECTRICAL_RETAIL":
      return "Products or materials you bought:"
    case "HOME_SERVICES":
      return "Services or repairs completed:"
    case "RETAIL":
      return "Products you bought or checked:"
    case "EDUCATION":
      return "Classes, activities, or facilities used:"
    case "PET_CARE":
      return "Services or care your pet received:"
    case "REAL_ESTATE":
      return "Property or transaction you worked on:"
    case "PROFESSIONAL_SERVICES":
      return "Services or projects completed:"
    default:
      return "Services or highlights experienced:"
  }
}

export function getSpecialMentionPlaceholder(industry: string, moodKey: "positive" | "neutral" | "negative"): string {
  const norm = normalizeIndustry(industry)
  if (moodKey === "positive") {
    switch (norm) {
      case "RESTAURANT":
        return "Any specific moments, dishes, or staff that made it great..."
      case "CAFE":
        return "Any specific drinks, food, or space that made it great..."
      case "BAKERY":
        return "Any specific bakes, custom order, or service that made it great..."
      case "QUICK_SERVICE":
        return "Any specific items, speed, or packaging that made it great..."
      case "HOTEL":
        return "Any specific room, staff, or facility that made it great..."
      case "DENTAL":
      case "MEDICAL":
        return "Any specific doctors, treatments, or comfort highlights..."
      case "SALON":
        return "Any specific stylists, services, or atmosphere highlights..."
      case "AUTO":
        return "Any specific advisors, repairs, or service details..."
      case "AUTO_DEALER":
        return "Any specific advisors, vehicles, or delivery details..."
      case "ELECTRONICS":
      case "ELECTRICAL_RETAIL":
      case "RETAIL":
        return "Any specific products, advice, or staff that made it great..."
      case "ELECTRONICS_REPAIR":
        return "Any specific repair, update, or staff that made it great..."
      case "ELECTRICAL":
        return "Any specific work, safety detail, or electrician that made it great..."
      case "FITNESS":
        return "Any specific trainers, workouts, or equipment highlights..."
      case "EDUCATION":
        return "Any specific teachers, classes, or facilities that made it great..."
      case "PET_CARE":
        return "Any specific care, staff, or facility that made it great..."
      case "REAL_ESTATE":
        return "Any specific guidance, property, or process details..."
      case "PROFESSIONAL_SERVICES":
        return "Any specific advice, project, or outcome details..."
      default:
        return "Any specific moments, staff, or services that made it great..."
    }
  } else if (moodKey === "neutral") {
    return "What could have been better or what stood out?"
  } else {
    return "What went wrong? Tell us what happened so we can make it right..."
  }
}
