'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { RegulatoryCallout } from '@/components/common/RegulatoryCallout'
import { useCase } from '@/components/shell/CaseContext'
import { CALLOUTS, calloutsFor, needsReverification } from '@/lib/callouts'
import { formatDate } from '@/lib/format'
import type { RegulatoryCallout as Callout } from '@/lib/types'

/** Callouts relevant to this case as compact cards; each opens the full callout (prompt 33). */
export function RegulatoryContextStrip() {
  const c = useCase()
  const relevant = new Map<string, Callout>()
  for (const e of c.entities) for (const co of calloutsFor(e)) relevant.set(co.id, co)
  const list = relevant.size ? [...relevant.values()] : [CALLOUTS['RD-01'], CALLOUTS['RD-02']]
  const [open, setOpen] = useState<string | null>(null)
  return (
    <section aria-labelledby="context-title" className="flex flex-col gap-2" data-tour="context">
      <h2 id="context-title" className="text-sm font-semibold">Regulatory context: why now</h2>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {list.map((co) => {
          const stale = needsReverification(co)
          return (
            <li key={co.id} className="min-w-60 max-w-72 shrink-0">
              <button
                type="button"
                aria-expanded={open === co.id}
                onClick={() => setOpen(open === co.id ? null : co.id)}
                className="flex h-full w-full flex-col gap-1 rounded-md border border-border bg-card p-3 text-left text-xs hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="font-mono text-[11px] text-muted-foreground">{co.id}</span>
                <span className="font-semibold">{co.title}</span>
                <span className="text-muted-foreground">Last verified {formatDate(co.lastVerified)}</span>
                {stale && (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-risk-amber px-2 py-px font-semibold text-ink">
                    <AlertTriangle className="size-3" aria-hidden="true" />
                    Needs re-verification
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {open && relevant.get(open) && <RegulatoryCallout {...relevant.get(open)!} />}
      {open && !relevant.get(open) && <RegulatoryCallout {...CALLOUTS[open as keyof typeof CALLOUTS]} />}
    </section>
  )
}
