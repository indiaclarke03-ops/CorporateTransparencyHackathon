'use client'

import { ViewGuide, ViewTitle } from '@/components/explain/ViewGuide'
import { NetworkGraph } from '@/components/network/NetworkGraph'
import { useCase } from '@/components/shell/CaseContext'
import { PlainSummary } from '@/components/ui-kit/PlainSummary'
import { viewKeyPoints } from '@/lib/narrative'

export default function WhosBehindItPage() {
  const c = useCase()
  const first = viewKeyPoints('network', c)[0]
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-3">
          <ViewTitle guideId="network">Who&apos;s Behind It</ViewTitle>
          <p className="text-sm text-muted-foreground">Who controls these companies? Select an entity for its profile, attribution and ownership.</p>
          {first && <PlainSummary text={first.text} certainty={first.certainty} />}
        </div>
        <ViewGuide view="network" />
      </div>
      <section aria-label="Network" className="overflow-hidden rounded-md border border-border bg-card" data-tour="network">
        <NetworkGraph key={c.id} caseFile={c} />
      </section>
    </div>
  )
}
