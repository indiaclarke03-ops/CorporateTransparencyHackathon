'use client'

import { useState } from 'react'
import { showcase } from '@/lib/showcase'
import { FilterButtons, Pill, StatTile, statusTone } from './ui'
import { useShowMore } from './use-show-more'

const ORDER = ['Confirmed', 'Pilot', 'Design', 'Unconfirmed', 'Blocked', 'Gap', 'Other'] as const
const COLOR: Record<string, string> = {
  Confirmed: 'var(--sev-low)', Pilot: 'var(--accent)', Design: '#7f9bbd', Unconfirmed: 'var(--sev-medium)',
  Blocked: 'var(--sev-high)', Gap: 'var(--sev-critical)', Other: 'var(--muted-foreground)',
}

export function DataMap() {
  const m = showcase.data_source_map
  const total = m.needs.length
  const buckets = ORDER.filter((b) => m.status_counts[b])
  const [bucket, setBucket] = useState<string>('All')
  const needs = m.needs.filter((n) => bucket === 'All' || n.bucket === bucket)
  const v = showcase.vendor_docs
  const { shown, toggle } = useShowMore(needs, bucket === 'All' ? 12 : 99)

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile value={v.sayari_endpoints} label="Sayari API operations" sub={`${v.sayari_paths} paths read from Sayari's own OpenAPI spec`} />
        <StatTile value={v.tradeverifyd_tools} label="Tradeverifyd tools" sub="checked against the live tool list" />
        <StatTile value={`${(m.status_counts.Confirmed ?? 0) + (m.status_counts.Pilot ?? 0)}/${total}`} label="Data needs confirmed" sub="in vendor docs, or seen in a live response" tone="good" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-background" role="img" aria-label="Status of every data need">
          {buckets.map((b) => (
            <span key={b} style={{ width: `${(100 * m.status_counts[b]) / total}%`, background: COLOR[b] }} title={`${b}: ${m.status_counts[b]}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {buckets.map((b) => (
            <span key={b} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: COLOR[b] }} />{b} {m.status_counts[b]}</span>
          ))}
        </div>
      </div>

      <FilterButtons options={['All', ...buckets]} value={bucket} onChange={setBucket} />
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr><th className="p-2">Question</th><th className="p-2">Need</th><th className="p-2">Tool</th><th className="p-2">Status</th></tr>
          </thead>
          <tbody>
            {shown.map((n, i) => (
              <tr key={i} className="border-t border-border align-top">
                <td className="p-2 text-xs text-muted-foreground">{n.section.replace(/\*/g, '')}</td>
                <td className="p-2 font-semibold">{n.need}</td>
                <td className="p-2 text-xs">{n.tool.length > 180 ? n.tool.slice(0, 180) + '…' : n.tool}</td>
                <td className="p-2"><Pill tone={statusTone(n.bucket)}>{n.bucket}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toggle}

      <details className="rounded-2xl bg-muted p-3 text-sm">
        <summary className="cursor-pointer font-semibold">The tool registry: the only calls the app is allowed to make ({m.registry.length})</summary>
        <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {m.registry.map((t) => (
            <li key={t.tool} className="flex min-w-0 flex-col gap-1 break-words rounded-xl bg-background/60 p-2">
              <span className="flex items-start justify-between gap-2"><span className="min-w-0 break-words font-mono text-xs font-bold text-accent">{t.tool}</span><Pill tone={statusTone(t.status)}>{t.status}</Pill></span>
              <span className="text-xs text-muted-foreground">{t.backed_by}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
