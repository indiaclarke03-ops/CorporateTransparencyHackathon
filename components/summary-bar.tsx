import { ChevronDown } from 'lucide-react'
import type { InvestigationSummary } from '@/lib/types'
import { confidenceClass, scoreColor } from '@/lib/graph-style'
import { cn } from '@/lib/utils'

export function SummaryBar({ summary }: { summary: InvestigationSummary }) {
  const score = Math.max(0, Math.min(100, summary.composite_risk_score))

  return (
    <section aria-label="Investigation summary" className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 md:flex-row md:items-center">
      <div className="flex items-center gap-4">
        <ScoreGauge score={score} />
        <div className="flex flex-col items-center gap-1">
          <span
            className={cn(
              'flex size-12 items-center justify-center rounded-2xl font-heading text-2xl font-bold',
              confidenceClass(summary.confidence_rating),
            )}
            aria-label={`Confidence rating ${summary.confidence_rating}`}
          >
            {summary.confidence_rating}
          </span>
          <span className="text-xs text-muted-foreground">Confidence</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-lg font-semibold">{summary.root_recipient}</h2>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-accent">{summary.primary_typology}</span>
        </div>
        <details className="group rounded-2xl bg-muted px-4 py-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
            Executive rationale
            <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="pt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{summary.executive_rationale}</p>
        </details>
      </div>
    </section>
  )
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 36
  const circumference = Math.PI * radius
  const offset = circumference * (1 - score / 100)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 88 50" className="h-12 w-22" role="img" aria-label={`Composite risk score ${score} out of 100`}>
        <path d="M8 46 A36 36 0 0 1 80 46" fill="none" stroke="var(--muted)" strokeWidth="8" strokeLinecap="round" />
        <path
          d="M8 46 A36 36 0 0 1 80 46"
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <text x="44" y="44" textAnchor="middle" className="fill-foreground font-heading text-lg font-bold">
          {score}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground">Risk score</span>
    </div>
  )
}
