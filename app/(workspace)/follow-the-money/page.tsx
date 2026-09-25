'use client'

import { TopPaths } from '@/components/brief/TopPaths'
import { ViewGuide, ViewTitle } from '@/components/explain/ViewGuide'
import { MoneyTrail } from '@/components/money/MoneyTrail'
import { CaseOverview } from '@/components/overview/CaseOverview'
import { useCase } from '@/components/shell/CaseContext'
import { PlainSummary } from '@/components/ui-kit/PlainSummary'
import { briefCards } from '@/lib/narrative'

export default function FollowTheMoneyPage() {
  const c = useCase()
  const where = briefCards(c).find((x) => x.id === 'where')!.sentence
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-3">
          <ViewTitle guideId="money">Follow the Money</ViewTitle>
          <p className="text-sm text-muted-foreground">Where did the public money go?</p>
          <PlainSummary text={where.text} certainty={where.certainty} />
        </div>
        <ViewGuide view="money" />
      </div>
      <MoneyTrail />
      <TopPaths />
      <CaseOverview caseFile={c} />
    </div>
  )
}
