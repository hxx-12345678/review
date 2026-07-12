// The secret admin path prefix — matches the directory name in app/
// In dev: NEXT_PUBLIC_ADMIN_PATH is set in .env.local
// In prod: set via Vercel/your hosting env vars
export const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_PATH || "d1ff499050"
