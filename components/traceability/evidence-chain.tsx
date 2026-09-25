import { ArrowDown, ExternalLink, FileText, Landmark, ListChecks, Quote, ScrollText, Workflow } from 'lucide-react'
import type { ReactNode } from 'react'
import { showcase } from '@/lib/showcase'
import { Pill, SourceChip } from './ui'

function Step({ icon, n, title, children }: { icon: ReactNode; n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">{icon}</span>
        <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pb-6">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Step {n}</p>
        <h3 className="font-heading text-lg font-semibold">{title}</h3>
        {children}
      </div>
    </li>
  )
}

export function EvidenceChain() {
  const c = showcase.chain
  return (
    <ol className="flex flex-col">
      <Step n={1} icon={<FileText className="size-5" />} title="A sentence in the Lead Dossier">
        <blockquote className="rounded-2xl border-l-4 border-accent bg-muted p-4 text-sm leading-relaxed">
          {c.sentence} {c.footnotes.map((f) => <SourceChip key={f} id={f} />)}
        </blockquote>
      </Step>
      <Step n={2} icon={<Workflow className="size-5" />} title="Filled from a fixed template, not written by a model">
        <p className="text-sm text-muted-foreground">
          Every sentence is a template from <code className="font-mono">config/narrative_templates.yaml</code> filled with sourced fields.
          If a field is missing, the sentence is dropped rather than guessed.
        </p>
        <code className="block overflow-x-auto rounded-xl bg-background p-3 font-mono text-xs">{c.template}</code>
      </Step>
      <Step n={3} icon={<ListChecks className="size-5" />} title="The footnotes resolve to registered sources">
        <div className="grid gap-2 md:grid-cols-2">
          {c.sources.map((s) => (
            <a key={s.id} href={`#source-${s.id}`} className="flex flex-col gap-1 rounded-2xl bg-muted p-3 transition hover:ring-2 hover:ring-accent">
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-accent">{s.id}</span>
                <Pill tone="good">Tier {s.tier}</Pill>
                {s.content_verified && <Pill tone="good">Content read</Pill>}
              </span>
              <span className="text-sm font-semibold">{s.name}</span>
              <span className="text-xs text-muted-foreground">Published by {s.publisher} · retrieved {s.retrieved_at} via {s.retrieved_via}</span>
            </a>
          ))}
        </div>
      </Step>
      {c.ledger_fact && (
        <Step n={4} icon={<Quote className="size-5" />} title="The evidence ledger records what the source actually says, and where">
          <div className="flex flex-col gap-2 rounded-2xl bg-muted p-4 text-sm">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-accent">{c.ledger_fact.fact_id}</span>
              <Pill>{c.ledger_fact.kind}</Pill>
              <Pill tone="good">Confidence {c.ledger_fact.confidence}</Pill>
            </span>
            <q className="leading-relaxed">{c.ledger_fact.claim_as_the_source_states_it}</q>
            <span className="text-xs text-muted-foreground">Locator: {c.ledger_fact.locator}</span>
          </div>
        </Step>
      )}
      <Step n={5} icon={<ScrollText className="size-5" />} title="The investigation graph carries the same citation, with who published it">
        <div className="flex flex-col gap-1 rounded-2xl bg-muted p-4 text-sm">
          <span className="font-semibold">{c.fixture_signal.signal_name}</span>
          <span className="text-xs text-muted-foreground">
            Published by <strong className="text-foreground">{c.fixture_signal.source_authority}</strong> · retrieved via {c.fixture_signal.provenance_source} · {c.fixture_signal.source_id}
          </span>
        </div>
      </Step>
      <li className="flex gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-sev-low text-accent-foreground">
          <Landmark className="size-5" />
        </span>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Step 6</p>
          <h3 className="font-heading text-lg font-semibold">The primary government record</h3>
          <a href={c.fixture_signal.evidence_record} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 break-all text-sm font-semibold text-accent hover:underline">
            <ExternalLink className="size-4 shrink-0" /> {c.fixture_signal.evidence_record}
          </a>
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowDown className="size-3 rotate-180" /> Anyone can open it and check the sentence at the top.</p>
        </div>
      </li>
    </ol>
  )
}
