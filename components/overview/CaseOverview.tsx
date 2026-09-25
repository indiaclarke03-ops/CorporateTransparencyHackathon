import { Banknote, ArrowRightLeft, Scale, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { DemoBadge } from '@/components/common/DemoBadge'
import { NotInRecord } from '@/components/common/NotInRecord'
import { RangeBar } from '@/components/common/RangeBar'
import { SourceLink } from '@/components/common/SourceLink'
import { TierChip } from '@/components/common/TierChip'
import { isCountedListed, summarizeExposure } from '@/lib/exposure'
import { formatUSD } from '@/lib/format'
import type { CaseFile, Tier } from '@/lib/types'

const TIER_ORDER: (Tier | null)[] = ['high', 'elevated', 'low', 'not_assessable', null]

export function CaseOverview({ caseFile }: { caseFile: CaseFile }) {
  const x = summarizeExposure(caseFile)
  const recipient = caseFile.entities.find((e) => e.id === caseFile.recipientId)
  const listed = caseFile.entities.filter(isCountedListed)
  const demo = caseFile.kind === 'demo'
  const usd = (n: number) => formatUSD(n, { compact: true })

  return (
    <section aria-labelledby="overview-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="overview-title" className="text-base font-semibold">
          Case overview
        </h2>
        {demo && <DemoBadge />}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard icon={<Banknote className="size-4" aria-hidden="true" />} title="Award">
          {caseFile.award ? (
            <>
              <p className="text-2xl font-semibold tabular-nums text-ledger">{formatUSD(caseFile.award.obligated, { compact: true })}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                <dt className="text-muted-foreground">Award</dt>
                <dd className="font-medium">{caseFile.award.id}</dd>
                <dt className="text-muted-foreground">Agency</dt>
                <dd>{caseFile.award.agency}</dd>
                <dt className="text-muted-foreground">Recipient</dt>
                <dd>{recipient?.name ?? <NotInRecord />}</dd>
              </dl>
              {caseFile.award.url ? <SourceLink url={caseFile.award.url} label="USAspending record" /> : <NotInRecord label="No USAspending link (demo)" />}
            </>
          ) : (
            <>
              <NotInRecord label="No award on record" />
              <p className="text-xs leading-relaxed text-muted-foreground">{caseFile.awardNote}</p>
            </>
          )}
        </OverviewCard>

        <OverviewCard icon={<ArrowRightLeft className="size-4" aria-hidden="true" />} title="Observed flows">
          {x.flows.length ? (
            <p className="text-2xl font-semibold tabular-nums">{usd(x.observedFlows)}</p>
          ) : (
            <NotInRecord label="No subawards or purchases on record" />
          )}
          <p className="text-xs text-muted-foreground">
            {x.flows.filter((f) => f.kind === 'subaward').length} subawards, {x.flows.filter((f) => f.kind === 'purchase').length} purchases
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">Observed records only; bank transfers are not visible.</p>
        </OverviewCard>

        <OverviewCard icon={<Scale className="size-4" aria-hidden="true" />} title="Estimated risk-weighted exposure">
          {x.riskWeighted && x.awardObligated ? (
            <>
              {x.riskWeighted.point !== null ? (
                <p className="text-2xl font-semibold tabular-nums">{usd(x.riskWeighted.point)}</p>
              ) : (
                <NotInRecord label="No point estimate: some entities not assessed" />
              )}
              <RangeBar max={x.awardObligated} lower={x.riskWeighted.lower} upper={x.riskWeighted.upper} point={x.riskWeighted.point} format={usd} />
              <p className="text-xs leading-relaxed text-muted-foreground">Observed dollars weighted by each entity&apos;s combined score. The range reflects signals that could not be checked.</p>
            </>
          ) : (
            <>
              <NotInRecord label="Not assessable" />
              <p className="text-xs leading-relaxed text-muted-foreground">Needs an award on record.</p>
            </>
          )}
        </OverviewCard>

        <OverviewCard icon={<ShieldAlert className="size-4" aria-hidden="true" />} title="Listed-party exposure">
          {x.awardObligated ? (
            <p className="text-2xl font-semibold tabular-nums">{usd(x.listedParty)}</p>
          ) : (
            <NotInRecord label="No award dollars to trace" />
          )}
          <p className="text-xs text-muted-foreground">
            {listed.length} {listed.length === 1 ? 'party' : 'parties'} on a US, UN, EU or UK list
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">Unweighted observed dollars reaching listed parties. Reported separately as a priority item.</p>
        </OverviewCard>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Entities by tier:</span>
        {TIER_ORDER.map((t) => {
          const n = x.tierCounts[t ?? 'not_assessed']
          return n ? (
            <span key={t ?? 'na'} className="inline-flex items-center gap-1">
              <TierChip tier={t} />
              <span className="tabular-nums font-medium">{n}</span>
            </span>
          ) : null
        })}
      </div>
    </section>
  )
}

function OverviewCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-4">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}
