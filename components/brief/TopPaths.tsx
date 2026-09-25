'use client'

import { ChevronRight } from 'lucide-react'
import { useCase } from '@/components/shell/CaseContext'
import { MoneyAmount } from '@/components/ui-kit/MoneyAmount'
import { ENDPOINT_LABEL, pathsOfConcern } from '@/lib/money'
import { pathChain } from '@/lib/narrative'
import { useWorkspace } from '@/lib/store'

/** "Top 3 paths of concern": one-line chains with the dollars at each step. */
export function TopPaths({ limit = 3 }: { limit?: number }) {
  const c = useCase()
  const setStoryPathId = useWorkspace((s) => s.setStoryPathId)
  const paths = pathsOfConcern(c, limit)
  return (
    <section aria-labelledby="paths-title" className="flex flex-col gap-2" data-tour="top-paths">
      <h2 id="paths-title" className="text-sm font-semibold">Top {limit} paths of concern</h2>
      {paths.length === 0 ? (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {c.award ? 'No recorded payment reaches a listed party or an entity with Elevated or High indicators.' : 'No award is on record, so there are no payment paths to follow.'}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {paths.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setStoryPathId(p.id)}
                className="flex w-full flex-col gap-1 rounded-md border border-border bg-card p-3 text-left text-sm hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-xs font-semibold text-muted-foreground">{ENDPOINT_LABEL[p.endpoint]}</span>
                <span className="flex flex-wrap items-center gap-x-1 gap-y-1">
                  {pathChain(c, p).map((s, i) => (
                    <span key={s.id} className="inline-flex items-center gap-1">
                      {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                      <span className="font-medium">{s.name}</span>
                      {s.amount !== null && <MoneyAmount value={s.amount} showCertainty={false} className="text-xs" />}
                    </span>
                  ))}
                </span>
                <span className="text-xs underline underline-offset-2">Read the path story</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
