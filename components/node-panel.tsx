import { ChevronDown, ExternalLink, X } from 'lucide-react'
import type { InvestigationNode, SayariPassThrough } from '@/lib/types'
import Link from 'next/link'
import { NODE_TYPE_META, SEVERITY_CLASS, formatMatchKey } from '@/lib/graph-style'
import { cn } from '@/lib/utils'

export function NodePanel({ node, onClose }: { node: InvestigationNode; onClose: () => void }) {
  const meta = NODE_TYPE_META[node.type]

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: meta?.color }} aria-hidden="true" />
            {meta?.label ?? node.type}
          </span>
          <h2 className="font-heading text-xl font-semibold text-balance">{node.label}</h2>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <Stat label="Jurisdiction" value={node.jurisdiction ?? '—'} />
        <Stat label="Entity confidence" value={node.entity_confidence ?? '—'} />
      </dl>

      <section className="flex flex-col gap-2">
        <h3 className="font-heading text-sm font-semibold">Risk signals ({node.risk_signals.length})</h3>
        {node.risk_signals.length === 0 ? (
          <p className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">No risk signals. Clear skies here.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {node.risk_signals.map((s, i) => (
              <li key={`${s.signal_name}-${i}`} className="flex flex-col gap-1.5 rounded-2xl bg-muted p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug">{s.signal_name}</p>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold', SEVERITY_CLASS[s.severity])}>
                    {s.severity}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.source_authority ? (
                    <>
                      Published by <strong className="text-foreground">{s.source_authority}</strong>
                      {' · retrieved via '}
                      {s.provenance_source}
                    </>
                  ) : (
                    <>Source: {s.provenance_source}</>
                  )}
                </p>
                {s.source_id && (
                  <Link
                    href={`/traceability#source-${s.source_id}`}
                    className="w-fit rounded-full bg-background px-2 py-0.5 font-mono text-[11px] font-bold text-accent hover:underline"
                  >
                    {s.source_id} in source registry
                  </Link>
                )}
                {s.evidence_record && (
                  <a
                    href={s.evidence_record}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 break-all text-xs font-semibold text-accent underline-offset-2 hover:underline"
                  >
                    <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                    {s.evidence_record}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <SayariBlock data={node.sayari_pass_through} />
    </div>
  )
}

function SayariBlock({ data }: { data: SayariPassThrough | null }) {
  if (!data) {
    return <p className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">No Sayari pass-through data.</p>
  }
  const fmt = (v: boolean | number | null) => (v === null ? 'null' : String(v))

  return (
    <details className="group rounded-2xl bg-muted p-3" open>
      <summary className="flex cursor-pointer list-none items-center justify-between font-heading text-sm font-semibold">
        Sayari pass-through
        <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="flex flex-col gap-3 pt-3">
        <dl className="grid grid-cols-2 gap-2">
          <Stat label="Sanctioned" value={fmt(data.sanctioned)} highlight={data.sanctioned === true} />
          <Stat label="PEP" value={fmt(data.pep)} />
          <Stat label="Closed" value={fmt(data.closed)} />
          <Stat label="Degree" value={fmt(data.degree)} />
        </dl>
        <ChipList
          label="Relationship counts"
          items={Object.entries(data.relationship_count ?? {}).map(([k, v]) => `${k}: ${v}`)}
        />
        <ChipList label="Match keys" items={(data.match_keys ?? []).map(formatMatchKey)} />
        <details className="group/raw">
          <summary className="cursor-pointer text-xs font-semibold text-accent">Raw JSON</summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-background p-3 text-[11px] leading-relaxed">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      </div>
    </details>
  )
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {items.length === 0 ? (
        <span className="text-xs">none</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map((it) => (
            <span key={it} className="rounded-full bg-background px-2 py-0.5 font-mono text-[11px]">
              {it}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-background/60 px-3 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn('text-sm font-bold', highlight && 'text-sev-critical')}>{value}</dd>
    </div>
  )
}

export function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <X className="size-4" aria-hidden="true" />
      <span className="sr-only">Close details</span>
    </button>
  )
}
