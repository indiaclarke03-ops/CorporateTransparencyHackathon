'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useCase } from '@/components/shell/CaseContext'
import { CertaintyMark } from '@/components/ui-kit/CertaintyMark'
import { briefCards } from '@/lib/narrative'

/** The five Brief questions (regulator prompt 23), every sentence generated from data. */
export function BriefCards() {
  const c = useCase()
  return (
    <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-tour="brief-cards">
      {briefCards(c).map((card) => (
        <li key={card.id} className="flex flex-col gap-2 rounded-md border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-muted-foreground briefing:text-base">{card.question}</h3>
          <p className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums">{card.keyNumber}</span>
            <span className="text-xs text-muted-foreground">{card.keyLabel}</span>
          </p>
          <p className="text-sm leading-relaxed">{card.sentence.text}</p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <CertaintyMark certainty={card.sentence.certainty} />
            <Link href={card.href} className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              See the evidence
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
        </li>
      ))}
    </ol>
  )
}
