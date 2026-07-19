import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

// Find install button in the laptop/desktop navbar (header)
const desktopBtn = page.getByRole("banner").getByRole("button", { name: "Install app" });
console.log("Desktop install button visible:", await desktopBtn.isVisible());
await desktopBtn.click();
await page.waitForTimeout(1500);

// Check if the modal appeared
const pageContent = await page.content();
const hasModal = pageContent.includes("Install BEYONDVYU");
const hasHomeScreen = pageContent.includes("Add to your home screen");
console.log("Modal 'Install BEYONDVYU' found in DOM:", hasModal);
console.log("'Add to your home screen' found in DOM:", hasHomeScreen);

// Check for the portal content on document.body
const modalHeading = page.locator("h3:has-text('Install BEYONDVYU')");
console.log("Modal heading visible:", await modalHeading.isVisible().catch(() => false));

const subtitleText = page.locator("text=Add to your home screen");
console.log("Modal subtitle visible:", await subtitleText.isVisible().catch(() => false));

await browser.close();
