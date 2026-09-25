import { showcase } from '@/lib/showcase'
import { Inline, Pill } from './ui'

export function NameTraps() {
  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {showcase.false_positives.map((f, i) => (
        <li key={i} className="flex flex-col gap-1.5 rounded-2xl bg-muted p-3 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone="warn">Searched: {f.query}</Pill>
            <span className="text-xs text-muted-foreground">in {f.source}</span>
          </div>
          <p className="font-semibold leading-snug">Returned: {f.returned_name}</p>
          <p className="text-xs leading-snug text-muted-foreground"><Inline text={f.why_it_is_not_a_match} /></p>
          <p className="rounded-xl bg-background/60 px-2 py-1 text-xs leading-snug"><strong className="text-accent">Rule: </strong><Inline text={f.lesson_for_matching} /></p>
        </li>
      ))}
    </ul>
  )
}
