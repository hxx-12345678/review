"use client"

import { CheckCheck, MoreVertical, Phone, Video } from "lucide-react"

interface Props {
  businessName: string
  headerText?: string | null
  bodyText: string
  footerText?: string | null
  variables?: string[]
  buttonText?: string | null
  buttonUrl?: string | null
}

export function WhatsAppPhonePreview({
  businessName,
  headerText,
  bodyText,
  footerText,
  variables = [],
  buttonText,
  buttonUrl,
}: Props) {
  // Render body text replacing {{1}}, {{2}} with corresponding variable or placeholder
  const renderedBody = (bodyText || "").replace(/\{\{(\d+)\}\}/g, (match, indexStr) => {
    const idx = parseInt(indexStr, 10) - 1
    const val = variables[idx]
    return val && val.trim() ? val : `[${match}]`
  })

  // Format current time for preview (e.g., 10:45 AM)
  const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  return (
    <div className="w-full max-w-[340px] mx-auto rounded-[38px] border-[6px] border-slate-800 bg-slate-900 shadow-2xl overflow-hidden text-slate-800">
      {/* Phone Notch / Speaker */}
      <div className="bg-slate-800 pt-2 pb-1 flex justify-center items-center">
        <div className="w-20 h-3.5 bg-black rounded-full flex items-center justify-end px-2">
          <div className="size-2 rounded-full bg-slate-800" />
        </div>
      </div>

      {/* WhatsApp Header */}
      <div className="bg-[#075E54] text-white px-3 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs shrink-0 text-white border border-white/30">
            {businessName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-xs font-semibold truncate leading-tight text-white">{businessName}</p>
              <span className="inline-flex size-3 items-center justify-center rounded-full bg-emerald-400 text-[8px] font-bold text-slate-900 shrink-0">
                ✓
              </span>
            </div>
            <p className="text-[10px] text-emerald-200/90 leading-tight">Official Business Account</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-white/90 shrink-0 ml-2">
          <Video className="size-3.5" />
          <Phone className="size-3.5" />
          <MoreVertical className="size-3.5" />
        </div>
      </div>

      {/* WhatsApp Chat Area */}
      <div
        className="p-3 min-h-[360px] flex flex-col justify-end bg-[#EFEAE2] dark:bg-[#0B141A] relative"
        style={{
          backgroundImage: "radial-gradient(#00000008 1px, transparent 1px)",
          backgroundSize: "12px 12px",
        }}
      >
        {/* Date pill */}
        <div className="self-center mb-3">
          <span className="bg-white/80 dark:bg-slate-800/80 text-[10px] text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full shadow-xs uppercase font-medium tracking-wide">
            Today
          </span>
        </div>

        {/* Message Bubble (Outgoing from Business) */}
        <div className="self-end max-w-[88%] bg-[#D9FDD3] dark:bg-[#005C4B] rounded-2xl rounded-tr-xs p-2.5 shadow-sm border border-emerald-900/5 relative text-slate-900 dark:text-slate-50 transition-all">
          {/* Header */}
          {headerText && (
            <p className="font-semibold text-xs text-slate-900 dark:text-white mb-1 leading-snug">
              {headerText}
            </p>
          )}

          {/* Body */}
          <div className="text-[12px] leading-relaxed whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100">
            {renderedBody || "Your message text will appear here…"}
          </div>

          {/* Footer & Timestamp */}
          <div className="mt-1 flex items-end justify-between gap-2 pt-0.5 text-[10px]">
            {footerText ? (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic truncate max-w-[170px]">
                {footerText}
              </p>
            ) : <span />}

            <div className="flex items-center gap-1 shrink-0 text-slate-500 dark:text-slate-300 text-[10px] ml-auto">
              <span>{timeString}</span>
              <CheckCheck className="size-3 text-[#53BDEB]" />
            </div>
          </div>

          {/* Action button if review link or CTA exists */}
          {(buttonText || buttonUrl) && (
            <div className="mt-2 pt-2 border-t border-emerald-900/10 dark:border-white/10 text-center">
              <span className="inline-flex items-center justify-center gap-1 text-[11px] font-medium text-[#00A884] dark:text-[#25D366]">
                🔗 {buttonText || "Open Link"}
              </span>
            </div>
          )}
        </div>

        {/* Security / Encryption disclaimer */}
        <div className="mt-4 text-center">
          <span className="text-[9px] text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-800/60 px-2 py-0.5 rounded-md inline-block">
            🔒 End-to-end encrypted · Business Chat
          </span>
        </div>
      </div>

      {/* WhatsApp Input Bar Mockup */}
      <div className="bg-[#F0F2F5] dark:bg-[#202C33] px-3 py-2 flex items-center gap-2 border-t border-slate-200 dark:border-slate-800">
        <div className="flex-1 bg-white dark:bg-[#2A3942] rounded-full px-3 py-1 text-[11px] text-slate-400">
          Message
        </div>
        <div className="size-7 rounded-full bg-[#00A884] flex items-center justify-center text-white text-xs">
          🎙️
        </div>
      </div>
    </div>
  )
}
