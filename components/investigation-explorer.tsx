'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import Link from 'next/link'
import { Info, Leaf, Route, ScrollText, Search } from 'lucide-react'
import { CASES, fetchInvestigation, resolveInvestigationUrl, type InvestigationId } from '@/lib/investigations'
import type { InvestigationEdge } from '@/lib/types'
import { SummaryBar } from './summary-bar'
import { NodePanel } from './node-panel'
import { EdgePanel } from './edge-panel'
import { AuditDrawer } from './audit-drawer'
import { GraphLegend } from './graph-legend'
import { CaseInsightsPanel } from './case-insights'
import { MONEY_STATUS } from '@/lib/graph-style'

const InvestigationGraph = dynamic(() => import('./investigation-graph').then((m) => m.InvestigationGraph), {
  ssr: false,
  loading: () => <GraphPlaceholder text="Building network…" />,
})

type Selection = { kind: 'node'; id: string } | { kind: 'edge'; edge: InvestigationEdge } | null

export function InvestigationExplorer() {
  const [investigationId, setInvestigationId] = useState<InvestigationId>(CASES[0]?.id ?? 'serniya')
  const [selection, setSelection] = useState<Selection>(null)
  const [auditOpen, setAuditOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pendingLabel, setPendingLabel] = useState<string | null>(null)

  const { data, error, isLoading } = useSWR(resolveInvestigationUrl(investigationId), fetchInvestigation)

  // Search every entity in every case, so a reviewer can start from a name instead of a case.
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return CASES.flatMap((c) =>
      [c.title, ...c.entities].filter((e) => e.toLowerCase().includes(q)).map((e) => ({ caseId: c.id, caseTitle: c.title, typology: c.typology, entity: e })),
    ).slice(0, 12)
  }, [query])

  const openCase = (id: string, label: string | null = null) => {
    setInvestigationId(id)
    setSelection(null)
    setPendingLabel(label)
    setQuery('')
  }

  useEffect(() => {
    if (!data || !pendingLabel) return
    const n = data.nodes.find((x) => x.label === pendingLabel)
    if (n) setSelection({ kind: 'node', id: n.id })
    setPendingLabel(null)
  }, [data, pendingLabel])

  const selectedNode = selection?.kind === 'node' ? data?.nodes.find((n) => n.id === selection.id) : undefined
  const nodeLabel = (id: string) => data?.nodes.find((n) => n.id === id)?.label ?? id

  return (
    <div className="flex min-h-dvh flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Leaf className="leaf-sway size-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-semibold text-balance">Follow the Public Dollar</h1>
            <p className="text-sm text-muted-foreground">Tracing public funds through ownership, trade, and payment networks</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <label className="flex h-10 w-64 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm">
              <Search className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Search entities across all cases</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companies, people…"
                className="w-full bg-transparent outline-none placeholder:text-muted-foreground" />
            </label>
            {hits.length > 0 && (
              <ul className="absolute right-0 z-20 mt-2 max-h-80 w-80 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-xl">
                {hits.map((h) => (
                  <li key={h.caseId + h.entity}>
                    <button type="button" onClick={() => openCase(h.caseId, h.entity === h.caseTitle ? null : h.entity)}
                      className="flex w-full flex-col items-start rounded-xl px-3 py-2 text-left hover:bg-muted">
                      <span className="text-sm font-semibold">{h.entity}</span>
                      <span className="text-xs text-muted-foreground">{h.typology} · {h.caseTitle}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link
            href="/about"
            className="flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-bold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Info className="size-4" aria-hidden="true" />
            About
          </Link>
          <Link
            href="/traceability"
            className="flex h-10 items-center gap-2 rounded-full border border-accent px-4 text-sm font-bold text-accent transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Route className="size-4" aria-hidden="true" />
            Traceability
          </Link>
          <button
            type="button"
            onClick={() => setAuditOpen(true)}
            disabled={!data}
            className="flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-bold text-accent-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <ScrollText className="size-4" aria-hidden="true" />
            Audit trail
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-2xl border border-sev-critical bg-card p-4 text-sm">
          {'The case file could not be loaded: '}
          {error.message}
        </p>
      )}

      <nav aria-label="Cases by typology" className="flex gap-2 overflow-x-auto pb-1">
        {CASES.map((c) => (
          <button key={c.id} type="button" onClick={() => openCase(c.id)} aria-pressed={c.id === investigationId}
            className={`flex w-56 shrink-0 flex-col gap-1 rounded-2xl border p-3 text-left transition ${c.id === investigationId ? 'border-accent bg-card' : 'border-border bg-card/60 hover:border-accent/60'}`}>
            <span className="text-[11px] font-bold uppercase tracking-wide text-accent">{c.typology}</span>
            <span className="line-clamp-2 text-sm font-semibold leading-snug">{c.title}</span>
            <span className="text-xs text-muted-foreground">
              Score {c.score} · Grade {c.grade} · {c.nodes} entities · {c.edges} links
            </span>
            <span className="text-[11px] text-muted-foreground">{c.tools.join(' · ')}</span>
            <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: MONEY_STATUS[c.money_status]?.color }}>$ {MONEY_STATUS[c.money_status]?.label}</span>
          </button>
        ))}
      </nav>

      {data && <SummaryBar summary={data.investigation_summary} caseMeta={data.case} />}

      {data?.case?.insights && <CaseInsightsPanel insights={data.case.insights} typology={data.investigation_summary.primary_typology} />}

      <main className="flex flex-1 flex-col gap-4 lg:flex-row">
        <section
          aria-label="Investigation graph"
          className="relative flex min-h-[640px] flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card"
        >
          {isLoading || !data ? (
            <GraphPlaceholder text="Building network…" />
          ) : (
            <InvestigationGraph
              key={investigationId}
              investigation={data}
              selectedNodeId={selection?.kind === 'node' ? selection.id : null}
              selectedEdge={selection?.kind === 'edge' ? selection.edge : null}
              onNodeSelect={(id) => setSelection({ kind: 'node', id })}
              onEdgeSelect={(edge) => setSelection({ kind: 'edge', edge })}
              nodeLabel={nodeLabel}
            />
          )}
          <GraphLegend investigation={data} />
        </section>

        <aside
          aria-label="Details"
          className="flex w-full flex-col overflow-hidden rounded-3xl border border-border bg-card lg:w-96"
        >
          {selectedNode ? (
            <NodePanel node={selectedNode} onClose={() => setSelection(null)} />
          ) : selection?.kind === 'edge' ? (
            <EdgePanel edge={selection.edge} nodeLabel={nodeLabel} onClose={() => setSelection(null)} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <Leaf className="leaf-sway size-10 text-accent" aria-hidden="true" />
              <p className="font-heading text-lg">Nothing selected</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Click a node to see its identifiers, addresses, risk signals and sources, or click a connection to see how two entities are
                linked, in the source&apos;s own words.
              </p>
            </div>
          )}
        </aside>
      </main>


      {data && <AuditDrawer open={auditOpen} onClose={() => setAuditOpen(false)} steps={data.audit_trail} />}
    </div>
  )
}

function GraphPlaceholder({ text }: { text: string }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Leaf className="leaf-sway size-5 text-primary" aria-hidden="true" />
      {text}
    </div>
  )
}
