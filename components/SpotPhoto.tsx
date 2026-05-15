'use client'
import { useState } from 'react'

interface Props { url: string; alt: string }

export function SpotPhoto({ url, alt }: Props) {
  const [error, setError] = useState(false)
  if (error) return null
  return (
    <div style={{ marginBottom: 12, borderRadius: 4, overflow: 'hidden', height: 120 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        onError={() => setError(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  )
}
