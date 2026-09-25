'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import Link from 'next/link'
import { Landmark, Loader2, MousePointerClick, Route, ScrollText } from 'lucide-react'
import {
  INVESTIGATION_OPTIONS,
  fetchInvestigation,
  resolveInvestigationUrl,
  type InvestigationId,
} from '@/lib/investigations'
import type { InvestigationEdge } from '@/lib/types'
import { SummaryBar } from './summary-bar'
import { NodePanel } from './node-panel'
import { EdgePanel } from './edge-panel'
import { AuditDrawer } from './audit-drawer'
import { GraphLegend } from './graph-legend'

const InvestigationGraph = dynamic(() => import('./investigation-graph').then((m) => m.InvestigationGraph), {
  ssr: false,
  loading: () => <GraphPlaceholder text="Building network…" />,
})

type Selection = { kind: 'node'; id: string } | { kind: 'edge'; edge: InvestigationEdge } | null

export function InvestigationExplorer() {
  const [investigationId, setInvestigationId] = useState<InvestigationId>('serniya')
  const [selection, setSelection] = useState<Selection>(null)
  const [auditOpen, setAuditOpen] = useState(false)

  const { data, error, isLoading } = useSWR(resolveInvestigationUrl(investigationId), fetchInvestigation)

  const selectedNode = selection?.kind === 'node' ? data?.nodes.find((n) => n.id === selection.id) : undefined
  const nodeLabel = (id: string) => data?.nodes.find((n) => n.id === id)?.label ?? id

  return (
    <div className="flex min-h-dvh flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Landmark className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-semibold text-balance">Follow the Public Dollar</h1>
            <p className="text-sm text-muted-foreground">Tracing public funds through ownership, trade, and payment networks</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="investigation" className="sr-only">
            Investigation
          </label>
          <select
            id="investigation"
            value={investigationId}
            onChange={(e) => {
              setInvestigationId(e.target.value as InvestigationId)
              setSelection(null)
            }}
            className="h-10 rounded-full border border-border bg-card px-4 text-sm font-semibold text-card-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {INVESTIGATION_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
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

      {data && <SummaryBar summary={data.investigation_summary} />}

      <main className="flex flex-1 flex-col gap-4 lg:flex-row">
        <section
          aria-label="Investigation graph"
          className="relative flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card"
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
          <GraphLegend />
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
              <MousePointerClick className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="font-heading text-base font-semibold">Nothing selected</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Select an entity or connection to view its evidence.
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
      <Loader2 className="size-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
      {text}
    </div>
  )
}
