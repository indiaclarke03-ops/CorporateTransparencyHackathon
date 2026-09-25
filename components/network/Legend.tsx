import { Building2, FlaskConical, ShieldAlert, User } from 'lucide-react'
import { TierChip } from '@/components/common/TierChip'
import { EDGE_KIND_META } from '@/lib/copy'
import { EDGE_KINDS } from '@/lib/graph'
import { EDGE_STYLE } from './edge-style'

export function Legend() {
  return (
    <div className="flex flex-col gap-3 text-xs" aria-label="Graph legend">
      <div className="flex flex-col gap-1.5">
        <h3 className="font-semibold">Entities</h3>
        <div className="flex flex-wrap gap-1">
          <TierChip tier="high" />
          <TierChip tier="elevated" />
          <TierChip tier="low" />
          <TierChip tier="not_assessable" />
          <TierChip tier={null} />
        </div>
        <ul className="flex flex-col gap-1 text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span className="flex size-4 items-center justify-center rounded-full bg-high text-on-color">
              <ShieldAlert className="size-3" aria-hidden="true" />
            </span>
            On a US, UN, EU or UK list
          </li>
          <li className="flex items-center gap-1.5">
            <Building2 className="size-4" aria-hidden="true" /> Company
            <User className="ml-2 size-4" aria-hidden="true" /> Person
          </li>
          <li className="flex items-center gap-1.5">
            <span className="flex size-4 items-center justify-center rounded-full border border-dashed border-unconfirmed text-unconfirmed">
              <FlaskConical className="size-2.5" aria-hidden="true" />
            </span>
            Invented demo entity
          </li>
          <li>Circle size shows observed dollars in. The small corner marker repeats the tier shape.</li>
        </ul>
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-semibold">Connections</h3>
        <ul className="flex flex-col gap-1">
          {EDGE_KINDS.map((k) => {
            const s = EDGE_STYLE[k]
            return (
              <li key={k} className="flex items-center gap-2">
                <svg width="36" height="10" aria-hidden="true" className="shrink-0">
                  <line x1="1" y1="5" x2={s.arrow ? 29 : 35} y2="5" stroke={s.stroke} strokeWidth={s.width} strokeDasharray={s.dash} />
                  {s.arrow && <path d="M29 1 L35 5 L29 9 Z" fill={s.stroke} />}
                </svg>
                <span>
                  <span className="font-medium">{EDGE_KIND_META[k].label}</span>
                  <span className="text-muted-foreground">: {EDGE_KIND_META[k].description}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
