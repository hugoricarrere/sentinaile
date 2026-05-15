import type { GeoPoint } from '@/lib/types'

interface WebcamData {
  title: string; city: string; country: string; streamUrl: string | null
}

// Origines autorisées pour les iframes de webcam
const ALLOWED_ORIGINS = ['windy.com', 'windy.app', 'windyapp.co', 'webcam.travel']

function isSafeStreamUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url)
    if (protocol !== 'https:') return false
    return ALLOWED_ORIGINS.some(o => hostname === o || hostname.endsWith(`.${o}`))
  } catch {
    return false
  }
}

export default function WebcamPanel({ point }: { point: GeoPoint }) {
  const d = point.data as unknown as WebcamData
  const safeUrl = d.streamUrl && isSafeStreamUrl(d.streamUrl) ? d.streamUrl : null

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 17, color: '#FFD700', marginBottom: 4, lineHeight: 1.2 }}>
        {d.title}
      </p>
      <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 400, fontSize: 13, color: '#3a5a80', marginBottom: 10 }}>
        {d.city}, {d.country}
      </p>
      {safeUrl ? (
        <iframe
          src={safeUrl}
          style={{ width: '100%', aspectRatio: '16/9', border: '1px solid #1a2840', borderRadius: 3, display: 'block' }}
          allowFullScreen
          sandbox="allow-scripts allow-presentation"
          title={d.title}
          referrerPolicy="no-referrer"
        />
      ) : (
        <>
          <p style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 400, fontSize: 13, color: '#3a5a80' }}>
            {d.streamUrl ? 'Flux non autorisé (origine inconnue)' : 'Flux non disponible'}
          </p>
          {!d.streamUrl && (
            <div style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 12, color: '#2a4a6a', padding: '8px 0', lineHeight: 1.5 }}>
              Clé API Windy manquante.<br/>
              Ajoutez <code style={{ color: '#00D4FF', fontFamily: 'var(--font-mono)', fontSize: 11 }}>WINDY_API_KEY</code> dans votre fichier <code style={{ color: '#00D4FF', fontFamily: 'var(--font-mono)', fontSize: 11 }}>.env.local</code>
            </div>
          )}
        </>
      )}
    </div>
  )
}
