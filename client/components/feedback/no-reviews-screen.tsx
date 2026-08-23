"use client"

import { useState, useEffect } from "react"
import { Mail, Phone, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"

interface NoReviewsScreenProps {
  business: any
  googleReviewUrl: string
  demo?: boolean
}

export function NoReviewsScreen({ business, googleReviewUrl, demo }: NoReviewsScreenProps) {
  const router = useRouter()
  const [showContactPopup, setShowContactPopup] = useState(false)
  const [autoRedirect, setAutoRedirect] = useState(false)

  const googleMapsUrl = googleReviewUrl || `https://www.google.com/maps/search/${encodeURIComponent(business.name)}`

  useEffect(() => {
    // Auto-redirect to Google after a brief delay to show the message
    const timer = setTimeout(() => {
      setAutoRedirect(true)
      router?.replace(googleMapsUrl)
    }, 2500)
    return () => clearTimeout(timer)
  }, [googleMapsUrl, router])

  function openGoogleMaps() {
    router?.replace(googleMapsUrl)
  }

  useEffect(() => {
    // If redirected via router, also open in new tab as fallback
    if (autoRedirect) {
      const urlWindow = window.open(googleMapsUrl, "_blank", "noopener,noreferrer")
      if (!urlWindow) {
        // If window.open fails (popup blocker), router.replace already happened above
      }
    }
  }, [autoRedirect, googleMapsUrl])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary shadow-lg">
          <Star className="size-8" />
        </div>

        <h2 className="text-2xl font-extrabold tracking-tight text-foreground text-center">
          AI cannot write reviews for improved AI reviews
        </h2>

        <p className="text-muted-foreground text-center leading-relaxed">
          To leave a review, you need an active subscription or credits. Your current plan has expired.
        </p>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={openGoogleMaps}
            disabled={autoRedirect}
            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary text-primary-foreground font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Mail className="size-4 mr-2" />
            Write review on Google
          </Button>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => setShowContactPopup(true)}
            className="flex-1 rounded-xl py-4 font-semibold bg-card border border-border/60 hover:border-primary/40 hover:text-primary transition-all transform active:scale-95"
          >
            <Mail className="size-4 mr-2" />
            Contact Manager
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowContactPopup(true)}
            className="flex-1 rounded-xl py-4 font-semibold bg-card border border-border/60 hover:border-primary/40 hover:text-primary transition-all transform active:scale-95"
          >
            <Phone className="size-4 mr-2" />
            Call Owner
          </Button>
        </div>

        {showContactPopup && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-6 space-y-4">
              <h3 className="text-xl font-semibold text-foreground text-center">
                Contact {business.name}
              </h3>
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    if (business.phoneNumber) window.open(`tel:${business.phoneNumber}`, "_self")
                  }}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  <Phone className="size-4 mr-3" />
                  Call {business.phoneNumber || "Business Phone"}
                </Button>
                <Button
                  onClick={() => window.open(`mailto:${business.email || "contact@beyondvyu.com"}`, "_blank", "noopener,noreferrer")}
                  className="w-full bg-secondary text-secondary-foreground py-3 rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  <Mail className="size-4 mr-3" />
                  Email Business
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowContactPopup(false)}
                  className="w-full py-3 rounded-xl font-medium text-muted-foreground hover:text-foreground transition-all"
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}

        {autoRedirect && (
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>
              {business.showPoweredBy !== false && (
                <span className="font-extrabold text-foreground/50 tracking-tight bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                  BEYONDVYU
                </span>
              )}
              {business.showPoweredBy !== false && " powered by"}
            </p>
            <p className="mt-2 text-[10px]">
              Redirecting to Google review page...
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}