import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Section shell with an anchor, so the sticky nav and footnote links can jump to it. */
export function Section({ id, eyebrow, title, intro, children }: {
  id: string; eyebrow: string; title: string; intro?: ReactNode; children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 md:p-7">
      <header className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-widest text-accent">{eyebrow}</span>
        <h2 id={`${id}-title`} className="font-heading text-2xl font-semibold text-balance">{title}</h2>
        {intro && <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">{intro}</p>}
      </header>
      {children}
    </section>
  )
}

export function Pill({ children, tone = 'muted', className }: { children: ReactNode; tone?: 'muted' | 'good' | 'warn' | 'bad' | 'accent'; className?: string }) {
  const tones = {
    muted: 'bg-muted text-muted-foreground',
    good: 'bg-sev-low text-accent-foreground',
    warn: 'bg-sev-medium text-accent-foreground',
    bad: 'bg-sev-critical text-on-color',
    accent: 'bg-accent text-accent-foreground',
  }
  return <span className={cn('inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold', tones[tone], className)}>{children}</span>
}

/** Link to a source card in the registry. Used for every footnote on the page. */
export function SourceChip({ id }: { id: string }) {
  return (
    <a href={`#source-${id}`} className="mx-0.5 inline-flex items-center rounded-full bg-background px-1.5 py-px align-baseline font-mono text-[10px] font-bold text-accent ring-1 ring-border hover:ring-accent" title={`Jump to ${id} in the source registry`}>
      {id}
    </a>
  )
}

/** Minimal inline markdown: **bold**, *italic*, `code`, and [^S01] footnotes as source chips. */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(\[\^S\d+\]|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|“[^”]*”)/g).filter(Boolean)
  return (
    <>
      {parts.map((p, i) => {
        const fn = p.match(/^\[\^(S\d+)\]$/)
        if (fn) return <SourceChip key={i} id={fn[1]} />
        if (p.startsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
        if (p.startsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>
        if (p.startsWith('`')) return <code key={i} className="rounded bg-background px-1 font-mono text-[0.85em]">{p.slice(1, -1)}</code>
        if (p.startsWith('“')) return <q key={i} className="text-foreground">{p.slice(1, -1)}</q>
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

export function StatTile({ value, label, sub, tone = 'accent' }: { value: ReactNode; label: string; sub?: ReactNode; tone?: 'accent' | 'good' | 'primary' }) {
  const color = { accent: 'text-accent', good: 'text-sev-low', primary: 'text-primary' }[tone]
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-muted p-4">
      <span className={cn('font-heading text-3xl font-bold tabular-nums', color)}>{value}</span>
      <span className="text-sm font-bold">{label}</span>
      {sub && <span className="text-xs leading-snug text-muted-foreground">{sub}</span>}
    </div>
  )
}

export function FilterButtons<T extends string>({ options, value, onChange, counts }: {
  options: readonly T[]; value: T; onChange: (v: T) => void; counts?: Partial<Record<T, number>>
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} aria-pressed={value === o}
          className={cn('rounded-full px-3 py-1 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === o ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>
          {o}{counts?.[o] != null ? ` · ${counts[o]}` : ''}
        </button>
      ))}
    </div>
  )
}

export function statusTone(status: string): 'good' | 'warn' | 'bad' | 'muted' | 'accent' {
  const s = status.toLowerCase()
  if (s.startsWith('decision')) return 'bad'
  if (s.startsWith('resolved') || s.startsWith('confirmed') || s.startsWith('complete') || s.startsWith('ready')) return 'good'
  if (s.startsWith('pilot') || s.startsWith('mostly') || s.startsWith('partly')) return 'accent'
  if (s.startsWith('blocked') || s.startsWith('gap') || s.startsWith('unconfirmed') || s.startsWith('open') || s.startsWith('new')) return 'warn'
  return 'muted'
}
