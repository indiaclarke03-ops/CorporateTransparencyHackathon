'use client'

import { useCase } from '@/components/shell/CaseContext'
import { MoneyAmount } from '@/components/ui-kit/MoneyAmount'

export default function SupplyChainPage() {
  const c = useCase()
  const name = (id: string) => c.entities.find((e) => e.id === id)?.name ?? id
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold briefing:text-2xl">Supply Chain</h1>
      <p className="text-sm text-muted-foreground">Who is in the supply chain? Shipments on record, in date order.</p>
      <div className="overflow-x-auto rounded-md border border-border bg-card" data-tour="lanes">
        {c.shipments.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No shipment records are attached to this case, so trade signals cannot be checked.</p>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">Shipments</caption>
            <thead className="bg-muted text-left text-xs">
              <tr>
                <th scope="col" className="p-2">Date</th>
                <th scope="col" className="p-2">Shipper → receiver</th>
                <th scope="col" className="p-2">HS code</th>
                <th scope="col" className="p-2">Route</th>
                <th scope="col" className="p-2 text-right">Declared value</th>
                <th scope="col" className="p-2">Flags</th>
              </tr>
            </thead>
            <tbody>
              {c.shipments.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-2 tabular-nums">{s.date ?? '—'}</td>
                  <td className="p-2">{name(s.shipperId)} → {name(s.receiverId)}</td>
                  <td className="p-2 font-mono text-xs">{s.hsCode ?? '—'}</td>
                  <td className="p-2 font-mono text-xs">{[s.origin, ...s.via, s.destination].filter(Boolean).join(' → ')}</td>
                  <td className="p-2 text-right">{s.declaredValueUsd !== null ? <MoneyAmount value={s.declaredValueUsd} certainty="estimated" /> : 'Not in record'}</td>
                  <td className="p-2 text-xs">{s.flags.join(', ').replaceAll('_', ' ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
