import type { PeriodSettlement } from '@/lib/reports'
import { MATERIAL_CATEGORY } from '@/lib/reports'
import { formatWon } from '@/lib/format'
import {
  CogsTable,
  ExpenseDetailTable,
  ReportShell,
} from '@/components/reports/report-shared'

export function MaterialReport({ data }: { data: PeriodSettlement }) {
  return (
    <ReportShell title="원재료비 결산" data={data}>
      <p className="mb-3 text-xs text-neutral-600">
        원재료비는 등록된 매출의 판매수량 × 메뉴 원가로 산출합니다. 물품구입
        지출(「{MATERIAL_CATEGORY}」)은 매입 내역으로 별도 표시합니다.
      </p>

      <table className="report-table mb-4 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-neutral-100">
            <th className="border border-black px-2 py-1.5">항목</th>
            <th className="border border-black px-2 py-1.5 w-36 text-right">
              금액
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1.5">
              원재료비 (판매수량×원가)
            </td>
            <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums font-semibold">
              {formatWon(data.materialTotal)}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1.5">
              물품구입 지출 (등록분)
            </td>
            <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums">
              {formatWon(data.purchaseTotal)}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1.5">기간 매출</td>
            <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums">
              {formatWon(data.salesRevenue)}
            </td>
          </tr>
        </tbody>
      </table>

      <CogsTable rows={data.cogsByMenu} />
      <ExpenseDetailTable
        title="○ 물품구입 지출 세부내역"
        lines={data.purchaseLines}
      />
    </ReportShell>
  )
}
