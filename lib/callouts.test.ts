import { describe, expect, it } from 'vitest'
import { calloutsFor, needsReverification } from './callouts'

const ids = (jurisdiction: string | null, name = 'Example LLC', kind: 'company' | 'person' = 'company') =>
  calloutsFor({ jurisdiction, name, entityType: 'company', kind }).map((c) => c.id)

describe('calloutsFor', () => {
  it('applies the state LLC rules plus RD-01', () => {
    expect(ids('US-DE')).toEqual(['RD-03', 'RD-01'])
    expect(ids('US-WY', 'Keystone Logistics Group LLC (Demo)')).toEqual(['RD-04', 'RD-01'])
    expect(ids('US-NV', 'Example L.L.C.')).toEqual(['RD-05', 'RD-01'])
  })

  it('gives other US-formed entities RD-01 only', () => {
    expect(ids('US-DE', 'Harborline Systems Inc.')).toEqual(['RD-01'])
    expect(ids('US', 'Strandway, LLC')).toEqual(['RD-01'])
  })

  it('gives UK entities RD-02 and others nothing', () => {
    expect(ids('GB', 'Photon Pro LLP')).toEqual(['RD-02'])
    expect(ids('RU')).toEqual([])
    expect(ids(null)).toEqual([])
  })

  it('does not attach company-registry callouts to people', () => {
    expect(ids('US', 'Boris Livshits', 'person')).toEqual([])
  })
})

describe('needsReverification', () => {
  it('flags callouts past their review-by date', () => {
    expect(needsReverification({ reviewBy: '2026-10-25' }, new Date('2026-10-25T12:00:00Z'))).toBe(false)
    expect(needsReverification({ reviewBy: '2026-10-25' }, new Date('2026-10-26T00:00:01Z'))).toBe(true)
  })
})
