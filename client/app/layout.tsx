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
  themeColor: '#007D9C',
}

export const metadata: Metadata = {
  metadataBase: new URL("https://beyondvyu.com"),
  title: {
    default: "BEYONDVYU — Turn real customer experiences into authentic Google reviews",
    template: "%s | BEYONDVYU — Google review management platform",
  },
  description:
    "Compliant QR + link review collection across dental clinics, auto repair, salons, restaurants, and retail. AI talking points the customer owns, review velocity tracking, and zero review gating. Start free.",
  keywords: [
    "Google reviews",
    "review management software",
    "QR code customer reviews",
    "collect Google reviews",
    "Google review QR code",
    "reputation management platform",
    "customer feedback software",
    "dental review software",
    "auto repair review management",
    "restaurant Google reviews",
    "salon review management",
    "bilingual Google reviews Spanish English",
    "review velocity funnel",
    "FTC compliant review collection",
    "AEO review software",
    "local business SEO reviews",
    "how to get more Google reviews",
  ],
  authors: [{ name: "BEYONDVYU" }],
  publisher: "BEYONDVYU",
  creator: "BEYONDVYU",
  category: "business",
  classification: "Review Management Software",
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://beyondvyu.com",
    languages: {
      "en-US": "https://beyondvyu.com",
      "en-IN": "https://beyondvyu.com",
      "es-US": "https://beyondvyu.com",
      en: "https://beyondvyu.com",
    },
  },
  openGraph: {
    type: "website",
    siteName: "BEYONDVYU",
    title: "BEYONDVYU — Turn real customer experiences into authentic Google reviews",
    description:
      "Compliant QR + link review collection across all business verticals. No review gating. AI-assisted drafts the customer owns. Multi-language support and transparent pricing.",
    url: "https://beyondvyu.com",
    locale: "en_US",
    alternateLocale: ["en_IN", "es_US", "hi_IN"],
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
    title: "BEYONDVYU — Authentic Google reviews from real customer experiences",
    description:
      "Compliant QR review flow in English, Spanish, and regional languages. No gating. AI talking points and review velocity tracking. Start free.",
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
    shortcut: [{ url: '/favicon.ico' }],
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
