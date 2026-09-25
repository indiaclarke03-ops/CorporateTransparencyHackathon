/**
 * Review queue (regulator prompts 19, 32). Pure; unit-tested.
 */
import { calloutsFor, needsReverification } from './callouts'
import { isCountedListed } from './exposure'
import { pathsOfConcern } from './money'
import type { Alert, CaseFile } from './types'

export function generateAlerts(c: CaseFile, today: Date = new Date()): Alert[] {
  const byId = new Map(c.entities.map((e) => [e.id, e]))
  const alerts: Alert[] = []
  for (const p of pathsOfConcern(c, 10).filter((x) => x.endpoint === 'listed')) {
    const end = byId.get(p.entityIds.at(-1)!)
    alerts.push({ id: `path_${p.id}`, kind: 'listed_path', entityId: end?.id ?? null, message: `Recorded payments reach ${end?.name}, a listed party, through ${p.entityIds.length - 1} ${p.entityIds.length - 1 === 1 ? 'step' : 'steps'}.`, status: 'new' })
  }
  for (const e of c.entities.filter((x) => x.tier === 'high' && !isCountedListed(x))) {
    alerts.push({ id: `high_${e.id}`, kind: 'high_tier', entityId: e.id, message: `${e.name} is in the High tier (${e.indicators.filter((i) => i.state === 'fired').length} signals fired).`, status: 'new' })
  }
  for (const e of c.entities) {
    const keys = new Set(e.indicators.filter((i) => i.state === 'fired').map((i) => i.key))
    const conflict = e.indicators.find((i) => i.state === 'not_fired' && keys.has(i.key))
    if (conflict) alerts.push({ id: `conflict_${e.id}_${conflict.key}`, kind: 'conflicting_sources', entityId: e.id, message: `Sources disagree on ${conflict.key} for ${e.name}.`, status: 'new' })
  }
  for (const e of c.entities.filter((x) => x.matchGrade === 'C' || x.matchGrade === 'D')) {
    alerts.push({ id: `match_${e.id}`, kind: 'low_match', entityId: e.id, message: `${e.name} was matched at grade ${e.matchGrade}; confirm it is the same entity before relying on it.`, status: 'new' })
  }
  const seen = new Set<string>()
  for (const e of c.entities) {
    for (const co of calloutsFor(e)) {
      if (seen.has(co.id) || !needsReverification(co, today)) continue
      seen.add(co.id)
      alerts.push({ id: `callout_${co.id}`, kind: 'callout_review', entityId: null, message: `Regulatory callout ${co.id} (${co.title}) is past its review-by date and needs re-verification.`, status: 'new' })
    }
  }
  return alerts
}
