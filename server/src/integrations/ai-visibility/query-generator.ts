import { Industry } from "@prisma/client";

const QUERIES: Record<string, string[]> = {
  DENTAL: [
    "Best dentist for implants in {city}",
    "Best affordable dentist in {city}",
    "Dentist for anxious patients {city}",
    "Emergency dentist near me {city}",
    "Dentist for kids {city}",
    "Invisalign specialist {city}",
    "Root canal dentist {city} reviews",
    "Dental clinic open Sunday {city}",
  ],
  RESTAURANT: [
    "Best family restaurant in {city}",
    "Best vegetarian restaurant {city}",
    "Best restaurant for date night {city}",
    "Best restaurant under \u20B92,000 {city}",
    "Family-friendly restaurant with Jain options {city}",
    "Restaurant with parking {city}",
    "Late night restaurant {city}",
    "Romantic dinner {city}",
  ],
  SALON: [
    "Best hair salon {city}",
    "Affordable salon {city}",
    "Salon for bridal makeup {city}",
    "Best unisex salon {city}",
    "Salon with online booking {city}",
    "Top rated salon {city} reviews",
  ],
  MEDICAL: [
    "Best clinic {city}",
    "Doctor near me {city}",
    "Affordable clinic {city}",
    "Clinic open now {city}",
  ],
  HOME_SERVICES: [
    "Emergency plumber {city}",
    "24 hour plumber {city}",
    "Best plumber {city} reviews",
    "Plumber for leakage {city}",
  ],
  GYM: [
    "Best gym {city}",
    "Gym with personal trainer {city}",
    "Affordable gym {city}",
    "Gym open 24 hours {city}",
  ],
  FITNESS: [
    "Best gym {city}",
    "Fitness center {city}",
    "Personal trainer {city}",
  ],
  AUTO: [
    "Best garage {city}",
    "Car service center {city}",
    "Auto repair {city}",
  ],
  OTHER: [
    "Best {name} in {city}",
    "{name} {city} reviews",
    "{name} near me {city}",
  ],
};

export function generateQueries(industry: string, city: string, businessName?: string, limit = 8): string[] {
  const key = industry in QUERIES ? industry : "OTHER";
  let templates = [...(QUERIES[key] || QUERIES.OTHER)];
  const resolvedCity = city?.trim() || "near me";
  const name = businessName || "";
  const out = templates.slice(0, limit).map((t) => t.replace("{city}", resolvedCity).replace("{name}", name));
  // Pad to exactly limit so every industry works for every query slot — general, no 4-query ceiling
  const padTemplates = [
    `Best ${industry.toLowerCase()} in {city} reviews`,
    `Affordable ${industry.toLowerCase()} {city}`,
    `${industry.toLowerCase()} open now {city}`,
    `Top rated ${industry.toLowerCase()} {city}`,
    `Best ${industry.toLowerCase()} near me {city}`,
  ];
  let p = 0;
  while (out.length < limit) {
    const t = padTemplates[p % padTemplates.length].replace("{city}", resolvedCity);
    if (!out.includes(t)) out.push(t);
    p++;
    if (p > 20) break; // safety
  }
  return out.slice(0, limit);
}
