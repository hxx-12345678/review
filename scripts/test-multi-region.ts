import { normalizePhoneNumber, cleanPhoneNumber } from "../server/src/utils/phone";
import { buildFallbackReview } from "../server/src/utils/gemini";
import { formatCurrency } from "../client/lib/format";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${msg}`);
    failed++;
  }
}

console.log("=== 1. Phone Normalization (US vs IN) ===");

// US number with formatting
const us1 = normalizePhoneNumber("(512) 555-0199", "US");
assert(us1.country === "US", "US phone country is US");
assert(us1.digits === "15125550199", "US phone digits = 15125550199 (no 91 prepended)");
assert(us1.e164 === "+15125550199", "US phone e164 = +15125550199");
assert(us1.isValid === true, "US phone isValid = true");

// US number 11 digits starting with 1
const us2 = normalizePhoneNumber("1-212-555-0123");
assert(us2.country === "US", "US 11-digit auto-detected as US");
assert(us2.digits === "12125550123", "US 11-digit digits = 12125550123");
assert(us2.e164 === "+12125550123", "US 11-digit e164 = +12125550123");

// US number starting with 2-5 without explicit country
const us3 = normalizePhoneNumber("2125550144");
assert(us3.country === "US", "10-digit starting with 2 auto-detected as US (NANP)");
assert(us3.digits === "12125550144", "10-digit starting with 2 digits = 12125550144");

// Indian number 10 digits
const in1 = normalizePhoneNumber("9876543210", "IN");
assert(in1.country === "IN", "IN phone country is IN");
assert(in1.digits === "919876543210", "IN phone digits = 919876543210");
assert(in1.e164 === "+919876543210", "IN phone e164 = +919876543210");
assert(in1.isValid === true, "IN phone isValid = true");

// Indian number with 0 prefix
const in2 = normalizePhoneNumber("09876543210");
assert(in2.country === "IN", "IN 0-prefix detected as IN");
assert(in2.digits === "919876543210", "IN 0-prefix trimmed and prepended with 91");

// Indian number with 91 prefix
const in3 = normalizePhoneNumber("+91 98765 43210");
assert(in3.country === "IN", "IN +91 detected as IN");
assert(in3.digits === "919876543210", "IN +91 digits = 919876543210");

console.log("\n=== 2. Spanish (es-US) Review Generation ===");

const spanishReview = buildFallbackReview({
  businessName: "El Sol Mexican Grill",
  rating: 5,
  talkingPoints: ["deliciosos tacos al pastor", "excelente atención"],
  language: "spanish",
});

assert(spanishReview.includes("El Sol Mexican Grill"), "Spanish review includes business name");
assert(spanishReview.includes("Quería compartir mi experiencia"), "Spanish review starts with authentic Spanish opening");
assert(spanishReview.includes("deliciosos tacos al pastor"), "Spanish review weaves customer talking points");
assert(spanishReview.includes("muy satisfecho"), "Spanish review has positive closing for rating 5");

const spanishNegReview = buildFallbackReview({
  businessName: "Tacos & Co",
  rating: 2,
  highlights: "la comida llegó fría",
  language: "spanish",
});
assert(spanishNegReview.includes("necesita mejoras"), "Spanish review has constructive closing for rating 2");

console.log("\n=== 3. Currency Formatting ===");

assert(formatCurrency(0, "USD") === "Free", "USD 0 cents is Free");
assert(formatCurrency(2900, "USD") === "$29", "USD 2900 cents formats as $29");
assert(formatCurrency(24900, "USD") === "$249", "USD 24900 cents formats as $249");
assert(formatCurrency(24900, "INR") === "₹249", "INR 24900 paise formats as ₹249");
assert(formatCurrency(199900, "INR") === "₹1,999", "INR 199900 paise formats as ₹1,999");

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All multi-region tests passed successfully!");
}
