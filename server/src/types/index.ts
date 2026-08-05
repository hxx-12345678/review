export const INDUSTRIES = [
  "DENTAL",
  "MEDICAL",
  "SALON",
  "GYM",
  "HOME_SERVICES",
  "RESTAURANT",
  "AUTO",
  "AUTO_DEALER",
  "FITNESS",
  "ELECTRONICS",
  "OTHER",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export function isValidIndustry(value: string): value is Industry {
  return INDUSTRIES.includes(value as Industry);
}
