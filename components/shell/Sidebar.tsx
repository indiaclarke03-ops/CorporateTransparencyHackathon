'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Banknote, CalendarRange, ClipboardCheck, Container, FileText, Globe2, Info, List, Network, Route, ScrollText, Shapes, Users, type LucideIcon } from 'lucide-react'
import { SECTIONS, sectionForPath, type Section } from '@/lib/sections'
import { useWorkspace } from '@/lib/store'
import { cn } from '@/lib/utils'

const ICONS: Record<Section['icon'], LucideIcon> = { FileText, Banknote, Container, Users, Shapes, CalendarRange, Globe2, List, ClipboardCheck, ScrollText }

export function Sidebar({ counts }: { counts: Partial<Record<string, number>> }) {
  const pathname = usePathname()
  const active = sectionForPath(pathname)
  const briefing = useWorkspace((s) => s.density === 'briefing')
  return (
    <nav aria-label="Case sections" className="flex flex-col gap-4 border-r border-border bg-muted/60 p-2 md:w-60 md:p-3 print:hidden" data-tour="nav">
      <ol className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {SECTIONS.map((s) => {
          const Icon = ICONS[s.icon]
          const on = active?.id === s.id
          return (
            <li key={s.id}>
              <Link
                href={s.href}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  on ? 'bg-ink text-paper' : 'text-foreground hover:bg-background',
                )}
              >
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2 whitespace-nowrap font-medium">
                    {s.label}
                    {counts[s.id] ? <span className={cn('rounded-full px-1.5 text-[10px] tabular-nums', on ? 'bg-paper/20' : 'bg-background')}>{counts[s.id]}</span> : null}
                  </span>
                  {briefing && <span className={cn('hidden text-[11px] leading-snug md:block', on ? 'text-paper/80' : 'text-muted-foreground')}>{s.question}</span>}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      <div className="hidden flex-col gap-1 border-t border-border pt-3 text-xs md:flex">
        <span className="px-2 font-semibold text-muted-foreground">More</span>
        {[
          { href: '/explorer', label: 'Case explorer (graph)', icon: Network },
          { href: '/traceability', label: 'Traceability', icon: Route },
          { href: '/about', label: 'About the project', icon: Info },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <l.icon className="size-3.5" aria-hidden="true" />
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
