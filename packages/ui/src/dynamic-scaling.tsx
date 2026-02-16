"use client"

import { useEffect } from 'react'

export function DynamicScaling() {
  useEffect(() => {
    function scalePage() {
      const baselineHeight = 1440
      const scale = window.innerHeight / baselineHeight

      document.body.style.transform = `scale(${scale})`
      document.body.style.transformOrigin = "top left"
      document.body.style.width = `${100 / scale}%`
      document.body.style.height = `${100 / scale}%`
    }

    scalePage()
    window.addEventListener("resize", scalePage)

    return () => {
      window.removeEventListener("resize", scalePage)
    }
  }, [])

  return null
}
