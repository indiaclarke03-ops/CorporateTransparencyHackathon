import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Landmark } from 'lucide-react'
import { showcase } from '@/lib/showcase'
import { Backlog } from '@/components/traceability/backlog'
import { CitationAudit } from '@/components/traceability/citation-audit'
import { DataMap } from '@/components/traceability/data-map'
import { DossierViewer } from '@/components/traceability/dossier-viewer'
import { EvidenceChain } from '@/components/traceability/evidence-chain'
import { EvidenceLedger } from '@/components/traceability/evidence-ledger'
import { NameTraps } from '@/components/traceability/name-traps'
import { Pipeline } from '@/components/traceability/pipeline'
import { SourceRegistry } from '@/components/traceability/source-registry'
import { Section, StatTile } from '@/components/traceability/ui'

export const metadata: Metadata = {
  title: 'Traceability — Follow the Public Dollar',
  description: 'How every fact in Follow the Public Dollar traces back to a primary government or registry record.',
}

const NAV = [
  ['chain', 'One fact, end to end'], ['sources', 'Sources'], ['evidence', 'Evidence'], ['audit', 'Citation audit'],
  ['traps', 'Name traps'], ['map', 'Data map'], ['pipeline', 'Pipeline'], ['dossiers', 'Dossiers'], ['backlog', 'Backlog'],
] as const

export default function TraceabilityPage() {
  const s = showcase
  const tier1 = s.sources.filter((x) => x.tier === 1).length
  const audit = Object.values(s.citation_audit.fixtures)
  const before = audit.reduce((a, f) => a + (f.before?.errors ?? 0), 0)
  const after = audit.reduce((a, f) => a + f.after.errors, 0)
  const tests = Object.values(s.tests).reduce((a, b) => a + b, 0)
  const confirmed = (s.data_source_map.status_counts.Confirmed ?? 0) + (s.data_source_map.status_counts.Pilot ?? 0)

  return (
    <div className="mx-auto flex max-w-6xl min-w-0 flex-col gap-5 overflow-x-clip p-4 md:p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Landmark className="size-6" aria-hidden="true" /></span>
          <div>
            <p className="font-heading text-2xl font-semibold">Follow the Public Dollar</p>
            <p className="text-sm text-muted-foreground">Traceability: how every fact gets back to its source</p>
          </div>
        </div>
        <Link href="/" className="flex h-10 w-fit items-center gap-2 rounded-full border border-accent px-4 text-sm font-bold text-accent transition hover:bg-accent hover:text-accent-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" /> Investigation graph
        </Link>
      </header>

      <section className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="flex max-w-3xl flex-col gap-3">
          <h1 className="font-heading text-3xl font-bold text-balance md:text-4xl">Every claim links to a primary record. Nothing is generated.</h1>
          <p className="text-base leading-relaxed text-muted-foreground text-pretty">
            Regulators and inspectors general won&apos;t act on a lead they can&apos;t check. So each fact here carries a source ID, a publisher,
            a retrieval time and a stored copy of the response. Copy is filled from fixed templates, and missing data is shown as missing,
            never as clean.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile value={s.sources.length} label="Registered sources" sub={`${tier1} are primary government or registry records`} />
          <StatTile value={s.ledger.length} label="Sourced facts in the ledger" sub="each quotes what its source says, and where" />
          <StatTile value={<>{before}<span className="text-muted-foreground"> → </span>{after}</>} label="Citation errors in the case files" sub="after the citation audit" tone="good" />
          <StatTile value={`${confirmed}/${s.data_source_map.needs.length}`} label="Data needs verified" sub="against vendor docs or a live response" tone="good" />
          <StatTile value={s.replay?.missing_source_record_total ?? '—'} label="Rows without a source record" sub="replay run of every dataset job" tone="good" />
          <StatTile value={s.recorded_fixtures.length} label="Recorded vendor responses" sub="hashed and timestamped, for replay" />
          <StatTile value={s.datasets.length} label="Datasets planned" sub={`${s.dry_run.pilot_size}-company pilot, dry-run checked`} />
          <StatTile value={tests} label="Automated tests" sub="provenance, templates, budgets, citations" />
        </div>
      </section>

      <nav aria-label="Sections" className="sticky top-2 z-10 flex gap-1.5 overflow-x-auto rounded-full border border-border bg-card/95 p-1.5 backdrop-blur">
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground">{label}</a>
        ))}
      </nav>

      <Section id="chain" eyebrow="Walkthrough" title="Follow one fact, from the dossier to the government record"
        intro="The same path applies to every sentence, signal and relationship in the product. Click a source ID anywhere on this page to jump to its registry entry.">
        <EvidenceChain />
      </Section>

      <Section id="sources" eyebrow="Source registry" title="Every citable record, with who published it and when we fetched it"
        intro="Tier 1 is the government or registry record itself. Tier 2 is an aggregator record with a stable ID, corroborated where possible. Tier 3 (law firms, news, contract-data resellers) is used only to find leads and is never cited.">
        <SourceRegistry />
      </Section>

      <Section id="evidence" eyebrow="Evidence ledger" title="What each source actually says"
        intro="One row per fact or relationship, quoting the source and pointing to where in the record it appears. Graph edges and dossier sentences are built from these rows.">
        <EvidenceLedger />
      </Section>

      <Section id="audit" eyebrow="Citation audit" title="We checked our own case files, and fixed what didn't hold up"
        intro="A link that loads isn't enough. The audit caught claims cited to the wrong agency, law-firm blogs standing in for OFAC records, and relationships stronger than the source states.">
        <CitationAudit />
      </Section>

      <Section id="traps" eyebrow="Name traps" title="Matches that looked like hits, and weren't"
        intro="Name-only matching produces confident-looking false leads. These are the real examples we logged, and the matching rule each one taught us.">
        <NameTraps />
      </Section>

      <Section id="map" eyebrow="Data-source map" title="Every data need, checked against the vendor's own documentation"
        intro="Endpoints and fields come from saved vendor and agency docs, never from memory. Anything unverified is marked UNCONFIRMED and parked in the backlog.">
        <DataMap />
      </Section>

      <Section id="pipeline" eyebrow="Dataset pipeline" title="From public money to provenance-backed datasets"
        intro="The build is planned and budgeted before any call is made, and replayable offline from recorded responses.">
        <Pipeline />
      </Section>

      <Section id="dossiers" eyebrow="Lead dossiers" title="The output a reviewer receives"
        intro="Written for an inspector-general intake analyst. It presents risk leads for human review, never findings of wrongdoing, and every statement is footnoted.">
        <DossierViewer />
      </Section>

      <Section id="backlog" eyebrow="Backlog" title="What we deliberately parked, and what needs a decision"
        intro="Anything not essential right now is recorded here with its status, so nothing unverified slips into the product.">
        <Backlog />
      </Section>

      <footer className="pb-6 text-center text-xs text-muted-foreground">
        Built from the repository by <code className="font-mono">scripts/build_showcase.py</code> at commit {s.commit} · {s.generated_at}. Shows research records and counts only: no raw vendor data.
      </footer>
    </div>
  )
}
