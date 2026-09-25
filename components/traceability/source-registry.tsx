'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, ExternalLink, EyeOff, Search } from 'lucide-react'
import { showcase } from '@/lib/showcase'
import { FilterButtons, Pill } from './ui'
import { useShowMore } from './use-show-more'

const SOURCE_HASH = /^#source-/

const TIERS = ['All', 'Tier 1', 'Tier 2'] as const

export function SourceRegistry() {
  const [tier, setTier] = useState<(typeof TIERS)[number]>('All')
  const [q, setQ] = useState('')
  const sources = useMemo(
    () =>
      showcase.sources.filter(
        (s) =>
          (tier === 'All' || `Tier ${s.tier}` === tier) &&
          (!q || `${s.id} ${s.name} ${s.publisher ?? ''} ${s.url}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [tier, q],
  )
  const { shown, toggle } = useShowMore(sources, q || tier !== 'All' ? 99 : 12, SOURCE_HASH)
  const counts = {
    All: showcase.sources.length,
    'Tier 1': showcase.sources.filter((s) => s.tier === 1).length,
    'Tier 2': showcase.sources.filter((s) => s.tier === 2).length,
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <FilterButtons options={TIERS} value={tier} onChange={setTier} counts={counts} />
        <label className="flex h-9 min-w-0 items-center gap-2 rounded-full border border-border bg-background px-3 text-sm md:w-72">
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Search sources</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search OFAC, Companies House…" className="w-full bg-transparent outline-none placeholder:text-muted-foreground" />
        </label>
      </div>
      <ul className="grid gap-2 md:grid-cols-2">
        {shown.map((s) => (
          <li key={s.id} id={`source-${s.id}`} className="scroll-mt-28 flex flex-col gap-1.5 rounded-2xl bg-muted p-3 target:ring-2 target:ring-accent">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-accent">{s.id}</span>
              <Pill tone={s.tier === 1 ? 'good' : 'accent'}>Tier {s.tier}</Pill>
              {s.content_verified ? (
                <Pill tone="good"><CheckCircle2 className="size-3" /> Content read</Pill>
              ) : (
                <Pill tone="warn"><EyeOff className="size-3" /> Title only</Pill>
              )}
              {s.checker.length === 0 ? <Pill>Citation check clean</Pill> : s.checker.map((c) => <Pill key={c.message} tone="warn">Checker: {c.message}</Pill>)}
            </div>
            <p className="text-sm font-semibold leading-snug">{s.name}</p>
            <p className="text-xs text-muted-foreground">
              {s.publisher ? `Published by ${s.publisher}` : 'Publisher not recorded'}
              {s.published ? ` · ${s.published}` : ''} · retrieved {s.retrieved_at ?? '—'} via {s.retrieved_via ?? '—'}
            </p>
            {s.note && <p className="text-xs leading-snug text-muted-foreground">Note: {s.note}</p>}
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 break-all text-xs font-semibold text-accent hover:underline">
              <ExternalLink className="size-3 shrink-0" /> {s.url}
            </a>
          </li>
        ))}
      </ul>
      {toggle}
      <details className="rounded-2xl bg-muted p-3 text-sm">
        <summary className="cursor-pointer font-semibold">Tier 3: seen during research, never used as evidence ({showcase.tier3.length})</summary>
        <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
          {showcase.tier3.map((t) => (
            <li key={t.url}><span className="font-mono">{t.url}</span>: {t.note}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}
