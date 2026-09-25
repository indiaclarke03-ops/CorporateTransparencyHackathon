'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Building2, ChevronDown, Info, RefreshCcw, ShieldAlert, User } from 'lucide-react'
import { useCase } from '@/components/shell/CaseContext'
import { CertaintyMark } from '@/components/ui-kit/CertaintyMark'
import { RiskBand } from '@/components/ui-kit/RiskBand'
import { UnverifiedLabel } from '@/components/ui-kit/TypologyBadge'
import { EDGE_STYLE } from '@/components/network/edge-style'
import { EXPLAINERS, type Swatch, type ViewKey } from '@/lib/explainers'
import { viewKeyPoints } from '@/lib/narrative'
import { useWorkspace } from '@/lib/store'
import { cn } from '@/lib/utils'

function Line({ kind }: { kind: keyof typeof EDGE_STYLE }) {
  const s = EDGE_STYLE[kind]
  return (
    <svg width="34" height="10" aria-hidden="true" className="shrink-0">
      <line x1="1" y1="5" x2={s.arrow ? 27 : 33} y2="5" stroke={s.stroke} strokeWidth={s.width} strokeDasharray={s.dash} />
      {s.arrow && <path d="M27 1 L33 5 L27 9 Z" fill={s.stroke} />}
    </svg>
  )
}

/** Legend swatches rendered with the same components the charts use. */
function SwatchView({ swatch }: { swatch: Swatch }) {
  switch (swatch) {
    case 'ribbon-width':
      return <svg width="34" height="14" aria-hidden="true"><rect x="0" y="5" width="34" height="3" fill="var(--money)" /><rect x="0" y="0" width="34" height="3" fill="var(--money)" opacity="0.4" /><rect x="0" y="10" width="34" height="4" fill="var(--money)" opacity="0.7" /></svg>
    case 'money-green':
    case 'money-shade':
      return <span className="block h-3.5 w-8 rounded-sm bg-money" aria-hidden="true" />
    case 'certainty':
      return <span className="flex gap-1"><CertaintyMark certainty="documented" showLabel={false} /><CertaintyMark certainty="estimated" showLabel={false} /><CertaintyMark certainty="unknown" showLabel={false} /></span>
    case 'endpoint-groups':
      return <span className="flex gap-0.5" aria-hidden="true"><span className="h-3.5 w-1.5 bg-risk-red" /><span className="h-3.5 w-1.5 bg-risk-amber" /><span className="h-3.5 w-1.5 bg-risk-sand" /><span className="h-3.5 w-1.5 border border-dotted border-unknown" /></span>
    case 'risk-ring':
    case 'card-outline':
      return <span className="flex gap-1"><RiskBand tier="high" /><RiskBand tier="low" /></span>
    case 'shield':
      return <span className="flex size-5 items-center justify-center rounded-full bg-risk-red text-on-color"><ShieldAlert className="size-3" aria-hidden="true" /></span>
    case 'node-size':
      return <span className="flex items-end gap-1" aria-hidden="true"><span className="size-2.5 rounded-full border-2 border-ink" /><span className="size-4 rounded-full border-2 border-ink" /></span>
    case 'line-ownership':
      return <Line kind="ownership" />
    case 'line-control':
      return <Line kind="control" />
    case 'arrow-goods':
      return <Line kind="trade" />
    case 'payment':
      return <span className="rounded-full border border-money px-1 text-[10px] font-semibold text-money">$</span>
    case 'line-sibling':
      return <Line kind="sibling" />
    case 'possible-match':
      return <span className="rounded-full border border-dashed border-unknown px-1 text-[10px] font-semibold text-unknown">?</span>
    case 'tier-columns':
    case 'lanes':
      return <span className="flex gap-0.5" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} className="h-3.5 w-2 rounded-sm bg-muted ring-1 ring-border" />)}</span>
    case 'hs-chip':
      return <span className="rounded bg-muted px-1 font-mono text-[10px]">903039</span>
    case 'person-company':
      return <span className="flex gap-1"><User className="size-4" aria-hidden="true" /><Building2 className="size-4" aria-hidden="true" /></span>
    case 'end-cap':
      return <span className="rounded border border-dotted border-unknown px-1 text-[10px] text-unknown">No natural person</span>
    case 'loop':
      return <RefreshCcw className="size-4" aria-hidden="true" />
    case 'event-icons':
      return <ArrowRight className="size-4" aria-hidden="true" />
    case 'brackets':
      return <svg width="30" height="12" aria-hidden="true"><path d="M2 10 V3 H28 V10" fill="none" stroke="var(--ink)" strokeWidth="1.5" /></svg>
    case 'disclosure-texture':
      return <span className="flex gap-1"><CertaintyMark certainty="documented" showLabel={false} /><CertaintyMark certainty="unknown" showLabel={false} /></span>
    case 'transshipment-marker':
      return <CertaintyMark certainty="estimated" showLabel={false} />
    case 'fit-count':
      return <span className="rounded border border-dashed border-ink px-1 text-[10px] font-semibold">3 of 6</span>
    case 'unverified':
      return <UnverifiedLabel className="text-[10px]" />
  }
}

/**
 * "How to read this" panel. Expanded by default in Briefing mode, collapsed in Analyst mode;
 * the "i" button beside a view title opens it.
 */
export function ViewGuide({ view, className }: { view: ViewKey; className?: string }) {
  const c = useCase()
  const { density, setHighlight, highlight } = useWorkspace()
  const [open, setOpen] = useState(density === 'briefing')
  useEffect(() => setOpen(density === 'briefing'), [density])
  const ex = EXPLAINERS[view]
  const points = viewKeyPoints(view === 'supply' ? 'geography' : view, c)
  const id = `guide-${view}`

  return (
    <aside className={cn('rounded-md border border-border bg-card text-sm', className)} aria-labelledby={`${id}-title`} data-tour={`guide-${view}`}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span id={`${id}-title`} className="flex items-center gap-1.5 font-semibold">
          <Info className="size-4" aria-hidden="true" />
          How to read this
        </span>
        <ChevronDown className={cn('size-4 transition', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <div id={id} className="flex flex-col gap-3 border-t border-border px-3 py-3">
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground">What this shows</h4>
            <p>{ex.whatThisShows}</p>
          </section>
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground">How to read it</h4>
            <ul className="mt-1 flex flex-col gap-1.5">
              {ex.encodings.map((e) => (
                <li key={e.meaning} className="flex items-center gap-2 text-xs">
                  <span className="flex w-24 shrink-0 justify-start">
                    <SwatchView swatch={e.swatch} />
                  </span>
                  <span>{e.meaning}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground">Key points in this case</h4>
            <ul className="mt-1 flex flex-col gap-1.5">
              {points.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span>{p.text}</span>
                  <CertaintyMark certainty={p.certainty} />
                  {p.highlight.length > 0 && (
                    <button
                      type="button"
                      aria-pressed={highlight.join() === p.highlight.join()}
                      onClick={() => setHighlight(highlight.join() === p.highlight.join() ? [] : p.highlight)}
                      className="rounded-full border border-ink px-2 py-px text-[11px] font-semibold hover:bg-ink hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Show me
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground">What this does not show</h4>
            <p className="text-xs">{ex.limitations}</p>
          </section>
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground">Try this</h4>
            <p className="text-xs">{ex.tryThis}</p>
          </section>
        </div>
      )}
    </aside>
  )
}

/** View title with an "i" button that opens its guide. */
export function ViewTitle({ children, guideId }: { children: React.ReactNode; guideId: ViewKey }) {
  return (
    <h1 className="flex items-center gap-2 text-xl font-semibold briefing:text-2xl">
      {children}
      <button
        type="button"
        aria-label="How to read this view"
        onClick={() => {
          const el = document.querySelector<HTMLButtonElement>(`[data-tour="guide-${guideId}"] button[aria-expanded="false"]`)
          el?.click()
          document.querySelector(`[data-tour="guide-${guideId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }}
        className="flex size-6 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>
    </h1>
  )
}
