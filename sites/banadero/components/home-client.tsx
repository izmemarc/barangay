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
    // Prefetch the clearances page after the main page loads
    const prefetchClearances = async () => {
      router.prefetch('/clearances')
      // Mark as prefetched to skip loading screen
      sessionStorage.setItem('clearances-prefetched', 'true')
    }

    // Delay prefetch slightly to let main page finish loading
    const timer = setTimeout(prefetchClearances, 1000)
    return () => clearTimeout(timer)
  }, [router])

  // Scroll reveal: observe .scroll-reveal elements and add .revealed when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    document.querySelectorAll('.scroll-reveal, .scroll-reveal-stagger').forEach((el) => {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <>
      <Header config={config} />
      <main style={{paddingLeft: '5%', paddingRight: '5%'}}>
        <HeroSection config={config} />
        <div className="scroll-reveal">
          <DisclosureDashboard config={config} />
        </div>
        <div className="scroll-reveal">
          <ProjectsSection config={config} />
        </div>
        <div className="scroll-reveal">
          <CommunitySection config={config} />
        </div>
      </main>
    </>
  )
}
