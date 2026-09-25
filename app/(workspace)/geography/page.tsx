'use client'

import { ViewGuide, ViewTitle } from '@/components/explain/ViewGuide'
import { useCase } from '@/components/shell/CaseContext'
import { MoneyAmount } from '@/components/ui-kit/MoneyAmount'
import { calloutsFor } from '@/lib/callouts'

export default function GeographyPage() {
  const c = useCase()
  const byJ = new Map<string, typeof c.entities>()
  for (const e of c.entities) byJ.set(e.jurisdiction ?? 'Unknown', [...(byJ.get(e.jurisdiction ?? 'Unknown') ?? []), e])
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-3">
          <ViewTitle guideId="geography">Geography</ViewTitle>
          <p className="text-sm text-muted-foreground">Where are the risks? One card per jurisdiction of registration.</p>
        </div>
        <ViewGuide view="geography" />
      </div>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[...byJ.entries()].sort((a, b) => b[1].length - a[1].length).map(([j, es]) => {
          const dollars = es.reduce((s, e) => s + (e.observedDollarsIn ?? 0), 0)
          const callouts = [...new Map(es.flatMap((e) => calloutsFor(e)).map((x) => [x.id, x])).values()]
          return (
            <li key={j} className="flex flex-col gap-1 rounded-md border border-border bg-card p-3 text-sm">
              <span className="font-mono text-base font-semibold">{j}</span>
              <span>{es.length} {es.length === 1 ? 'entity' : 'entities'}</span>
              {dollars > 0 && <MoneyAmount value={dollars} certainty="derived" />}
              {callouts.length > 0 && <span className="text-xs text-muted-foreground">Callouts: {callouts.map((x) => x.id).join(', ')}</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
