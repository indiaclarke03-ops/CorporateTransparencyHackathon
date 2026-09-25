'use client'

import { Building2, User } from 'lucide-react'
import { DemoBadge } from '@/components/common/DemoBadge'
import { NotInRecord } from '@/components/common/NotInRecord'
import { RangeBar } from '@/components/common/RangeBar'
import { RegulatoryCallout } from '@/components/common/RegulatoryCallout'
import { TierChip } from '@/components/common/TierChip'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { attributionFor } from '@/lib/attribution'
import { calloutsFor } from '@/lib/callouts'
import { formatPercent, formatUSD } from '@/lib/format'
import { useWorkspace } from '@/lib/store'
import type { CaseFile, Entity } from '@/lib/types'
import { AttributionTab } from './AttributionTab'
import { IndicatorsTable } from './IndicatorsTable'
import { ListedStatusBox } from './ListedStatusBox'

/** Right-hand panel for the selected entity, driven by the workspace store. */
export function EntityPanel({ caseFile }: { caseFile: CaseFile }) {
  const { selectedEntityId, setSelectedEntityId } = useWorkspace()
  const entity = caseFile.entities.find((e) => e.id === selectedEntityId)
  const nameOf = (id: string) => caseFile.entities.find((e) => e.id === id)?.name ?? id

  return (
    <Sheet open={!!entity} onOpenChange={(open) => !open && setSelectedEntityId(null)} modal={false}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl" onInteractOutside={(e) => e.preventDefault()}>
        {entity && <EntityDetail entity={entity} caseFile={caseFile} nameOf={nameOf} />}
      </SheetContent>
    </Sheet>
  )
}

function EntityDetail({ entity: e, caseFile, nameOf }: { entity: Entity; caseFile: CaseFile; nameOf: (id: string) => string }) {
  const demoValues = caseFile.kind === 'demo'
  const callouts = calloutsFor(e)
  const KindIcon = e.kind === 'person' ? User : Building2

  return (
    <>
      <SheetHeader className="gap-2 border-b border-border p-5 pr-12">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <KindIcon className="size-3.5" aria-hidden="true" />
          <span className="capitalize">{e.entityType.replaceAll('_', ' ')}</span>
          <span aria-hidden="true">·</span>
          <span>{e.jurisdiction ?? 'Jurisdiction not in record'}</span>
          {e.demo && <DemoBadge label="Invented entity" />}
        </div>
        <SheetTitle className="text-xl leading-tight">{e.name}</SheetTitle>
        <SheetDescription asChild>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-border px-2 py-0.5 font-semibold text-foreground">Match grade {e.matchGrade ?? '—'}</span>
            {e.matchedAttributes.length > 0 ? (
              <span>Matched on {e.matchedAttributes.join(', ')}</span>
            ) : (
              <NotInRecord label="Matched attributes not in record" />
            )}
          </div>
        </SheetDescription>
        {e.identifiers.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {e.identifiers.map((i) => (
              <li key={`${i.type}-${i.value}`} className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px]">
                {i.type} {i.value}
              </li>
            ))}
          </ul>
        )}
      </SheetHeader>

      <Tabs defaultValue="profile" className="gap-0">
        <TabsList className="mx-5 mt-4" aria-label="Entity sections">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="flex flex-col gap-5 p-5">
          <ListedStatusBox status={e.listedStatus} />

          <section aria-labelledby="score-title" className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="score-title" className="text-sm font-semibold">
                Combined risk score
              </h3>
              {demoValues && e.score && <DemoBadge />}
            </div>
            {e.score ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <TierChip tier={e.tier} size="md" />
                  <span className="text-2xl font-semibold tabular-nums">{e.score.point}</span>
                  <span className="text-xs text-muted-foreground">of 100</span>
                </div>
                <RangeBar max={100} lower={e.score.lower} upper={e.score.upper} point={e.score.point} format={(n) => String(Math.round(n))} />
                <p className="text-xs text-muted-foreground">Range reflects signals that could not be checked.</p>
              </>
            ) : (
              <div className="flex flex-col gap-1">
                <TierChip tier={null} size="md" />
                <p className="text-xs text-muted-foreground">The scoring engine has not been run on this entity. Its recorded signals are listed below.</p>
              </div>
            )}
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-muted p-2">
                <dt className="text-muted-foreground">Coverage</dt>
                <dd className="font-semibold">{e.coverage !== null ? `${formatPercent(e.coverage)} of applicable signals checked` : <NotInRecord />}</dd>
              </div>
              <div className="rounded-md bg-muted p-2">
                <dt className="text-muted-foreground">Observed dollars in</dt>
                <dd className="font-semibold tabular-nums">{e.observedDollarsIn ? formatUSD(e.observedDollarsIn) : <NotInRecord />}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="signals-title" className="flex flex-col gap-2">
            <h3 id="signals-title" className="text-sm font-semibold">
              Signals
            </h3>
            <IndicatorsTable indicators={e.indicators} />
          </section>

          {callouts.length > 0 && (
            <section aria-labelledby="callouts-title" className="flex flex-col gap-2">
              <h3 id="callouts-title" className="text-sm font-semibold">
                Regulatory context
              </h3>
              {callouts.map((c) => (
                <RegulatoryCallout key={c.id} {...c} />
              ))}
            </section>
          )}
        </TabsContent>

        <TabsContent value="attribution" className="p-5">
          <AttributionTab analysis={attributionFor(caseFile, e.id)} nameOf={nameOf} />
        </TabsContent>
      </Tabs>
    </>
  )
}
