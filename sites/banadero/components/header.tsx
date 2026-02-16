"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@barangay/ui"
import { Menu, X } from "lucide-react"
import type { BarangayConfig } from "@barangay/shared"

interface HeaderProps {
  config?: BarangayConfig
}

const NAV_LINKS = [
  { label: 'Home', sectionId: 'hero' },
  { label: 'Projects', sectionId: 'projects' },
  { label: 'Info', sectionId: 'community' },
]

export function Header({ config }: HeaderProps) {
  const barangayName = config ? `${config.name}, ${config.city}` : 'Bañadero, Legazpi City'
  const barangayTagline = config?.tagline || 'Serving Our Community'
  const primaryColor = config?.primary_color || '#0007C6'
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const isSpecialPage = pathname === '/clearances' || pathname === '/admin'

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" })
    setIsMenuOpen(false)
  }

  const handleLogoClick = () => {
    if (isSpecialPage) {
      router.push('/')
    } else {
      scrollToSection("hero")
    }
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-gray-200/50 shadow-lg" style={{backgroundColor: primaryColor}}>
      <div className="w-full mx-auto" style={{paddingTop: '1rem', paddingBottom: '1rem', paddingLeft: '5%', paddingRight: '5%'}}>
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center cursor-pointer hover:opacity-90 transition-opacity" 
            style={{gap: 'clamp(0.5rem, 2vw, 1rem)'}}
            onClick={handleLogoClick}
          >
            <div className="relative flex-shrink-0" style={{width: 'clamp(2.5rem, 4vw, 3.5rem)', height: 'clamp(2.5rem, 4vw, 3.5rem)'}}>
              <Image
                src="/logo.png"
                alt="Barangay Logo"
                fill
                sizes="56px"
                className="object-cover"
                priority
              />
            </div>
            <div className="min-w-0 flex-1">
                <h1 className="font-black text-white leading-none tracking-wide" style={{fontWeight: '900', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 'clamp(1.125rem, 2.4vw, 1.25rem)', marginBottom: 'clamp(0.125rem, 0.3vh, 0.25rem)', letterSpacing: '0.05em'}}>
                  {barangayName}
                </h1>
              <p className="text-gray-200 font-medium leading-tight" style={{fontSize: 'clamp(0.875rem, 1.6vw, 0.75rem)'}}>
                {barangayTagline}
              </p>
            </div>
          </div>

              {/* Desktop Navigation */}
          {!isSpecialPage && (
            <nav className="hidden lg:flex items-center" style={{gap: '0.0625rem'}}>
                  {NAV_LINKS.map(({ label, sectionId }) => (
                    <button
                      key={sectionId}
                      onClick={() => scrollToSection(sectionId)}
                      className="text-gray-200 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 font-semibold min-h-[44px] w-20 flex items-center justify-center"
                      style={{padding: '0.25rem 0.5rem', fontSize: 'clamp(0.875rem, 1.2vw, 1rem)'}}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
          )}

          {/* Mobile Menu Button */}
          {!isSpecialPage && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden p-3 text-white hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white focus-visible:outline-none focus-visible:ring-0 active:bg-white/10 [&:hover]:!bg-white/10 [&:hover]:!text-white [&:focus]:!bg-white/10 [&:focus]:!text-white" 
              onClick={(e) => {
                setIsMenuOpen(!isMenuOpen)
                // Remove focus after click to prevent yellow from staying
                const target = e.currentTarget
                setTimeout(() => {
                  if (target) {
                    target.blur()
                  }
                }, 0)
              }}
              aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {isMenuOpen ? <X className="h-[30px] w-[30px] size-[30px]" style={{ width: '30px', height: '30px' }} /> : <Menu className="h-[30px] w-[30px] size-[30px]" style={{ width: '30px', height: '30px' }} />}
            </Button>
          )}
        </div>

        {/* Mobile Navigation */}
        {!isSpecialPage && isMenuOpen && (
              <nav className="lg:hidden border-t border-gray-200/50 animate-in slide-in-from-top-2 duration-200" style={{marginTop: 'clamp(0.75rem, 2vh, 1rem)', paddingTop: 'clamp(0.75rem, 2vh, 1rem)', paddingBottom: 'clamp(0.75rem, 2vh, 1rem)'}}>
                <div className="flex flex-col" style={{gap: 'clamp(0.125rem, 0.5vh, 0.25rem)'}}>
                  {NAV_LINKS.map(({ label, sectionId }) => (
                    <button
                      key={sectionId}
                      onClick={() => scrollToSection(sectionId)}
                      className="text-left text-gray-200 hover:text-white hover:bg-white/10 transition-all duration-200 rounded-lg font-semibold min-h-[44px] flex items-center"
                      style={{padding: 'clamp(0.5rem, 1.5vh, 0.75rem) clamp(0.5rem, 1vw, 0.75rem)', fontSize: 'clamp(0.875rem, 2vw, 1rem)'}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </nav>
        )}
      </div>
    </header>
    </>
  )
}