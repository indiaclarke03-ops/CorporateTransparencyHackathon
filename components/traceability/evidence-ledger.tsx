'use client'

import { useMemo, useState } from 'react'
import { showcase } from '@/lib/showcase'
import { FilterButtons, Pill, SourceChip } from './ui'
import { useShowMore } from './use-show-more'

export function EvidenceLedger() {
  const kinds = useMemo(() => ['all', ...Array.from(new Set(showcase.ledger.map((r) => r.kind)))], [])
  const [kind, setKind] = useState('all')
  const facts = showcase.ledger.filter((r) => kind === 'all' || r.kind === kind)
  const { shown, toggle } = useShowMore(facts, kind === 'all' ? 8 : 99)
  const counts = Object.fromEntries(kinds.map((k) => [k, k === 'all' ? showcase.ledger.length : showcase.ledger.filter((r) => r.kind === k).length]))

  return (
    <div className="flex flex-col gap-4">
      <FilterButtons options={kinds} value={kind} onChange={setKind} counts={counts} />
      <ul className="flex flex-col gap-2">
        {shown.map((f) => (
          <li key={f.fact_id} className="flex flex-col gap-1.5 rounded-2xl bg-muted p-3 md:flex-row md:gap-4">
            <div className="flex shrink-0 items-start gap-1.5 md:w-40 md:flex-col">
              <span className="font-mono text-xs font-bold text-accent">{f.fact_id}</span>
              <Pill>{f.kind}</Pill>
              <Pill tone={f.confidence === 'A' ? 'good' : f.confidence === 'B' ? 'accent' : 'warn'}>Grade {f.confidence}</Pill>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <q className="text-sm leading-relaxed">{f.claim_as_the_source_states_it}</q>
              <p className="text-xs text-muted-foreground">
                {f.source_id.split(';').map((s) => <SourceChip key={s} id={s.trim()} />)}
                {f.locator && <span> · {f.locator}</span>}
              </p>
              {f.notes && <p className="text-xs leading-snug text-muted-foreground">{f.notes}</p>}
            </div>
          </li>
        ))}
      </ul>
      {toggle}
    </div>
  )
}
