import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Leaf, Route } from 'lucide-react'
import { CASES } from '@/lib/investigations'
import { Section } from '@/components/traceability/ui'

export const metadata: Metadata = {
  title: 'About — Follow the Public Dollar',
  description: 'What the tool does, who it is for, how the data tools divide the work, and the shell-company signals it scores.',
}

const STAGES = [
  ['Ingest the money', 'Pull award, grant and loan recipients from USAspending.gov and SAM.gov.'],
  ['Resolve the entity', 'Match each recipient to a corporate record, with an A–D grade for how sure the match is.'],
  ['Expand the network', 'Trace owners, officers, subawardees and trade counterparties out to 1–3 links.'],
  ['Score every entity', 'Apply shell-company signals, each with visible evidence and a source link.'],
  ['Surface paths', 'Rank routes from the public dollar to flagged parties, and export an evidence packet (the Lead Dossier).'],
]

const TOOLS = [
  ['Sayari', 'Ownership and risk backbone', 'Company profiles, shareholders, directors and officers, sanctions and PEP flags, and trade counts across 250+ jurisdictions. Every entity on the graph links to its Sayari record, and every link quotes Sayari\'s own relationship text.'],
  ['Tradeverifyd', 'Trade exposure layer', 'Entity matching, risk score and annotations (sanctions programmes, SAM.gov exclusions), and trade relationships. Shown on the entity panel where a record was retrieved.'],
  ['Tavily', 'Reality check and primary sources', 'Finds the government record behind each flag (Treasury, DOJ, CBP, DHS press releases and lists) and checks whether a company has a real-world footprint.'],
  ['USAspending, SAM.gov', 'Public-money input', 'The layer none of the three tools hold natively: contract, grant and loan recipients, registrations and exclusions.'],
]

const SIGNALS = [
  ['Public money', 'Registration-to-award gap, award size vs. company profile, pass-through to subawardees, non-competitive awards, shared principals across bidders, mission mismatch.'],
  ['Structure', 'Ownership that dead-ends at a company instead of a person, layered or circular ownership, nominee directors, secrecy jurisdictions.'],
  ['Lifecycle', 'Recent incorporation followed by sudden activity; short lifespan and phoenix companies.'],
  ['Location', 'Mass-registration addresses and virtual offices.'],
  ['Trade', 'Goods that don\'t fit the stated business, transshipment routing, partner churn, Common High Priority List items.'],
  ['Presence', 'No website, staff or press; look-alike names; adverse media.'],
  ['Proximity', 'A sanctioned party within 1–3 links, and the OFAC 50% rule that makes ownership proximity legally meaningful.'],
]

const USERS = [
  ['Inspectors general and auditors', 'Did this award recipient pass money to risky parties?'],
  ['Investigative journalists', 'Where is the story in this contract data?'],
  ['Prime contractors and grantmakers', 'Are my subcontractors or grantees safe?'],
  ['Banks and compliance teams', 'Is this government-funded client a front?'],
]

export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-5xl min-w-0 flex-col gap-5 overflow-x-clip p-4 md:p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Leaf className="leaf-sway size-6" aria-hidden="true" /></span>
          <div>
            <p className="font-heading text-2xl font-semibold">Follow the Public Dollar</p>
            <p className="text-sm text-muted-foreground">About the tool</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="flex h-10 w-fit items-center gap-2 rounded-full border border-accent px-4 text-sm font-bold text-accent transition hover:bg-accent hover:text-accent-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" /> Investigation graph
          </Link>
          <Link href="/traceability" className="flex h-10 w-fit items-center gap-2 rounded-full border border-border px-4 text-sm font-bold transition hover:bg-muted">
            <Route className="size-4" aria-hidden="true" /> Traceability
          </Link>
        </div>
      </header>

      <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 md:p-8">
        <h1 className="font-heading text-3xl font-bold text-balance md:text-4xl">Follow the public dollar until it hits a shell.</h1>
        <p className="max-w-3xl text-base leading-relaxed text-muted-foreground text-pretty">
          Most due-diligence tools start from a known bad actor and look for their assets. This tool reverses that: it starts from taxpayer
          money and looks for bad actors. That is the question inspectors general, auditors and journalists actually have: <em>did public
          money end up somewhere it shouldn&apos;t have?</em>
        </p>
        <p className="max-w-3xl rounded-2xl bg-muted p-4 text-sm leading-relaxed">
          <strong>Risk leads, not accusations.</strong> Every output is a lead for human review, never a finding of wrongdoing. Each claim
          links to the primary record behind it, missing data is shown as missing, and no text is generated by a language model.
        </p>
      </section>

      <Section id="how" eyebrow="How it works" title="Five stages, from an award to an evidence packet">
        <ol className="grid gap-2 md:grid-cols-5">
          {STAGES.map(([t, d], i) => (
            <li key={t} className="flex flex-col gap-1 rounded-2xl bg-muted p-3">
              <span className="font-heading text-2xl font-bold text-accent">{i + 1}</span>
              <span className="text-sm font-bold">{t}</span>
              <span className="text-xs leading-snug text-muted-foreground">{d}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="tools" eyebrow="Data tools" title="How Sayari, Tradeverifyd and Tavily divide the work">
        <ul className="grid gap-2 md:grid-cols-2">
          {TOOLS.map(([name, role, d]) => (
            <li key={name} className="flex flex-col gap-1 rounded-2xl bg-muted p-4">
              <span className="font-heading text-lg font-semibold">{name}</span>
              <span className="text-xs font-bold uppercase tracking-wide text-accent">{role}</span>
              <span className="text-sm leading-relaxed text-muted-foreground">{d}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="cases" eyebrow="Risk typologies" title="One validated case per typology"
        intro="Each case starts from a network that a government agency has already acted on, to show the tool would have flagged it. Palantir is the clean control.">
        <ul className="grid gap-2 md:grid-cols-2">
          {CASES.map((c) => (
            <li key={c.id} className="flex flex-col gap-1 rounded-2xl bg-muted p-3">
              <span className="text-[11px] font-bold uppercase tracking-wide text-accent">{c.typology}</span>
              <span className="text-sm font-semibold">{c.title}</span>
              <span className="text-xs text-muted-foreground">Score {c.score} · Grade {c.grade} · {c.nodes} entities, {c.edges} links · {c.tools.join(', ')}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="signals" eyebrow="Signal framework" title="The shell-company signals we score"
        intro="A composite score with every contributing signal shown, its evidence and its source. Proximity and trade mismatch weigh most because they are the hardest to explain innocently.">
        <dl className="grid gap-2 md:grid-cols-2">
          {SIGNALS.map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-muted p-3">
              <dt className="text-sm font-bold">{k}</dt>
              <dd className="text-xs leading-relaxed text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="users" eyebrow="Who it's for" title="Built for the people who follow public money">
        <ul className="grid gap-2 md:grid-cols-2">
          {USERS.map(([u, q]) => (
            <li key={u} className="rounded-2xl bg-muted p-3">
              <p className="text-sm font-bold">{u}</p>
              <p className="text-xs italic text-muted-foreground">&ldquo;{q}&rdquo;</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="team" eyebrow="Team" title="Corporate Transparency Hackathon">
        <ul className="grid gap-2 md:grid-cols-3">
          <li className="rounded-2xl bg-muted p-3"><p className="text-sm font-bold">Maria Ashby</p><p className="text-xs text-muted-foreground">Technical lead: schema, fixtures, scoring engine</p></li>
          <li className="rounded-2xl bg-muted p-3"><p className="text-sm font-bold">India Clarke</p><p className="text-xs text-muted-foreground">Domain and evidence: primary-source research, citations, Lead Dossier copy, traceability</p></li>
          <li className="rounded-2xl bg-muted p-3"><p className="text-sm font-bold">Lola C</p><p className="text-xs text-muted-foreground">Specs, control cases and risk typologies</p></li>
        </ul>
      </Section>
    </div>
  )
}
