'use client'

import { SourceLink } from '@/components/common/SourceLink'
import { useCase } from '@/components/shell/CaseContext'
import { GLOSSARY } from '@/lib/glossary'

export default function EvidencePage() {
  const c = useCase()
  const records = new Map<string, { url: string | null; sourceId?: string; label: string }>()
  for (const s of c.sources) records.set(s.url, { url: s.url, sourceId: s.id, label: s.name })
  for (const e of c.entities) for (const i of e.indicators) if (i.sourceUrl && !records.has(i.sourceUrl)) records.set(i.sourceUrl, { url: i.sourceUrl, sourceId: i.sourceId, label: i.provider ?? i.sourceUrl })
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold briefing:text-2xl">Evidence</h1>
      <section aria-labelledby="src-title" className="flex flex-col gap-2" data-tour="evidence-list">
        <h2 id="src-title" className="text-sm font-semibold">Source records ({records.size})</h2>
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-card">
          {[...records.values()].map((r) => (
            <li key={r.url ?? r.label} className="flex flex-col gap-1 p-3 text-sm">
              <span className="font-medium">{r.label}</span>
              <SourceLink url={r.url} sourceId={r.sourceId} />
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="audit-title" className="flex flex-col gap-2">
        <h2 id="audit-title" className="text-sm font-semibold">Audit trail ({c.audit.length} queries)</h2>
        <ol className="flex flex-col gap-2">
          {c.audit.map((a) => (
            <li key={a.seq} className="rounded-md border border-border bg-card p-3 text-sm">
              <span className="font-semibold">{a.seq}. {a.provider}</span> · {a.recordsReturned} records
              <code className="mt-1 block break-words font-mono text-xs">{a.query}</code>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="gloss-title" className="flex flex-col gap-2">
        <h2 id="gloss-title" className="text-sm font-semibold">Glossary</h2>
        <dl className="grid gap-3 md:grid-cols-2">
          {Object.values(GLOSSARY).map((g) => (
            <div key={g.term} className="rounded-md border border-border bg-card p-3 text-sm">
              <dt className="font-semibold">{g.term}</dt>
              <dd>{g.definition}</dd>
              <dd className="text-xs text-muted-foreground">Why it matters: {g.whyItMatters}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
