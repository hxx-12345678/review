import {
  normalizeIndustry,
  getIndustryLabel,
  getCustomTopicExampleForIndustry,
  getSignatureItemsLabel,
  getSpecialMentionPlaceholder,
  getCategoriesForIndustry,
  INDUSTRY_OPTIONS,
  IndustryKey,
} from "../client/lib/industry-categories";

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

console.log("=== 1. Universal Industry Categories & Non-Food Domains ===");

// Check dental clinic
const dentalCats = getCategoriesForIndustry("DENTAL");
assert(dentalCats.length >= 4, "Dental has at least 4 category sections");
assert(dentalCats.some(c => c.id === "treatment"), "Dental includes treatment experience category");
assert(!dentalCats.some(c => c.id === "food"), "Dental strictly has NO food quality category");

// Check auto repair
const autoCats = getCategoriesForIndustry("AUTO");
assert(autoCats.length >= 4, "Auto repair has at least 4 category sections");
assert(autoCats.some(c => c.id === "work_quality" || c.id === "pricing"), "Auto repair includes work quality / pricing");
assert(!autoCats.some(c => c.id === "food"), "Auto repair strictly has NO food quality category");

// Check electronics repair
const elecRepCats = getCategoriesForIndustry("ELECTRONICS_REPAIR");
assert(elecRepCats.some(c => c.id === "repair"), "Electronics repair includes repair quality");
assert(elecRepCats.some(c => c.id === "data"), "Electronics repair includes data privacy/device safety");

// Check hotel
const hotelCats = getCategoriesForIndustry("HOTEL");
assert(hotelCats.some(c => c.id === "room"), "Hotel includes room & comfort");
assert(hotelCats.some(c => c.id === "booking"), "Hotel includes check-in/booking");

// Check cafe vs restaurant distinction
const cafeCats = getCategoriesForIndustry("CAFE");
const restCats = getCategoriesForIndustry("RESTAURANT");
assert(cafeCats.some(c => c.id === "beverages"), "Cafe has dedicated beverages category");
assert(restCats.some(c => c.id === "food"), "Restaurant has food quality category");

console.log("\n=== 2. Dynamic Placeholders & Custom Topic Examples ===");

// Verify every industry in INDUSTRY_OPTIONS has customized examples
for (const ind of INDUSTRY_OPTIONS) {
  const example = getCustomTopicExampleForIndustry(ind.value);
  assert(typeof example === "string" && example.length > 5, `Custom topic example exists for ${ind.label}`);
}

// Dental example should not mention Jain options
const dentalExample = getCustomTopicExampleForIndustry("DENTAL");
assert(!dentalExample.toLowerCase().includes("jain"), "Dental custom topics do not mention Jain options");
assert(dentalExample.toLowerCase().includes("child") || dentalExample.toLowerCase().includes("appointment"), "Dental custom topics mention clinic features");

// Auto example should not mention food
const autoExample = getCustomTopicExampleForIndustry("AUTO");
assert(!autoExample.toLowerCase().includes("jain"), "Auto repair custom topics do not mention Jain options");
assert(autoExample.toLowerCase().includes("pickup") || autoExample.toLowerCase().includes("diagnostic"), "Auto repair custom topics mention automotive features");

// Restaurant example preserves Jain options
const restExample = getCustomTopicExampleForIndustry("RESTAURANT");
assert(restExample.toLowerCase().includes("jain"), "Restaurant custom topics properly suggest Jain options");

console.log("\n=== 3. Google Reviews Status Resolution Logic ===");

// Simulate status determination
function resolveGoogleStatus(googleAccount: any, businessPlaceId?: string | null) {
  const isStub = !googleAccount || googleAccount.googleAccountId?.startsWith("places-");
  const hasToken = !!(
    googleAccount &&
    (googleAccount.tokenEncrypted || (googleAccount.accessToken && googleAccount.accessToken.length > 0))
  );
  const isOauthConnected = !isStub && hasToken;
  return {
    connected: isOauthConnected,
    oauthConnected: isOauthConnected,
    googleAccountId: isOauthConnected ? googleAccount?.googleAccountId : null,
    hasPlaceId: !!businessPlaceId,
  };
}

// Case A: Places API stub (account ID = places-cmr6892l40004uln4lv85e307, no token)
const stubAccount = {
  googleAccountId: "places-cmr6892l40004uln4lv85e307",
  accessToken: "",
  tokenEncrypted: null,
};
const stubStatus = resolveGoogleStatus(stubAccount, "ChIJN1t_tDeuEmsRUsoyG83frY4");
assert(stubStatus.connected === false, "Places stub account is NOT treated as OAuth connected");
assert(stubStatus.googleAccountId === null, "Places stub does NOT expose raw places- ID as GBP account");
assert(stubStatus.hasPlaceId === true, "Place ID remains available for Method 2 Places API");

// Case B: Real GBP OAuth connection
const realAccount = {
  googleAccountId: "locations/1234567890",
  accessToken: "ya29.mock",
  tokenEncrypted: { accessToken: { encrypted: "enc", iv: "iv", tag: "tag" } },
};
const realStatus = resolveGoogleStatus(realAccount, "ChIJN1t_tDeuEmsRUsoyG83frY4");
assert(realStatus.connected === true, "Real GBP OAuth account is correctly marked connected");
assert(realStatus.googleAccountId === "locations/1234567890", "Real GBP account ID is displayed");

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All industry and Google reviews tests passed successfully!");
}
