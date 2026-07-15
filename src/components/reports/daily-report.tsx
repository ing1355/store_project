import { PAYMENT_METHODS, paymentLabel } from '@/lib/store'
import type { PeriodSettlement } from '@/lib/reports'
import { formatWon } from '@/lib/format'
import {
  CogsTable,
  ExpenseDetailTable,
  MenuSalesTable,
  ReportShell,
  SaleTxnTable,
  SummaryTable,
} from '@/components/reports/report-shared'

export function DailyReport({ data }: { data: PeriodSettlement }) {
  return (
    <ReportShell title="일일 결산" data={data}>
      <SummaryTable data={data} />

      <section className="mb-4">
        <h2 className="mb-2 text-sm font-semibold">결제수단별 집계</h2>
        <table className="report-table w-full border-collapse text-sm">
          <thead>
            <tr className="bg-neutral-100">
              <th className="border border-black px-2 py-1.5">결제수단</th>
              <th className="border border-black px-2 py-1.5 w-20 text-right">
                건수
              </th>
              <th className="border border-black px-2 py-1.5 w-28 text-right">
                금액
              </th>
            </tr>
          </thead>
          <tbody>
            {PAYMENT_METHODS.map((m) => {
              const b = data.payment[m.value]
              return (
                <tr key={m.value}>
                  <td className="border border-black px-2 py-1">
                    {paymentLabel(m.value)}
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-mono tabular-nums">
                    {b.count}
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-mono tabular-nums">
                    {formatWon(b.revenue)}
                  </td>
                </tr>
              )
            })}
            <tr className="bg-neutral-50 font-medium">
              <td className="border border-black px-2 py-1.5">계</td>
              <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums">
                {data.saleCount}
              </td>
              <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums">
                {formatWon(data.salesRevenue)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {data.specialByType.length > 0 ? (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-semibold">특이수입</h2>
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
            </tbody>
          </table>
        </section>
      ) : null}

      <SaleTxnTable rows={data.saleTxns} />
      <MenuSalesTable rows={data.menuTotals} />
      <CogsTable rows={data.cogsByMenu} />
      <ExpenseDetailTable title="○ 지출 내역" lines={data.allExpenseLines} />
    </ReportShell>
  )
}
