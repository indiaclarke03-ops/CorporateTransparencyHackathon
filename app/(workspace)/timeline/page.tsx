'use client'

import { ViewGuide, ViewTitle } from '@/components/explain/ViewGuide'
import { useCase } from '@/components/shell/CaseContext'
import { CertaintyMark } from '@/components/ui-kit/CertaintyMark'
import { caseEvents, sequenceFlags } from '@/lib/timeline'

export default function TimelinePage() {
  const c = useCase()
  const events = caseEvents(c)
  const flags = sequenceFlags(c)
  const name = (id: string) => c.entities.find((e) => e.id === id)?.name ?? id
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-3">
          <ViewTitle guideId="timeline">Timeline</ViewTitle>
          <p className="text-sm text-muted-foreground">In what order did things happen?</p>
          {flags.length > 0 && (
            <ul className="flex flex-col gap-1">
              {flags.map((f) => (
                <li key={f.id} className="rounded-md border-l-4 border-ink bg-muted px-3 py-1.5 text-sm">
                  <strong>{name(f.entityIds[0])}:</strong> {f.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <ViewGuide view="timeline" />
      </div>
      <ol className="flex flex-col gap-1 border-l-2 border-border pl-4">
        {events.length === 0 && <li className="text-sm text-muted-foreground">No dated events are on record for this case.</li>}
        {events.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="w-24 font-mono text-xs tabular-nums">{e.date}</span>
            <span className="font-medium">{name(e.entityId)}</span>
            <span>{e.label}</span>
            <CertaintyMark certainty={e.certainty} />
          </li>
        ))}
      </ol>
    </div>
  )
}
