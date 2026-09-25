import { describe, expect, it } from 'vitest'
import { PATH_TYPE_META } from './copy'
import { DEMO_CASE } from './cases'
import { describeEdge, pathType } from './describe'
import type { Edge } from './types'

const nameOf = (id: string) => DEMO_CASE.entities.find((e) => e.id === id)?.name ?? id
const edge = (id: string) => DEMO_CASE.edges.find((e) => e.id === id)!

describe('describeEdge', () => {
  it('reads each kind in plain language', () => {
    expect(describeEdge(edge('e_grinin'), nameOf)).toBe('Yevgeniy Aleksandrovich Grinin is an officer or director of Photon Pro LLP')
    expect(describeEdge(edge('e_own'), nameOf)).toBe('Keystone Logistics Group LLC (Demo) is 60% owned by Northgate Components LLC (Demo)')
    expect(describeEdge(edge('e_sub1'), nameOf)).toBe('Harborline Systems Inc. (Demo) made a subaward of $1,200,000 to Northgate Components LLC (Demo)')
    expect(describeEdge(edge('e_sib'), nameOf)).toBe('Majory LLP and Photon Pro LLP share a registered address')
    expect(describeEdge(edge('e_psa'), nameOf)).toMatch(/may be the same party \(unconfirmed\)$/)
    expect(describeEdge(edge('e_trade_pp'), nameOf)).toBe('Photon Pro LLP shipped goods to Northgate Components LLC (Demo)')
  })
})

describe('pathType', () => {
  it('gives every edge kind a badge and a legal note', () => {
    for (const e of DEMO_CASE.edges) {
      const meta = PATH_TYPE_META[pathType(e, DEMO_CASE.edges)]
      expect(meta.badge.length).toBeGreaterThan(0)
      expect(meta.legalNote.length).toBeGreaterThan(0)
    }
  })

  it('classes ownership by the aggregate share of the owned entity', () => {
    const base: Edge = { ...edge('e_own'), id: 'a', share: 30 }
    const other: Edge = { ...base, id: 'b', source: 'x', share: 25 }
    expect(pathType(base, [base])).toBe('ownership_minority')
    expect(pathType(base, [base, other])).toBe('ownership_majority')
  })

  it('marks control as control only, with the 50 Percent Rule note', () => {
    expect(pathType(edge('e_grinin'), DEMO_CASE.edges)).toBe('control_only')
    expect(PATH_TYPE_META.control_only.legalNote).toContain("OFAC's 50 Percent Rule applies to ownership, not control.")
    expect(PATH_TYPE_META.sibling.legalNote).toContain('Association only; no legal consequence follows.')
  })
})
