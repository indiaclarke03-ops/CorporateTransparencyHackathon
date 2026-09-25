/**
 * Timeline events and sequence flags (regulator prompt 29). Pure functions, unit-tested.
 */
import { isCountedListed } from './exposure'
import type { CaseFile, TimelineEvent } from './types'

export interface SequenceFlag {
  id: string
  label: string
  /** Events the flag brackets, in date order */
  eventIds: [string, string]
  entityIds: string[]
}

const DAY = 86_400_000
const days = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY)

/** Case events in date order: recorded timeline events plus award, subaward and shipment dates. */
export function caseEvents(c: CaseFile): TimelineEvent[] {
  const events = [...c.timeline]
  const has = (kind: TimelineEvent['kind'], entityId: string, date: string) => events.some((e) => e.kind === kind && e.entityId === entityId && e.date === date)
  if (c.award?.date && c.recipientId && !has('award', c.recipientId, c.award.date)) {
    events.push({ id: 'award', entityId: c.recipientId, date: c.award.date, kind: 'award', label: `Award ${c.award.id}`, certainty: c.award.certainty, sourceUrl: c.award.url })
  }
  for (const s of c.subawards) {
    if (s.date && !has('subaward', s.payeeId, s.date)) events.push({ id: `sub_${s.id}`, entityId: s.payeeId, date: s.date, kind: 'subaward', label: `Subaward ${s.id}`, certainty: s.certainty, sourceUrl: s.url })
  }
  for (const s of c.shipments) {
    if (s.date && !has('shipment', s.shipperId, s.date) && !has('shipment', s.receiverId, s.date)) {
      events.push({ id: `ship_${s.id}`, entityId: s.shipperId, date: s.date, kind: 'shipment', label: `Shipment${s.hsCode ? `, HS ${s.hsCode}` : ''}`, certainty: 'estimated', sourceUrl: null })
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Sequence patterns worth review:
 * - incorporated within 180 days before the award or its first subaward;
 * - shipments with a listed counterparty after that party's designation;
 * - dissolved within 2 years of a designation or award.
 */
export function sequenceFlags(c: CaseFile): SequenceFlag[] {
  const ev = caseEvents(c)
  const flags: SequenceFlag[] = []
  const firstMoney = (id: string) => ev.find((e) => e.entityId === id && (e.kind === 'award' || e.kind === 'subaward'))

  for (const inc of ev.filter((e) => e.kind === 'incorporation')) {
    const money = firstMoney(inc.entityId)
    if (!money) continue
    const d = days(inc.date, money.date)
    if (d >= 0 && d <= 180) {
      flags.push({ id: `flag_inc_${inc.entityId}`, label: `Incorporated ${d} days before ${money.kind === 'award' ? 'the award' : 'its first subaward'}`, eventIds: [inc.id, money.id], entityIds: [inc.entityId] })
    }
  }

  const listed = new Set(c.entities.filter(isCountedListed).map((e) => e.id))
  for (const s of c.shipments) {
    const party = listed.has(s.receiverId) ? s.receiverId : listed.has(s.shipperId) ? s.shipperId : null
    if (!party || !s.date) continue
    const des = ev.find((e) => e.entityId === party && e.kind === 'designation')
    const shipEvent = ev.find((e) => e.kind === 'shipment' && e.date === s.date && (e.entityId === s.shipperId || e.entityId === s.receiverId))
    if (des && shipEvent && days(des.date, s.date) > 0 && !flags.some((f) => f.eventIds[1] === shipEvent.id)) {
      flags.push({ id: `flag_ship_${s.id}`, label: "Shipment after the counterparty's designation", eventIds: [des.id, shipEvent.id], entityIds: [s.shipperId, s.receiverId] })
    }
  }

  for (const dis of ev.filter((e) => e.kind === 'dissolution')) {
    const prior = ev.filter((e) => e.entityId === dis.entityId && (e.kind === 'designation' || e.kind === 'award') && e.date <= dis.date).at(-1)
    if (prior && days(prior.date, dis.date) <= 730) {
      flags.push({ id: `flag_dis_${dis.entityId}`, label: `Dissolution filed ${days(prior.date, dis.date)} days after ${prior.kind === 'designation' ? 'designation' : 'the award'}`, eventIds: [prior.id, dis.id], entityIds: [dis.entityId] })
    }
  }
  return flags
}
