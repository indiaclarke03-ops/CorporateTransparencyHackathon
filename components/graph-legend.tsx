import { MONEY_STATUS, NODE_TYPE_META, RELATIONSHIP_META, SEVERITY_COLOR } from '@/lib/graph-style'

export function GraphLegend() {
  return (
    <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <span className="font-bold text-foreground">Entities</span>
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
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <span className="font-bold text-foreground">$ Public money</span>
        {Object.entries(MONEY_STATUS).map(([k, m]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`w-5 border-t-4 ${m.dashed ? 'border-dashed' : ''}`} style={{ borderColor: m.color }} aria-hidden="true" />
            {m.label}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <span className="font-bold text-foreground">Links (arrow = direction)</span>
        {Object.entries(RELATIONSHIP_META).map(([type, meta]) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className={`w-5 border-t-2 ${meta.dashed ? 'border-dashed' : ''}`} style={{ borderColor: meta.color }} aria-hidden="true" />
            {meta.label}
          </span>
        ))}
      </div>
    </div>
  )
}
