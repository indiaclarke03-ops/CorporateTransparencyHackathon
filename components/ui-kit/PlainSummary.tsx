import type { Certainty } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CertaintyMark } from './CertaintyMark'

/** One-sentence plain-language summary shown above a chart or table. */
export function PlainSummary({ text, certainty, className }: { text: string; certainty?: Certainty; className?: string }) {
  return (
    <p className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 border-l-4 border-ink bg-muted px-3 py-2 text-sm leading-relaxed briefing:text-base', className)}>
      <span>{text}</span>
      {certainty && <CertaintyMark certainty={certainty} />}
    </p>
  )
}
