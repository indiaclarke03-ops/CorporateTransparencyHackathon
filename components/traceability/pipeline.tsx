import { Database, FileCheck2, HardDriveDownload, ShieldCheck, Sprout } from 'lucide-react'
import type { ReactNode } from 'react'
import { showcase } from '@/lib/showcase'
import { Pill, StatTile, statusTone } from './ui'

const TOOL_LABEL: Record<string, string> = {
  sayari: 'Sayari', usaspending: 'USAspending', sam_gov: 'SAM.gov', tradeverifyd: 'Tradeverifyd', tavily: 'Tavily',
  gleif: 'GLEIF', federal_register: 'Federal Register', consolidated_screening_list: 'Screening List', local_file: 'Repo files',
}

function Stage({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-2xl bg-muted p-3">
      <span className="flex items-center gap-2 font-heading font-semibold"><span className="text-accent">{icon}</span>{title}</span>
      <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}

export function Pipeline() {
  const dr = showcase.dry_run
  const rp = showcase.replay
  const tools = Object.entries(dr.totals).filter(([t]) => t !== 'local_file').sort((a, b) => (b[1].planned + b[1].estimated) - (a[1].planned + a[1].estimated))
  const max = Math.max(...tools.map(([, t]) => Math.max(t.budget ?? 0, t.planned + t.estimated)))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 md:flex-row">
        <Stage icon={<Sprout className="size-4" />} title="1. Seed">A reproducible random draw of {dr.pilot_size} federal-money recipients across seven typologies, {dr.date_range.start_date} to {dr.date_range.end_date}.</Stage>
        <Stage icon={<ShieldCheck className="size-4" />} title="2. Adapters">Only confirmed operations. Every response is hashed and stored before anything reads it. Budgets stop the run cleanly.</Stage>
        <Stage icon={<Database className="size-4" />} title="3. Datasets">One job per dataset. Missing data is stored as empty with a reason, never as zero.</Stage>
        <Stage icon={<HardDriveDownload className="size-4" />} title="4. Export">Parquet, plus a manifest of calls, time range, failures and source-record IDs. Loaded into PostgreSQL.</Stage>
        <Stage icon={<FileCheck2 className="size-4" />} title="5. Quality report">Counts only. Rows missing a source record must be zero.</Stage>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-heading text-lg font-semibold">Pilot seed: {dr.pilot_size} companies</h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(dr.typologies).map(([k, t]) => (
            <div key={k} className="flex flex-col gap-1 rounded-2xl bg-muted p-3">
              <span className="flex items-center justify-between gap-2"><span className="text-sm font-bold">{k.replace(/_/g, ' ')}</span><Pill tone="accent">{t.seed_count}</Pill></span>
              <span className="font-mono text-[11px] text-muted-foreground">{Object.values(t.filters).flat().map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ')}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-heading text-lg font-semibold">Dry run: planned calls against each budget</h3>
        <p className="text-sm text-muted-foreground">Nothing was called. Follow-up calls depend on responses, so they are estimates.</p>
        <ul className="flex flex-col gap-2">
          {tools.map(([t, v]) => {
            const used = v.planned + v.estimated
            return (
              <li key={t} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-sm">
                <span className="font-semibold">{TOOL_LABEL[t] ?? t}</span>
                <span className="relative h-3 overflow-hidden rounded-full bg-background">
                  {v.budget != null && <span className="absolute inset-y-0 left-0 bg-border" style={{ width: `${(100 * v.budget) / max}%` }} />}
                  <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(100 * used) / max}%`, background: v.budget != null && used > v.budget ? 'var(--sev-critical)' : 'var(--primary)' }} />
                </span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">~{used} / {v.budget ?? '—'}{v.daily_limit ? ` (≤${v.daily_limit}/day)` : ''}</span>
              </li>
            )
          })}
        </ul>
      </div>

      {rp && (
        <div className="flex flex-col gap-3">
          <h3 className="font-heading text-lg font-semibold">Replay run on the recorded pilot fixtures</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile value={rp.missing_source_record_total} label="Rows missing a source record" sub="must be zero" tone="good" />
            <StatTile value={rp.datasets.reduce((a, d) => a + d.with_source_record, 0)} label="Rows backed by a stored record" />
            <StatTile value={rp.datasets.reduce((a, d) => a + d.gap_rows, 0)} label="Gap rows, each with a reason" sub="calls not recorded yet: empty, not zero" tone="primary" />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr><th className="p-2">Dataset</th><th className="p-2">Status</th><th className="p-2 text-right">Rows</th><th className="p-2 text-right">With source record</th><th className="p-2 text-right">Gaps</th><th className="p-2">Most common gap reason</th></tr>
              </thead>
              <tbody>
                {rp.datasets.map((d) => (
                  <tr key={d.dataset} className="border-t border-border">
                    <td className="p-2 font-mono text-xs font-bold">{d.dataset}</td>
                    <td className="p-2"><Pill tone={statusTone(d.status)}>{d.status}</Pill></td>
                    <td className="p-2 text-right tabular-nums">{d.rows}</td>
                    <td className="p-2 text-right tabular-nums">{d.with_source_record}</td>
                    <td className="p-2 text-right tabular-nums">{d.gap_rows}</td>
                    <td className="p-2 text-xs text-muted-foreground">{d.status === 'blocked' ? d.reason : d.nulls[0]?.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
