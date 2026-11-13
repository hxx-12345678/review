/**
 * Universal Phone Number Normalizer for BeyondVyu (supporting India & US).
 * 
 * Rules:
 * 1. Clean digits by stripping non-numeric characters.
 * 2. If cleaned is 11 digits and starts with "1", it's a US number: e164 = "+1...", digits = "1...".
 * 3. If cleaned is 12 digits and starts with "91", it's an Indian number: e164 = "+91...", digits = "91...".
 * 4. If cleaned is 11 digits and starts with "0":
 *    - In India, leading 0 is standard trunk prefix for 10-digit mobile (e.g., 09876543210 -> 919876543210).
 * 5. If cleaned is 10 digits:
 *    - If defaultCountry is "US" OR if first digit is 2-5 (US NANP area code, impossible in India where mobile is 6-9):
 *      -> US number: digits = `1${cleaned}`, e164 = `+1${cleaned}`
 *    - Otherwise (defaultCountry is "IN" and mobile starts with 6-9):
 *      -> India number: digits = `91${cleaned}`, e164 = `+91${cleaned}`
 * 
 * Never prepends 91 to US numbers!
 */

export interface NormalizedPhone {
  raw: string;
  cleaned: string;
  country: "US" | "IN" | "UNKNOWN";
  digits: string; // e.g. "15125550199" or "919876543210" without plus
  e164: string;   // e.g. "+15125550199" or "+919876543210"
  isValid: boolean;
}

export function normalizePhoneNumber(
  raw: string,
  defaultCountry: "IN" | "US" = "IN"
): NormalizedPhone {
  if (!raw) {
    return { raw: "", cleaned: "", country: "UNKNOWN", digits: "", e164: "", isValid: false };
  }

  const cleaned = raw.replace(/\D/g, "");

  // 1. Explicit US / NANP: 11 digits starting with 1
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    const areaCodeFirstDigit = cleaned[1];
    const isValidNanp = /^[2-9]/.test(areaCodeFirstDigit);
    return {
      raw,
      cleaned,
      country: "US",
      digits: cleaned,
      e164: `+${cleaned}`,
      isValid: isValidNanp,
    };
  }

  // 2. Explicit India: 12 digits starting with 91
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    const mobileFirstDigit = cleaned[2];
    const isValidIndianMobile = /^[6-9]/.test(mobileFirstDigit);
    return {
      raw,
      cleaned,
      country: "IN",
      digits: cleaned,
      e164: `+${cleaned}`,
      isValid: isValidIndianMobile,
    };
  }

  // 3. India trunk prefix: 11 digits starting with 0 followed by [6-9]
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    const sliced = cleaned.slice(1);
    if (/^[6-9]/.test(sliced[0])) {
      return {
        raw,
        cleaned,
        country: "IN",
        digits: `91${sliced}`,
        e164: `+91${sliced}`,
        isValid: true,
      };
    }
  }

  // 4. Standard 10-digit number
  if (cleaned.length === 10) {
    const firstDigit = cleaned[0];

    // In India, mobile numbers strictly start with 6, 7, 8, or 9.
    // Numbers starting with 2, 3, 4, 5 in India are landlines or invalid mobile.
    // In US / NANP, area codes start with 2 through 9.
    // If defaultCountry is US, OR if firstDigit is [2-5], it is a US number.
    const isLikelyUS = defaultCountry === "US" || /^[2-5]/.test(firstDigit);

    if (isLikelyUS) {
      const isValidNanp = /^[2-9]/.test(firstDigit);
      return {
        raw,
        cleaned,
        country: "US",
        digits: `1${cleaned}`,
        e164: `+1${cleaned}`,
        isValid: isValidNanp,
      };
    } else {
      // Indian mobile (starts with 6-9)
      const isValidIndian = /^[6-9]/.test(firstDigit);
      return {
        raw,
        cleaned,
        country: "IN",
        digits: `91${cleaned}`,
        e164: `+91${cleaned}`,
        isValid: isValidIndian,
      };
    }
  }

  // Unrecognized format
  return {
    raw,
    cleaned,
    country: "UNKNOWN",
    digits: cleaned,
    e164: cleaned ? `+${cleaned}` : "",
    isValid: false,
  };
}

/** Convenience helper returning the dialing string (without +) */
export function cleanPhoneNumber(raw: string, defaultCountry: "IN" | "US" = "IN"): string {
  return normalizePhoneNumber(raw, defaultCountry).digits;
}
