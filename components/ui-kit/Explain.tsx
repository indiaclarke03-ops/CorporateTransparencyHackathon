'use client'

import { HelpCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { glossary, type GlossaryKey } from '@/lib/glossary'
import { useWorkspace } from '@/lib/store'

/**
 * Label with a "What does this mean?" tooltip from lib/glossary.ts. In Briefing mode the plain
 * heading replaces the technical term; the term stays in the tooltip.
 */
export function Explain({ term, children, className }: { term: GlossaryKey; children?: ReactNode; className?: string }) {
  const density = useWorkspace((s) => s.density)
  const g = glossary(term)
  const label = children ?? (density === 'briefing' && g.plain ? g.plain : g.term)
  return (
    <span className={className}>
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="ml-1 inline-flex translate-y-0.5 rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`What does "${g.term}" mean?`}>
            <HelpCircle className="size-3.5" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-left">
          <p className="font-semibold">{g.term}</p>
          <p>{g.definition}</p>
          <p className="mt-1 opacity-90">Why it matters: {g.whyItMatters}</p>
        </TooltipContent>
      </Tooltip>
    </span>
  )
}
