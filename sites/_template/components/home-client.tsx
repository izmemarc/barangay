"use client"

import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import type { BarangayConfig } from "@barangay/shared"

interface HomeClientProps {
  config: BarangayConfig
}

export function HomeClient({ config }: HomeClientProps) {
  return (
    <main className="min-h-screen">
      <Header config={config} />
      <HeroSection config={config} />
      {/* TODO: Add your custom sections here */}
      {/* Examples: community section, projects section, disclosure dashboard */}
    </main>
  )
}
