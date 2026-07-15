import type { PeriodSettlement } from '@/lib/reports'
import {
  CogsTable,
  ExpenseDetailTable,
  MenuSalesTable,
  ReportShell,
  SummaryTable,
} from '@/components/reports/report-shared'

export function WeeklyReport({ data }: { data: PeriodSettlement }) {
  return (
    <ReportShell title="주간 운영 결산" data={data}>
      <SummaryTable data={data} />
      <MenuSalesTable rows={data.menuTotals} />
      <CogsTable rows={data.cogsByMenu} />
      <ExpenseDetailTable
        title="○ 물품구입 지출"
        lines={data.purchaseLines}
      />
      <ExpenseDetailTable title="○ 경상비" lines={data.opexLines} />
    </ReportShell>
  )
}
