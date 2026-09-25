'use client'

import { ChevronRight } from 'lucide-react'
import { SourceLink } from '@/components/common/SourceLink'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FAMILY_LABEL, SIGNAL_STATE_LABEL } from '@/lib/copy'
import type { Indicator, SignalState } from '@/lib/types'

const STATES: SignalState[] = ['fired', 'not_fired', 'not_assessable']

export function IndicatorsTable({ indicators }: { indicators: Indicator[] }) {
  const byState = (s: SignalState) => indicators.filter((i) => i.state === s)
  return (
    <Tabs defaultValue="fired" className="gap-2">
      <TabsList aria-label="Signals by state">
        {STATES.map((s) => (
          <TabsTrigger key={s} value={s}>
            {SIGNAL_STATE_LABEL[s]} <span className="tabular-nums text-muted-foreground">{byState(s).length}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {STATES.map((s) => (
        <TabsContent key={s} value={s}>
          {byState(s).length === 0 ? (
            <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">No signals in this state.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {byState(s).map((ind, i) => (
                <li key={`${ind.key}-${i}`} className="flex flex-col gap-1 p-3">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-mono text-[11px] font-semibold text-muted-foreground">{ind.key}</span>
                    <span className="text-sm font-semibold">{ind.label}</span>
                    <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-semibold text-muted-foreground">{FAMILY_LABEL[ind.family]}</span>
                  </div>
                  {ind.evidence && ind.evidence !== ind.label && <p className="text-xs leading-relaxed">{ind.evidence}</p>}
                  {(ind.provider || ind.sourceUrl) && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      {ind.provider && <span>{ind.provider}</span>}
                      <SourceLink url={ind.sourceUrl} sourceId={ind.sourceId} />
                    </div>
                  )}
                  {ind.innocentExplanations.length > 0 && (
                    <details className="group text-xs">
                      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <ChevronRight className="size-3 transition group-open:rotate-90" aria-hidden="true" />
                        Possible innocent explanations
                      </summary>
                      <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                        {ind.innocentExplanations.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}
