'use client'

import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, Position, type Edge as FlowEdge, type EdgeProps } from '@xyflow/react'
import { EDGE_KIND_META } from '@/lib/copy'
import { formatUSD } from '@/lib/format'
import type { Edge } from '@/lib/types'
import { cn } from '@/lib/utils'
import { EDGE_STYLE } from './edge-style'

export type CaseEdgeData = { edge: Edge; selected: boolean; dimmed: boolean; highlighted: boolean; onSelect: (id: string) => void }
export type CaseFlowEdge = FlowEdge<CaseEdgeData, 'case'>

function labelText(e: Edge) {
  if (e.kind === 'ownership') return e.share !== null ? `${e.share}%` : 'Owner'
  if (e.kind === 'payment') return e.amount !== null ? formatUSD(e.amount, { compact: true }) : '$'
  if (e.kind === 'possible_match') return '?'
  return null
}

function CaseEdgeViewInner(props: EdgeProps<CaseFlowEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data } = props
  if (!data) return null
  const { edge, selected, dimmed, highlighted, onSelect } = data
  const style = EDGE_STYLE[edge.kind]
  const loop = sourcePosition === targetPosition
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: loop ? 0.8 : 0.25 })
  const text = labelText(edge)
  const meta = EDGE_KIND_META[edge.kind]

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={style.arrow ? markerEnd : undefined}
        interactionWidth={16}
        style={{
          stroke: style.stroke,
          strokeDasharray: style.dash,
          strokeWidth: selected || highlighted ? style.width + 1.5 : style.width,
          opacity: dimmed ? 0.18 : 1,
        }}
      />
      <EdgeLabelRenderer>
        <button
          type="button"
          onClick={() => onSelect(edge.id)}
          aria-pressed={selected}
          aria-label={`${meta.label} connection${text ? `, ${text}` : ''}${edge.demo ? ', demo link' : ''}. Show details.`}
          className={cn(
            'nodrag nopan pointer-events-auto absolute flex items-center gap-1 rounded-full border bg-background px-1.5 py-px text-[11px] font-semibold shadow-sm transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            edge.kind === 'payment' ? 'border-ledger text-ledger' : 'border-border text-muted-foreground',
            edge.kind === 'possible_match' && 'border-dashed border-unconfirmed text-unconfirmed',
            selected && 'ring-2 ring-ring',
            dimmed && 'opacity-25',
          )}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {edge.kind === 'payment' && <span aria-hidden="true">$</span>}
          {text && edge.kind !== 'payment' ? text : edge.kind === 'payment' ? text?.replace('$', '') : <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
          {edge.demo && <span className="rounded-full border border-dashed border-unconfirmed px-1 text-[10px] font-medium text-unconfirmed">demo</span>}
        </button>
      </EdgeLabelRenderer>
    </>
  )
}

export const CaseEdgeView = memo(CaseEdgeViewInner)
