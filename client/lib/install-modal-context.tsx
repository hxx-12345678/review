"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface InstallModalContextType {
  open: boolean
  openModal: () => void
  closeModal: () => void
}

const InstallModalContext = createContext<InstallModalContextType | null>(null)

export function InstallModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const openModal = useCallback(() => setOpen(true), [])
  const closeModal = useCallback(() => setOpen(false), [])

  return (
    <InstallModalContext.Provider value={{ open, openModal, closeModal }}>
      {children}
    </InstallModalContext.Provider>
  )
}

export function useInstallModal() {
  const ctx = useContext(InstallModalContext)
  if (!ctx) throw new Error("useInstallModal must be used within InstallModalProvider")
  return ctx
}
