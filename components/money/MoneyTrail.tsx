'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from 'd3-sankey'
import { Download } from 'lucide-react'
import { useCase } from '@/components/shell/CaseContext'
import { CertaintyMark, certaintyFill } from '@/components/ui-kit/CertaintyMark'
import { MoneyAmount } from '@/components/ui-kit/MoneyAmount'
import { formatUSD } from '@/lib/format'
import { ENDPOINT_LABEL, TRAIL_COLUMNS, buildMoneyTrail, pathsOfConcern, type EndpointGroup, type TrailLink, type TrailNode } from '@/lib/money'
import { useWorkspace } from '@/lib/store'
import { cn } from '@/lib/utils'

type N = TrailNode & { col: number }
type L = TrailLink
type SN = SankeyNode<N, L>
type SL = SankeyLink<N, L>

const ENDPOINT_FILL: Record<EndpointGroup, string> = {
  listed: 'var(--risk-red)',
  possibly_majority_owned: 'var(--risk-rust)',
  elevated_high: 'var(--risk-amber)',
  typology_fit: 'var(--paper)',
  no_concerns: 'var(--risk-sand)',
  trail_ends: 'url(#pat-unknown)',
  other: 'var(--surface)',
}

const COLUMN_LABEL = { agency: 'Agency', award: 'Award', recipient: 'Recipient', tier1: 'Tier 1', tier2: 'Tier 2', tier3: 'Tier 3', endpoint: 'Where it ended up' }

export function MoneyTrail() {
  const c = useCase()
  const { lens, highlight, setStoryPathId, setSelectedEntityId } = useWorkspace()
  const [mode, setMode] = useState<'dollars' | 'share'>('dollars')
  const [min, setMin] = useState(0)
  const [hover, setHover] = useState<{ link: L; x: number; y: number } | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(900)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(560, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const trail = useMemo(() => buildMoneyTrail(c, { lens, minAmount: min }), [c, lens, min])
  const paths = useMemo(() => pathsOfConcern(c, 50), [c])
  const name = (id: string) => c.entities.find((e) => e.id === id)?.name ?? id

  const layout = useMemo(() => {
    if (!trail) return null
    const used = new Set(trail.nodes.map((n) => n.column))
    const cols = TRAIL_COLUMNS.filter((col) => used.has(col))
    const nodes: N[] = trail.nodes.map((n) => ({ ...n, col: cols.indexOf(n.column) }))
    const height = Math.max(360, nodes.filter((n) => n.column === 'endpoint').length * 70, Math.max(...cols.map((col) => nodes.filter((n) => n.column === col).length)) * 64)
    const gen = sankey<N, L>()
      .nodeId((n) => n.id)
      .nodeWidth(14)
      .nodePadding(22)
      .nodeAlign((n) => n.col)
      .nodeSort(null)
      .extent([[4, 24], [width - 180, height - 8]])
    const g = gen({ nodes: nodes.map((n) => ({ ...n })), links: trail.links.map((l) => ({ ...l, value: l.amount })) as unknown as SL[] })
    return { ...g, height, cols }
  }, [trail, width])

  if (!trail || !layout) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-dotted border-unknown p-6 text-sm">
        <CertaintyMark certainty="unknown" />
        <p className="font-semibold">No money trail can be drawn for this case.</p>
        <p className="text-muted-foreground">{c.awardNote ?? 'No federal award is on record.'} The trail starts only from a recorded award.</p>
      </div>
    )
  }

  const fmt = (n: number) => (mode === 'dollars' ? formatUSD(n, { compact: true }) : `${((n / trail.awardTotal) * 100).toFixed(n / trail.awardTotal < 0.01 ? 1 : 0)}%`)
  const lit = new Set(highlight)
  const isLit = (l: L) => !lit.size || (l.payeeId && lit.has(l.payeeId)) || (l.payerId && lit.has(l.payerId) && !l.payeeId)

  const openLink = (l: L) => {
    const p = paths.find((x) => x.flowIds.some((f) => `l_${f}` === l.id)) ?? paths.find((x) => l.payerId && x.entityIds.at(-1) === l.payerId)
    if (p) setStoryPathId(p.id)
    else if (l.payeeId) setSelectedEntityId(l.payeeId)
    else if (l.payerId) setSelectedEntityId(l.payerId)
  }

  const exportCsv = () => {
    const rows = [['from', 'to', 'amount_usd', 'basis', 'certainty', 'date'], ...trail.links.map((l) => [trailName(l.source), trailName(l.target), l.amount.toFixed(2), l.basis, l.certainty, l.date ?? ''])]
    const blob = new Blob([rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `money-trail-${c.id}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const trailName = (id: string) => trail.nodes.find((n) => n.id === id)?.label ?? name(id)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-xs" role="toolbar" aria-label="Money trail options">
        <div role="group" aria-label="Units" className="flex rounded-md border border-input p-0.5">
          {(['dollars', 'share'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={cn('rounded px-2 py-0.5 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', mode === m ? 'bg-ink text-paper' : 'text-muted-foreground')}>
              {m === 'dollars' ? 'Dollars' : 'Share of award'}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5">
          Hide flows under
          <select value={min} onChange={(e) => setMin(Number(e.target.value))} className="h-7 rounded-md border border-input bg-background px-1.5">
            <option value={0}>Show all</option>
            <option value={100_000}>$100K</option>
            <option value={500_000}>$500K</option>
            <option value={1_000_000}>$1M</option>
          </select>
        </label>
        <span className="flex items-center gap-2 text-muted-foreground">
          <CertaintyMark certainty="documented" />
          <CertaintyMark certainty="derived" />
          <CertaintyMark certainty="estimated" />
          <CertaintyMark certainty="unknown" />
        </span>
      </div>

      <div ref={wrap} className="relative overflow-x-auto rounded-md border border-border bg-card" data-tour="money-trail">
        <svg width={width} height={layout.height} role="img" aria-label={`Money trail from ${c.award?.agency} to ${layout.nodes.filter((n) => n.column === 'endpoint').length} endpoint groups. The same flows are listed in the table below.`}>
          {layout.cols.map((col, i) => {
            const x = layout.nodes.find((n) => n.column === col)?.x0 ?? 0
            return (
              <text key={col} x={x} y={14} fontSize="11" fill="var(--slate)" fontWeight={600}>
                {COLUMN_LABEL[col]}
                <title>{`Column ${i + 1}`}</title>
              </text>
            )
          })}
          <g fill="none">
            {(layout.links as SL[]).map((l) => (
              <path
                key={l.id}
                d={sankeyLinkHorizontal<N, L>()(l) ?? undefined}
                stroke={certaintyFill(l.certainty)}
                strokeOpacity={isLit(l) ? (l.certainty === 'documented' ? 0.55 : 0.9) : 0.12}
                strokeWidth={Math.max(1.5, l.width ?? 1)}
                className="cursor-pointer transition-[stroke-opacity]"
                tabIndex={0}
                role="button"
                aria-label={`${formatUSD(l.amount)} from ${trailName(l.source as unknown as string)} to ${trailName(l.target as unknown as string)}, ${l.certainty}. Open path story.`}
                onMouseMove={(e) => setHover({ link: l, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })}
                onMouseLeave={() => setHover(null)}
                onClick={() => openLink(l)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openLink(l))}
              />
            ))}
          </g>
          {(layout.nodes as SN[]).map((n) => {
            const end = n.endpoint
            const h = Math.max(2, (n.y1 ?? 0) - (n.y0 ?? 0))
            return (
              <g key={n.id}>
                <rect
                  x={n.x0}
                  y={n.y0}
                  width={(n.x1 ?? 0) - (n.x0 ?? 0)}
                  height={h}
                  fill={end ? ENDPOINT_FILL[end] : n.column === 'agency' || n.column === 'award' ? 'var(--money)' : 'var(--ink)'}
                  stroke={end === 'typology_fit' ? 'var(--ink)' : end === 'trail_ends' ? 'var(--unknown)' : 'none'}
                  strokeDasharray={end === 'typology_fit' ? '3 2' : end === 'trail_ends' ? '1.5 2' : undefined}
                  className={n.entityId ? 'cursor-pointer' : undefined}
                  onClick={() => n.entityId && setSelectedEntityId(n.entityId)}
                />
                <text x={(n.x1 ?? 0) + 6} y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2} dy="0.35em" fontSize="11" fill="var(--ink)">
                  <tspan fontWeight={600}>{n.label.length > 34 ? `${n.label.slice(0, 33)}…` : n.label}</tspan>
                  <tspan x={(n.x1 ?? 0) + 6} dy="1.25em" fill="var(--money)">
                    {fmt(n.value ?? 0)}
                  </tspan>
                </text>
              </g>
            )
          })}
        </svg>
        {hover && (
          <div className="pointer-events-none absolute z-10 max-w-xs rounded-md border border-border bg-popover p-2 text-xs shadow-md" style={{ left: Math.min(hover.x + 12, width - 240), top: hover.y + 12 }}>
            <p className="font-semibold">{trailName(hover.link.source as unknown as string)} → {trailName(hover.link.target as unknown as string)}</p>
            <p><MoneyAmount value={hover.link.amount} certainty={hover.link.certainty} compact={false} /></p>
            <p className="text-muted-foreground">Basis: {hover.link.basis}{hover.link.date ? ` · ${hover.link.date}` : ''}</p>
            <p className="pt-1 text-muted-foreground">Click to read the path step by step.</p>
          </div>
        )}
      </div>

      <section aria-labelledby="flows-table-title" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="flows-table-title" className="text-sm font-semibold">Flows table</h2>
          <button type="button" onClick={exportCsv} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Download className="size-3.5" aria-hidden="true" />
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">Every flow in the money trail, with the endpoint totals. Totals reconcile with the award.</caption>
            <thead className="bg-muted text-left text-xs">
              <tr>
                <th scope="col" className="p-2">From</th>
                <th scope="col" className="p-2">To</th>
                <th scope="col" className="p-2 text-right">Amount</th>
                <th scope="col" className="p-2">Basis</th>
                <th scope="col" className="p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {trail.links.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-2">{trailName(l.source)}</td>
                  <td className="p-2">{trailName(l.target)}</td>
                  <td className="p-2 text-right"><MoneyAmount value={l.amount} certainty={l.certainty} compact={false} /></td>
                  <td className="p-2 capitalize">{l.basis}</td>
                  <td className="p-2 tabular-nums">{l.date ?? '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-ink text-xs">
              {(Object.entries(trail.byEndpoint) as [EndpointGroup, number][]).filter(([, v]) => v > 0).map(([g, v]) => (
                <tr key={g}>
                  <th scope="row" colSpan={2} className="p-2 text-left font-medium">{ENDPOINT_LABEL[g]}</th>
                  <td className="p-2 text-right"><MoneyAmount value={v} compact={false} /></td>
                  <td colSpan={2} className="p-2 text-muted-foreground">{((v / trail.awardTotal) * 100).toFixed(1)}% of award</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <th scope="row" colSpan={2} className="p-2 text-left">Total (equals the award)</th>
                <td className="p-2 text-right"><MoneyAmount value={Object.values(trail.byEndpoint).reduce((a, b) => a + b, 0)} compact={false} /></td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  )
}
