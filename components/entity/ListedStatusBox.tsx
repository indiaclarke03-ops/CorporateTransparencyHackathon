import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { SourceLink } from '@/components/common/SourceLink'
import { LISTED_LABEL, LISTED_SCORE_NOTE } from '@/lib/copy'
import { formatDate } from '@/lib/format'
import type { ListedStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Official list status, kept apart from the score and labeled as public record. */
export function ListedStatusBox({ status }: { status: ListedStatus }) {
  const listed = status.kind === 'listed' || status.kind === 'possibly_majority_owned'
  const Icon = listed ? ShieldAlert : status.kind === 'not_listed' ? ShieldCheck : ShieldQuestion
  return (
    <section aria-labelledby="listed-title" className={cn('flex flex-col gap-2 rounded-md border p-3', listed ? 'border-high' : 'border-border')}>
      <h3 id="listed-title" className={cn('flex items-center gap-1.5 text-sm font-semibold', listed && 'text-high')}>
        <Icon className="size-4" aria-hidden="true" />
        {LISTED_LABEL[status.kind]}
      </h3>
      {status.entries.length > 0 && (
        <ul className="flex flex-col gap-2">
          {status.entries.map((x, i) => (
            <li key={`${x.list}-${i}`} className="flex flex-col gap-0.5 text-xs">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold">{x.list}</span>
                <span className={cn('rounded-full px-1.5 py-px text-[10px] font-semibold', x.counted ? 'bg-high text-on-color' : 'bg-muted text-muted-foreground')}>
                  {x.counted ? 'Counts toward score' : 'Context only'}
                </span>
              </span>
              <span className="text-muted-foreground">
                {x.authority}
                {x.date ? ` · listed ${formatDate(x.date)}` : ''}
              </span>
              <SourceLink url={x.sourceUrl} sourceId={x.sourceId} />
            </li>
          ))}
        </ul>
      )}
      {status.kind === 'not_listed' && <p className="text-xs text-muted-foreground">No list entry found in the sources checked. This is not a clearance.</p>}
      <p className="text-[11px] leading-snug text-muted-foreground">{LISTED_SCORE_NOTE}</p>
    </section>
  )
}
