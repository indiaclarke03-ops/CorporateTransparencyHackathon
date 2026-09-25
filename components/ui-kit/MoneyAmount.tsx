import { formatUSD } from '@/lib/format'
import type { Certainty } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CertaintyMark } from './CertaintyMark'

/** Public dollars: always the public-money green, tabular numerals, optional certainty. */
export function MoneyAmount({
  value,
  certainty,
  compact = true,
  className,
  showCertainty = true,
}: {
  value: number
  certainty?: Certainty
  compact?: boolean
  className?: string
  showCertainty?: boolean
}) {
  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      <span className="font-semibold tabular-nums text-money">{formatUSD(value, { compact })}</span>
      {certainty && showCertainty && <CertaintyMark certainty={certainty} className="self-center" />}
    </span>
  )
}
