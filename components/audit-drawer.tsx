'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { AuditStep } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  steps: AuditStep[]
}

export function AuditDrawer({ open, onClose, steps }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && onClose()}
      aria-labelledby="audit-title"
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-md bg-card p-0 text-card-foreground backdrop:bg-background/70"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 id="audit-title" className="font-heading text-xl font-semibold">
              Audit trail
            </h2>
            <p className="text-sm text-muted-foreground">Every query, in order, for reproducibility.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">Close audit trail</span>
          </button>
        </div>

        {steps.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No audit steps recorded for this investigation.</p>
        ) : (
          <ol className="flex flex-col gap-3 overflow-y-auto p-5">
            {steps.map((s) => (
              <li key={s.step} className="flex gap-3 rounded-2xl bg-muted p-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-heading font-bold text-primary-foreground">
                  {s.step}
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-sm font-bold">{s.source}</p>
                  <code className="break-words rounded-lg bg-background px-2 py-1 font-mono text-xs">{s.query_executed}</code>
                  <p className="text-xs text-muted-foreground">{s.records_matched} records matched</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </dialog>
  )
}
