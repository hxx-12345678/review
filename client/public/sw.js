const CACHE = "beyondvyu-v2"
const STATIC_ASSETS = [
  "/",
  "/offline",
  "/manifest.json",
  "/icon.svg",
  "/icon-light-32x32.png",
  "/icon-dark-32x32.png",
  "/apple-icon.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      const results = await Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch(() => {
            console.warn("SW: failed to cache", url)
          }),
        ),
      )
      const failed = results.filter((r) => r.status === "rejected").length
      if (failed > 0) console.warn("SW: skipped", failed, "assets")
    }),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    })
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== "GET") return

  if (request.headers.get("Accept")?.includes("text/html")) {
    event.respondWith(networkFirstWithFallback(request, "/offline"))
    return
  }

  if (url.href.includes("/api/")) {
    event.respondWith(networkThenCache(request))
    return
  }

  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/fonts/") ||
      url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|css|js)$/))
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  event.respondWith(networkFirstWithFallback(request, "/offline"))
})

async function networkFirstWithFallback(request, fallbackUrl) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE)
      cache.put(request, response.clone())
      return response
    }
    throw new Error("Network response not ok")
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return caches.match(fallbackUrl)
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response("", { status: 408, statusText: "Offline" })
  }
}

async function networkThenCache(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const clone = response.clone()
      const cache = await caches.open(CACHE)
      cache.put(request, clone)
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }
}
