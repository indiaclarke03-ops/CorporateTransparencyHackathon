'use client'

import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Building2, FlaskConical, ShieldAlert, User } from 'lucide-react'
import { TIER_META } from '@/components/common/TierChip'
import { isCountedListed } from '@/lib/exposure'
import { formatUSD } from '@/lib/format'
import { nodeSize } from '@/lib/graph'
import type { Entity } from '@/lib/types'
import { cn } from '@/lib/utils'

export type EntityNodeData = { entity: Entity; selected: boolean; dimmed: boolean; onSelect: (id: string) => void }
export type EntityFlowNode = Node<EntityNodeData, 'entity'>

const HANDLES = [
  { id: 'l-s', type: 'source', position: Position.Left },
  { id: 'l-t', type: 'target', position: Position.Left },
  { id: 'r-s', type: 'source', position: Position.Right },
  { id: 'r-t', type: 'target', position: Position.Right },
  { id: 'b-s', type: 'source', position: Position.Bottom },
  { id: 'b-t', type: 'target', position: Position.Bottom },
] as const

/** Circle sized by observed inflow, ringed by tier color plus tier shape, shield if listed. */
function EntityNodeView({ data }: NodeProps<EntityFlowNode>) {
  const { entity: e, selected, dimmed, onSelect } = data
  const size = nodeSize(e.observedDollarsIn)
  const tier = TIER_META[e.tier ?? 'not_assessed']
  const TierIcon = tier.icon
  const listed = isCountedListed(e)
  const KindIcon = e.kind === 'person' ? User : Building2

  return (
    <div className={cn('relative transition-opacity', dimmed && 'opacity-25')} style={{ width: size, height: size }}>
      {HANDLES.map((h) => (
        <Handle
          key={h.id}
          id={h.id}
          type={h.type}
          position={h.position}
          isConnectable={false}
          className="!size-1 !min-h-0 !min-w-0 !border-0 !bg-transparent"
        />
      ))}
      <button
        type="button"
        onClick={() => onSelect(e.id)}
        aria-pressed={selected}
        aria-label={`${e.name}. Tier ${tier.label}.${listed ? ' On a counted sanctions list.' : ''}${e.demo ? ' Demo entity.' : ''} Show details.`}
        className={cn(
          'nodrag relative flex items-center justify-center rounded-full border-[3px] bg-card text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/60',
          tier.border,
          selected && 'ring-4 ring-ring ring-offset-2 ring-offset-background',
        )}
        style={{ width: size, height: size }}
      >
        <KindIcon className="size-5 text-muted-foreground" aria-hidden="true" />
        <span className={cn('absolute -bottom-1 -left-1 flex size-6 items-center justify-center rounded-full border bg-background', tier.border, tier.text)}>
          <TierIcon className="size-3.5" aria-hidden="true" />
        </span>
        {e.demo && (
          <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border border-dashed border-unconfirmed bg-background text-unconfirmed" title="Invented demo entity">
            <FlaskConical className="size-3.5" aria-hidden="true" />
          </span>
        )}
        {listed && (
          <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-high text-on-color" title="On a US, UN, EU or UK list">
            <ShieldAlert className="size-3.5" aria-hidden="true" />
          </span>
        )}
      </button>
      <div className="pointer-events-none absolute left-1/2 top-full mt-1.5 flex w-44 -translate-x-1/2 flex-col items-center">
        <span className="line-clamp-2 text-center text-xs font-semibold leading-tight">{e.name}</span>
        {e.observedDollarsIn !== null && e.observedDollarsIn > 0 && (
          <span className="text-[11px] tabular-nums text-ledger">{formatUSD(e.observedDollarsIn, { compact: true })} in</span>
        )}
      </div>
    </div>
  )
}

export const EntityNode = memo(EntityNodeView)
