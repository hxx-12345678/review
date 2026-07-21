import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/lib/providers'
import { PWARegister } from '@/components/pwa-register'
import { GlobalInstallCapture } from '@/components/install-capture'
import { GlobalInstallModal } from '@/components/global-install-modal'
import { CookieConsentBanner } from '@/components/consent/cookie-consent-banner'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})
const headingFont = Plus_Jakarta_Sans({
  variable: '--font-heading',
  subsets: ['latin'],
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1e293b',
}

export const metadata: Metadata = {
  metadataBase: new URL("https://beyondvyu.com"),
  title: {
    default: "BEYONDVYU — Collect authentic Google reviews with QR codes & AI",
    template: "%s | BEYONDVYU — Google review management platform",
  },
  description:
    "Collect authentic Google reviews in 60 seconds with QR codes. AI-powered sentiment analysis, weekly WhatsApp insights, and 100% Google & FTC compliant. Trusted by 2,000+ businesses.",
  keywords: [
    "Google reviews",
    "review management",
    "QR code reviews",
    "collect Google reviews",
    "business reviews",
    "FTC compliant reviews",
    "review generation",
    "customer feedback",
    "Google review QR code",
    "review management software",
    "local business marketing",
    "online reputation management",
    "customer review platform",
    "Google review generator",
    "AEO",
    "GEO",
    "generative engine optimization",
    "answer engine optimization",
    "AI sentiment analysis",
    "WhatsApp review alerts",
    "review compliance",
    "reputation management SaaS",
    "small business review tool",
    "multi-location review management",
    "customer feedback platform",
    "automated review requests",
    "how to get more Google reviews",
    "Google review link generator",
    "business reputation tool",
  ],
  authors: [{ name: "BEYONDVYU" }],
  publisher: "BEYONDVYU",
  creator: "BEYONDVYU",
  verification: {
    google: "YOUR_GOOGLE_SEARCH_CONSOLE_VERIFICATION_CODE",
  },
  other: {
    "google-site-verification": "YOUR_GOOGLE_SEARCH_CONSOLE_VERIFICATION_CODE",
    "og:locale:alternate": "en_IN",
  },
  category: "business",
  classification: "Review Management Software",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BEYONDVYU",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "BEYONDVYU",
    title: "BEYONDVYU — Collect authentic Google reviews with QR codes & AI",
    description:
      "Collect authentic Google reviews in 60 seconds with QR codes. AI sentiment analysis, weekly WhatsApp reports, and full Google & FTC compliance. Trusted by 2,000+ businesses.",
    url: "https://beyondvyu.com",
    locale: "en_US",
    countryName: "India",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BEYONDVYU — Google review management platform for local businesses",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@beyondvyu",
    creator: "@beyondvyu",
    title: "BEYONDVYU — Collect Google reviews with QR codes & AI",
    description:
      "Collect authentic Google reviews in 60 seconds. AI sentiment analysis, weekly WhatsApp insights. Fully Google & FTC compliant.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${headingFont.variable} bg-background`}>
      <body className="font-sans antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__deferredPrompt = null;
              window.__installReady = false;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__deferredPrompt = e;
                window.__installReady = true;
              });
              window.addEventListener('appinstalled', function() {
                window.__deferredPrompt = null;
                window.__installReady = true;
              });
              if ('serviceWorker' in navigator && (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'https:')) {
                navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(function(){});
              }
            `,
          }}
        />
        <Providers>
          {children}
          <PWARegister />
          <GlobalInstallCapture />
          <GlobalInstallModal />
          <CookieConsentBanner />
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}
