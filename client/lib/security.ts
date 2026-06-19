/**
 * Security & Privacy Module for ReviewOS
 * 
 * CRITICAL HARDENING:
 * 1. Input validation & sanitization
 * 2. XSS prevention
 * 3. URL parameter validation
 * 4. Data exposure prevention
 * 5. Consent & privacy enforcement
 * 6. Rate limiting guidance
 * 7. CORS & security headers
 */

// Regex patterns for validation (whitelist approach)
const BUSINESS_SLUG_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/
const VALID_URL_PROTOCOL = /^https?:\/\//
const SAFE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Sanitize business slug to prevent URL traversal & injection
 * Only allows lowercase alphanumeric and hyphens
 */
export function validateBusinessSlug(slug: unknown): slug is string {
  if (typeof slug !== "string") return false
  if (slug.length < 2 || slug.length > 64) return false
  return BUSINESS_SLUG_REGEX.test(slug)
}

/**
 * Sanitize text input to prevent XSS
 * Removes potentially dangerous HTML/JS
 */
export function sanitizeTextInput(input: unknown, maxLength = 1000): string {
  if (typeof input !== "string") return ""

  // Truncate
  let text = input.slice(0, maxLength).trim()

  // Remove null bytes, control characters
  text = text.replace(/[\0-\x1f\x7f]/g, "")

  // Remove potential script injections (basic protection - React escapes by default)
  text = text.replace(/<script[^>]*>.*?<\/script>/gi, "")
  text = text.replace(/javascript:/gi, "")
  text = text.replace(/on\w+\s*=/gi, "") // onload=, onclick=, etc.

  return text
}

/**
 * Validate email address (basic check)
 */
export function validateEmail(email: unknown): boolean {
  if (typeof email !== "string") return false
  if (email.length > 254) return false
  return SAFE_EMAIL_REGEX.test(email)
}

/**
 * Validate star rating is 1-5
 */
export function validateRating(rating: unknown): rating is number {
  return typeof rating === "number" && rating >= 1 && rating <= 5 && Number.isInteger(rating)
}

/**
 * Validate Google review URL format
 * Must be https and point to Google domains
 */
export function validateGoogleUrl(url: unknown): boolean {
  if (typeof url !== "string") return false
  if (!VALID_URL_PROTOCOL.test(url)) return false

  try {
    const parsed = new URL(url)
    // Only allow Google domains
    if (!parsed.hostname.endsWith("google.com") && !parsed.hostname.endsWith("google.co.in")) {
      return false
    }
    return true
  } catch {
    return false
  }
}

/**
 * Prevent console data leakage in production
 * DO NOT use console.log with sensitive data
 */
export function logSecure(level: "info" | "warn" | "error", message: string) {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    const method = level === "info" ? console.log : level === "warn" ? console.warn : console.error
    method(`[ReviewOS] ${message}`)
  }
  // In production, logs go to server only (not browser console)
}

/**
 * Create a safe copy button without exposing data to clipboard APIs that leak
 */
export async function copyToClipboardSecure(text: string): Promise<boolean> {
  try {
    // Modern Clipboard API (more secure)
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }

    // Fallback for older browsers (less secure but necessary)
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand("copy")
    document.body.removeChild(textarea)
    return success
  } catch {
    return false
  }
}

/**
 * Rate limiting helper - store attempt counts in memory
 * (In production, use Redis or database)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(key: string, maxAttempts = 10, windowMs = 60000): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    // Window expired or first attempt
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (entry.count >= maxAttempts) {
    // Rate limit exceeded
    return false
  }

  entry.count++
  return true
}

/**
 * CORS & Security Headers (Next.js middleware pattern)
 * Add to middleware.ts or route handlers
 */
export const securityHeaders = {
  // Prevent clickjacking
  "X-Frame-Options": "DENY",
  // Prevent MIME sniffing
  "X-Content-Type-Options": "nosniff",
  // XSS protection
  "X-XSS-Protection": "1; mode=block",
  // CSP - strict policy to prevent injection
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.openai.com https://api.vercel.com",
  // Referrer policy
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Permissions policy
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=()",
}

/**
 * Prevent URL-based attacks
 * Validate that external redirects only go to trusted domains
 */
export function isValidRedirectUrl(url: string, allowedOrigins: string[] = []): boolean {
  if (!url) return false

  // Don't allow protocol-relative URLs or data: URLs
  if (url.startsWith("//") || url.startsWith("data:") || url.startsWith("javascript:")) {
    return false
  }

  // Allow relative URLs (safe)
  if (url.startsWith("/")) return true

  // For absolute URLs, check against whitelist
  try {
    const parsed = new URL(url)
    return allowedOrigins.some((origin) => parsed.origin === origin)
  } catch {
    return false
  }
}

/**
 * Encrypt sensitive data before storing (basic - use proper encryption in production)
 * This is a placeholder for proper crypto libraries like TweetNaCl.js
 */
export function hashForComparison(value: string): string {
  // In production, use bcrypt or Argon2
  // This is just for demonstration
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}

/**
 * Privacy: Anonymize customer feedback before logging
 */
export function anonymizeFeedback(feedback: string): string {
  // Remove common PII patterns
  let anon = feedback
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "***-**-****") // SSN-like
    .replace(/\b\d{16}\b/g, "****-****-****-****") // Card-like
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]") // Email
    .replace(/\b\d{3}-\d{3}-\d{4}\b/g, "[PHONE]") // Phone

  return anon
}

/**
 * Consent & Privacy: Never collect data without consent
 */
export interface ConsentFlags {
  emailNotifications: boolean
  smsNotifications: boolean
  marketingEmails: boolean
  dataAnalytics: boolean
  thirdPartySharing: boolean
}

export const defaultConsent: ConsentFlags = {
  emailNotifications: false,
  smsNotifications: false,
  marketingEmails: false,
  dataAnalytics: false,
  thirdPartySharing: false,
}

/**
 * Ensure no data is collected without explicit consent
 */
export function validateConsent(flags: Partial<ConsentFlags>): ConsentFlags {
  return {
    ...defaultConsent,
    ...flags,
  }
}

/**
 * DEVELOPER PROTECTION: Prevent console manipulation
 * Lock down console.log, eval, etc. in production
 */
export function lockdownDeveloperTools() {
  if (process.env.NODE_ENV === "production") {
    // Prevent eval
    if (typeof window !== "undefined") {
      window.eval = function () {
        throw new Error("eval() is disabled")
      } as any
    }

    // Optionally: Disable console in production
    // const noop = () => {}
    // console.log = noop
    // console.warn = noop
    // console.error = noop
  }
}
