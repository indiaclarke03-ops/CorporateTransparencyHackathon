'use client'

import Link from 'next/link'
import { Compass, FileDown, HelpCircle, Landmark, Presentation } from 'lucide-react'
import { CASE_OPTIONS } from '@/lib/cases'
import { useWorkspace, type Density } from '@/lib/store'
import { TYPOLOGIES } from '@/lib/typologies'
import { cn } from '@/lib/utils'

export function ShellTopBar({ onHelp }: { onHelp: () => void }) {
  const { caseId, setCaseId, lens, setLens, density, setDensity, setPresenting, setTourStep } = useWorkspace()
  const demo = CASE_OPTIONS.filter((c) => c.kind === 'demo')
  const real = CASE_OPTIONS.filter((c) => c.kind === 'real')
  return (
    <header className="border-b border-border bg-background print:hidden">
      <div className="flex flex-col gap-2 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between md:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex size-8 items-center justify-center rounded-md bg-ink text-paper">
            <Landmark className="size-4.5" aria-hidden="true" />
          </span>
          <span className="flex flex-col">
            <span className="font-semibold leading-tight">Follow the Public Dollar</span>
            <span className="text-[11px] text-muted-foreground">Tracing public funds through ownership, trade, and payment networks</span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Case
            <select
              id="case-select"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="h-8 max-w-64 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <optgroup label="Demo">
                {demo.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Real records">
                {real.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-muted-foreground" data-tour="lens">
            Lens
            <select
              value={lens ?? ''}
              onChange={(e) => setLens(e.target.value || null)}
              className="h-8 max-w-52 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">No typology lens</option>
              {TYPOLOGIES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <div role="group" aria-label="Density" className="flex rounded-md border border-input p-0.5">
            {(['briefing', 'analyst'] as Density[]).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={density === d}
                onClick={() => setDensity(d)}
                className={cn('rounded px-2 py-0.5 text-xs font-medium capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', density === d ? 'bg-ink text-paper' : 'text-muted-foreground hover:text-foreground')}
              >
                {d}
              </button>
            ))}
          </div>

          <button type="button" onClick={() => setTourStep(0)} className="flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Compass className="size-3.5" aria-hidden="true" />
            Tour
          </button>
          <button type="button" onClick={() => setPresenting(true)} className="flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-keyshortcuts="p">
            <Presentation className="size-3.5" aria-hidden="true" />
            Present
          </button>
          <Link href={`/report/${caseId}`} className="flex h-8 items-center gap-1 rounded-md bg-ink px-2.5 text-xs font-semibold text-paper hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <FileDown className="size-3.5" aria-hidden="true" />
            Export report
          </Link>
          <button type="button" onClick={onHelp} className="flex size-8 items-center justify-center rounded-md border border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Help and keyboard shortcuts" aria-keyshortcuts="?">
            <HelpCircle className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}
