import type { Metadata, Viewport } from 'next'
import { Fredoka, Nunito } from 'next/font/google'
import './globals.css'

const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-fredoka', weight: ['500', '600', '700'] })
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' })

export const metadata: Metadata = {
  title: 'Follow the Public Dollar — Investigation Graph',
  description:
    'Explore corporate-transparency sanctions investigations as an interactive force-directed graph with risk signals, provenance, and a full audit trail.',
}

export const viewport: Viewport = {
  themeColor: '#221814',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`bg-background ${fredoka.variable} ${nunito.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
