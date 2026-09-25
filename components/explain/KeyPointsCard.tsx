'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { DemoBadge } from '@/components/common/DemoBadge'
import { useCase } from '@/components/shell/CaseContext'
import { CertaintyMark } from '@/components/ui-kit/CertaintyMark'
import { keyPoints } from '@/lib/narrative'
import { useWorkspace } from '@/lib/store'

/** "Key points" card (regulator prompt 38): generated from data, each point links to its view. */
export function KeyPointsCard() {
  const c = useCase()
  const setHighlight = useWorkspace((s) => s.setHighlight)
  const points = keyPoints(c)
  return (
    <section aria-labelledby="keypoints-title" className="rounded-md border-2 border-ink bg-card p-4" data-tour="key-points">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 id="keypoints-title" className="text-base font-semibold">Key points</h2>
        {c.kind === 'demo' && <DemoBadge />}
      </div>
      <dl className="grid gap-x-6 gap-y-2 md:grid-cols-2">
        {points.map((p) => (
          <div key={p.id} className="flex flex-col gap-0.5">
            <dt className="text-xs font-semibold text-muted-foreground">{p.label}</dt>
            <dd className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span>{p.text}</span>
              <CertaintyMark certainty={p.certainty} />
              <Link href={p.href} onClick={() => setHighlight(p.highlight)} className="inline-flex items-center gap-0.5 text-xs font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Verify
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
