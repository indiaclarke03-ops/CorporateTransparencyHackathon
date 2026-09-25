import { Coins, Crosshair, Factory, FlaskConical, HandHeart, Pickaxe, Radar, type LucideIcon } from 'lucide-react'
import type { TypologyDefinition } from '@/lib/typologies'
import { cn } from '@/lib/utils'

export const TYPOLOGY_ICON: Record<TypologyDefinition['icon'], LucideIcon> = { Radar, FlaskConical, Pickaxe, Coins, Factory, HandHeart, Crosshair }

/** Icon + outline only. Typologies never use risk colors. */
export function TypologyBadge({ typology, className, short = false }: { typology: TypologyDefinition; className?: string; short?: boolean }) {
  const Icon = TYPOLOGY_ICON[typology.icon]
  return (
    <span className={cn('inline-flex w-fit items-center gap-1 rounded-md border border-dashed border-ink bg-background px-2 py-0.5 text-xs font-medium text-ink', className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className={short ? 'line-clamp-1' : undefined}>{typology.name}</span>
    </span>
  )
}

export function UnverifiedLabel({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex w-fit items-center rounded-full border border-dotted border-unknown px-2 py-0.5 text-[11px] font-semibold text-unknown', className)}>
      Unverified definition – source needed
    </span>
  )
}
