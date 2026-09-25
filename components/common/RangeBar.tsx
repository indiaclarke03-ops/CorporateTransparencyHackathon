import { cn } from '@/lib/utils'

interface Props {
  /** Scale end; the scale starts at 0 */
  max: number
  lower: number
  upper: number
  point: number | null
  format: (n: number) => string
  className?: string
}

/** Horizontal range with an optional point estimate. Text alternative via aria-label. */
export function RangeBar({ max, lower, upper, point, format, className }: Props) {
  const pct = (n: number) => `${Math.min(100, Math.max(0, max > 0 ? (n / max) * 100 : 0))}%`
  const label = `${point === null ? 'No point estimate' : `Estimate ${format(point)}`}, range ${format(lower)} to ${format(upper)}, on a scale of 0 to ${format(max)}`
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div role="img" aria-label={label} className="relative h-2.5 rounded-full bg-muted ring-1 ring-border">
        <div className="absolute inset-y-0 rounded-full bg-slate/35" style={{ left: pct(lower), width: `calc(${pct(upper)} - ${pct(lower)})` }} />
        {point !== null && (
          <div className="absolute -top-1 h-4.5 w-1 -translate-x-1/2 rounded-full bg-ink" style={{ left: pct(point) }} />
        )}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground" aria-hidden="true">
        <span>{format(lower)}</span>
        <span>{format(upper)}</span>
      </div>
    </div>
  )
}
