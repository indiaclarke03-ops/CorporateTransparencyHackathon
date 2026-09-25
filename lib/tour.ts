/**
 * Guided demo walkthrough (regulator prompt 37). Each step names the route it opens and the
 * data-tour attribute it spotlights. Numbers come from the case at runtime (GuidedTour.tsx).
 */
export interface TourStep {
  id: string
  title: string
  route: string
  target: string | null
  /** Static text; `{…}` placeholders are filled from case data */
  body: string
}

export const TOUR: TourStep[] = [
  { id: 'welcome', title: 'Welcome', route: '/', target: null, body: 'This demo traces one public award through its supply chain to see whether any money reached companies that show shell-company indicators or connect to sanctioned parties. Everything here is a lead for review, not a finding.' },
  { id: 'brief', title: 'Case Brief', route: '/', target: 'brief-cards', body: 'Five questions, answered from the records: {award}. Each card shows how certain its number is and links to the evidence.' },
  { id: 'certainty', title: 'Certainty', route: '/', target: 'certainty-legend', body: 'Solid means documented in a record, dotted means derived, hatched means estimated, and a gray dotted outline with "?" means not visible in available records.' },
  { id: 'money', title: 'Follow the Money', route: '/follow-the-money', target: 'money-trail', body: 'Ribbons carry public dollars from the agency to where they ended up. {topFlow} The "Trail ends" group shows money whose next step is not visible: {trailEnds}.' },
  { id: 'story', title: 'Path Story', route: '/follow-the-money', target: 'top-paths', body: 'Open a path to read it step by step, from the award to the endpoint, ending with what is not known.' },
  { id: 'behind', title: "Who's Behind It", route: '/whos-behind-it', target: 'network', body: 'The network shows owners, officers and trading partners. {noPerson}' },
  { id: 'supply', title: 'Supply Chain', route: '/supply-chain', target: 'lanes', body: 'Commodity lanes show goods moving from origin to final destination. {chpl}' },
  { id: 'typologies', title: 'Typologies', route: '/typologies', target: 'typology-cards', body: 'Switch on the Russia sanctions evasion lens to highlight matching entities in every view. "Unverified definition – source needed" marks patterns that still need a source.' },
  { id: 'context', title: 'Regulatory context', route: '/', target: 'context', body: 'Why US ownership data is thin (RD-01) compared with the UK (RD-02). Each callout shows when it was last verified.' },
  { id: 'evidence', title: 'Evidence', route: '/evidence', target: 'evidence-list', body: 'Every claim links to a source record and to the audit trail of queries that produced it.' },
  { id: 'review', title: 'Review', route: '/review', target: 'review-queue', body: 'Give each lead a disposition with a reason, and build a referral packet that prints with the disclaimer on every page.' },
]
