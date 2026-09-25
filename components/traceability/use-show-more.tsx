'use client'

import { useEffect, useState } from 'react'

/** Show the first `n` items with a "show all" toggle. If `expandOnHash` matches the URL hash
 *  (e.g. a footnote link to #source-S30), everything is shown so the anchor exists. */
export function useShowMore<T>(items: T[], n: number, expandOnHash?: RegExp) {
  const [all, setAll] = useState(false)
  useEffect(() => {
    if (!expandOnHash) return
    const check = () => {
      if (expandOnHash.test(window.location.hash)) {
        setAll(true)
        const id = window.location.hash.slice(1)
        requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'center' }))
      }
    }
    check()
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [expandOnHash])
  const shown = all ? items : items.slice(0, n)
  const toggle =
    items.length > n ? (
      <button
        type="button"
        onClick={() => setAll(!all)}
        className="w-fit self-center rounded-full border border-border px-4 py-1.5 text-xs font-bold text-accent hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {all ? 'Show fewer' : `Show all ${items.length}`}
      </button>
    ) : null
  return { shown, toggle }
}
