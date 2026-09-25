import { ArrowRight } from 'lucide-react'
import { hostOf, showcase } from '@/lib/showcase'
import { Inline, Pill, SourceChip, StatTile } from './ui'

const LABEL: Record<string, string> = { serniya_investigation: 'Serniya validation case', palantir_control: 'Palantir control case' }

export function CitationAudit() {
  const fx = showcase.citation_audit.fixtures
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(fx).map(([name, side]) => (
          <div key={name} className="flex flex-col gap-3 rounded-2xl bg-muted p-4">
            <p className="font-heading text-lg font-semibold">{LABEL[name] ?? name}</p>
            <div className="flex items-center gap-3">
              <StatTile value={side.before?.errors ?? '—'} label="Citation errors before" tone="primary" />
              <ArrowRight className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
              <StatTile value={side.after.errors} label="After the audit" tone="good" sub={`${side.after.items.length} citations checked`} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-heading text-lg font-semibold">What changed, citation by citation</h3>
        <ul className="flex flex-col gap-2">
          {Object.entries(fx).flatMap(([name, side]) =>
            (side.before?.items ?? [])
              .map((b, idx, all) => ({ b, pos: all.slice(0, idx).filter((x) => x.where === b.where).length }))
              .filter(({ b }) => b.errors.length || b.warnings.length)
              .map(({ b, pos }, i) => {
                const after = side.after.items.filter((a) => a.where === b.where)[pos]
                return (
                  <li key={`${name}-${i}`} className="grid gap-2 rounded-2xl bg-muted p-3 text-sm md:grid-cols-[1fr_auto_1fr] md:items-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-muted-foreground">{b.where}</span>
                      <span className="leading-snug">{b.claim}</span>
                      <span className="font-mono text-xs text-sev-critical">{hostOf(b.url)}</span>
                      {[...b.errors, ...b.warnings].map((m) => <Pill key={m} tone={b.errors.includes(m) ? 'bad' : 'warn'}>{m}</Pill>)}
                    </div>
                    <ArrowRight className="hidden size-5 text-muted-foreground md:block" aria-hidden="true" />
                    <div className="flex flex-col gap-1">
                      {after ? (
                        <>
                          <span className="leading-snug">{after.claim}</span>
                          <span className="text-xs text-muted-foreground">
                            {after.source_id && <SourceChip id={after.source_id} />} {after.authority} · <span className="font-mono">{hostOf(after.url)}</span>
                          </span>
                          <Pill tone="good">Primary record</Pill>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Removed: no source supports it</span>
                      )}
                    </div>
                  </li>
                )
              }),
          )}
        </ul>
      </div>

      {showcase.citation_audit.tables
        .filter((t) => t.heading?.startsWith('Edges the sources'))
        .map((t) => (
          <div key={t.heading} className="flex flex-col gap-2">
            <h3 className="font-heading text-lg font-semibold">Relationships the sources did not support</h3>
            <p className="text-sm text-muted-foreground">A working link can still overstate what a record says. These were retyped or removed.</p>
            <ul className="flex flex-col gap-2">
              {t.rows.map((r, i) => (
                <li key={i} className="grid gap-2 rounded-2xl bg-muted p-3 text-sm md:grid-cols-3">
                  <span className="font-semibold"><Inline text={r['Edge in fixture']} /></span>
                  <span className="text-muted-foreground"><Inline text={r['What the sources say']} /></span>
                  <span><Inline text={r['Fix']} /></span>
                </li>
              ))}
            </ul>
          </div>
        ))}

      <p className="rounded-2xl border border-dashed border-border p-3 text-xs leading-relaxed text-muted-foreground">
        The checker (<code className="font-mono">scripts/check_citations.py</code>) rejects law-firm, news and contract-reseller links, homepages, tracking or bot-challenge
        tokens, and claims cited to the wrong agency. It also flags government pages that answer an automated request with a bot-challenge page while returning HTTP 200.
        The fixes were applied by <code className="font-mono">scripts/apply_citation_audit.py</code>, which reads every replacement from the source registry.
      </p>
    </div>
  )
}
