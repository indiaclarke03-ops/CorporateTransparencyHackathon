import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Marks demo values. Required on every screen that shows demo scores, tiers or dollars. */
export function DemoBadge({ className, label = 'Demo data' }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1 rounded-full border border-dashed border-unconfirmed px-2 py-0.5 text-xs font-semibold text-unconfirmed',
        className,
      )}
    >
      <FlaskConical className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}
