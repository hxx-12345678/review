// Local-only V2 preview. Never hardcode an account email in client code.
// Set NEXT_PUBLIC_V2_DEV_EMAIL in client/.env.local to opt in locally.
const DEV_EMAIL = process.env.NEXT_PUBLIC_V2_DEV_EMAIL || ""

function isLocalhost(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.includes("192.168.") ||
    window.location.hostname.includes(".local")
  )
}

export function isV2Visible(userEmail?: string | null): boolean {
  if (!isLocalhost()) return false
  if (!DEV_EMAIL) return false
  if (!userEmail) return false
  return userEmail.toLowerCase() === DEV_EMAIL.toLowerCase()
}
