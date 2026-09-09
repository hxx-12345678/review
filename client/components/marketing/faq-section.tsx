const FAQS = [
  {
    q: "How does BEYONDVYU help collect Google reviews?",
    a: "Customers scan a QR code or open a link, rate their visit, and describe it in their own words — in English, Hinglish, Hindi, Marathi, Gujarati, Gujlish, Tamil, Telugu, Bengali or Kannada. They get reminder talking points drawn only from what they wrote, then edit and own their review before choosing what to post to Google. We never post on anyone's behalf.",
  },
  {
    q: "Does BEYONDVYU push only happy customers to Google?",
    a: "No. Every customer gets the same Google review path whatever they rate — no gating, no incentives, no staff-name prompts. Private feedback is offered alongside the public option, never as a gate that hides it.",
  },
  {
    q: "How much does BEYONDVYU cost?",
    a: "Free (₹0) for 1 location with 30 AI credits/month. Paid plans: Lite ₹100/month, Starter ₹249/month, Growth ₹499/month (up to 3 locations), Pro ₹799/month (up to 10 locations) — with yearly options. UPI and cards via Razorpay, GST invoice included. Full table on /pricing.",
  },
  {
    q: "Which languages does the customer flow support?",
    a: "Ten: English, Hinglish, Hindi, Marathi, Gujarati, Gujlish, Tamil, Telugu, Bengali and Kannada. Drafts follow the selected language — and if a customer types in a different script, the flow suggests switching. Dashboard keyword trends work best in English/Hinglish today.",
  },
  {
    q: "Does the weekly WhatsApp digest send automatically?",
    a: "The digest (feedback volume, review velocity, rating change, top praise/issues, follow-ups) is generated in your dashboard with an honest preview today. Automatic WhatsApp delivery needs your WhatsApp Business API number connected plus owner opt-in and an approved Meta utility template — until then, nothing is auto-sent.",
  },
  {
    q: "What should I track besides my star rating?",
    a: "Review velocity (reviews per location per month) and the visits → review-starts → Google-posts funnel, plus rating change vs the prior period, unresolved 1–2★ follow-ups, and repeat praise/complaint themes per location.",
  },
  {
    q: "How long does setup take?",
    a: "About 2 minutes: create an account, add your business with its Google review link or Place ID, download the QR code, and place it at billing, checkout or reception.",
  },
  {
    q: "Does it work for multiple locations?",
    a: "Yes — Growth covers up to 3 locations and Pro up to 10, each with its own QR, dashboard and digest, plus team roles. Velocity and funnel are reported per location.",
  },
]

export function FaqSection() {
  return (
    <section id="faq" className="relative bg-gradient-to-b from-background via-muted/10 to-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-24 sm:px-6">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">FAQ</p>
          <h2 className="speakable mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Answers, in plain words
          </h2>
          <p className="mt-3 text-muted-foreground">
            The same answers our structured data gives to search and AI assistants — visible here for everyone.
          </p>
        </div>
        <div className="mt-10 space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="reveal group rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm transition-all hover:shadow-md"
            >
              <summary className="cursor-pointer list-none text-[15px] font-bold text-foreground [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4">
                  {f.q}
                  <span className="text-primary transition-transform group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="speakable mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
