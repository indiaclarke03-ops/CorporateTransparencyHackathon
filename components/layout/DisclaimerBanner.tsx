import { Info } from 'lucide-react'

/** Persistent risk-lead notice (spec 2.5 and 10.4). Rendered once in the root layout. */
export function DisclaimerBanner() {
  return (
    <div role="note" className="border-b border-border bg-muted print:hidden">
      <p className="mx-auto flex max-w-[1600px] items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground md:px-6">
        <Info className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
        Outputs are risk leads for review, not findings of wrongdoing. Every item links to its source.
      </p>
    </div>
  )
}
