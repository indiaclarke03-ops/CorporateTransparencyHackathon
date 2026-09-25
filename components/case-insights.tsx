import { AlertTriangle, ArrowRight, Lightbulb, Search } from 'lucide-react'
import type { CaseInsights } from '@/lib/types'

/** What the case uncovers and what it means for the typology. Copy is written per case in scripts/build_cases.py. */
export function CaseInsightsPanel({ insights, typology }: { insights: CaseInsights; typology: string }) {
  return (
    <section aria-label="What this uncovers" className="flex flex-col gap-4 rounded-3xl border border-accent/60 bg-card p-5">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-widest text-accent">What this uncovers</span>
        <h2 className="font-heading text-xl font-semibold text-balance">{insights.headline}</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Block icon={<Search className="size-4" />} title="Findings from the data">
          {insights.findings.map((f) => <li key={f}>{f}</li>)}
        </Block>
        <Block icon={<AlertTriangle className="size-4" />} title={`What it means for ${typology.toLowerCase()}`}>
          {insights.implications.map((f) => <li key={f}>{f}</li>)}
        </Block>
        {insights.next_steps.length > 0 && (
          <Block icon={<Lightbulb className="size-4" />} title="Next investigative steps">
            {insights.next_steps.map((f) => (
              <li key={f} className="flex gap-1.5"><ArrowRight className="mt-0.5 size-3.5 shrink-0 text-accent" />{f}</li>
            ))}
          </Block>
        )}
      </div>
    </section>
  )
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-muted p-4">
      <p className="flex items-center gap-2 font-heading text-sm font-semibold text-accent">{icon}{title}</p>
      <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm leading-relaxed text-muted-foreground marker:text-accent">{children}</ul>
    </div>
  )
}
