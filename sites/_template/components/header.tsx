"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@barangay/ui"
import { Menu, X } from "lucide-react"
import type { BarangayConfig } from "@barangay/shared"

interface HeaderProps {
  config?: BarangayConfig
}

export function Header({ config }: HeaderProps) {
  const barangayName = config ? `${config.name}, ${config.city}` : 'Your Barangay'
  const primaryColor = config?.primary_color || '#0007C6'
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const isSpecialPage = pathname === '/clearances' || pathname === '/admin'

  const handleLogoClick = () => {
    if (isSpecialPage) {
      router.push('/')
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur"
      style={{ borderColor: primaryColor + '20' }}
    >
      <div className="max-w-[1600px] mx-auto flex items-center justify-between px-6 py-3">
        <button onClick={handleLogoClick} className="flex items-center gap-3 cursor-pointer">
          <img src="/logo.webp" alt={barangayName} className="h-10 w-10 rounded-full" />
          <span className="font-semibold text-lg">{barangayName}</span>
        </button>

        {/* TODO: Customize navigation items */}
        <nav className="hidden md:flex items-center gap-6">
          {!isSpecialPage && (
            <>
              <button onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm hover:opacity-70">Home</button>
              <button onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm hover:opacity-70">Services</button>
            </>
          )}
          <Button
            onClick={() => router.push('/clearances')}
            style={{ backgroundColor: primaryColor }}
            className="text-white"
          >
            Request Clearance
          </Button>
        </nav>

        <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t p-4 bg-white space-y-3">
          <Button
            onClick={() => { router.push('/clearances'); setIsMenuOpen(false) }}
            style={{ backgroundColor: primaryColor }}
            className="w-full text-white"
          >
            Request Clearance
          </Button>
        </div>
      )}
    </header>
  )
}
