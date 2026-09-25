import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, Public_Sans, Source_Serif_4 } from 'next/font/google'
import { DisclaimerBanner } from '@/components/layout/DisclaimerBanner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import './globals.css'

const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-public-sans' })
const sourceSerif = Source_Serif_4({ subsets: ['latin'], variable: '--font-source-serif' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex-mono' })

export const metadata: Metadata = {
  title: 'Follow the Public Dollar',
  description: 'Tracing public funds through ownership, trade, and payment networks. Outputs are risk leads for review, not findings of wrongdoing.',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#12151c' },
  ],
  colorScheme: 'light dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(publicSans.variable, sourceSerif.variable, plexMono.variable)} data-density="briefing" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <TooltipProvider>
          <DisclaimerBanner />
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}
