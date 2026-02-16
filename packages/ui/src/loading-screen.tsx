"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

export function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    // Skip loading screen for clearances page if coming from prefetch
    if (pathname === '/clearances' && typeof window !== 'undefined') {
      const prefetched = sessionStorage.getItem('clearances-prefetched')
      if (prefetched === 'true') {
        setIsLoading(false)
        return
      }
    }
  }, [pathname])

  useEffect(() => {
    let isHydrated = false
    let checkCount = 0
    const maxChecks = 200 // 10 seconds max (50ms intervals)
    const maxAssetWaitMs = 3000 // max time to wait for critical images
    const postHydrationDelayMs = 100 // small buffer after hydration
    const postReadyDelayMs = 500 // delay before hiding loader

    function waitForImages(): Promise<void> {
      return new Promise((resolve) => {
        const start = Date.now()
        const deadline = start + maxAssetWaitMs

        // Collect only critical images
        const imgs = Array.from(document.querySelectorAll('img[data-critical="true"]')) as HTMLImageElement[]

        if (imgs.length === 0) {
          resolve()
          return
        }

        let remaining = imgs.length

        function doneOnce() {
          remaining -= 1
          if (remaining <= 0) resolve()
        }

        imgs.forEach((img) => {
          if ((img.complete && img.naturalWidth > 0)) {
            doneOnce()
            return
          }
          const onLoadOrError = () => {
            img.removeEventListener('load', onLoadOrError)
            img.removeEventListener('error', onLoadOrError)
            doneOnce()
          }
          img.addEventListener('load', onLoadOrError)
          img.addEventListener('error', onLoadOrError)
          // Try decode when supported for better reliability
          if (typeof img.decode === 'function') {
            img.decode().catch(() => { /* ignore */ })
          }
        })

        // Fallback timeout to avoid hanging
        const checkTimeout = () => {
          if (Date.now() >= deadline) {
            resolve()
          } else if (remaining > 0) {
            setTimeout(checkTimeout, 150)
          }
        }
        setTimeout(checkTimeout, 150)
      })
    }

    function checkHydration() {
      checkCount++

      // Check for multiple hydration indicators
      const hasReactHydrated = (
        (window as any).React !== undefined ||
        document.querySelector('[data-nextjs-scroll-focus-boundary]') !== null ||
        document.querySelector('[data-nextjs-router]') !== null ||
        document.body?.getAttribute('data-reactroot') !== null ||
        document.querySelector('[data-reactroot]') !== null ||
        // Check if React components are actually rendered
        document.querySelector('header') !== null ||
        document.querySelector('main') !== null
      )

      if (hasReactHydrated) {
        isHydrated = true
        // Small buffer then wait for images to finish (with timeout)
        setTimeout(async () => {
          try {
            await waitForImages()
          } finally {
            setTimeout(() => setIsLoading(false), postReadyDelayMs)
          }
        }, postHydrationDelayMs)
        return
      }

      // Continue checking if not hydrated and under limit
      if (!isHydrated && checkCount < maxChecks) {
        setTimeout(checkHydration, 50)
      } else if (!isHydrated) {
        // Fallback: hide loading after max checks
        setIsLoading(false)
      }
    }

    // Start checking after a short delay to let React initialize
    setTimeout(checkHydration, 200)
  }, [])

  if (!isLoading) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 1)'
      }}
    >
      <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  )
}
