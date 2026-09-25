import { Circle, CircleDashed, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { Tier } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Risk tiers on one sequential scale: sand -> amber -> deep red. Unknown: slate, dotted. */
export const RISK_META: Record<Tier | 'not_assessed', { label: string; icon: LucideIcon; chip: string; stroke: string; text: string }> = {
  low: { label: 'Low', icon: Circle, chip: 'bg-risk-sand text-ink border-risk-sand-stroke', stroke: 'var(--risk-sand-stroke)', text: 'text-risk-sand-stroke' },
  elevated: { label: 'Elevated', icon: TriangleAlert, chip: 'bg-risk-amber text-ink border-risk-amber-stroke', stroke: 'var(--risk-amber-stroke)', text: 'text-risk-amber-stroke' },
  high: { label: 'High', icon: OctagonAlert, chip: 'bg-risk-red text-on-color border-risk-red', stroke: 'var(--risk-red)', text: 'text-risk-red' },
  not_assessable: { label: 'Not assessable', icon: CircleDashed, chip: 'bg-background text-unknown border-unknown border-dotted', stroke: 'var(--unknown)', text: 'text-unknown' },
  not_assessed: { label: 'Not assessed', icon: CircleDashed, chip: 'bg-background text-unknown border-unknown border-dotted', stroke: 'var(--unknown)', text: 'text-unknown' },
}

/** Tier label + distinct icon shape + scale color. Replaces TierChip / BandChip. */
export function RiskBand({ tier, className, size = 'sm' }: { tier: Tier | null; className?: string; size?: 'sm' | 'md' }) {
  const meta = RISK_META[tier ?? 'not_assessed']
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1 rounded-full border font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        meta.chip,
        className,
      )}
    >
      <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden="true" />
      <span>
        <span className="sr-only">Risk tier: </span>
        {meta.label}
      </span>
    </span>
  )
}
