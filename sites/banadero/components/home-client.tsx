"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { DisclosureDashboard } from "@/components/disclosure-dashboard"
import { ProjectsSection } from "@/components/projects-section"
import { CommunitySection } from "@/components/community-section"
import type { BarangayConfig } from "@barangay/shared"

interface HomeClientProps {
  config: BarangayConfig
}

export function HomeClient({ config }: HomeClientProps) {
  const router = useRouter()

  useEffect(() => {
    // Prefetch the clearances page once the browser is idle
    const prefetch = () => {
      router.prefetch('/clearances')
      sessionStorage.setItem('clearances-prefetched', 'true')
    }

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(prefetch)
      return () => cancelIdleCallback(id)
    } else {
      // Fallback for Safari — run after paint
      const id = requestAnimationFrame(() => setTimeout(prefetch, 0))
      return () => cancelAnimationFrame(id)
    }
  }, [router])

  return (
    <>
      <Header config={config} />
      <main style={{paddingLeft: '5%', paddingRight: '5%'}}>
        <HeroSection config={config} />
        <DisclosureDashboard config={config} />
        <ProjectsSection config={config} />
        <CommunitySection config={config} />
      </main>
    </>
  )
}
