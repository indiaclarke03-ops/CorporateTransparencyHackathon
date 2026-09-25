'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SECTIONS } from '@/lib/sections'
import { useWorkspace } from '@/lib/store'

/** Keyboard shortcuts: "/" case picker, "g"+letter section, "p" present, "?" help, Esc closes panels. */
export function Shortcuts({ helpOpen, setHelpOpen }: { helpOpen: boolean; setHelpOpen: (v: boolean) => void }) {
  const router = useRouter()
  const pendingG = useRef(false)
  const { clearSelection, setPresenting, setTourStep, setHighlight } = useWorkspace()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest('input, textarea, select, [contenteditable="true"]')) return
      if (pendingG.current) {
        pendingG.current = false
        const s = SECTIONS.find((x) => x.key === e.key.toLowerCase())
        if (s) {
          e.preventDefault()
          router.push(s.href)
        }
        return
      }
      if (e.key === 'g') {
        pendingG.current = true
        window.setTimeout(() => (pendingG.current = false), 1200)
      } else if (e.key === '/') {
        e.preventDefault()
        document.getElementById('case-select')?.focus()
      } else if (e.key === 'p') {
        setPresenting(true)
      } else if (e.key === '?') {
        setHelpOpen(true)
      } else if (e.key === 'Escape') {
        clearSelection()
        setHighlight([])
        setTourStep(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router, clearSelection, setPresenting, setHelpOpen, setTourStep, setHighlight])

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Help and keyboard shortcuts</DialogTitle>
          <DialogDescription>Outputs are risk leads for review, not findings of wrongdoing. Every item links to its source.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt><kbd className="rounded border px-1 font-mono">/</kbd></dt><dd>Choose a case</dd>
          <dt><kbd className="rounded border px-1 font-mono">p</kbd></dt><dd>Present this case</dd>
          <dt><kbd className="rounded border px-1 font-mono">Esc</kbd></dt><dd>Close panels, tour and highlights</dd>
          <dt><kbd className="rounded border px-1 font-mono">?</kbd></dt><dd>This help</dd>
          {SECTIONS.map((s) => (
            <div key={s.id} className="contents">
              <dt><kbd className="rounded border px-1 font-mono">g</kbd> <kbd className="rounded border px-1 font-mono">{s.key}</kbd></dt>
              <dd>{s.label}: {s.question}</dd>
            </div>
          ))}
        </dl>
        <button type="button" onClick={() => { setHelpOpen(false); setTourStep(0) }} className="mt-2 w-fit rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Take the guided tour
        </button>
      </DialogContent>
    </Dialog>
  )
}
