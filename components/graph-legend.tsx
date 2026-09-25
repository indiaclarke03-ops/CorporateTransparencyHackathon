import { NODE_TYPE_META, RELATIONSHIP_META, SEVERITY_COLOR } from '@/lib/graph-style'

export function GraphLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
      {Object.entries(NODE_TYPE_META).map(([type, meta]) => (
        <span key={type} className="flex items-center gap-1.5">
          <span className="size-3 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
          {meta.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-full border-2" style={{ borderColor: SEVERITY_COLOR.CRITICAL }} aria-hidden="true" />
        Sanctioned ring
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-5 border-t-2 border-dashed" style={{ borderColor: RELATIONSHIP_META.POSSIBLY_SAME_AS.color }} aria-hidden="true" />
        Possible identity match
      </span>
    </div>
  )
}
