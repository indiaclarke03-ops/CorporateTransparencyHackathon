import { cn } from '@/lib/utils'

/** Shown for missing fields. Missing is never displayed as blank or 0. */
export function NotInRecord({ className, label = 'Not in record' }: { className?: string; label?: string }) {
  return (
    <span className={cn('inline-flex w-fit items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground', className)}>
      {label}
    </span>
  )
}
