"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Shield, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { adminApi } from "@/lib/admin-api"
import { ADMIN_BASE } from "@/lib/admin-path"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("admin@beyondvyu.com")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await adminApi.login(email, password)
      localStorage.setItem("beyondvyu_admin_token", res.token)
      router.replace(`/${ADMIN_BASE}`)
    } catch (err: any) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10">
            <Shield className="size-6 text-amber-500" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-zinc-100">Admin Login</h1>
          <p className="mt-1 text-sm text-zinc-500">Super admin access only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-zinc-700 bg-zinc-900 text-zinc-100 h-11 md:h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-zinc-700 bg-zinc-900 text-zinc-100 pr-10 h-11 md:h-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-2"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
          )}

          <Button type="submit" disabled={loading} className="w-full bg-amber-500 text-black hover:bg-amber-400 h-11 md:h-10">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  )
}
