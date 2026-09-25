'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { DemoBadge } from '@/components/common/DemoBadge'
import { useCase } from '@/components/shell/CaseContext'
import { formatUSD } from '@/lib/format'
import { buildMoneyTrail, pathsOfConcern } from '@/lib/money'
import { useWorkspace } from '@/lib/store'
import { TOUR } from '@/lib/tour'
import type { CaseFile } from '@/lib/types'

function fill(text: string, c: CaseFile) {
  const trail = buildMoneyTrail(c)
  const top = pathsOfConcern(c, 1)[0]
  const byId = new Map(c.entities.map((e) => [e.id, e]))
  const noPerson = c.entities.find((e) => e.indicators.some((i) => i.key === 'ST1' && i.state === 'fired'))
  const chpl = c.shipments.find((s) => s.flags.includes('chpl') && s.flags.includes('pass_through'))
  const values: Record<string, string> = {
    award: c.award ? `${formatUSD(c.award.obligated, { compact: true })} awarded by ${c.award.agency}` : 'no award is on record for this case',
    topFlow: top ? `The widest flow into a flagged endpoint carries ${formatUSD(top.amount, { compact: true })} to ${byId.get(top.entityIds.at(-1)!)?.name}.` : '',
    trailEnds: trail ? formatUSD(trail.byEndpoint.trail_ends, { compact: true }) : 'not applicable',
    noPerson: noPerson ? `The ownership chain of ${noPerson.name} ends at a company: no natural person identified.` : 'No ownership chain in this case ends without a natural person.',
    chpl: chpl ? `${byId.get(chpl.shipperId)?.name} passed CHPL goods (HS ${chpl.hsCode}) on to ${byId.get(chpl.receiverId)?.name}.` : '',
  }
  return text.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? '')
}

/** Step-by-step walkthrough of the demo case (regulator prompt 37). */
export function GuidedTour() {
  const c = useCase()
  const router = useRouter()
  const pathname = usePathname()
  const { tourStep, setTourStep, caseId, setCaseId, clearSelection } = useWorkspace()
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = tourStep === null ? null : TOUR[Math.min(tourStep, TOUR.length - 1)]

  useEffect(() => {
    if (caseId !== 'demo') setCaseId('demo')
    clearSelection()
  }, [caseId, setCaseId, clearSelection])

  useEffect(() => {
    if (!step) return
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
    const here = pathname.replace(base, '').replace(/\/$/, '') || '/'
    if (here !== step.route) router.push(step.route)
  }, [step, pathname, router])

  useLayoutEffect(() => {
    if (!step?.target) return setRect(null)
    let frame = 0
    const find = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
        setRect(el.getBoundingClientRect())
      } else frame = window.setTimeout(find, 120)
    }
    find()
    const onResize = () => setRect(document.querySelector(`[data-tour="${step.target}"]`)?.getBoundingClientRect() ?? null)
    window.addEventListener('resize', onResize)
    return () => {
      window.clearTimeout(frame)
      window.removeEventListener('resize', onResize)
    }
  }, [step, pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tourStep === null) return
      if (e.key === 'ArrowRight') setTourStep(Math.min(TOUR.length - 1, tourStep + 1))
      if (e.key === 'ArrowLeft') setTourStep(Math.max(0, tourStep - 1))
      if (e.key === 'Escape') setTourStep(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tourStep, setTourStep])

  if (!step || tourStep === null) return null
  const last = tourStep === TOUR.length - 1
  const pad = 6

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-md ring-4 ring-ring transition-all"
          style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: '0 0 0 9999px rgb(10 12 16 / 0.55)' }}
        />
      ) : (
        <div className="fixed inset-0 bg-[rgb(10_12_16/0.55)]" />
      )}
      <div className="fixed bottom-4 left-1/2 w-[min(92vw,30rem)] -translate-x-1/2 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-xl">
        <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Step {tourStep + 1} of {TOUR.length}
          </span>
          <DemoBadge />
        </div>
        <h2 id="tour-title" className="text-lg font-semibold">{step.title}</h2>
        <p className="mt-1 text-sm leading-relaxed">{fill(step.body, c)}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" onClick={() => setTourStep(null)} className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Exit tour
          </button>
          <div className="flex gap-2">
            <button type="button" disabled={tourStep === 0} onClick={() => setTourStep(tourStep - 1)} className="rounded-md border border-border px-3 py-1 text-sm font-medium disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Back
            </button>
            <button type="button" autoFocus onClick={() => setTourStep(last ? null : tourStep + 1)} className="rounded-md bg-ink px-3 py-1 text-sm font-semibold text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {last ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
