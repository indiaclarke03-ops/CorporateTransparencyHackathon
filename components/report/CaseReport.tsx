'use client'

import Link from 'next/link'
import { Printer } from 'lucide-react'
import { CaseProvider } from '@/components/shell/CaseContext'
import { CertaintyDefs } from '@/components/ui-kit/CertaintyMark'
import { MoneyAmount } from '@/components/ui-kit/MoneyAmount'
import { ENDPOINT_LABEL, ENDPOINT_ORDER, buildMoneyTrail, pathsOfConcern } from '@/lib/money'
import { briefCards, pathStory, unknowns } from '@/lib/narrative'
import { useCaseFile } from '@/lib/use-case'

/** Print-optimized case report (regulator prompt 10). Users print to PDF from the browser. */
export function CaseReport({ caseId }: { caseId: string }) {
  const { data: c, error } = useCaseFile(caseId)
  if (error) return <p className="p-6">The case file could not be loaded: {error.message}</p>
  if (!c) return <p className="p-6">Loading the report…</p>
  const trail = buildMoneyTrail(c)
  return (
    <CaseProvider value={c}>
      <CertaintyDefs />
      <article className="mx-auto flex max-w-4xl flex-col gap-6 p-6 font-serif print:p-0">
        <div className="flex items-center justify-between gap-2 font-sans print:hidden">
          <Link href="/" className="text-sm underline">Back to the case</Link>
          <button type="button" onClick={() => window.print()} className="flex items-center gap-1 rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-paper">
            <Printer className="size-4" aria-hidden="true" />
            Print or save as PDF
          </button>
        </div>
        <p className="border-y-2 border-ink py-1 text-center font-sans text-sm font-semibold">Risk leads for review, not findings of wrongdoing.</p>
        <header>
          <h1 className="text-3xl font-semibold">{c.title}</h1>
          <p className="mt-1 text-sm">{c.note}</p>
        </header>
        <section className="no-break">
          <h2 className="text-xl font-semibold">Summary</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {briefCards(c).map((card) => (
              <li key={card.id}><strong>{card.question}</strong> {card.sentence.text} ({card.sentence.certainty})</li>
            ))}
          </ul>
        </section>
        <section className="no-break">
          <h2 className="text-xl font-semibold">Scope and limitations</h2>
          <ul className="mt-2 list-disc pl-6">
            {unknowns(c).map((u) => (
              <li key={u.text}>{u.text}</li>
            ))}
            <li>Shows recorded awards, subawards, and declared trade values only. Bank transfers and unreported payments are not visible.</li>
          </ul>
        </section>
        {trail && (
          <section className="no-break">
            <h2 className="text-xl font-semibold">Where the money ended up</h2>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {ENDPOINT_ORDER.filter((g) => trail.byEndpoint[g] > 0).map((g) => (
                  <tr key={g} className="border-t"><td className="py-1">{ENDPOINT_LABEL[g]}</td><td className="py-1 text-right"><MoneyAmount value={trail.byEndpoint[g]} compact={false} /></td></tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <section className="print-break">
          <h2 className="text-xl font-semibold">Paths of concern</h2>
          {pathsOfConcern(c, 3).map((p) => {
            const s = pathStory(c, p)
            return (
              <div key={p.id} className="no-break mt-3">
                <h3 className="font-semibold">{s.endpoint}</h3>
                <ol className="list-decimal pl-6">{s.steps.map((st) => <li key={st.n}>{st.text}</li>)}</ol>
                <p className="text-sm">Not known: {s.notKnown.join(' ')}</p>
              </div>
            )
          })}
          {pathsOfConcern(c, 3).length === 0 && <p className="mt-2">No payment path reaches a listed or flagged party in the records.</p>}
        </section>
        <section className="no-break">
          <h2 className="text-xl font-semibold">Sources</h2>
          <ul className="mt-2 list-disc pl-6 text-sm">
            {c.sources.map((s) => <li key={s.id}>{s.id}: {s.name} — {s.url}</li>)}
          </ul>
        </section>
        <section className="no-break">
          <h2 className="text-xl font-semibold">Method and audit</h2>
          <ol className="mt-2 list-decimal pl-6 text-sm">{c.audit.map((a) => <li key={a.seq}>{a.provider}: {a.query} ({a.recordsReturned} records)</li>)}</ol>
        </section>
      </article>
    </CaseProvider>
  )
}
