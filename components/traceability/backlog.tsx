'use client'

import { useState } from 'react'
import { showcase } from '@/lib/showcase'
import { FilterButtons, Pill, statusTone } from './ui'

const GROUPS = ['All', 'Decision needed', 'Open / new', 'Later', 'Resolved'] as const

function group(status: string): (typeof GROUPS)[number] {
  const s = status.toLowerCase()
  if (s.startsWith('decision')) return 'Decision needed'
  if (s.startsWith('resolved') || s.startsWith('mostly resolved')) return 'Resolved'
  if (s.startsWith('later')) return 'Later'
  return 'Open / new'
}

export function Backlog() {
  const items = showcase.data_source_map.backlog
  const [g, setG] = useState<(typeof GROUPS)[number]>('All')
  const counts = Object.fromEntries(GROUPS.map((x) => [x, x === 'All' ? items.length : items.filter((i) => group(i.status) === x).length]))
  const shown = items.filter((i) => g === 'All' || group(i.status) === g)

  return (
    <div className="flex flex-col gap-4">
      <FilterButtons options={GROUPS} value={g} onChange={setG} counts={counts} />
      <ul className="flex flex-col gap-2">
        {shown.map((b) => (
          <li key={b.id} className="grid gap-2 break-words rounded-2xl bg-muted p-3 text-sm md:grid-cols-[4rem_minmax(0,1fr)_14rem] [&>*]:min-w-0">
            <span className="font-mono text-xs font-bold text-accent">{b.id}</span>
            <span className="leading-snug">{b.item}</span>
            <span className="flex flex-col gap-1"><Pill tone={statusTone(b.status)}>{group(b.status)}</Pill><span className="text-xs text-muted-foreground">{b.status}</span></span>
          </li>
        ))}
      </ul>
    </div>
  )
}
