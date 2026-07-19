const { chromium } = require("playwright")
const fs = require("fs")
const path = require("path")

const TEST_SITES = [
  { name: "PWAmp (Microsoft demo)", url: "https://microsoftedge.github.io/Demos/pwamp/" },
  { name: "Production Vercel Site", url: "https://review-nine-inky.vercel.app/" },
]

async function testSite(name, url, browserType) {
  const userDataDir = path.join(__dirname, "tmp-profile-" + name.replace(/[^a-z0-9]/gi, "_"))
  if (fs.existsSync(userDataDir)) fs.rmSync(userDataDir, { recursive: true, force: true })

  const context = await browserType.launchPersistentContext(userDataDir, {
    headless: false, // must be headed for BIP to work
    args: ["--no-sandbox"],
  })
  const page = context.pages()[0] || await context.newPage()

  // Aggressive BIP capture
  await page.addInitScript(() => {
    window.__bipData = { captured: false, count: 0, events: [] }
    const orig = EventTarget.prototype.addEventListener
    EventTarget.prototype.addEventListener = function(type, fn, opts) {
      if (type === "beforeinstallprompt" || type === "appinstalled") {
        window.__bipData.events.push("listener:" + type)
      }
      return orig.call(this, type, fn, opts)
    }
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault()
      window.__bipData.captured = true
      window.__bipData.count++
      window.__bipData.source = "initScript"
      window.__bipData.time = Date.now()
      window.__bipData.eventType = e.type
      window.__bipData.hasPrompt = typeof e.prompt
    }, true)
  })

  console.log(`\n=== Testing: ${name} ===`)
  console.log(`URL: ${url}`)

  try {
    await page.goto(url, { waitUntil: "networkidle0", timeout: 20000 })
    console.log("Page loaded")
  } catch (e) {
    console.log("Navigation timeout (might be slow), continuing...")
  }

  await page.waitForTimeout(3000)

  // Check BIP status immediately
  let data = await page.evaluate(() => window.__bipData)
  console.log("BIP after load:", JSON.stringify(data))

  // Click and wait
  await page.mouse.click(400, 350).catch(() => {})
  await page.waitForTimeout(5000)

  data = await page.evaluate(() => window.__bipData)
  console.log("BIP after click+5s:", JSON.stringify(data))

  // Check installability via CDP
  try {
    const cdp = await context.newCDPSession(page)
    const errs = await cdp.send("Page.getInstallabilityErrors")
    console.log("Installability errors:", errs.installabilityErrors?.length || 0)
    if (errs.installabilityErrors?.length > 0) {
      for (const e of errs.installabilityErrors) {
        console.log("  ERROR:", e.errorId)
      }
    }
  } catch (e) {
    console.log("CDP error:", e.message)
  }

  // Check SW
  const sw = await page.evaluate(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/")
      return {
        registered: !!reg,
        active: reg?.active?.state,
        scope: reg?.scope,
      }
    } catch { return {} }
  })
  console.log("SW:", JSON.stringify(sw))

  // Second visit (engagement)
  console.log("Second visit...")
  try {
    await page.goto(url, { waitUntil: "networkidle0", timeout: 20000 })
  } catch {}
  await page.waitForTimeout(2000)
  await page.mouse.click(400, 350).catch(() => {})
  await page.waitForTimeout(10000)

  data = await page.evaluate(() => window.__bipData)
  console.log("BIP after 2nd visit+10s:", JSON.stringify(data))

  await context.close()
  if (fs.existsSync(userDataDir)) fs.rmSync(userDataDir, { recursive: true, force: true })
}

async function main() {
  for (const site of TEST_SITES) {
    await testSite(site.name, site.url, chromium)
  }
  console.log("\n=== ALL DONE ===")
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1) })
