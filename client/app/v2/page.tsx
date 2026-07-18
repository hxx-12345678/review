"use client"

import Link from "next/link"
import {
  MessageSquare,
  Globe,
  Inbox,
  ListChecks,
  AtSign,
  Smartphone,
} from "lucide-react"
import { Card } from "@/components/ui/card"

const features = [
  {
    title: "WhatsApp Review Flows",
    description: "Interactive review collection via WhatsApp — 88% completion rate.",
    href: "/v2/whatsapp",
    icon: MessageSquare,
    color: "bg-green-500/10 text-green-600",
  },
  {
    title: "Multi-Platform Automation",
    description: "Send review requests via SMS, WhatsApp & Email in sequence.",
    href: "/v2/multi-platform",
    icon: Smartphone,
    color: "bg-purple-500/10 text-purple-600",
  },
  {
    title: "Cross-Platform Inbox",
    description: "Unified inbox for Google, Instagram, WhatsApp, SMS & Email.",
    href: "/v2/inbox",
    icon: Inbox,
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    title: "Follow-up Tasks",
    description: "Auto-generated tasks from negative reviews and pending replies.",
    href: "/v2/tasks",
    icon: ListChecks,
    color: "bg-orange-500/10 text-orange-600",
  },
  {
    title: "Instagram @Mentions",
    description: "Monitor and reply to Instagram @mentions from one place.",
    href: "/v2/instagram",
    icon: AtSign,
    color: "bg-pink-500/10 text-pink-600",
  },
  {
    title: "Google GBP Manager",
    description: "Sync, reply, bulk-reply, and manage Google reviews.",
    href: "/v2/gbp",
    icon: Globe,
    color: "bg-blue-500/10 text-blue-600",
  },
]

export default function V2LandingPage() {
  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">ReviewOS — v2 Features</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Six validated features built to own what AI giants cannot: multi-location review management,
          cross-platform collection, and private feedback routing.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <Link key={f.href} href={f.href}>
            <Card className="p-5 hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <div className="flex items-start gap-4">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${f.color}`}>
                  <f.icon className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{f.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
