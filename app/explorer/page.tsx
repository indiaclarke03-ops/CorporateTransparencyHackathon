import type { Metadata } from 'next'
import { InvestigationExplorer } from '@/components/investigation-explorer'

export const metadata: Metadata = { title: 'Case explorer — Follow the Public Dollar' }

export default function ExplorerPage() {
  return <InvestigationExplorer />
}
