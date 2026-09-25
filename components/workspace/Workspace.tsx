'use client'

import Link from 'next/link'
import { Loader2, Route } from 'lucide-react'
import { DemoBadge } from '@/components/common/DemoBadge'
import { EntityPanel } from '@/components/entity/EntityPanel'
import { EdgePanel } from '@/components/network/EdgePanel'
import { TopBar } from '@/components/layout/TopBar'
import { NetworkGraph } from '@/components/network/NetworkGraph'
import { CaseOverview } from '@/components/overview/CaseOverview'
import { CASE_OPTIONS, type CaseId } from '@/lib/cases'
import { useWorkspace } from '@/lib/store'
import { useCaseFile } from '@/lib/use-case'

export function Workspace() {
  const { caseId, setCaseId } = useWorkspace()
  const { data: caseFile, error, isLoading } = useCaseFile(caseId as CaseId)

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar>
        <label htmlFor="case" className="text-xs text-muted-foreground">
          Case
        </label>
        <select
          id="case"
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {CASE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <Link
          href="/"
          className="flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Case explorer
        </Link>
        <Link
          href="/traceability"
          className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Route className="size-4" aria-hidden="true" />
          Traceability
        </Link>
      </TopBar>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 p-4 md:p-6">
        {error && (
          <p role="alert" className="rounded-md border border-high p-4 text-sm">
            The case file could not be loaded: {error.message} Reload the page to try again.
          </p>
        )}

        {isLoading || !caseFile ? (
          !error && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Building network…
            </p>
          )
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold">{caseFile.title}</h1>
                {caseFile.kind === 'demo' ? (
                  <DemoBadge label="Hypothetical scenario" />
                ) : (
                  <span className="rounded-full border border-ledger px-2 py-0.5 text-xs font-semibold text-ledger">Real records</span>
                )}
                {caseFile.typology && <span className="text-xs text-muted-foreground">Typology: {caseFile.typology}</span>}
              </div>
              <p className="max-w-4xl text-sm text-muted-foreground">{caseFile.note}</p>
            </div>

            <CaseOverview caseFile={caseFile} />

            <section aria-labelledby="network-title" className="flex flex-col overflow-hidden rounded-md border border-border bg-card">
              <h2 id="network-title" className="sr-only">
                Network
              </h2>
              <NetworkGraph key={caseFile.id} caseFile={caseFile} />
            </section>

            <EntityPanel caseFile={caseFile} />
            <EdgePanel caseFile={caseFile} />
          </>
        )}
      </main>
    </div>
  )
}
