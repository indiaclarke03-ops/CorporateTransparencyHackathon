import type { Metadata, Viewport } from 'next'
import { Public_Sans, Source_Serif_4 } from 'next/font/google'
import { DisclaimerBanner } from '@/components/layout/DisclaimerBanner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import './globals.css'

const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-public-sans' })
const sourceSerif = Source_Serif_4({ subsets: ['latin'], variable: '--font-source-serif' })

export const metadata: Metadata = {
  title: 'Follow the Public Dollar',
  description: 'Tracing public funds through ownership, trade, and payment networks. Outputs are risk leads for review, not findings of wrongdoing.',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1724' },
  ],
  colorScheme: 'light dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(publicSans.variable, sourceSerif.variable)}>
      <body className="font-sans antialiased">
        <TooltipProvider>
          <DisclaimerBanner />
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}
