import { MONEY_STATUS, NODE_TYPE_META, RELATIONSHIP_META, SEVERITY_COLOR } from '@/lib/graph-style'
import type { Investigation } from '@/lib/types'

/** Legend for the types that appear in the current case only, so it stays short. */
export function GraphLegend({ investigation }: { investigation?: Investigation }) {
  const nodeTypes = investigation ? new Set<string>(investigation.nodes.map((n) => n.type)) : null
  const relTypes = investigation ? new Set<string>(investigation.edges.map((e) => e.relationship_type)) : null
  const money = investigation
    ? new Set<string>([...investigation.edges.map((e) => e.money_status), ...investigation.nodes.map((n) => n.details?.money_status)].filter((x): x is NonNullable<typeof x> => !!x))
    : null
  const sanctioned = investigation ? investigation.nodes.some((n) => n.type === 'sanctioned_entity' || n.sayari_pass_through?.sanctioned === true) : true
  return (
    <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <span className="font-bold text-foreground">Entities</span>
        {Object.entries(NODE_TYPE_META).filter(([type]) => !nodeTypes || nodeTypes.has(type)).map(([type, meta]) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className="size-3 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
            {meta.label}
          </span>
        ))}
        {sanctioned && (
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-full border-2" style={{ borderColor: SEVERITY_COLOR.CRITICAL }} aria-hidden="true" />
            Red ring: sanctioned
          </span>
        )}
      </div>
      {(!money || money.size > 0) && (
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <span className="font-bold text-foreground">$ Public money</span>
        {Object.entries(MONEY_STATUS).filter(([k]) => !money || money.has(k)).map(([k, m]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`w-5 border-t-4 ${m.dashed ? 'border-dashed' : ''}`} style={{ borderColor: m.color }} aria-hidden="true" />
            {m.label}
          </span>
        ))}
      </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <span className="font-bold text-foreground">Links (arrow = direction)</span>
        {Object.entries(RELATIONSHIP_META).filter(([type]) => !relTypes || relTypes.has(type)).map(([type, meta]) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className={`w-5 border-t-2 ${meta.dashed ? 'border-dashed' : ''}`} style={{ borderColor: meta.color }} aria-hidden="true" />
            {meta.label}
          </span>
        ))}
      </div>
    </div>
  )
}
