'use client'
import { useState } from 'react'
import { subscribeToPush } from '@/lib/push'

interface Props { spotId: string; minScore?: number; color: string }

export function PushAlertButton({ spotId, minScore = 7, color }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'subscribed' | 'error'>('idle')

  const handleSubscribe = async () => {
    setStatus('loading')
    const sub = await subscribeToPush()
    if (!sub) { setStatus('error'); return }
    try {
      const res = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), spotId, minScore }),
      })
      if (res.ok) setStatus('subscribed')
      else setStatus('error')
    } catch { setStatus('error') }
  }

  const scoreLabel = minScore >= 0 ? `≥ ${minScore}/10` : 'conditions favorables'

  if (status === 'subscribed') return (
    <div style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 11, color: '#00FF88', marginTop: 8 }}>
      🔔 Alertes activées ({scoreLabel})
    </div>
  )

  return (
    <button
      onClick={handleSubscribe}
      disabled={status === 'loading'}
      style={{
        display: 'block', width: '100%', marginTop: 8,
        fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: 12,
        letterSpacing: '0.1em', border: `1px solid ${color}35`,
        background: 'none', color: status === 'error' ? '#FF6B35' : color,
        padding: '5px 0', borderRadius: 3, cursor: 'pointer',
      }}
    >
      {status === 'loading' ? '…' : status === 'error' ? '✗ Notifications indisponibles' : `🔔 M'alerter (${scoreLabel})`}
    </button>
  )
}
