import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-XSS-Protection", "1; mode=block")

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
  const apiOrigin = new URL(apiUrl).origin
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // connect.facebook.net is required by Meta Embedded Signup (FB.init/FB.login).
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://connect.facebook.net https://static.cloudflareinsights.com https://*.razorpay.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://*.razorpay.com",
      // The SDK reaches Graph API and facebook.com during signup/session checks.
      `connect-src 'self' ${apiOrigin} https://api.openai.com https://connect.facebook.net https://graph.facebook.com https://www.facebook.com https://web.facebook.com https://static.cloudflareinsights.com https://*.razorpay.com`,
      // Embedded Signup renders in a Facebook-hosted window/iframe.
      "frame-src https://*.razorpay.com https://www.facebook.com https://web.facebook.com https://*.facebook.com",
      "form-action 'self' https://*.razorpay.com https://www.facebook.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join("; "),
  )
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=(self)")

  const origin = request.headers.get("origin")
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean) as string[]

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Access-Control-Allow-Credentials", "true")
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
  runtime: "experimental-edge",
}
