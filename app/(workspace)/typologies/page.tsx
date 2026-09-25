'use client'

import { ViewGuide, ViewTitle } from '@/components/explain/ViewGuide'
import { useCase } from '@/components/shell/CaseContext'
import { MoneyAmount } from '@/components/ui-kit/MoneyAmount'
import { PlainSummary } from '@/components/ui-kit/PlainSummary'
import { TypologyBadge, UnverifiedLabel } from '@/components/ui-kit/TypologyBadge'
import { computeFlows } from '@/lib/exposure'
import { INDICATORS } from '@/lib/indicators'
import { viewKeyPoints } from '@/lib/narrative'
import { useWorkspace } from '@/lib/store'
import { TYPOLOGIES, fitLabel, typologyFit } from '@/lib/typologies'
import { cn } from '@/lib/utils'

export default function TypologiesPage() {
  const c = useCase()
  const { lens, setLens, setSelectedEntityId } = useWorkspace()
  const { inflow } = computeFlows(c)
  const summary = viewKeyPoints('typologies', c)[0]
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-3">
          <ViewTitle guideId="typologies">Typologies</ViewTitle>
          <p className="text-sm text-muted-foreground">What patterns does this match?</p>
          {summary && <PlainSummary text={summary.text} certainty={summary.certainty} />}
        </div>
        <ViewGuide view="typologies" />
      </div>
      <ul className="grid gap-3 lg:grid-cols-2" data-tour="typology-cards">
        {TYPOLOGIES.map((t) => {
          const fits = c.entities.map((e) => ({ e, f: typologyFit(e, c, t) })).filter((x) => x.f.matched.length > 0).sort((a, b) => b.f.matched.length - a.f.matched.length)
          const dollars = fits.reduce((s, x) => s + (inflow[x.e.id] ?? 0), 0)
          return (
            <li key={t.id} className={cn('flex flex-col gap-2 rounded-md border bg-card p-4', lens === t.id ? 'border-2 border-ink' : 'border-border')}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TypologyBadge typology={t} />
                <button type="button" aria-pressed={lens === t.id} onClick={() => setLens(lens === t.id ? null : t.id)} className="rounded-md border border-ink px-2 py-0.5 text-xs font-semibold hover:bg-ink hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {lens === t.id ? 'Lens on' : 'Use as lens'}
                </button>
              </div>
              <p className="text-sm">{t.shortDescription}</p>
              {t.verificationStatus === 'needs_source' && (
                <div className="flex flex-col gap-1">
                  <UnverifiedLabel />
                  <p className="text-xs text-muted-foreground">Needs a source: {t.unverifiedParts.join('; ')}.</p>
                </div>
              )}
              <p className="text-xs">
                {fits.length} {fits.length === 1 ? 'entity fits' : 'entities fit'} in this case
                {dollars > 0 && (
                  <>
                    {' '}· <MoneyAmount value={dollars} certainty="estimated" /> touching them
                  </>
                )}
              </p>
              {fits.slice(0, 4).map(({ e, f }) => (
                <button key={e.id} type="button" onClick={() => setSelectedEntityId(e.id)} className="flex flex-col rounded-md bg-muted p-2 text-left text-xs hover:ring-1 hover:ring-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="font-semibold">{e.name}</span>
                  <span>{fitLabel(f)}</span>
                  <span className="text-muted-foreground">Matched: {f.matched.map((k) => INDICATORS[k].label).join(', ')}</span>
                </button>
              ))}
              {t.validationCases.length > 0 && (
                <p className="text-xs text-muted-foreground">Known cases: {t.validationCases.map((v) => v.label).join('; ')}</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
