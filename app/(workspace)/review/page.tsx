'use client'

import { useCase } from '@/components/shell/CaseContext'
import { generateAlerts } from '@/lib/alerts'
import { useWorkspace } from '@/lib/store'

export default function ReviewPage() {
  const c = useCase()
  const { setSelectedEntityId, packet } = useWorkspace()
  const alerts = generateAlerts(c)
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold briefing:text-2xl">Review</h1>
      <p className="text-sm text-muted-foreground">What needs my decision? {packet.length} {packet.length === 1 ? 'item is' : 'items are'} in the referral packet.</p>
      <ul className="flex flex-col gap-2" data-tour="review-queue">
        {alerts.length === 0 && <li className="rounded-md bg-muted p-3 text-sm">No leads need a decision in this case.</li>}
        {alerts.map((a) => (
          <li key={a.id} className="flex flex-col gap-1 rounded-md border border-border bg-card p-3 text-sm">
            <span className="text-xs font-semibold capitalize text-muted-foreground">{a.kind.replaceAll('_', ' ')}</span>
            <span>{a.message}</span>
            {a.entityId && (
              <button type="button" onClick={() => setSelectedEntityId(a.entityId)} className="w-fit text-xs font-semibold underline underline-offset-2">
                Open the entity
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
