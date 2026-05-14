import type { GeoPoint } from '@/lib/types'

interface WebcamData {
  title: string; city: string; country: string; streamUrl: string | null
}

export default function WebcamPanel({ point }: { point: GeoPoint }) {
  const d = point.data as unknown as WebcamData
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 17, color: '#FFD700', marginBottom: 4, lineHeight: 1.2 }}>
        {d.title}
      </p>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 400, fontSize: 13, color: '#3a5a80', marginBottom: 10 }}>
        {d.city}, {d.country}
      </p>
      {d.streamUrl ? (
        <iframe
          src={d.streamUrl}
          style={{ width: '100%', aspectRatio: '16/9', border: '1px solid #1a2840', borderRadius: 3, display: 'block' }}
          allowFullScreen
          title={d.title}
        />
      ) : (
        <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 400, fontSize: 13, color: '#3a5a80' }}>
          Flux non disponible
        </p>
      )}
    </div>
  )
}
