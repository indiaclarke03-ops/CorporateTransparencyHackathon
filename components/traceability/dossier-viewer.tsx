'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { showcase, type DossierBlock } from '@/lib/showcase'
import { FilterButtons, Inline, SourceChip } from './ui'

const CASES = ['serniya', 'palantir'] as const
const LABEL = { serniya: 'Serniya (validation)', palantir: 'Palantir (control)' } as const

function Block({ b }: { b: DossierBlock }) {
  switch (b.type) {
    case 'heading':
      return b.level === 1
        ? <h3 className="font-heading text-xl font-semibold">{b.text}</h3>
        : <h4 className={b.level === 2 ? 'pt-3 font-heading text-lg font-semibold text-accent' : 'pt-2 font-heading font-semibold'}>{b.text}</h4>
    case 'notice':
      return <p className="flex gap-2 rounded-2xl border border-accent bg-background/60 p-3 text-sm"><AlertTriangle className="size-4 shrink-0 text-accent" /><Inline text={b.text} /></p>
    case 'paragraph':
      return <p className="text-sm leading-relaxed"><Inline text={b.text} /></p>
    case 'list':
      return (
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed">
          {b.items.map((it, i) => <li key={i} className="whitespace-pre-line"><Inline text={it} /></li>)}
        </ul>
      )
    case 'table':
      return (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-muted text-xs text-muted-foreground"><tr>{b.columns.map((c) => <th key={c} className="p-2">{c}</th>)}</tr></thead>
            <tbody>{b.rows.map((r, i) => <tr key={i} className="border-t border-border align-top">{r.map((c, j) => <td key={j} className="p-2"><Inline text={c} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      )
    case 'footnote':
      return <p className="text-xs leading-relaxed text-muted-foreground"><SourceChip id={b.id} /> {b.text.replace(/^\[S\d+\]\s*/, '')}</p>
  }
}

export function DossierViewer() {
  const [c, setC] = useState<(typeof CASES)[number]>('serniya')
  const d = showcase.dossiers[c]
  return (
    <div className="flex flex-col gap-4">
      <FilterButtons options={CASES} value={c} onChange={setC} />
      <p className="text-xs text-muted-foreground">
        {LABEL[c]} · rendered from <code className="font-mono">narrative/inputs/{c}.json</code> with the templates in <code className="font-mono">config/narrative_templates.yaml</code>.
        Source chips jump to the registry. Sentences whose data is missing are dropped, never guessed: {(d.skipped_templates as unknown[]).length} templates skipped here.
      </p>
      <article className="flex max-h-[42rem] flex-col gap-3 overflow-y-auto rounded-2xl bg-muted p-5">
        {d.blocks.map((b, i) => <Block key={i} b={b} />)}
      </article>
    </div>
  )
}
