import type { Metadata } from 'next'
import { JetBrains_Mono, Rajdhani } from 'next/font/google'
import './globals.css'

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
})

export const metadata: Metadata = {
  title: 'SentinAile — Intelligence géospatiale en temps réel',
  description: 'Carte interactive temps réel : vols, navires, parachutisme, parapente, BASE jump, surf, météo et qualité de l\'air.',
  keywords: ['carte', 'temps réel', 'vols', 'navires', 'parachutisme', 'parapente', 'météo', 'géospatial'],
  authors: [{ name: 'SentinAile' }],
  openGraph: {
    title: 'SentinAile — Intelligence géospatiale en temps réel',
    description: 'Suivez en direct vols, navires, sports de plein air et données météo sur une carte interactive.',
    type: 'website',
    locale: 'fr_FR',
    siteName: 'SentinAile',
  },
  twitter: {
    card: 'summary',
    title: 'SentinAile',
    description: 'Carte interactive temps réel : vols, navires, sports outdoor et météo.',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Viewport: enables safe-area-inset for iOS notch + disables zoom for map */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#040810" />
      </head>
      <body className={`${mono.variable} ${rajdhani.variable}`}>
        <a
          href="#main-content"
          style={{
            position: 'absolute', left: -9999, top: 'auto',
            width: 1, height: 1, overflow: 'hidden',
          }}
          onFocus={e => { (e.currentTarget as HTMLAnchorElement).style.left = '16px'; (e.currentTarget as HTMLAnchorElement).style.width = 'auto'; (e.currentTarget as HTMLAnchorElement).style.height = 'auto' }}
          onBlur={e => { (e.currentTarget as HTMLAnchorElement).style.left = '-9999px'; (e.currentTarget as HTMLAnchorElement).style.width = '1px'; (e.currentTarget as HTMLAnchorElement).style.height = '1px' }}
        >
          Aller au contenu principal
        </a>
        <main id="main-content" style={{ display: 'contents' }}>{children}</main>
      </body>
    </html>
  )
}
