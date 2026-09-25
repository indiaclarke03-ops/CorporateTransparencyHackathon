import { ExternalLink } from 'lucide-react'
import type { InvestigationEdge } from '@/lib/types'
import Link from 'next/link'
import { RELATIONSHIP_META, formatMatchKey } from '@/lib/graph-style'
import { CloseButton, Stat } from './node-panel'

interface Props {
  edge: InvestigationEdge
  nodeLabel: (id: string) => string
  onClose: () => void
}

export function EdgePanel({ edge, nodeLabel, onClose }: Props) {
  const meta = RELATIONSHIP_META[edge.relationship_type]
  const isProbabilistic = edge.relationship_type === 'POSSIBLY_SAME_AS'

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Connection</span>
          <h2 className="font-heading text-xl font-semibold" style={{ color: meta?.color }}>
            {meta?.label ?? edge.relationship_type}
          </h2>
          <p className="font-mono text-[11px] text-muted-foreground">{edge.relationship_type}</p>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <p className="rounded-2xl bg-muted p-3 text-sm leading-relaxed">
        <strong>{nodeLabel(edge.source)}</strong> {'→'} <strong>{nodeLabel(edge.target)}</strong>
      </p>

      {edge.label && (
        <blockquote className="rounded-2xl border-l-4 border-accent bg-muted p-3 text-sm italic leading-relaxed">
          &ldquo;{edge.label}&rdquo;
          <span className="mt-1 block text-xs not-italic text-muted-foreground">
            As stated in the {edge.source_authority ?? 'source'} record{edge.sayari_relationship ? ` (relationship type: ${edge.sayari_relationship.replace(/_/g, ' ')})` : ''}
            {edge.former ? ' · former relationship' : ''}
          </span>
        </blockquote>
      )}

      {isProbabilistic && (
        <p className="rounded-2xl border border-dashed border-accent p-3 text-sm leading-relaxed text-muted-foreground">
          Probabilistic identity resolution, not a confirmed relationship.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-2">
        <Stat label="Ownership" value={edge.ownership_percentage != null ? `${edge.ownership_percentage}%` : '—'} />
        <Stat label="Match keys" value={edge.match_keys?.length ? edge.match_keys.map(formatMatchKey).join(', ') : '—'} />
      </dl>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">
          Provenance{edge.source_authority ? ` · published by ${edge.source_authority}` : ''}
        </span>
        {edge.source_id && (
          <Link
            href={`/traceability#source-${edge.source_id}`}
            className="w-fit rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-bold text-accent hover:underline"
          >
            {edge.source_id} in source registry
          </Link>
        )}
        {edge.provenance_ref ? (
          <a
            href={edge.provenance_ref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 break-all text-sm font-semibold text-accent underline-offset-2 hover:underline"
          >
            <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
            {edge.provenance_ref}
          </a>
        ) : (
          <span className="text-sm">—</span>
        )}
      </div>
    </div>
  )
}
