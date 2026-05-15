'use client'
import { useState, useEffect } from 'react'

/** Returns true when the device is in landscape orientation with a short viewport (mobile landscape). */
export function useLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    const check = () =>
      setIsLandscape(window.innerWidth > window.innerHeight && window.innerHeight < 500)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return isLandscape
}
