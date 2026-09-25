'use client'

import { AlertTriangle, BookOpen, EyeOff, FileWarning, Scale } from 'lucide-react'
import { needsReverification } from '@/lib/callouts'
import { formatDate } from '@/lib/format'
import type { CalloutSeverity, RegulatoryCallout as Callout } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SourceLink } from './SourceLink'

const SEVERITY: Record<CalloutSeverity, { label: string; icon: typeof Scale }> = {
  data_gap: { label: 'Data gap', icon: FileWarning },
  changing_rules: { label: 'Changing rules', icon: Scale },
  opacity_flag: { label: 'Opacity flag', icon: EyeOff },
  partial_disclosure: { label: 'Partial disclosure', icon: BookOpen },
}

export function RegulatoryCallout({ title, severity, body, whatThisMeans, sources, lastVerified, reviewBy }: Omit<Callout, 'id'>) {
  const stale = needsReverification({ reviewBy })
  const meta = SEVERITY[severity]
  const Icon = meta.icon
  return (
    <aside className={cn('flex flex-col gap-2 rounded-md border p-3 text-sm', stale ? 'border-elevated bg-elevated/5' : 'border-border bg-muted')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          <Icon className="size-3" aria-hidden="true" />
          {meta.label}
        </span>
        {stale && (
          <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[11px] font-semibold text-on-color">
            <AlertTriangle className="size-3" aria-hidden="true" />
            Needs re-verification
          </span>
        )}
      </div>
      <h4 className="font-semibold">{title}</h4>
      <p className="text-xs leading-relaxed">{body}</p>
      <p className="text-xs leading-relaxed">
        <span className="font-semibold">What this means: </span>
        {whatThisMeans}
      </p>
      {sources.length > 0 && (
        <div className="flex flex-col gap-1">
          {sources.map((s) => (
            <SourceLink key={s.url} url={s.url} label={s.label} />
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Last verified {formatDate(lastVerified)} · review by {formatDate(reviewBy)}
      </p>
    </aside>
  )
}
