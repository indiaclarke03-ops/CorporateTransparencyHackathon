/** Question-led navigation (regulator prompt 22). Order is the order regulators ask. */
export interface Section {
  id: string
  href: string
  label: string
  question: string
  /** "g" + this key jumps here */
  key: string
  icon: 'FileText' | 'Banknote' | 'Container' | 'Users' | 'Shapes' | 'CalendarRange' | 'Globe2' | 'List' | 'ClipboardCheck' | 'ScrollText'
  subViews: string[]
}

export const SECTIONS: Section[] = [
  { id: 'brief', href: '/', label: 'Brief', question: 'What happened?', key: 'b', icon: 'FileText', subViews: [] },
  { id: 'money', href: '/follow-the-money', label: 'Follow the Money', question: 'Where did the public money go?', key: 'm', icon: 'Banknote', subViews: ['Money trail', 'Flows table'] },
  { id: 'supply', href: '/supply-chain', label: 'Supply Chain', question: 'Who is in the supply chain?', key: 's', icon: 'Container', subViews: ['Commodity lanes', 'Shipments'] },
  { id: 'behind', href: '/whos-behind-it', label: "Who's Behind It", question: 'Who controls these companies?', key: 'w', icon: 'Users', subViews: ['Network', 'Ownership', 'Attribution'] },
  { id: 'typologies', href: '/typologies', label: 'Typologies', question: 'What patterns does this match?', key: 't', icon: 'Shapes', subViews: ['Lenses', 'Nonprofits'] },
  { id: 'timeline', href: '/timeline', label: 'Timeline', question: 'In what order did things happen?', key: 'l', icon: 'CalendarRange', subViews: [] },
  { id: 'geography', href: '/geography', label: 'Geography', question: 'Where are the risks?', key: 'g', icon: 'Globe2', subViews: [] },
  { id: 'entities', href: '/entities', label: 'Entities', question: 'Everyone in this case', key: 'e', icon: 'List', subViews: [] },
  { id: 'review', href: '/review', label: 'Review', question: 'What needs my decision?', key: 'r', icon: 'ClipboardCheck', subViews: ['Alerts', 'Referral packet'] },
  { id: 'evidence', href: '/evidence', label: 'Evidence', question: 'How do we know?', key: 'v', icon: 'ScrollText', subViews: ['Sources', 'Audit trail', 'Glossary'] },
]

export function sectionForPath(path: string) {
  const p = path.replace(process.env.NEXT_PUBLIC_BASE_PATH ?? '', '').replace(/\/$/, '') || '/'
  return SECTIONS.find((s) => (s.href === '/' ? p === '/' : p.startsWith(s.href))) ?? null
}
