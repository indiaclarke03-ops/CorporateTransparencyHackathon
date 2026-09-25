import { ChevronDown, ExternalLink, X } from 'lucide-react'
import type { InvestigationNode, NodeDetails, SayariPassThrough } from '@/lib/types'
import Link from 'next/link'
import { MONEY_STATUS, NODE_TYPE_META, SEVERITY_CLASS, formatMatchKey } from '@/lib/graph-style'
import { cn } from '@/lib/utils'

export function NodePanel({ node, onClose }: { node: InvestigationNode; onClose: () => void }) {
  const meta = NODE_TYPE_META[node.type]

  if (node.type === 'public_money') {
    const st = MONEY_STATUS[node.details?.money_status ?? 'none']
    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: st.color }}>Public money · {st.label}</span>
            <h2 className="font-heading text-xl font-semibold text-balance">{node.label}</h2>
          </div>
          <CloseButton onClose={onClose} />
        </div>
        <p className="rounded-2xl bg-muted p-3 text-sm leading-relaxed">{node.details?.money_text}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          This is where the tool starts: federal spending data (USAspending.gov awards, SAM.gov registrations and exclusions). The graph then follows
          ownership, officers and trade outward from the entity the money reaches. Green means money was paid, red means the entity is barred, amber
          dashed means exposure through suppliers, and grey dashed means we screened and found no awards.
        </p>
        {node.details?.sayari_url && (
          <a href={node.details.sayari_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 break-all text-xs font-semibold text-accent hover:underline">
            <ExternalLink className="size-3 shrink-0" /> {node.details.sayari_url}
          </a>
        )}
      </div>
    )
  }

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
        <Stat label="Jurisdiction" value={node.details?.countries?.join(', ') || node.jurisdiction || '—'} />
        <Stat label="Entity confidence" value={node.entity_confidence ?? '—'} />
        {node.details?.registration_date && <Stat label="Registered" value={node.details.registration_date} />}
        {node.details?.trade_count && <Stat label="Shipments sent / received" value={`${node.details.trade_count.sent} / ${node.details.trade_count.received}`} />}
      </dl>

      {node.details && <DetailsBlock d={node.details} />}

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

function DetailsBlock({ d }: { d: NodeDetails }) {
  const tv = d.tradeverifyd
  return (
    <section className="flex flex-col gap-3">
      {d.sayari_url && (
        <a href={d.sayari_url} target="_blank" rel="noopener noreferrer"
          className="flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground hover:brightness-110">
          <ExternalLink className="size-3.5" aria-hidden="true" /> Open the record in Sayari Graph
        </a>
      )}
      <Facts label="Identifiers" items={(d.identifiers ?? []).map((i) => `${i.type.replace(/_/g, ' ')}: ${i.value}`)} mono />
      <Facts label="Registered addresses" items={d.addresses ?? []} />
      <Facts label="Also known as" items={d.aliases ?? []} />
      {(d.company_type || d.status) && (
        <p className="text-xs text-muted-foreground">
          {d.company_type && <>Company type: <strong className="text-foreground">{d.company_type}</strong></>}
          {d.company_type && d.status && ' · '}
          {d.status && <>Status: <strong className="text-foreground">{d.status}</strong></>}
        </p>
      )}
      <Facts label="Stated business" items={d.business_purpose ?? []} />
      {d.relationship_summary && (
        <ChipList label="Relationships in Sayari (all, not just those drawn)" items={Object.entries(d.relationship_summary).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)} />
      )}
      {tv && (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-muted p-3">
          <p className="font-heading text-sm font-semibold">
            Tradeverifyd {tv.score != null && <span className="text-accent">score {tv.score} ({tv.score_level})</span>}
          </p>
          {tv.name && <p className="text-xs text-muted-foreground">Matched as &ldquo;{tv.name}&rdquo; · {tv.trade_relationships ?? 0} trade relationships on record</p>}
          <ul className="flex flex-col gap-1">
            {(tv.annotations ?? []).map((a) => (
              <li key={a.name} className="text-xs">
                <strong>{a.name}</strong>{a.description ? `: ${a.description}` : ''}
                {a.url && <> · <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">source</a></>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Facts label="Sayari drew this from" items={d.sayari_sources ?? []} />
      {d.risk_flag_count != null && d.risk_flag_count > 0 && (
        <p className="text-xs text-muted-foreground">Sayari lists {d.risk_flag_count} risk flags on this record; the main ones are shown as signals below.</p>
      )}
    </section>
  )
}

function Facts({ label, items, mono }: { label: string; items: string[]; mono?: boolean }) {
  if (!items.length) return null
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <ul className="flex flex-col gap-0.5">
        {items.map((it) => (
          <li key={it} className={cn('break-words text-xs', mono && 'font-mono text-[11px]')}>{it}</li>
        ))}
      </ul>
    </div>
  )
}

function SayariBlock({ data }: { data: SayariPassThrough | null }) {
  if (!data) {
    return <p className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">No Sayari pass-through data.</p>
  }
  const fmt = (v: boolean | number | null) => (v === null ? 'null' : String(v))

  return (
    <details className="group rounded-2xl bg-muted p-3">
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
