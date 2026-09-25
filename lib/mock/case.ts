/**
 * Demo scenario: a hypothetical federal award whose money reaches the Serniya network.
 *
 * Everything here is demo data EXCEPT what carries a `sourceId`: the OFAC designations,
 * the Companies House officer record, the shared address and the "acting on behalf of"
 * relationships are real and cite research/sources.json. The three companies ending in
 * "(Demo)", the award, every dollar amount, score, tier, shipment and every edge marked
 * `demo: true` are invented to exercise the interface.
 */
import type { AuditEntry, CaseFile, Edge, Entity, Indicator, ListedStatus, Nonprofit, Shipment, SignalFamily, SignalState, TimelineEvent } from '../types'

const S01 = 'https://home.treasury.gov/news/press-releases/jy0692'
const S02 = 'https://ofac.treasury.gov/recent-actions/20220331'
const S05 = 'https://www.justice.gov/d9/press-releases/attachments/2022/12/13/grinin_superseder_0.pdf'
const S12 = 'https://find-and-update.company-information.service.gov.uk/company/OC400827'
const S13 = 'https://find-and-update.company-information.service.gov.uk/company/OC425116'

function ind(
  key: string,
  label: string,
  family: SignalFamily,
  state: SignalState,
  extra: Partial<Pick<Indicator, 'evidence' | 'provider' | 'sourceUrl' | 'sourceId' | 'innocentExplanations'>> = {},
): Indicator {
  return { key, label, family, state, evidence: null, provider: null, sourceUrl: null, innocentExplanations: [], ...extra }
}

const OFAC_LISTED: ListedStatus = {
  kind: 'listed',
  entries: [{ list: 'OFAC SDN List (E.O. 14024)', authority: 'U.S. Treasury (OFAC)', date: '2022-03-31', sourceUrl: S01, sourceId: 'S01', counted: true }],
}
const NOT_LISTED: ListedStatus = { kind: 'not_listed', entries: [] }

const px1 = ind('PX1', 'Listed entity', 'proximity', 'fired', {
  evidence: 'Designated by OFAC under E.O. 14024 on 31 March 2022.',
  provider: 'U.S. Treasury (OFAC)',
  sourceUrl: S01,
  sourceId: 'S01',
})

function company(p: Partial<Entity> & Pick<Entity, 'id' | 'name'>): Entity {
  return {
    kind: 'company',
    entityType: 'company',
    jurisdiction: null,
    incorporated: null,
    dissolved: null,
    address: null,
    identifiers: [],
    listedStatus: NOT_LISTED,
    tier: null,
    score: null,
    coverage: null,
    matchGrade: null,
    matchedAttributes: [],
    indicators: [],
    observedDollarsIn: null,
    hopsFromRecipient: null,
    demo: true,
    ...p,
  }
}

const entities: Entity[] = [
  company({
    id: 'demo_prime',
    name: 'Harborline Systems Inc. (Demo)',
    entityType: 'public_recipient',
    jurisdiction: 'US-DE',
    incorporated: '2009-04-14',
    address: '100 Example Street, Wilmington, DE (demo)',
    identifiers: [{ type: 'UEI', value: 'DEMO00000001' }],
    tier: 'low',
    score: { point: 18, lower: 12, upper: 31 },
    coverage: 0.8,
    matchGrade: 'A',
    matchedAttributes: ['UEI', 'Name', 'Address'],
    hopsFromRecipient: 0,
    indicators: [
      ind('PM1', 'Registration-to-award gap', 'public_money', 'not_fired', { evidence: 'Registered in SAM.gov 14 years before the award (demo).' }),
      ind('PM4', 'Pass-through', 'public_money', 'not_fired', { evidence: 'Reported subawards are 46% of the award (demo).' }),
      ind('ST1', 'UBO dead end', 'structure', 'not_fired'),
      ind('PR1', 'No footprint', 'presence', 'not_fired', { evidence: 'Operating website with staff and product pages (demo).' }),
      ind('TR1', 'Business-goods mismatch', 'trade', 'not_assessable', { evidence: 'No trade records returned (demo).' }),
    ],
  }),
  company({
    id: 'demo_sub1',
    name: 'Northgate Components LLC (Demo)',
    entityType: 'shell_intermediary',
    jurisdiction: 'US-DE',
    incorporated: '2023-11-02',
    address: '1209 Example Street, Wilmington, DE (registered agent, demo)',
    identifiers: [{ type: 'UEI', value: 'DEMO00000002' }],
    tier: 'elevated',
    score: { point: 58, lower: 44, upper: 77 },
    coverage: 0.7,
    matchGrade: 'B',
    matchedAttributes: ['UEI', 'Name'],
    hopsFromRecipient: 1,
    indicators: [
      ind('LC1', 'Recent incorporation then activity', 'lifecycle', 'fired', {
        evidence: 'Incorporated 4 months before its first subaward (demo).',
        innocentExplanations: ['New firms legitimately win subcontracts, including through small-business programs.'],
      }),
      ind('LO1', 'Address cluster', 'location', 'fired', {
        evidence: 'Registered at an address shared by more than 1,000 entities (demo).',
        innocentExplanations: ['Registered-agent addresses are used by many legitimate companies.'],
      }),
      ind('PX2', 'Sanctions proximity', 'proximity', 'fired', {
        evidence: 'Payment to Photon Pro LLP, one hop away (demo link).',
        innocentExplanations: ['The payment may predate the designation or fall under a general license.'],
      }),
      ind('PR1', 'No footprint', 'presence', 'fired', {
        evidence: 'Only registry and aggregator listings found (demo).',
        innocentExplanations: ['Small or new firms often have little online presence.'],
      }),
      ind('ST1', 'UBO dead end', 'structure', 'not_assessable', { evidence: 'Delaware does not publish beneficial owners.' }),
      ind('TR1', 'Business-goods mismatch', 'trade', 'not_fired'),
    ],
  }),
  company({
    id: 'demo_sub2',
    name: 'Keystone Logistics Group LLC (Demo)',
    entityType: 'shell_intermediary',
    jurisdiction: 'US-WY',
    incorporated: '2024-01-19',
    address: '30 Example Avenue, Sheridan, WY (demo)',
    identifiers: [{ type: 'UEI', value: 'DEMO00000003' }],
    tier: 'high',
    score: { point: 74, lower: 61, upper: 88 },
    coverage: 0.65,
    matchGrade: 'B',
    matchedAttributes: ['UEI', 'Name'],
    hopsFromRecipient: 1,
    indicators: [
      ind('ST1', 'UBO dead end', 'structure', 'fired', {
        evidence: 'Ownership chain ends at Northgate Components LLC (Demo); no natural person on record (demo).',
        innocentExplanations: ['Wyoming LLCs are not required to name members publicly.'],
      }),
      ind('PX2', 'Sanctions proximity', 'proximity', 'fired', {
        evidence: 'Payment to Alexsong Pte Ltd, an OFAC-listed party (demo link).',
        innocentExplanations: ['The payment may fall under a general license or predate the designation.'],
      }),
      ind('TR2', 'High-priority goods', 'trade', 'fired', {
        evidence: 'Shipped HS 903039 measuring instruments (demo).',
        innocentExplanations: ['Many legitimate distributors trade high-priority items.'],
      }),
      ind('TR3', 'Transshipment routing', 'trade', 'fired', {
        evidence: 'Goods routed via a configured hub before the final destination (demo).',
        innocentExplanations: ['Hubs are also normal logistics centers.'],
      }),
      ind('LO2', 'Virtual office', 'location', 'not_assessable', { evidence: 'Analyst confirmation pending.' }),
    ],
  }),
  company({
    id: 'demo_np',
    name: 'Northern Light Relief Foundation (Demo)',
    entityType: 'Nonprofit corporation',
    jurisdiction: 'US-NV',
    incorporated: '2023-06-12',
    address: '5 Example Plaza, Reno, NV (demo)',
    identifiers: [{ type: 'EIN', value: 'DEMO-00-0000004' }],
    tier: 'elevated',
    score: { point: 52, lower: 38, upper: 71 },
    coverage: 0.55,
    matchGrade: 'B',
    matchedAttributes: ['EIN', 'Name'],
    hopsFromRecipient: 1,
    indicators: [
      ind('NP1', 'Mission mismatch', 'nonprofit', 'fired', {
        evidence: 'Stated mission is disaster relief in the Americas; 61% of grants went to a region outside it (demo).',
        innocentExplanations: ['Missions are often written broadly; the charity may have widened its program.'],
      }),
      ind('NP2', 'High-risk grantmaking', 'nonprofit', 'fired', {
        evidence: 'Grants to a grantee one hop from a listed party (demo).',
        innocentExplanations: ['Humanitarian work in conflict areas often involves unavoidable contact with listed parties; licenses may apply.'],
      }),
      ind('LC1', 'Recent incorporation then activity', 'lifecycle', 'fired', { evidence: 'Incorporated 8 months before its subaward (demo).' }),
      ind('PR1', 'No footprint', 'presence', 'not_fired', { evidence: 'Website with annual reports (demo).' }),
    ],
  }),
  company({ id: 'ent_serniya', name: 'OOO Serniya Engineering', entityType: 'sanctioned_entity', jurisdiction: 'RU', listedStatus: OFAC_LISTED, tier: 'high', score: { point: 91, lower: 84, upper: 97 }, coverage: 0.4, matchGrade: 'A', matchedAttributes: ['OGRN'], identifiers: [{ type: 'OGRN', value: '1177746132563' }], hopsFromRecipient: 3, indicators: [px1, ind('PR2', 'Adverse media', 'presence', 'fired', { evidence: 'Named in the DOJ superseding indictment (E.D.N.Y., 13 Dec 2022).', provider: 'U.S. Department of Justice', sourceUrl: S05, sourceId: 'S05' })] }),
  company({ id: 'ent_sertal', name: 'OOO Sertal', entityType: 'sanctioned_entity', jurisdiction: 'RU', listedStatus: OFAC_LISTED, tier: 'high', score: { point: 82, lower: 70, upper: 94 }, coverage: 0.3, matchGrade: 'A', hopsFromRecipient: null, indicators: [px1] }),
  company({ id: 'ent_majory', name: 'Majory LLP', entityType: 'sanctioned_entity', jurisdiction: 'GB', listedStatus: OFAC_LISTED, tier: 'high', score: { point: 84, lower: 73, upper: 95 }, coverage: 0.5, matchGrade: 'A', identifiers: [{ type: 'Companies House', value: 'OC400827' }], hopsFromRecipient: 3, indicators: [px1, ind('LC4', 'Lifecycle: strike-off after designation', 'lifecycle', 'fired', { evidence: 'No accounts after 31 Aug 2022; voluntary strike-off notice 6 Dec 2022.', provider: 'Companies House', sourceUrl: S12, sourceId: 'S12' })] }),
  company({ id: 'ent_photonpro', name: 'Photon Pro LLP', entityType: 'sanctioned_entity', jurisdiction: 'GB', listedStatus: { kind: 'listed', entries: [...OFAC_LISTED.entries, { list: 'UK Sanctions List (RUS1116)', authority: 'UK FCDO', date: null, sourceUrl: 'https://graph.sayari.com/resource/entity/LlRXkKg2SPoD2SaDanvRrg', sourceId: 'S23', counted: true }] }, tier: 'high', score: { point: 88, lower: 79, upper: 96 }, coverage: 0.5, matchGrade: 'A', identifiers: [{ type: 'Companies House', value: 'OC425116' }], hopsFromRecipient: 2, indicators: [px1, ind('LC1', 'Lifecycle: confirmation statement overdue', 'lifecycle', 'fired', { evidence: 'Still registered; confirmation statement overdue.', provider: 'Companies House', sourceUrl: S13, sourceId: 'S13' })] }),
  company({ id: 'ent_inventionbridge', name: 'Invention Bridge SL', entityType: 'sanctioned_entity', jurisdiction: 'ES', listedStatus: OFAC_LISTED, tier: 'high', score: { point: 80, lower: 68, upper: 93 }, coverage: 0.3, matchGrade: 'A', identifiers: [{ type: 'CIF', value: 'B66732785' }], hopsFromRecipient: 4, indicators: [px1] }),
  company({ id: 'ent_alexsong', name: 'Alexsong Pte Ltd', entityType: 'sanctioned_entity', jurisdiction: 'SG', listedStatus: OFAC_LISTED, tier: 'high', score: { point: 86, lower: 75, upper: 95 }, coverage: 0.35, matchGrade: 'A', identifiers: [{ type: 'Singapore registration', value: '199104462G' }], hopsFromRecipient: 2, indicators: [{ ...px1, evidence: 'Designated under E.O. 14024 for facilitating transactions for the Serniya network.' }] }),
  company({
    id: 'person_grinin',
    name: 'Yevgeniy Aleksandrovich Grinin',
    kind: 'person',
    entityType: 'person',
    jurisdiction: 'RU',
    listedStatus: { kind: 'listed', entries: [{ list: 'OFAC SDN List (E.O. 14024)', authority: 'OFAC', date: '2022-03-31', sourceUrl: S02, sourceId: 'S02', counted: true }] },
    tier: 'high',
    score: { point: 85, lower: 74, upper: 95 },
    coverage: 0.4,
    matchGrade: 'A',
    hopsFromRecipient: 3,
    indicators: [
      { ...px1, evidence: 'SDN entry linked to Serniya and Photon Pro LLP.', provider: 'OFAC', sourceUrl: S02, sourceId: 'S02' },
      ind('PR2', 'Adverse media', 'presence', 'fired', { evidence: 'Named defendant in the E.D.N.Y. superseding indictment (allegations only).', provider: 'U.S. Department of Justice', sourceUrl: S05, sourceId: 'S05' }),
    ],
  }),
]

// Real entities keep demo scores, but their list status, identifiers and sourced indicators are real.
for (const e of entities) if (!e.id.startsWith('demo_')) e.demo = false

function edge(p: Partial<Edge> & Pick<Edge, 'id' | 'source' | 'target' | 'kind' | 'relationship'>): Edge {
  return { share: null, amount: null, activeFrom: null, activeTo: null, strength: 'moderate', strengthFactors: [], sourceUrls: [], demo: true, ...p }
}

const edges: Edge[] = [
  edge({ id: 'e_sub1', source: 'demo_prime', target: 'demo_sub1', kind: 'payment', relationship: 'Subaward', amount: 1_200_000, activeFrom: '2024-03-18', strength: 'strong', strengthFactors: ['Reported subaward (demo)'] }),
  edge({ id: 'e_sub2', source: 'demo_prime', target: 'demo_sub2', kind: 'payment', relationship: 'Subaward', amount: 850_000, activeFrom: '2024-06-03', strength: 'strong', strengthFactors: ['Reported subaward (demo)'] }),
  edge({ id: 'e_sub3', source: 'demo_prime', target: 'demo_np', kind: 'payment', relationship: 'Subaward', amount: 300_000, activeFrom: '2024-02-28', strength: 'strong', strengthFactors: ['Reported subaward (demo)'] }),
  edge({ id: 'e_own', source: 'demo_sub1', target: 'demo_sub2', kind: 'ownership', relationship: 'Shareholder', share: 60, activeFrom: '2024-01-19', strength: 'moderate', strengthFactors: ['Single registry filing (demo)'] }),
  edge({ id: 'e_pay_pp', source: 'demo_sub1', target: 'ent_photonpro', kind: 'payment', relationship: 'Purchase', amount: 410_000, activeFrom: '2024-09-10', strength: 'moderate', strengthFactors: ['Declared value on trade record (demo)'] }),
  edge({ id: 'e_trade_pp', source: 'ent_photonpro', target: 'demo_sub1', kind: 'trade', relationship: 'Supply chain shipment', activeFrom: '2024-09-02', strength: 'moderate', strengthFactors: ['Two shipment records (demo)'] }),
  edge({ id: 'e_pay_ax', source: 'demo_sub2', target: 'ent_alexsong', kind: 'payment', relationship: 'Purchase', amount: 920_000, activeFrom: '2024-10-01', strength: 'moderate', strengthFactors: ['Declared value on trade record (demo)'] }),
  edge({ id: 'e_psa', source: 'demo_sub2', target: 'ent_alexsong', kind: 'possible_match', relationship: 'Possibly same operator', strength: 'weak', strengthFactors: ['Shared phone number only (demo)'] }),
  edge({ id: 'e_grinin', source: 'person_grinin', target: 'ent_photonpro', kind: 'control', relationship: 'Officer / director', strength: 'strong', strengthFactors: ['Companies House officer record'], sourceUrls: [`${S13}/officers`], sourceId: 'S13', sourceAuthority: 'Companies House (UK)', demo: false }),
  edge({ id: 'e_sib', source: 'ent_majory', target: 'ent_photonpro', kind: 'sibling', relationship: 'Shared address', strength: 'moderate', strengthFactors: ['Both SDN entries list the same two London addresses'], sourceUrls: [S02], sourceId: 'S02', sourceAuthority: 'OFAC', demo: false }),
  ...(['ent_majory', 'ent_photonpro', 'ent_inventionbridge'] as const).map((id) =>
    edge({ id: `e_aobo_${id}`, source: id, target: 'ent_serniya', kind: 'association', relationship: 'Acting on behalf of', strength: 'strong', strengthFactors: ['Stated in the OFAC designation press release'], sourceUrls: [S01], sourceId: 'S01', sourceAuthority: 'U.S. Treasury (OFAC)', demo: false }),
  ),
  edge({ id: 'e_ax_srn', source: 'ent_alexsong', target: 'ent_serniya', kind: 'association', relationship: 'Facilitated transactions for', strength: 'strong', strengthFactors: ['Stated in the OFAC designation press release'], sourceUrls: [S01], sourceId: 'S01', sourceAuthority: 'U.S. Treasury (OFAC)', demo: false }),
]

const shipments: Shipment[] = [
  { id: 'sh1', date: '2024-09-02', shipperId: 'ent_photonpro', receiverId: 'demo_sub1', hsCode: '903039', description: 'Instruments for measuring electrical quantities', declaredValueUsd: 205_000, weightKg: 38, origin: 'GB', destination: 'US', via: [], flags: ['chpl'], demo: true },
  { id: 'sh2', date: '2024-10-05', shipperId: 'demo_sub2', receiverId: 'ent_alexsong', hsCode: '903039', description: 'Instruments for measuring electrical quantities', declaredValueUsd: 212_000, weightKg: 41, origin: 'US', destination: 'SG', via: [], flags: ['chpl'], demo: true },
  { id: 'sh3', date: '2024-10-09', shipperId: 'ent_alexsong', receiverId: 'ent_serniya', hsCode: '903039', description: 'Measuring equipment, relabeled as spare parts', declaredValueUsd: 88_000, weightKg: 41, origin: 'SG', destination: 'RU', via: ['AE'], flags: ['chpl', 'transshipment', 'short_dwell', 'relabeling', 'pass_through'], demo: true },
]

const audit: AuditEntry[] = [
  { seq: 1, timestamp: '2026-09-25T15:02:11Z', provider: 'USAspending', query: 'POST /api/v2/search/spending_by_award (recipient UEI DEMO00000001)', recordsReturned: 1, responseHash: 'demo-3f9a1c2e', cache: 'live' },
  { seq: 2, timestamp: '2026-09-25T15:02:14Z', provider: 'USAspending', query: 'POST /api/v2/search/spending_by_award (subawards: true, prime DEMO-AWD-0001)', recordsReturned: 2, responseHash: 'demo-a81b07d4', cache: 'live' },
  { seq: 3, timestamp: '2026-09-25T15:02:20Z', provider: 'Sayari', query: 'GET /v1/ubo/{id} for Keystone Logistics Group LLC (Demo)', recordsReturned: 1, responseHash: 'demo-5c2e9f10', cache: 'cache' },
  { seq: 4, timestamp: '2026-09-25T15:02:26Z', provider: 'Sayari', query: 'GET /v1/watchlist/{id}?psa=false for Northgate Components LLC (Demo)', recordsReturned: 3, responseHash: 'demo-9e44b2aa', cache: 'live' },
  { seq: 5, timestamp: '2026-09-25T15:02:31Z', provider: 'Sayari', query: 'POST /v1/trade/search/shipments (shipper Keystone Logistics Group LLC (Demo))', recordsReturned: 2, responseHash: 'demo-17d0c3be', cache: 'live' },
  { seq: 6, timestamp: '2026-09-25T15:02:40Z', provider: 'Tavily', query: '"Northgate Components LLC" website OR news', recordsReturned: 0, responseHash: 'demo-c0ffee01', cache: 'live' },
]

const designated = (id: string, source = S01, sourceId = 'S01'): TimelineEvent => ({ id: `des_${id}`, entityId: id, date: '2022-03-31', kind: 'designation', label: 'Designated by OFAC (E.O. 14024)', certainty: 'documented', sourceUrl: source, sourceId })

const timeline: TimelineEvent[] = [
  { id: 'inc_prime', entityId: 'demo_prime', date: '2009-04-14', kind: 'incorporation', label: 'Incorporated (demo)', certainty: 'documented', sourceUrl: null },
  { id: 'sam_prime', entityId: 'demo_prime', date: '2010-01-20', kind: 'sam_registration', label: 'SAM.gov registration (demo)', certainty: 'documented', sourceUrl: null },
  { id: 'inc_np', entityId: 'demo_np', date: '2023-06-12', kind: 'incorporation', label: 'Incorporated (demo)', certainty: 'documented', sourceUrl: null },
  { id: 'inc_sub1', entityId: 'demo_sub1', date: '2023-11-02', kind: 'incorporation', label: 'Incorporated (demo)', certainty: 'documented', sourceUrl: null },
  { id: 'inc_sub2', entityId: 'demo_sub2', date: '2024-01-19', kind: 'incorporation', label: 'Incorporated (demo)', certainty: 'documented', sourceUrl: null },
  { id: 'award', entityId: 'demo_prime', date: '2024-02-26', kind: 'award', label: 'Award DEMO-AWD-0001, $4.5M (demo)', certainty: 'documented', sourceUrl: null },
  { id: 'sub3', entityId: 'demo_np', date: '2024-02-28', kind: 'subaward', label: 'Subaward $300K (demo)', certainty: 'documented', sourceUrl: null },
  { id: 'sub1', entityId: 'demo_sub1', date: '2024-03-18', kind: 'subaward', label: 'Subaward $1.2M (demo)', certainty: 'documented', sourceUrl: null },
  { id: 'sub2', entityId: 'demo_sub2', date: '2024-06-03', kind: 'subaward', label: 'Subaward $850K (demo)', certainty: 'documented', sourceUrl: null },
  { id: 'sh1', entityId: 'demo_sub1', date: '2024-09-02', kind: 'shipment', label: 'Shipment from Photon Pro LLP, HS 903039 (demo)', certainty: 'estimated', sourceUrl: null },
  { id: 'sh2', entityId: 'demo_sub2', date: '2024-10-05', kind: 'shipment', label: 'Shipment to Alexsong Pte Ltd, HS 903039 (demo)', certainty: 'estimated', sourceUrl: null },
  { id: 'sh3', entityId: 'ent_alexsong', date: '2024-10-09', kind: 'shipment', label: 'Shipment to OOO Serniya Engineering via AE (demo)', certainty: 'estimated', sourceUrl: null },
  designated('ent_serniya'),
  designated('ent_photonpro'),
  designated('ent_majory'),
  designated('ent_inventionbridge'),
  designated('ent_alexsong'),
  designated('ent_sertal'),
  designated('person_grinin', S02, 'S02'),
  { id: 'strike_majory', entityId: 'ent_majory', date: '2022-12-06', kind: 'dissolution', label: 'Voluntary strike-off notice', certainty: 'documented', sourceUrl: S12, sourceId: 'S12' },
]

const nonprofits: Nonprofit[] = [
  {
    entityId: 'demo_np',
    statedMission: 'Disaster relief in the Americas (demo)',
    publicMoney: 300_000,
    foreignGrants: [
      { region: 'Americas', amount: 90_000, recipientType: 'Local relief groups' },
      { region: 'Middle East', amount: 140_000, recipientType: 'Intermediary foundation' },
      { region: 'Europe', amount: 10_000, recipientType: 'Consultancy' },
    ],
    programShare: 0.58,
    filingYear: 2024,
    missionRegions: ['Americas'],
    certainty: 'documented',
    demo: true,
  },
]

export const demoCase: CaseFile = {
  id: 'demo',
  title: 'Demo scenario (hypothetical)',
  kind: 'demo',
  note: 'Hypothetical award to show the interface. Companies ending in "(Demo)", all dollars, scores and marked connections are invented; list status and sourced links for the Serniya network are real.',
  typology: 'Russia sanctions evasion',
  summary: null,
  rootId: 'demo_prime',
  recipientId: 'demo_prime',
  award: { id: 'DEMO-AWD-0001', agency: 'Example Agency (Demo)', recipientId: 'demo_prime', obligated: 4_500_000, date: '2024-02-26', url: null, certainty: 'documented', demo: true },
  awardNote: null,
  subawards: [
    { id: 'DEMO-SUB-01', primeAwardId: 'DEMO-AWD-0001', payerId: 'demo_prime', payeeId: 'demo_sub1', amount: 1_200_000, date: '2024-03-18', url: null, certainty: 'documented', demo: true },
    { id: 'DEMO-SUB-02', primeAwardId: 'DEMO-AWD-0001', payerId: 'demo_prime', payeeId: 'demo_sub2', amount: 850_000, date: '2024-06-03', url: null, certainty: 'documented', demo: true },
    { id: 'DEMO-SUB-03', primeAwardId: 'DEMO-AWD-0001', payerId: 'demo_prime', payeeId: 'demo_np', amount: 300_000, date: '2024-02-28', url: null, certainty: 'documented', demo: true },
  ],
  purchases: [
    { id: 'DEMO-PUR-01', payerId: 'demo_sub1', payeeId: 'ent_photonpro', amount: 410_000, date: '2024-09-10', hsCode: '903039', certainty: 'estimated', demo: true },
    { id: 'DEMO-PUR-02', payerId: 'demo_sub2', payeeId: 'ent_alexsong', amount: 920_000, date: '2024-10-01', hsCode: '903039', certainty: 'estimated', demo: true },
  ],
  entities,
  edges,
  shipments,
  audit,
  manifest: { runId: 'demo-run-0001', codeVersion: 'demo', weightsHash: 'demo-weights-v0', retrievalWindow: '25 Sep 2026, 15:02–15:03 UTC', reviewer: 'Demo reviewer' },
  typologyIds: ['russia_evasion', 'humanitarian_fronts'],
  sources: [
    { id: 'S01', name: 'Treasury press release JY0692 (Serniya network designations)', url: S01, publisher: 'U.S. Department of the Treasury' },
    { id: 'S02', name: 'OFAC Recent Actions 20220331', url: S02, publisher: 'OFAC' },
    { id: 'S05', name: 'Superseding indictment, United States v. Grinin et al.', url: S05, publisher: 'U.S. Department of Justice' },
    { id: 'S12', name: 'Companies House: Majory LLP', url: S12, publisher: 'Companies House' },
    { id: 'S13', name: 'Companies House: Photon Pro LLP', url: S13, publisher: 'Companies House' },
  ],
  publicMoneyNote: 'Hypothetical award DEMO-AWD-0001 (demo).',
  timeline,
  nonprofits,
  compositeScore: null,
}
