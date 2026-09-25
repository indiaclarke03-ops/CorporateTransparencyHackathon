'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Landmark } from 'lucide-react'

/** Page header: product name, subtitle and the page's own controls on the right. */
export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
        <Link href="/" className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Landmark className="size-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-semibold leading-tight">Follow the Public Dollar</span>
            <span className="text-xs text-muted-foreground">Tracing public funds through ownership, trade, and payment networks</span>
          </span>
        </Link>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </header>
  )
}
