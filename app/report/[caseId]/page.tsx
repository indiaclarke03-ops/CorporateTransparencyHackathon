import { CASE_OPTIONS } from '@/lib/cases'
import { CaseReport } from '@/components/report/CaseReport'

export function generateStaticParams() {
  return CASE_OPTIONS.map((c) => ({ caseId: c.id }))
}

export default async function ReportPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  return <CaseReport caseId={caseId} />
}
