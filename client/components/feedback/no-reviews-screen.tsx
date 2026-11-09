"use client"

import { useState } from "react"
import { ExternalLink, Phone, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface NoReviewsScreenProps {
  business: any
  googleReviewUrl: string
  demo?: boolean
}

/**
 * Shown only when the business has no entitled plan. This screen is seen by the
 * business's *customers*, so it must never mention the owner's subscription,
 * credits or billing state — and it must never redirect them automatically.
 */
export function NoReviewsScreen({ business, googleReviewUrl }: NoReviewsScreenProps) {
  const [showContact, setShowContact] = useState(false)
  const googleMapsUrl =
    googleReviewUrl || `https://www.google.com/maps/search/${encodeURIComponent(business.name)}`
  const hasPhone = Boolean(business.phoneNumber)

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary shadow-lg">
          <Star className="size-8" />
        </div>

        <h2 className="text-2xl font-extrabold tracking-tight text-foreground text-center">
          Share your experience
        </h2>

        <p className="text-muted-foreground text-center leading-relaxed">
          This review page isn&apos;t accepting responses right now. You can still leave a review for{" "}
          <span className="font-medium text-foreground">{business.name}</span> on Google.
        </p>

        <Button
          onClick={() => window.location.assign(googleMapsUrl)}
          className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary text-primary-foreground font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <ExternalLink className="size-4 mr-2" />
          Write review on Google
        </Button>

        {hasPhone && (
          <Button
            variant="outline"
            onClick={() => setShowContact(true)}
            className="w-full rounded-xl py-4 font-semibold bg-card border border-border/60 hover:border-primary/40 hover:text-primary transition-all"
          >
            <Phone className="size-4 mr-2" />
            Contact {business.name}
          </Button>
        )}

        {showContact && hasPhone && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-6 space-y-4">
              <h3 className="text-xl font-semibold text-foreground text-center">
                Contact {business.name}
              </h3>
              <Button
                onClick={() => window.location.assign(`tel:${business.phoneNumber}`)}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:shadow-lg transition-all"
              >
                <Phone className="size-4 mr-3" />
                Call {business.phoneNumber}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowContact(false)}
                className="w-full py-3 rounded-xl font-medium text-muted-foreground hover:text-foreground transition-all"
              >
                Close
              </Button>
            </Card>
          </div>
        )}

        {business.showPoweredBy !== false && (
          <div className="text-center text-xs text-muted-foreground">
            <p>
              <span className="font-extrabold text-foreground/50 tracking-tight bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                BEYONDVYU
              </span>{" "}
              powered
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
