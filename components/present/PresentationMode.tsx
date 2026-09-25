'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useCase } from '@/components/shell/CaseContext'
import { CertaintyMark } from '@/components/ui-kit/CertaintyMark'
import { MoneyAmount } from '@/components/ui-kit/MoneyAmount'
import { CALLOUTS, needsReverification } from '@/lib/callouts'
import { formatDate } from '@/lib/format'
import { ENDPOINT_LABEL, ENDPOINT_ORDER, buildMoneyTrail, pathsOfConcern } from '@/lib/money'
import { bestFit, briefCards, keyPoints, pathStory, unknowns } from '@/lib/narrative'
import { useWorkspace } from '@/lib/store'
import { fitLabel } from '@/lib/typologies'

type Slide = { title: string; body: React.ReactNode; steps?: number }

/** Full-screen, keyboard-driven slides generated from the case (regulator prompt 34). */
export function PresentationMode() {
  const c = useCase()
  const setPresenting = useWorkspace((s) => s.setPresenting)
  const [i, setI] = useState(0)
  const [reveal, setReveal] = useState(1)

  const slides = useMemo<Slide[]>(() => {
    const cards = briefCards(c)
    const trail = buildMoneyTrail(c)
    const paths = pathsOfConcern(c, 3)
    const fit = bestFit(c)
    const u = unknowns(c)
    const s: Slide[] = [
      {
        title: c.title,
        body: (
          <div className="flex flex-col gap-4">
            <p className="text-2xl">{c.note}</p>
            <p className="rounded-md border-2 border-ink p-4 text-xl font-semibold">Outputs are risk leads for review, not findings of wrongdoing.</p>
          </div>
        ),
      },
      {
        title: 'Key points',
        body: (
          <dl className="grid gap-4 md:grid-cols-2">
            {keyPoints(c).map((p) => (
              <div key={p.id}>
                <dt className="text-base font-semibold text-muted-foreground">{p.label}</dt>
                <dd className="flex flex-wrap items-center gap-2 text-xl">{p.text} <CertaintyMark certainty={p.certainty} /></dd>
              </div>
            ))}
          </dl>
        ),
      },
      {
        title: 'Why now',
        body: (
          <div className="grid gap-4 md:grid-cols-2">
            {[CALLOUTS['RD-01'], CALLOUTS['RD-02']].map((co) => (
              <div key={co.id} className="rounded-md border-2 border-ink p-4">
                <p className="font-mono text-base text-muted-foreground">{co.id}</p>
                <p className="text-2xl font-semibold">{co.title}</p>
                <p className="mt-2 text-lg">{co.body}</p>
                <p className="mt-2 text-base text-muted-foreground">Last verified {formatDate(co.lastVerified)}</p>
                {needsReverification(co) && <p className="mt-1 text-base font-semibold">Needs re-verification</p>}
              </div>
            ))}
          </div>
        ),
      },
      {
        title: 'Case brief',
        body: (
          <ul className="flex flex-col gap-4">
            {cards.map((card) => (
              <li key={card.id} className="flex flex-col gap-1">
                <span className="text-base font-semibold text-muted-foreground">{card.question}</span>
                <span className="text-xl">
                  <strong className="mr-2 text-3xl">{card.keyNumber}</strong>
                  {card.sentence.text}
                </span>
              </li>
            ))}
          </ul>
        ),
      },
      {
        title: 'Where the money ended up',
        body: trail ? (
          <ul className="flex flex-col gap-3">
            {ENDPOINT_ORDER.filter((g) => trail.byEndpoint[g] > 0).map((g) => (
              <li key={g} className="flex flex-col gap-1">
                <span className="text-lg">{ENDPOINT_LABEL[g]}</span>
                <div className="flex items-center gap-3">
                  <div className="h-6 rounded-sm bg-money" style={{ width: `${Math.max(1, (trail.byEndpoint[g] / trail.awardTotal) * 70)}%` }} aria-hidden="true" />
                  <MoneyAmount value={trail.byEndpoint[g]} className="text-xl" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-2xl">No award is on record, so there is no money trail for this case.</p>
        ),
      },
      ...paths.map((p, n) => {
        const story = pathStory(c, p)
        return {
          title: `Path ${n + 1}: ${story.endpoint}`,
          steps: story.steps.length + 1,
          body: (
            <ol className="flex flex-col gap-3">
              {story.steps.map((st, k) => (
                <li key={st.n} className={k < reveal ? 'text-2xl' : 'invisible text-2xl'} aria-hidden={k >= reveal}>
                  <span className="mr-2 font-semibold">Step {st.n}.</span>
                  {st.text}
                </li>
              ))}
              <li className={reveal > story.steps.length ? 'rounded-md border-2 border-ink p-3 text-xl' : 'invisible'} aria-hidden={reveal <= story.steps.length}>
                <strong>Not known:</strong> {story.notKnown.join(' ')}
              </li>
            </ol>
          ),
        }
      }),
      { title: 'Typology fit', body: <p className="text-2xl">{fit ? `${fit.name}. ${fitLabel(fit.fit)} at ${fit.entity.name}. A pattern match is a reason to review, not a conclusion.` : 'No typology indicators matched with the data available.'}</p> },
      {
        title: "What we can't see",
        body: (
          <ul className="flex list-disc flex-col gap-2 pl-6 text-xl">
            {u.map((x) => (
              <li key={x.text}>{x.text}</li>
            ))}
          </ul>
        ),
      },
      {
        title: 'Method and audit',
        body: (
          <div className="flex flex-col gap-3 text-xl">
            <p>{c.audit.length} recorded queries; {c.sources.length} primary sources. Scores are provisional until calibrated (spec 12.4).</p>
            {c.manifest && <p>Run {c.manifest.runId} · weights {c.manifest.weightsHash} · reviewer {c.manifest.reviewer}</p>}
            <p className="font-semibold">Outputs are risk leads for review, not findings of wrongdoing.</p>
          </div>
        ),
      },
    ]
    return s
  }, [c, reveal])

  const slide = slides[i]
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresenting(false)
      else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        if (slide.steps && reveal < slide.steps) setReveal(reveal + 1)
        else if (i < slides.length - 1) (setI(i + 1), setReveal(1))
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        if (slide.steps && reveal > 1) setReveal(reveal - 1)
        else if (i > 0) (setI(i - 1), setReveal(1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [i, reveal, slide, slides.length, setPresenting])

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-paper text-ink" role="dialog" aria-modal="true" aria-labelledby="slide-title">
      <div className="flex items-center justify-between border-b border-border px-8 py-3 text-sm text-muted-foreground">
        <span>
          Slide {i + 1} of {slides.length} · arrow keys to move, Esc to exit
        </span>
        <button type="button" onClick={() => setPresenting(false)} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-4" aria-hidden="true" />
          Exit
        </button>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 overflow-y-auto px-8 py-10" aria-live="polite">
        <h2 id="slide-title" className="text-4xl font-semibold">{slide.title}</h2>
        {slide.body}
      </div>
      <p className="border-t border-border px-8 py-2 text-center text-sm">Risk leads for review, not findings of wrongdoing.</p>
    </div>
  )
}
