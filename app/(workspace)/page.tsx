'use client'

import { Compass } from 'lucide-react'
import { BriefCards } from '@/components/brief/BriefCards'
import { TopPaths } from '@/components/brief/TopPaths'
import { DemoBadge } from '@/components/common/DemoBadge'
import { RegulatoryContextStrip } from '@/components/context/RegulatoryContextStrip'
import { KeyPointsCard } from '@/components/explain/KeyPointsCard'
import { useCase } from '@/components/shell/CaseContext'
import { CertaintyMark } from '@/components/ui-kit/CertaintyMark'
import { Explain } from '@/components/ui-kit/Explain'
import { TypologyBadge } from '@/components/ui-kit/TypologyBadge'
import { useWorkspace } from '@/lib/store'
import { typologyById } from '@/lib/typologies'

/** Case Brief: the landing page (regulator prompt 23). */
export default function BriefPage() {
  const c = useCase()
  const setTourStep = useWorkspace((s) => s.setTourStep)
  return (
    <div className="flex max-w-7xl flex-col gap-5">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold briefing:text-3xl">{c.title}</h1>
          {c.kind === 'demo' ? <DemoBadge label="Hypothetical scenario" /> : <span className="rounded-full border border-ink px-2 py-0.5 text-xs font-semibold">Real records</span>}
        </div>
        <p className="max-w-4xl text-sm text-muted-foreground briefing:text-base">{c.note}</p>
        <div className="flex flex-wrap items-center gap-2">
          {c.typologyIds.map((id) => {
            const t = typologyById(id)
            return t ? <TypologyBadge key={id} typology={t} /> : null
          })}
          <button type="button" onClick={() => setTourStep(0)} className="flex items-center gap-1 rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Compass className="size-4" aria-hidden="true" />
            Take the tour
          </button>
        </div>
      </header>

      <KeyPointsCard />

      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2 text-xs" data-tour="certainty-legend">
        <span className="font-semibold">
          <Explain term="certainty">How certain each number is</Explain>
        </span>
        <CertaintyMark certainty="documented" />
        <CertaintyMark certainty="derived" />
        <CertaintyMark certainty="estimated" />
        <CertaintyMark certainty="unknown" />
      </div>

      <section aria-labelledby="questions-title" className="flex flex-col gap-2">
        <h2 id="questions-title" className="sr-only">Five questions</h2>
        <BriefCards />
      </section>

      <TopPaths />
      <RegulatoryContextStrip />
    </div>
  )
}
