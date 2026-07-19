import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/lib/providers'
import { PWARegister } from '@/components/pwa-register'
import { GlobalInstallCapture } from '@/components/install-capture'
import { GlobalInstallModal } from '@/components/global-install-modal'
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
    default: "BEYONDVYU — Turn happy customers into authentic Google reviews",
    template: "%s | BEYONDVYU",
  },
  description:
    "BEYONDVYU helps local businesses collect more authentic Google reviews with QR codes and an AI assistant that jogs your customers\u2019 memory — fully compliant with Google and FTC policy.",
  keywords: [
    "Google reviews",
    "review management",
    "QR code reviews",
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
  ],
  verification: {
    google: "YOUR_GOOGLE_SEARCH_CONSOLE_VERIFICATION_CODE",
  },
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
    title: "BEYONDVYU — Turn happy customers into authentic Google reviews",
    description:
      "BEYONDVYU helps local businesses collect more authentic Google reviews with QR codes and an AI assistant.",
    url: "https://beyondvyu.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "BEYONDVYU — Turn happy customers into authentic Google reviews",
    description:
      "BEYONDVYU helps local businesses collect more authentic Google reviews with QR codes and an AI assistant.",
  },
  robots: {
    index: true,
    follow: true,
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
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}
