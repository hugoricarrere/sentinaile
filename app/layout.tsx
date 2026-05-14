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
  title: 'SentinAile',
  description: 'Plateforme d\'intelligence géospatiale',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${mono.variable} ${rajdhani.variable}`}>{children}</body>
    </html>
  )
}
