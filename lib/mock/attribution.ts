/** Demo attribution analysis for one invented shell. All evidence here is demo data. */
import type { AttributionAnalysis } from '../types'

export const DEMO_ATTRIBUTION: AttributionAnalysis[] = [
  {
    entityId: 'demo_sub2',
    demo: true,
    candidates: [
      {
        id: 'cand_serniya_network',
        name: 'Serniya Engineering network',
        kind: 'network',
        naturalPerson: false,
        band: 'probable',
        rationale: 'Goods and dollars from the shell follow the routing recorded for the network (demo).',
        conflictsWith: ['cand_northgate_operator'],
        evidence: [
          { group: 'registry', state: 'not_assessable', evidence: 'Wyoming does not publish LLC members.', sourceUrl: null },
          { group: 'trade_commodity', state: 'fired', evidence: 'Same HS 903039 goods move to Alexsong Pte Ltd, then to OOO Serniya Engineering (demo).', sourceUrl: null },
          { group: 'public_money', state: 'fired', evidence: 'Subaward dollars reach Alexsong Pte Ltd, an OFAC-listed party (demo).', sourceUrl: null },
          { group: 'logistics', state: 'fired', evidence: 'Transshipment via AE with a short dwell time (demo).', sourceUrl: null },
          { group: 'digital', state: 'not_fired', evidence: 'No shared domains or website hosting found (demo).', sourceUrl: null },
          { group: 'list_identifiers', state: 'fired', evidence: "Phone number matches Alexsong Pte Ltd's record (demo, unconfirmed).", sourceUrl: null },
          { group: 'public_reporting', state: 'not_assessable', evidence: 'No reporting names the shell.', sourceUrl: null },
        ],
      },
      {
        id: 'cand_northgate_operator',
        name: 'Operator of Northgate Components LLC (Demo)',
        kind: 'company',
        naturalPerson: false,
        band: 'possible',
        rationale: 'Northgate holds 60% of the shell and received a subaward under the same prime (demo).',
        conflictsWith: ['cand_serniya_network'],
        evidence: [
          { group: 'registry', state: 'fired', evidence: 'Northgate Components LLC (Demo) holds 60% (demo filing).', sourceUrl: null },
          { group: 'trade_commodity', state: 'not_fired', evidence: 'No shared shipments between the two (demo).', sourceUrl: null },
          { group: 'public_money', state: 'fired', evidence: 'Both are subawardees of the same prime award (demo).', sourceUrl: null },
          { group: 'logistics', state: 'not_assessable', evidence: null, sourceUrl: null },
          { group: 'digital', state: 'fired', evidence: 'Same website template and contact form provider (demo).', sourceUrl: null },
          { group: 'list_identifiers', state: 'not_fired', evidence: null, sourceUrl: null },
          { group: 'public_reporting', state: 'not_fired', evidence: null, sourceUrl: null },
        ],
      },
    ],
    convergence: [{ candidateId: 'cand_serniya_network', shellIds: ['demo_sub1', 'demo_sub2'] }],
    screening: [
      { candidateId: 'cand_serniya_network', result: 'Network members are on the OFAC SDN List (E.O. 14024), designated 31 Mar 2022.', sourceUrl: 'https://home.treasury.gov/news/press-releases/jy0692', sourceId: 'S01' },
      { candidateId: 'cand_northgate_operator', result: 'No list match located (demo screen).', sourceUrl: null },
    ],
    leadPriority: { likelihood: 'higher', exposure: 'higher' },
  },
]
