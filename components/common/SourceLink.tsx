import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/** External source link plus, when known, a chip linking to the source registry entry. */
export function SourceLink({ url, sourceId, label, className }: { url: string | null; sourceId?: string; label?: string; className?: string }) {
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      {sourceId && (
        <Link
          href={`/traceability#source-${sourceId}`}
          className="rounded-full bg-muted px-1.5 py-px font-mono text-[11px] font-semibold text-primary ring-1 ring-border hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={`${sourceId} in the source registry`}
        >
          {sourceId}
        </Link>
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-w-0 items-center gap-1 break-all text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
          {label ?? url.replace(/^https?:\/\//, '')}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </span>
  )
}
