import { Circle, CircleDashed, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { Tier } from '@/lib/types'
import { cn } from '@/lib/utils'

export const TIER_META: Record<Tier | 'not_assessed', { label: string; icon: LucideIcon; text: string; border: string; fill: string }> = {
  high: { label: 'High', icon: OctagonAlert, text: 'text-tier-high', border: 'border-tier-high', fill: 'bg-tier-high' },
  elevated: { label: 'Elevated', icon: TriangleAlert, text: 'text-tier-elevated', border: 'border-tier-elevated', fill: 'bg-tier-elevated' },
  low: { label: 'Low', icon: Circle, text: 'text-tier-low', border: 'border-tier-low', fill: 'bg-tier-low' },
  not_assessable: { label: 'Not assessable', icon: CircleDashed, text: 'text-tier-na', border: 'border-tier-na border-dashed', fill: 'bg-tier-na' },
  not_assessed: { label: 'Not assessed', icon: CircleDashed, text: 'text-tier-na', border: 'border-tier-na border-dashed', fill: 'bg-tier-na' },
}

/** Tier label with a distinct marker shape, so the tier never depends on color alone. */
export function TierChip({ tier, className, size = 'sm' }: { tier: Tier | null; className?: string; size?: 'sm' | 'md' }) {
  const meta = TIER_META[tier ?? 'not_assessed']
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1 rounded-full border bg-background font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        meta.text,
        meta.border,
        className,
      )}
    >
      <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden="true" />
      <span>
        <span className="sr-only">Tier: </span>
        {meta.label}
      </span>
    </span>
  )
}
