import { Circle, CircleDashed, CircleDot, GitMerge, Users } from 'lucide-react'
import { DemoBadge } from '@/components/common/DemoBadge'
import { SourceLink } from '@/components/common/SourceLink'
import { BAND_LABEL, EVIDENCE_GROUPS, attributionStatement, rankCandidates } from '@/lib/attribution'
import { SIGNAL_STATE_LABEL } from '@/lib/copy'
import type { AttributionAnalysis, AttributionCandidate, Entity, SignalState } from '@/lib/types'
import { cn } from '@/lib/utils'

const STATE_ICON: Record<SignalState, typeof Circle> = { fired: CircleDot, not_fired: Circle, not_assessable: CircleDashed }

export function AttributionTab({ analysis, nameOf }: { analysis: AttributionAnalysis | null; nameOf: (id: string) => string }) {
  if (!analysis) {
    return (
      <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
        No attribution analysis is recorded for this entity. Attribution needs registry, trade, public-money and identifier evidence gathered for the entity itself.
      </p>
    )
  }
  const ranked = rankCandidates(analysis.candidates)
  const conflicting = ranked.filter((c) => c.conflictsWith.length > 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {analysis.demo && <DemoBadge />}
      </div>
      <p className="rounded-md border border-border p-3 text-sm font-medium">{attributionStatement(analysis)}</p>

      <section aria-labelledby="cand-title" className="flex flex-col gap-2">
        <h3 id="cand-title" className="text-sm font-semibold">
          Candidates, ranked
        </h3>
        <ol className="flex flex-col gap-2">
          {ranked.map((c) => (
            <li key={c.id} className="flex flex-col gap-1 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-paper">{BAND_LABEL[c.band]}</span>
                <span className="text-sm font-semibold">{c.name}</span>
                {!c.naturalPerson && <span className="text-[11px] text-muted-foreground">Not a natural person</span>}
              </div>
              <p className="text-xs text-muted-foreground">{c.rationale}</p>
            </li>
          ))}
        </ol>
      </section>

      {analysis.convergence.map((cv) => (
        <p key={cv.candidateId} className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs">
          <GitMerge className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <span className="font-semibold">Convergence: </span>
            evidence from {cv.shellIds.length} shells ({cv.shellIds.map(nameOf).join(', ')}) points to{' '}
            {analysis.candidates.find((c) => c.id === cv.candidateId)?.name}. Convergence raises confidence; it is not proof of control.
          </span>
        </p>
      ))}

      <section aria-labelledby="matrix-title" className="flex flex-col gap-2">
        <h3 id="matrix-title" className="text-sm font-semibold">
          Evidence matrix
        </h3>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <caption className="sr-only">Evidence group by candidate</caption>
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="p-2 text-left font-semibold">
                  Evidence group
                </th>
                {ranked.map((c) => (
                  <th key={c.id} scope="col" className="p-2 text-left font-semibold">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EVIDENCE_GROUPS.map(({ group, label }) => (
                <tr key={group} className="border-t border-border align-top">
                  <th scope="row" className="p-2 text-left font-medium">
                    {label}
                  </th>
                  {ranked.map((c) => (
                    <MatrixCell key={c.id} candidate={c} group={group} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {conflicting.length > 1 && (
        <section aria-labelledby="conflict-title" className="flex flex-col gap-2">
          <h3 id="conflict-title" className="flex items-center gap-1.5 text-sm font-semibold">
            <Users className="size-4" aria-hidden="true" />
            Conflicting candidates
          </h3>
          <p className="text-xs text-muted-foreground">These candidates cannot both be right. They are shown side by side and are never merged.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {conflicting.map((c) => (
              <div key={c.id} className="flex flex-col gap-1 rounded-md border border-dashed border-unconfirmed p-3 text-xs">
                <span className="font-semibold">{c.name}</span>
                <span className="text-muted-foreground">
                  {BAND_LABEL[c.band]} · {c.evidence.filter((e) => e.state === 'fired').length} of {EVIDENCE_GROUPS.length} groups fired
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="screen-title" className="flex flex-col gap-2 rounded-md border border-border p-3">
        <h3 id="screen-title" className="text-sm font-semibold">
          Screening of candidates
        </h3>
        <p className="text-[11px] text-muted-foreground">List status of each candidate. Kept separate from attribution.</p>
        <ul className="flex flex-col gap-1.5 text-xs">
          {analysis.screening.map((s) => (
            <li key={s.candidateId} className="flex flex-col gap-0.5">
              <span className="font-semibold">{analysis.candidates.find((c) => c.id === s.candidateId)?.name}</span>
              <span>{s.result}</span>
              <SourceLink url={s.sourceUrl} sourceId={s.sourceId} />
            </li>
          ))}
        </ul>
      </section>

      <LeadPriority value={analysis.leadPriority} />
    </div>
  )
}

function MatrixCell({ candidate, group }: { candidate: AttributionCandidate; group: string }) {
  const r = candidate.evidence.find((e) => e.group === group)
  const state: SignalState = r?.state ?? 'not_assessable'
  const Icon = STATE_ICON[state]
  return (
    <td className="p-2">
      <span className={cn('inline-flex items-center gap-1 font-semibold', state === 'fired' ? 'text-high' : 'text-muted-foreground')}>
        <Icon className="size-3.5" aria-hidden="true" />
        {SIGNAL_STATE_LABEL[state]}
      </span>
      {r?.evidence && <p className="mt-0.5 text-muted-foreground">{r.evidence}</p>}
      {(r?.sourceUrl || r?.sourceId) && <SourceLink url={r.sourceUrl} sourceId={r.sourceId} />}
    </td>
  )
}

function LeadPriority({ value }: { value: AttributionAnalysis['leadPriority'] }) {
  const cells: { likelihood: 'higher' | 'lower'; exposure: 'higher' | 'lower'; label: string }[] = [
    { likelihood: 'higher', exposure: 'lower', label: 'Review' },
    { likelihood: 'higher', exposure: 'higher', label: 'Prioritize' },
    { likelihood: 'lower', exposure: 'lower', label: 'Monitor' },
    { likelihood: 'lower', exposure: 'higher', label: 'Verify' },
  ]
  return (
    <section aria-labelledby="priority-title" className="flex flex-col gap-2">
      <h3 id="priority-title" className="text-sm font-semibold">
        Lead priority
      </h3>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-1 text-xs">
        <span />
        <span className="text-center text-muted-foreground">Lower exposure</span>
        <span className="text-center text-muted-foreground">Higher exposure</span>
        {(['higher', 'lower'] as const).map((l) => (
          <div key={l} className="contents">
            <span className="self-center pr-2 text-muted-foreground">{l === 'higher' ? 'Higher likelihood' : 'Lower likelihood'}</span>
            {cells
              .filter((c) => c.likelihood === l)
              .map((c) => {
                const on = c.likelihood === value.likelihood && c.exposure === value.exposure
                return (
                  <span key={c.label} className={cn('rounded-md border p-2 text-center font-semibold', on ? 'border-ink bg-ink text-paper' : 'border-border text-muted-foreground')}>
                    {c.label}
                    {on && <span className="sr-only"> (this entity)</span>}
                  </span>
                )
              })}
          </div>
        ))}
      </div>
    </section>
  )
}
