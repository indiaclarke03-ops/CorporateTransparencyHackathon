import { describe, expect, it } from 'vitest'
import { DEMO_CASE } from './cases'
import { caseEvents, sequenceFlags } from './timeline'

describe('sequenceFlags', () => {
  const flags = sequenceFlags(DEMO_CASE)

  it('flags incorporation shortly before first money', () => {
    const f = flags.find((x) => x.entityIds[0] === 'demo_sub2' && x.id.startsWith('flag_inc'))!
    expect(f.label).toBe('Incorporated 136 days before its first subaward')
  })

  it('flags shipments after a counterparty designation', () => {
    expect(flags.some((f) => f.label === "Shipment after the counterparty's designation" && f.entityIds.includes('ent_alexsong'))).toBe(true)
  })

  it('flags a dissolution soon after designation', () => {
    expect(flags.find((f) => f.id === 'flag_dis_ent_majory')!.label).toBe('Dissolution filed 250 days after designation')
  })

  it('links every flag to events that exist', () => {
    const ids = new Set(caseEvents(DEMO_CASE).map((e) => e.id))
    for (const f of flags) for (const id of f.eventIds) expect(ids.has(id)).toBe(true)
  })

  it('finds nothing to flag without dates', () => {
    expect(sequenceFlags({ ...DEMO_CASE, timeline: [], award: null, subawards: [], shipments: [] })).toEqual([])
  })
})
