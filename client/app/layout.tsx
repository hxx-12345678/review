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
    default: "BEYONDVYU — Turn real customer experiences into authentic Google reviews",
    template: "%s | BEYONDVYU — Google review management platform",
  },
  description:
    "QR + link review collection in ~60 seconds, in 10 Indian languages. Same review path for every customer — no gating. Review velocity funnel, AI insights, WhatsApp-ready digest. Plans from ₹0, UPI & cards via Razorpay.",
  keywords: [
    "Google reviews",
    "review management",
    "QR code reviews",
    "collect Google reviews",
    "Google review QR code",
    "review management software India",
    "online reputation management",
    "customer review platform",
    "customer feedback platform",
    "review velocity",
    "review conversion funnel",
    "WhatsApp review reports",
    "multi-language reviews Hindi Hinglish Tamil Telugu",
    "restaurant review software India",
    "salon review software India",
    "clinic review software India",
    "how to get more Google reviews",
    "Google review link generator",
  ],
  authors: [{ name: "BEYONDVYU" }],
  publisher: "BEYONDVYU",
  creator: "BEYONDVYU",
  category: "business",
  classification: "Review Management Software",
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://beyondvyu.com",
    languages: { "en-IN": "https://beyondvyu.com", en: "https://beyondvyu.com" },
  },
  openGraph: {
    type: "website",
    siteName: "BEYONDVYU",
    title: "BEYONDVYU — Turn real customer experiences into authentic Google reviews",
    description:
      "QR + link review collection in 10 Indian languages. No gating, customer owns every word. Review velocity funnel + weekly digest. Free plan, INR pricing.",
    url: "https://beyondvyu.com",
    locale: "en_IN",
    alternateLocale: ["en_US", "hi_IN"],
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
    title: "BEYONDVYU — Authentic Google reviews from real customer experiences",
    description:
      "QR review flow in 10 Indian languages. No gating. Review velocity + WhatsApp-ready digest. Free plan.",
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
