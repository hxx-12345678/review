"use client"

import { useState, useEffect, useRef } from "react"
import { Save, ShieldCheck, Lock, MessageSquare, Mail, Palette, Eye, AlertTriangle, CheckCircle2, Upload, X, Loader2, Globe, RefreshCw, Trash2, Search, MapPin, Star } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

/**
 * Extracts a direct image URL from various URL formats.
 * Handles Google imgres, Pinterest, Bing, and other search result pages
 * that wrap the actual image URL in query parameters.
 */
function extractImageUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ""

  try {
    const parsed = new URL(trimmed)

    // Google imgres format: https://www.google.com/imgres?imgurl=ENCODED_URL
    if (parsed.hostname.includes("google.") && parsed.pathname.includes("/imgres")) {
      const imgurl = parsed.searchParams.get("imgurl")
      if (imgurl) return decodeURIComponent(imgurl)
    }

    // Google search with tbm=isch (image search) — extract from imgurl param
    if (parsed.hostname.includes("google.") && parsed.searchParams.get("tbm") === "isch") {
      const imgurl = parsed.searchParams.get("imgurl")
      if (imgurl) return decodeURIComponent(imgurl)
    }

    // Pinterest pin format: extract from pin image URL
    if (parsed.hostname.includes("pinterest.") && parsed.pathname.includes("/pin/")) {
      // Pinterest pins have the image in the page, return original for now
      return trimmed
    }

    // If it already looks like a direct image URL, return as-is
    if (/\.(png|jpe?g|gif|webp|svg|bmp|ico|tiff?)(\?.*)?$/i.test(parsed.pathname)) {
      return trimmed
    }

    // Common image CDNs that use non-extension paths
    if (
      parsed.hostname.includes("images.unsplash.com") ||
      parsed.hostname.includes("cdn.") ||
      parsed.hostname.includes("storage.googleapis.com") ||
      parsed.hostname.includes("raw.githubusercontent.com")
    ) {
      return trimmed
    }

    // Return as-is — let the browser attempt to load it
    return trimmed
  } catch {
    // Not a valid URL, return as-is
    return trimmed
  }
}

/**
 * Validates if a URL looks like it could be a direct image link
 * (as opposed to a search results page or HTML page).
 */
function getImageUrlStatus(url: string): { valid: boolean; message: string; extracted?: string } {
  const trimmed = url.trim()
  if (!trimmed) return { valid: true, message: "" }

  const extracted = extractImageUrl(trimmed)
  const isDirectImage = /\.(png|jpe?g|gif|webp|svg|bmp|ico|tiff?)(\?.*)?$/i.test(extracted)

  // Check if it was extracted from a wrapper URL
  if (extracted !== trimmed) {
    return {
      valid: true,
      message: `Auto-extracted image URL from search page`,
      extracted,
    }
  }

  if (isDirectImage) {
    return { valid: true, message: "Direct image URL detected" }
  }

  // Could be a CDN without extension — allow it but warn
  return {
    valid: true,
    message: "Make sure this is a direct link to an image file (PNG, JPG, SVG, etc.), not a web page",
  }
}

export function SettingsForm({ business }: { business: any }) {
  const { user } = useAuth()
  const [name, setName] = useState(business?.name || "")
  const [googleUrl, setGoogleUrl] = useState(business?.googleReviewUrl || "")
  const [googlePlaceId, setGooglePlaceId] = useState(business?.googlePlaceId || "")
  const [location, setLocation] = useState(business?.location || "")
  const [phoneNumber, setPhoneNumber] = useState(business?.phoneNumber || "")
  const [website, setWebsite] = useState(business?.website || "")
  const [emailTemplate, setEmailTemplate] = useState(business?.emailTemplate || "")
  const [smsTemplate, setSmsTemplate] = useState(business?.smsTemplate || "")
  // Branding
  const [logoUrl, setLogoUrl] = useState(business?.logoUrl || "")
  const [primaryColor, setPrimaryColor] = useState(business?.primaryColor || "#1c3a35")
  const [bgColor, setBgColor] = useState(business?.backgroundColor || "#ffffff")
  const [splashTagline, setSplashTagline] = useState(business?.splashTagline || "")
  const [showPoweredBy, setShowPoweredBy] = useState(business?.showPoweredBy !== false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Google listing search
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedPlace, setSelectedPlace] = useState<any>(null)
  const [showManualGoogleFields, setShowManualGoogleFields] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  async function doSearch(query: string) {
    if (!query || query.length < 2) return
    setSearching(true)
    setSearchResults([])
    try {
      const res = await api.googlePlaces.search(query)
      setSearchResults(res.results)
    } catch (err: any) {
      toast.error(err.message || "Search failed")
    } finally {
      setSearching(false)
    }
  }

  function selectListing(place: any) {
    setSelectedPlace(place)
    setGooglePlaceId(place.placeId)
    setGoogleUrl(`https://search.google.com/local/writereview?placeid=${place.placeId}`)
    setShowManualGoogleFields(false)
  }

  function clearSelection() {
    setSelectedPlace(null)
    setGooglePlaceId("")
    setGoogleUrl("")
  }

  async function save() {
    if (!business?.id) return
    setSaving(true)
    try {
      // Extract actual image URL from search page URLs
      const finalLogoUrl = extractImageUrl(logoUrl)

      // When googlePlaceId is set, auto-derive googleReviewUrl from it
      // unless the URL already contains the placeId (custom override)
      const finalGoogleUrl = googlePlaceId && (!googleUrl || !googleUrl.includes(googlePlaceId))
        ? `https://search.google.com/local/writereview?placeid=${googlePlaceId}`
        : googleUrl

      await api.businesses.update(business.id, {
        name,
        googleReviewUrl: finalGoogleUrl || undefined,
        googlePlaceId: googlePlaceId || undefined,
        location: location || undefined,
        phoneNumber: phoneNumber || undefined,
        website: website || undefined,
        emailTemplate: emailTemplate || undefined,
        smsTemplate: smsTemplate || undefined,
        // Branding
        logoUrl: finalLogoUrl || undefined,
        primaryColor: primaryColor || undefined,
        backgroundColor: bgColor || undefined,
        splashTagline: splashTagline || undefined,
        showPoweredBy,
      })
      toast.success("Settings saved")
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("logo", file)
      formData.append("businessId", business?.id || "")
      const token = localStorage.getItem("beyondvyu_token")
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/upload/logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Upload failed")
      }
      const data = await res.json()
      setLogoUrl(data.url)
      toast.success("Logo uploaded and optimized")
    } catch (err: any) {
      toast.error(err.message || "Failed to upload logo")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  // ── Password change (only for non-OAuth users) ───────────────────────────
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")

  async function handleChangePassword() {
    setPasswordError("")
    setPasswordSuccess("")

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters")
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    setChangingPassword(true)
    try {
      await api.auth.changePassword({ currentPassword, newPassword })
      setPasswordSuccess("Password updated successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6 overflow-hidden p-4 sm:p-8">
      <Card className="p-6">
        <h2 className="font-medium text-foreground">Business details</h2>
        <p className="text-sm text-muted-foreground">Shown to customers in your review flow.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Google listing</Label>

            {/* Connected state */}
            {selectedPlace && !showManualGoogleFields && (
              <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MapPin className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{selectedPlace.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedPlace.address}</p>
                    {selectedPlace.rating && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        <span className="font-medium text-foreground">{selectedPlace.rating}</span>
                        {selectedPlace.totalRatings && (
                          <span className="text-muted-foreground">({selectedPlace.totalRatings} reviews)</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={clearSelection} className="text-xs text-muted-foreground underline-offset-2 hover:underline shrink-0">
                    Change
                  </button>
                </div>
              </div>
            )}

            {/* Search input */}
            {(!selectedPlace || showManualGoogleFields) && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    ref={searchInputRef}
                    placeholder={`Search "${business?.name || "your business"}" on Google...`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        doSearch((e.target as HTMLInputElement).value)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => doSearch(searchInputRef.current?.value || "")}
                    disabled={searching}
                  >
                    {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                    Search
                  </Button>
                </div>

                {/* Search results */}
                {!searching && searchResults.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border border-border">
                    {searchResults.map((place) => (
                      <button
                        key={place.placeId}
                        type="button"
                        onClick={() => selectListing(place)}
                        className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent border-b border-border last:border-b-0"
                      >
                        <p className="font-medium text-foreground">{place.name}</p>
                        <p className="text-xs text-muted-foreground">{place.address}</p>
                        {place.rating && (
                          <div className="mt-0.5 flex items-center gap-1 text-xs">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            <span className="font-medium text-foreground">{place.rating}</span>
                            {place.totalRatings && (
                              <span className="text-muted-foreground">({place.totalRatings} reviews)</span>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {!searching && !selectedPlace && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowManualGoogleFields(!showManualGoogleFields)}
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      {showManualGoogleFields ? "Search on Google instead" : "Enter URL manually"}
                    </button>
                  </div>
                )}

                {/* Manual fields */}
                {showManualGoogleFields && (
                  <div className="space-y-3 rounded-lg border border-border p-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="google" className="text-xs">Google review URL</Label>
                      <Input id="google" value={googleUrl} onChange={(e) => setGoogleUrl(e.target.value)} placeholder="https://g.co/kgs/..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="googlePlaceId" className="text-xs">
                        Google Place ID
                        <span className="ml-1 font-normal text-muted-foreground">(for importing reviews)</span>
                      </Label>
                      <Input
                        id="googlePlaceId"
                        value={googlePlaceId}
                        onChange={(e) => setGooglePlaceId(e.target.value)}
                        placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Find your Place ID at{" "}
                        <a href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder" target="_blank" rel="noopener noreferrer" className="underline text-blue-500">Place ID Finder</a>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="123 Main St, City" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1-555-0123" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
          </div>
        </div>
        <div className="mt-5">
          <Button onClick={save} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Palette className="size-5 text-violet-500" />
          <h2 className="font-medium text-foreground">Branding</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize the branded loading screen your customers see when they scan your QR code.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="logo-url">Logo</Label>
            <div className="flex gap-2">
              <Input
                id="logo-url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://your-brand.com/logo.png"
                className="flex-1"
              />
              <label className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors shrink-0">
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                <span className="hidden sm:inline">{uploading ? "Uploading..." : "Upload"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            {logoUrl && (() => {
              const status = getImageUrlStatus(logoUrl)
              const extracted = extractImageUrl(logoUrl)
              const wasExtracted = extracted !== logoUrl.trim()
              return (
                <div className="flex items-start gap-1.5 text-[11px]">
                  {wasExtracted ? (
                    <>
                      <CheckCircle2 className="size-3.5 mt-0.5 shrink-0 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Extracted direct image: <span className="font-mono text-[10px] break-all">{extracted}</span>
                      </span>
                    </>
                  ) : /\.(png|jpe?g|gif|webp|svg|bmp|ico|tiff?)(\?.*)?$/i.test(extracted) ? (
                    <>
                      <CheckCircle2 className="size-3.5 mt-0.5 shrink-0 text-emerald-500" />
                      <span className="text-muted-foreground">Direct image URL — looks good</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="size-3.5 mt-0.5 shrink-0 text-amber-500" />
                      <span className="text-amber-600 dark:text-amber-400">
                        Paste a direct image link (ends in .png, .jpg, .svg, etc.), not a search results page
                      </span>
                    </>
                  )}
                </div>
              )
            })()}
            <p className="text-[11px] text-muted-foreground">
              Upload an image or paste a direct link. JPG, PNG, WebP, SVG. Images are optimized to WebP and resized to 400px.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary color</Label>
            <div className="flex items-center gap-2">
              <input
                id="primary-color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="size-10 cursor-pointer rounded-lg border border-border p-0.5"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bg-color">Background color</Label>
            <div className="flex items-center gap-2">
              <input
                id="bg-color"
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="size-10 cursor-pointer rounded-lg border border-border p-0.5"
              />
              <Input
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="splash-tagline">Tagline (optional)</Label>
            <Input
              id="splash-tagline"
              value={splashTagline}
              onChange={(e) => setSplashTagline(e.target.value)}
              placeholder="Welcome to"
              maxLength={200}
            />
            <p className="text-[11px] text-muted-foreground">Shown below your logo on the loading screen. Leave empty for default.</p>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4 sm:col-span-2">
            <div>
              <p className="text-sm font-medium text-foreground">Show &quot;Powered by BEYONDVYU&quot;</p>
              <p className="text-sm text-muted-foreground">Display subtle attribution on the loading screen.</p>
            </div>
            <Switch checked={showPoweredBy} onCheckedChange={setShowPoweredBy} />
          </div>
        </div>

        {/* Live preview */}
        <div className="mt-5 rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 border-b border-border">
            <Eye className="size-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Preview</span>
          </div>
          <PreviewBox
            primaryColor={primaryColor}
            bgColor={bgColor}
            logoUrl={extractImageUrl(logoUrl)}
            name={name}
            splashTagline={splashTagline}
            showPoweredBy={showPoweredBy}
          />
        </div>

        <div className="mt-5">
          <Button onClick={save} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving..." : "Save branding"}
          </Button>
        </div>
      </Card>

      <Card className="border-primary/30 bg-primary/5 p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h2 className="font-medium text-foreground">Compliance guardrails</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          These protections keep your Google profile safe. They&apos;re locked on by design.
        </p>
        <div className="mt-5 space-y-1">
          <LockedToggle title="AI talking points only" body="The AI generates reminders, never finished reviews customers can paste." />
          <Separator />
          <LockedToggle title="No review gating" body="Every customer sees the same Google review link, regardless of rating." />
          <Separator />
          <LockedToggle title="Authenticity checks" body="Generic, templated text is flagged so reviews stay specific and real." />
        </div>
      </Card>

      {user && !user.googleId && (
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Lock className="size-5 text-amber-500" />
            <h2 className="font-medium text-foreground">Change password</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your account password. This only applies to email/password logins — Google-linked accounts use Google authentication.
          </p>
          <div className="mt-5 space-y-4">
            {passwordError && (
              <div className="rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive shadow-sm">{passwordError}</div>
            )}
            {passwordSuccess && (
              <div className="rounded-xl bg-emerald-500/10 p-3.5 text-sm text-emerald-600 shadow-sm">{passwordSuccess}</div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="current-password" className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="h-11 w-full rounded-xl border-border/70 bg-white/70 px-4 text-sm shadow-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs font-semibold uppercase tracking-wider text-foreground/70">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="h-11 w-full rounded-xl border-border/70 bg-white/70 px-4 text-sm shadow-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-new-password" className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Repeat new password"
                className="h-11 w-full rounded-xl border-border/70 bg-white/70 px-4 text-sm shadow-sm"
              />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword} className="h-11 rounded-xl text-sm font-bold">
              {changingPassword ? "Updating..." : "Update password"}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="font-medium text-foreground flex items-center gap-2">
          <Mail className="size-5 text-amber-500" />
          Email review request template
        </h2>
        <p className="text-sm text-muted-foreground">
          Customize the message sent to customers when requesting reviews via email.
          Use {"{"}{"{"}business_name{"}"}{"}"} for business name and {"{"}{"{"}review_url{"}"}{"}"} for the review link.
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="email-template">Email body (max 500 characters)</Label>
          <textarea
            id="email-template"
            value={emailTemplate}
            onChange={(e) => setEmailTemplate(e.target.value)}
            maxLength={500}
            rows={5}
            className="w-full resize-none rounded-lg border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder={`Hi there,\n\nWe'd love to hear your feedback on your recent visit to {{business_name}}.\n\nPlease take 1 minute to share your experience here:\n{{review_url}}\n\nThank you!`}
          />
          <p className="text-xs text-muted-foreground text-right">{emailTemplate.length}/500</p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-medium text-foreground flex items-center gap-2">
          <MessageSquare className="size-5 text-indigo-500" />
          SMS review request template
        </h2>
        <p className="text-sm text-muted-foreground">
          Customize the SMS sent to customers. Keep it short — SMS has a 300 character limit.
          Use {"{"}{"{"}business_name{"}"}{"}"} and {"{"}{"{"}review_url{"}"}{"}"} placeholders.
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="sms-template">SMS text (max 300 characters)</Label>
          <textarea
            id="sms-template"
            value={smsTemplate}
            onChange={(e) => setSmsTemplate(e.target.value)}
            maxLength={300}
            rows={3}
            className="w-full resize-none rounded-lg border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder={`Share your feedback about {{business_name}}: {{review_url}}`}
          />
          <p className="text-xs text-muted-foreground text-right">{smsTemplate.length}/300</p>
        </div>
      </Card>

      <GoogleAccountSection businessId={business?.id} />

      <Card className="p-6">
        <h2 className="font-medium text-foreground">Private feedback routing</h2>
        <p className="text-sm text-muted-foreground">
          Where unhappy customers&apos; private notes are sent. (Public reviews are never affected.)
        </p>
        <div className="mt-5 space-y-2">
          <Label htmlFor="notify">Notification email</Label>
          <Input id="notify" type="email" defaultValue={business?.user?.email || ""} />
        </div>
        <div className="mt-5">
          <Button variant="outline" onClick={save}>
            <Save className="size-4" />
            Save
          </Button>
        </div>
      </Card>
    </div>
  )
}

function GoogleAccountSection({ businessId }: { businessId: string }) {
  const [status, setStatus] = useState<{ connected: boolean; googleAccountId: string | null; reviewCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingPlaces, setSyncingPlaces] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    api.googleReviews.status(businessId)
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [businessId]);

  async function handleConnect() {
    try {
      const { url } = await api.googleReviews.oauthUrl(businessId);
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message || "Failed to generate OAuth URL — check server configuration");
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await api.googleReviews.sync(businessId);
      toast.success(`Synced ${result.synced} new review(s) (${result.total} total)`);
      const s = await api.googleReviews.status(businessId);
      setStatus(s);
    } catch (err: any) {
      toast.error(err.message || "Sync failed — check GBP API access");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncPlaces() {
    setSyncingPlaces(true);
    try {
      const result = await api.googleReviews.syncPlaces(businessId);
      toast.success(`Imported ${result.synced} new public review(s) via Places API (${result.total} total)`);
      const s = await api.googleReviews.status(businessId);
      setStatus(s);
    } catch (err: any) {
      toast.error(err.message || "Places API sync failed — set your Google Place ID above and ensure GOOGLE_PLACES_API_KEY is configured");
    } finally {
      setSyncingPlaces(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect your Google account? All synced reviews will be removed.")) return;
    setDisconnecting(true);
    try {
      await api.googleReviews.disconnect(businessId);
      setStatus({ connected: false, googleAccountId: null, reviewCount: 0 });
      toast.success("Google account disconnected");
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Globe className="size-5 text-blue-500" />
        <h2 className="font-medium text-foreground">Google Reviews Integration</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Import real Google reviews into your dashboard. Two methods available:
      </p>

      {/* Method 1: Google Business Profile OAuth */}
      <div className="mt-4 rounded-lg border border-border p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Method 1: Business Profile OAuth (Full access)</p>
          <p className="text-xs text-muted-foreground mt-0.5">Connect your GBP account for full review management and reply capabilities. Requires GBP API access approval from Google.</p>
        </div>
        <div>
          {loading ? (
            <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
          ) : status?.connected ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Account ID:</span> {status.googleAccountId}</p>
                <p><span className="text-muted-foreground">Total reviews synced:</span> {status.reviewCount}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                  <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing..." : "Sync GBP Reviews"}
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
                  <Trash2 className="size-4" />
                  {disconnecting ? "Disconnecting..." : "Disconnect"}
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={handleConnect} size="sm">
              <Globe className="size-4" />
              Connect Google Account
            </Button>
          )}
        </div>
      </div>

      {/* Method 2: Places API (No GBP approval required) */}
      <div className="mt-3 rounded-lg border border-dashed border-border p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Method 2: Places API <span className="text-xs font-normal text-green-600 ml-1">(No approval needed)</span></p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Import up to 5 public reviews using your Google Place ID (set above) + a Places API key.
            No GBP API approval required. Set <code className="text-xs bg-muted px-1 rounded">GOOGLE_PLACES_API_KEY</code> in server .env.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSyncPlaces} disabled={syncingPlaces}>
          <RefreshCw className={`size-4 ${syncingPlaces ? "animate-spin" : ""}`} />
          {syncingPlaces ? "Importing..." : "Import Public Reviews"}
        </Button>
      </div>
    </Card>
  );
}


function LockedToggle({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Lock className="size-3.5 text-muted-foreground" />
        <Switch checked disabled aria-label={`${title} (locked on)`} />
      </div>
    </div>
  )
}

function PreviewBox({
  primaryColor,
  bgColor,
  logoUrl,
  name,
  splashTagline,
  showPoweredBy,
}: {
  primaryColor: string
  bgColor: string
  logoUrl: string
  name: string
  splashTagline: string
  showPoweredBy: boolean
}) {
  // Contrast-aware text color based on background
  const h = bgColor.replace("#", "")
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const textColor = luminance > 0.5 ? "#1a1a1a" : "#ffffff"
  const isDark = textColor === "#ffffff"

  return (
    <div
      className="flex flex-col items-center justify-center py-10 px-4"
      style={{ backgroundColor: bgColor }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="Logo preview"
          className="max-h-[80px] w-auto object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
        />
      ) : (
        <div
          className="flex size-16 items-center justify-center rounded-full"
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.12)" : `${primaryColor}15`,
            border: `2px solid ${isDark ? "rgba(255,255,255,0.2)" : `${primaryColor}30`}`,
          }}
        >
          <span className="text-xl font-bold" style={{ color: textColor }}>
            {name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}
      <p className="mt-4 text-xs font-medium" style={{ color: textColor, opacity: 0.6 }}>
        {splashTagline || "Welcome to"}
      </p>
      {showPoweredBy && (
        <p className="mt-4 text-[9px] font-medium" style={{ color: textColor, opacity: 0.3 }}>
          powered by BEYONDVYU
        </p>
      )}
    </div>
  )
}
