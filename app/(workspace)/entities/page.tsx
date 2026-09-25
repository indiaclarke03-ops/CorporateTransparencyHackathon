'use client'

import { useCase } from '@/components/shell/CaseContext'
import { MoneyAmount } from '@/components/ui-kit/MoneyAmount'
import { RiskBand } from '@/components/ui-kit/RiskBand'
import { isCountedListed } from '@/lib/exposure'
import { useWorkspace } from '@/lib/store'

export default function EntitiesPage() {
  const c = useCase()
  const setSelectedEntityId = useWorkspace((s) => s.setSelectedEntityId)
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold briefing:text-2xl">Entities</h1>
      <p className="text-sm text-muted-foreground">Everyone in this case. Select a row for the full profile.</p>
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">Entities in the case</caption>
          <thead className="bg-muted text-left text-xs">
            <tr>
              <th scope="col" className="p-2">Name</th>
              <th scope="col" className="p-2">Jurisdiction</th>
              <th scope="col" className="p-2">Risk tier</th>
              <th scope="col" className="p-2">Listed</th>
              <th scope="col" className="p-2 text-right">Signals fired</th>
              <th scope="col" className="p-2 text-right">Public dollars in</th>
            </tr>
          </thead>
          <tbody>
            {c.entities.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="p-2">
                  <button type="button" onClick={() => setSelectedEntityId(e.id)} className="text-left font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {e.name}
                  </button>
                </td>
                <td className="p-2 font-mono text-xs">{e.jurisdiction ?? '—'}</td>
                <td className="p-2"><RiskBand tier={e.tier} /></td>
                <td className="p-2 text-xs">{isCountedListed(e) ? 'Yes' : e.listedStatus.kind === 'not_checked' ? 'Not checked' : 'No'}</td>
                <td className="p-2 text-right tabular-nums">{e.indicators.filter((i) => i.state === 'fired').length}</td>
                <td className="p-2 text-right">{e.observedDollarsIn ? <MoneyAmount value={e.observedDollarsIn} showCertainty={false} /> : <span className="text-xs text-muted-foreground">Not in record</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
