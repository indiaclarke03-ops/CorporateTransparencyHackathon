'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** The earlier /workspace view now lives under "Who's Behind It". */
export default function WorkspaceRedirect() {
  const router = useRouter()
  useEffect(() => router.replace('/whos-behind-it'), [router])
  return <p className="p-6 text-sm">This view has moved to Who&apos;s Behind It. Redirecting…</p>
}
