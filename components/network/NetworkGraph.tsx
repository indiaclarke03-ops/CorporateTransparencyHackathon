'use client'

import { useMemo, useState } from 'react'
import { Background, Controls, MarkerType, ReactFlow, type NodeTypes, type EdgeTypes } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Route } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { EDGE_KIND_META } from '@/lib/copy'
import { EDGE_KINDS, filterGraph, layeredLayout, layoutRoot, pathsToListed } from '@/lib/graph'
import { useWorkspace } from '@/lib/store'
import type { CaseFile, EdgeKind } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CaseEdgeView, type CaseFlowEdge } from './CaseEdgeView'
import { EntityNode, type EntityFlowNode } from './EntityNode'
import { EDGE_STYLE } from './edge-style'
import { Legend } from './Legend'

const nodeTypes: NodeTypes = { entity: EntityNode }
const edgeTypes: EdgeTypes = { case: CaseEdgeView }

export function NetworkGraph({ caseFile }: { caseFile: CaseFile }) {
  const { selectedEntityId, selectedEdgeId, setSelectedEntityId, setSelectedEdgeId } = useWorkspace()
  const [kinds, setKinds] = useState<Set<EdgeKind>>(() => new Set(EDGE_KINDS))
  const [limitHops, setLimitHops] = useState(false)
  const [maxHops, setMaxHops] = useState(3)
  const [showPaths, setShowPaths] = useState(false)
  const hasRecipient = caseFile.recipientId !== null
  const presentKinds = useMemo(() => EDGE_KINDS.filter((k) => caseFile.edges.some((e) => e.kind === k)), [caseFile.edges])

  const view = useMemo(
    () => filterGraph(caseFile.entities, caseFile.edges, { kinds, maxHops: limitHops && hasRecipient ? maxHops : null }),
    [caseFile, kinds, limitHops, maxHops, hasRecipient],
  )
  const paths = useMemo(
    () => (showPaths ? pathsToListed(caseFile.recipientId, view.entities, view.edges) : null),
    [showPaths, caseFile.recipientId, view],
  )
  // Layout from the full graph so positions stay put while filters change.
  const positions = useMemo(
    () => layeredLayout(caseFile.entities, caseFile.edges, layoutRoot(caseFile.entities, caseFile.edges, caseFile.recipientId), { x: 240, y: 160 }),
    [caseFile],
  )

  const nodes: EntityFlowNode[] = view.entities.map((e) => ({
    id: e.id,
    type: 'entity',
    position: positions[e.id] ?? { x: 0, y: 0 },
    data: { entity: e, selected: e.id === selectedEntityId, dimmed: paths !== null && !paths.nodes.has(e.id), onSelect: setSelectedEntityId },
    draggable: true,
    selectable: false,
  }))

  const seenPairs = new Set<string>()
  const edges: CaseFlowEdge[] = view.edges.map((e) => {
    const s = positions[e.source]
    const t = positions[e.target]
    const pair = [e.source, e.target].sort().join('|')
    const parallel = seenPairs.has(pair)
    seenPairs.add(pair)
    // Route by relative position: same-column edges loop out to the right, and a second
    // edge between the same pair curves below so the two never overlap.
    const [sourceHandle, targetHandle] = parallel
      ? ['b-s', 'b-t']
      : Math.abs(s.x - t.x) < 1
        ? ['r-s', 'r-t']
        : s.x < t.x
          ? ['r-s', 'l-t']
          : ['l-s', 'r-t']
    const style = EDGE_STYLE[e.kind]
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle,
      targetHandle,
      type: 'case',
      markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke, width: 16, height: 16 },
      data: {
        edge: e,
        selected: e.id === selectedEdgeId,
        dimmed: paths !== null && !paths.edges.has(e.id),
        highlighted: paths !== null && paths.edges.has(e.id),
        onSelect: setSelectedEdgeId,
      },
    }
  })

  const toggleKind = (k: EdgeKind) =>
    setKinds((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  return (
    <div className="flex min-h-[640px] flex-1 flex-col lg:flex-row">
      <div className="relative flex min-h-[480px] flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border p-3" role="toolbar" aria-label="Graph filters">
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Connection types">
            {presentKinds.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kinds.has(k)}
                onClick={() => toggleKind(k)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  kinds.has(k) ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground line-through hover:text-foreground',
                )}
              >
                {EDGE_KIND_META[k].label}
              </button>
            ))}
          </div>

          <div className={cn('flex items-center gap-2 text-xs', !hasRecipient && 'opacity-60')}>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={limitHops}
                disabled={!hasRecipient}
                onChange={(ev) => setLimitHops(ev.target.checked)}
                className="size-3.5 accent-[var(--ledger)]"
              />
              Limit to
            </label>
            <Slider
              className="w-24"
              min={1}
              max={3}
              step={1}
              value={[maxHops]}
              onValueChange={([v]) => setMaxHops(v)}
              disabled={!hasRecipient || !limitHops}
              aria-label="Maximum hops from the recipient"
            />
            <span className="w-14 tabular-nums">{maxHops} {maxHops === 1 ? 'hop' : 'hops'}</span>
          </div>

          <button
            type="button"
            aria-pressed={showPaths}
            disabled={!hasRecipient}
            onClick={() => setShowPaths((v) => !v)}
            title={hasRecipient ? undefined : 'No award recipient in this case, so there is no starting point for paths.'}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              showPaths ? 'border-high bg-high text-on-color' : 'border-border hover:bg-muted',
            )}
          >
            <Route className="size-3.5" aria-hidden="true" />
            Show paths to listed parties
          </button>
          {showPaths && paths && (
            <span className="text-xs text-muted-foreground" role="status">
              {paths.targets.length ? `${paths.targets.length} listed ${paths.targets.length === 1 ? 'party' : 'parties'} reachable` : 'No listed party reachable with the current filters'}
            </span>
          )}
        </div>

        <div className="relative flex-1" aria-label="Network graph">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.1, maxZoom: 1.1 }}
            colorMode="system"
            minZoom={0.2}
            nodesConnectable={false}
            onEdgeClick={(_, e) => setSelectedEdgeId(e.id)}
          >
            <Background gap={24} color="var(--rule)" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </div>
      <aside className="border-t border-border p-4 lg:w-72 lg:border-l lg:border-t-0">
        <Legend />
      </aside>
    </div>
  )
}
