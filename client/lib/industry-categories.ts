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
  | "DENTAL"
  | "SALON"
  | "MEDICAL"
  | "AUTO"
  | "FITNESS"
  | "GYM"
  | "HOME_SERVICES"
  | "OTHER"

export function normalizeIndustry(industry: string): IndustryKey {
  const upper = industry.toUpperCase().trim()
  const valid: IndustryKey[] = ["RESTAURANT", "DENTAL", "SALON", "MEDICAL", "AUTO", "FITNESS", "GYM", "HOME_SERVICES", "OTHER"]
  if (valid.includes(upper as IndustryKey)) return upper as IndustryKey
  if (upper === "CLINIC") return "MEDICAL"
  return "OTHER"
}

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
        { id: "dent_dentist", label: "Dentist", keywords: ["dentist", "doctor", "dr.", "specialist"] },
        { id: "dent_hygienist", label: "Hygienist", keywords: ["hygienist", "cleaning", "teeth cleaning"] },
        { id: "dent_front_desk", label: "Front Desk", keywords: ["front desk", "reception", "scheduler", "admin"] },
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
      label: "Stylist / Technician",
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
        { id: "med_doctor", label: "Doctor / Nurse", keywords: ["doctor", "nurse", "physician", "specialist"] },
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
        { id: "med_front_desk", label: "Front Desk", keywords: ["front desk", "reception", "check-in"] },
        { id: "med_support", label: "Support Staff", keywords: ["staff", "assistant", "team", "helper"] },
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
        { id: "auto_technician", label: "Technician", keywords: ["technician", "mechanic", "tech", "expert"] },
        { id: "auto_honesty", label: "Honesty", keywords: ["honest", "trustworthy", "trust", "integrity"] },
        { id: "auto_front_desk", label: "Front Desk", keywords: ["front desk", "service advisor", "manager"] },
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
        { id: "fit_instructor", label: "Instructor", keywords: ["instructor", "trainer", "coach", "teacher"] },
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
        { id: "fit_trainers", label: "Trainers", keywords: ["trainer", "coach", "personal trainer"] },
        { id: "fit_front_desk", label: "Front Desk", keywords: ["front desk", "check-in", "staff"] },
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

  // GYM mirrors FITNESS but with slightly different focus
  GYM: [
    {
      id: "equipment",
      label: "Equipment",
      icon: "Dumbbell",
      subOptions: [
        { id: "gym_availability", label: "Availability", keywords: ["available", "crowded", "busy", "wait"] },
        { id: "gym_condition", label: "Condition", keywords: ["condition", "maintained", "broken", "working"] },
        { id: "gym_variety", label: "Variety", keywords: ["variety", "range", "selection", "options"] },
      ],
    },
    {
      id: "classes",
      label: "Classes",
      icon: "Users",
      subOptions: [
        { id: "gym_instructor", label: "Instructor", keywords: ["instructor", "trainer", "coach", "teacher"] },
        { id: "gym_schedule", label: "Schedule", keywords: ["schedule", "timing", "time slot"] },
      ],
    },
    {
      id: "cleanliness",
      label: "Cleanliness",
      icon: "Sparkles",
      subOptions: [
        { id: "gym_clean", label: "Gym Floor", keywords: ["clean", "wipes", "equipment clean"] },
        { id: "gym_locker", label: "Locker Rooms", keywords: ["locker", "shower", "changing"] },
      ],
    },
    {
      id: "staff",
      label: "Staff",
      icon: "UserCheck",
      subOptions: [
        { id: "gym_staff", label: "Staff", keywords: ["staff", "trainer", "front desk"] },
        { id: "gym_knowledge", label: "Knowledge", keywords: ["knowledgeable", "helpful"] },
      ],
    },
    {
      id: "value",
      label: "Value",
      icon: "SmilePlus",
      subOptions: [
        { id: "gym_pricing", label: "Membership Pricing", keywords: ["membership", "price", "fee", "cost"] },
        { id: "gym_amenities", label: "Amenities", keywords: ["amenities", "sauna", "pool", "towels"] },
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
        { id: "home_technician", label: "Technician", keywords: ["technician", "worker", "pro", "contractor"] },
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
