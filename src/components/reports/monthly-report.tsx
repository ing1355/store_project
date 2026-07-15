import type { PeriodSettlement } from '@/lib/reports'
import { formatWon } from '@/lib/format'
import {
  CogsTable,
  ExpenseDetailTable,
  MenuSalesTable,
  ReportShell,
  SummaryTable,
} from '@/components/reports/report-shared'

export function MonthlyReport({ data }: { data: PeriodSettlement }) {
  return (
    <ReportShell title="월간 결산 (총괄 운영현황)" data={data}>
      <SummaryTable data={data} />

      {data.specialByType.length > 0 ? (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-semibold">특이사항 · 수입</h2>
          <table className="report-table w-full border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-100">
                <th className="border border-black px-2 py-1.5">유형</th>
                <th className="border border-black px-2 py-1.5 w-20 text-right">
                  건수
                </th>
                <th className="border border-black px-2 py-1.5 w-28 text-right">
                  금액
                </th>
              </tr>
            </thead>
            <tbody>
              {data.specialByType.map((t) => (
                <tr key={t.type}>
                  <td className="border border-black px-2 py-1">{t.label}</td>
                  <td className="border border-black px-2 py-1 text-right font-mono tabular-nums">
                    {t.count}
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-mono tabular-nums">
                    {formatWon(t.amount)}
                  </td>
                </tr>
              ))}
              <tr className="bg-neutral-50 font-medium">
                <td className="border border-black px-2 py-1.5">계</td>
                <td className="border border-black px-2 py-1.5" />
                <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums">
                  {formatWon(data.specialIncomeTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="mb-4">
        <h2 className="mb-2 text-sm font-semibold">지출 분류별 (등록분)</h2>
        <table className="report-table w-full border-collapse text-sm">
          <thead>
            <tr className="bg-neutral-100">
              <th className="border border-black px-2 py-1.5">분류</th>
              <th className="border border-black px-2 py-1.5 w-20 text-right">
                건수
              </th>
              <th className="border border-black px-2 py-1.5 w-28 text-right">
                금액
              </th>
            </tr>
          </thead>
          <tbody>
            {data.expenseByCategory.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="border border-black px-2 py-4 text-center text-neutral-500"
                >
                  지출 없음
                </td>
              </tr>
            ) : (
              data.expenseByCategory.map((c) => (
                <tr key={c.category}>
                  <td className="border border-black px-2 py-1">{c.category}</td>
                  <td className="border border-black px-2 py-1 text-right font-mono tabular-nums">
                    {c.count}
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-mono tabular-nums">
                    {formatWon(c.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

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
