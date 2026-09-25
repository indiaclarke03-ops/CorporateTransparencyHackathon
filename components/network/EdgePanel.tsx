'use client'

import { DemoBadge } from '@/components/common/DemoBadge'
import { NotInRecord } from '@/components/common/NotInRecord'
import { SourceLink } from '@/components/common/SourceLink'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EDGE_KIND_META, PATH_TYPE_META } from '@/lib/copy'
import { describeEdge, pathType } from '@/lib/describe'
import { formatDate, formatUSD } from '@/lib/format'
import { useWorkspace } from '@/lib/store'
import type { CaseFile, Edge } from '@/lib/types'

export function EdgePanel({ caseFile }: { caseFile: CaseFile }) {
  const { selectedEdgeId, setSelectedEdgeId, setSelectedEntityId } = useWorkspace()
  const edge = caseFile.edges.find((e) => e.id === selectedEdgeId)
  const nameOf = (id: string) => caseFile.entities.find((e) => e.id === id)?.name ?? id

  return (
    <Sheet open={!!edge} onOpenChange={(open) => !open && setSelectedEdgeId(null)} modal={false}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        {edge && <EdgeDetail edge={edge} all={caseFile.edges} nameOf={nameOf} onEntity={setSelectedEntityId} />}
      </SheetContent>
    </Sheet>
  )
}

function EdgeDetail({ edge: e, all, nameOf, onEntity }: { edge: Edge; all: Edge[]; nameOf: (id: string) => string; onEntity: (id: string) => void }) {
  const type = PATH_TYPE_META[pathType(e, all)]
  return (
    <>
      <SheetHeader className="gap-2 border-b border-border p-5 pr-12">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-ink px-2 py-0.5 font-semibold text-paper">{type.badge}</span>
          <span className="text-muted-foreground">{EDGE_KIND_META[e.kind].label} · recorded as “{e.relationship}”</span>
          {e.demo && <DemoBadge label="Demo link" />}
        </div>
        <SheetTitle className="text-lg leading-snug">{describeEdge(e, nameOf)}</SheetTitle>
        <SheetDescription className="text-xs">
          From{' '}
          <button type="button" onClick={() => onEntity(e.source)} className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {nameOf(e.source)}
          </button>{' '}
          to{' '}
          <button type="button" onClick={() => onEntity(e.target)} className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {nameOf(e.target)}
          </button>
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-5 p-5 text-sm">
        <section aria-labelledby="legal-title" className="flex flex-col gap-1 rounded-md bg-muted p-3">
          <h3 id="legal-title" className="text-xs font-semibold">
            What this connection means
          </h3>
          <p className="text-xs leading-relaxed">{type.legalNote}</p>
        </section>

        <dl className="grid grid-cols-2 gap-2 text-xs">
          {e.share !== null && <Field label="Share">{`${e.share}%`}</Field>}
          {e.amount !== null && <Field label="Amount">{formatUSD(e.amount)}</Field>}
          <Field label="Active from">{e.activeFrom ? formatDate(e.activeFrom) : <NotInRecord />}</Field>
          <Field label="Active to">{e.activeTo ? formatDate(e.activeTo) : <NotInRecord />}</Field>
        </dl>

        <section aria-labelledby="strength-title" className="flex flex-col gap-1">
          <h3 id="strength-title" className="text-xs font-semibold">
            Strength: <span className="capitalize">{e.strength}</span>
          </h3>
          {e.strengthFactors.length ? (
            <ul className="list-disc pl-5 text-xs text-muted-foreground">
              {e.strengthFactors.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : (
            <NotInRecord label="No strength factors recorded" />
          )}
        </section>

        <section aria-labelledby="sources-title" className="flex flex-col gap-1">
          <h3 id="sources-title" className="text-xs font-semibold">
            Sources
          </h3>
          {e.sourceUrls.length || e.sourceId ? (
            <>
              {e.sourceAuthority && <p className="text-xs text-muted-foreground">Published by {e.sourceAuthority}</p>}
              {(e.sourceUrls.length ? e.sourceUrls : [null]).map((u, i) => (
                <SourceLink key={u ?? i} url={u} sourceId={i === 0 ? e.sourceId : undefined} />
              ))}
            </>
          ) : (
            <NotInRecord label={e.demo ? 'No source: invented demo link' : 'No source recorded'} />
          )}
        </section>
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-muted p-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{children}</dd>
    </div>
  )
}
