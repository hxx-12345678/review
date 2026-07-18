const DEV_EMAIL = "cptjacksprw@gmail.com"

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
  if (!userEmail) return false
  return userEmail.toLowerCase() === DEV_EMAIL.toLowerCase()
}
