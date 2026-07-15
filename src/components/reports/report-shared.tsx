import type { ReactNode } from 'react'
import type { PeriodSettlement } from '@/lib/reports'
import { formatPeriodRange } from '@/lib/reports'
import { formatWon } from '@/lib/format'

export function ReportShell({
  title,
  data,
  children,
}: {
  title: string
  data: PeriodSettlement
  children: ReactNode
}) {
  return (
    <div className="report-sheet mx-auto w-full max-w-[210mm] bg-white text-black">
      <header className="report-header mb-4 flex items-start justify-between gap-4 border-b-2 border-black pb-3">
        <div>
          <p className="text-xs text-neutral-600">{data.settings.storeName}</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm">{formatPeriodRange(data.period)}</p>
          <p className="mt-0.5 text-xs text-neutral-600">
            단위 : 원 · 등록 데이터 기준 집계
            {data.hasAnyData
              ? ` (매출 ${data.saleCount}건 · 지출 ${data.allExpenseLines.length}건)`
              : ' (해당 기간 데이터 없음)'}
          </p>
        </div>
        <table className="report-sign-table shrink-0 border-collapse text-center text-xs">
          <thead>
            <tr>
              <th className="border border-black px-4 py-1 font-medium">
                {data.settings.approverLeft}
              </th>
              <th className="border border-black px-4 py-1 font-medium">
                {data.settings.approverRight}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="h-12 w-24 border border-black" />
              <td className="h-12 w-24 border border-black" />
            </tr>
          </tbody>
        </table>
      </header>
      {children}
    </div>
  )
}

export function SummaryTable({ data }: { data: PeriodSettlement }) {
  return (
    <table className="report-table mb-4 w-full border-collapse text-sm">
      <thead>
        <tr className="bg-neutral-100">
          <th className="border border-black px-2 py-1.5" rowSpan={2}>
            구분
          </th>
          <th className="border border-black px-2 py-1.5" rowSpan={2}>
            총수입
          </th>
          <th className="border border-black px-2 py-1.5" colSpan={3}>
            지출
          </th>
          <th className="border border-black px-2 py-1.5" rowSpan={2}>
            순수익금
          </th>
          <th className="border border-black px-2 py-1.5" rowSpan={2}>
            수익률
          </th>
        </tr>
        <tr className="bg-neutral-100">
          <th className="border border-black px-2 py-1">소계</th>
          <th className="border border-black px-2 py-1">원재료비</th>
          <th className="border border-black px-2 py-1">경상비</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="border border-black px-2 py-1.5 text-center">금액</td>
          <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums">
            {formatWon(data.totalIncome)}
          </td>
          <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums">
            {formatWon(data.expenseTotal)}
          </td>
          <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums">
            {formatWon(data.materialTotal)}
          </td>
          <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums">
            {formatWon(data.opexTotal)}
          </td>
          <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums font-semibold">
            {formatWon(data.net)}
          </td>
          <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums">
            {data.profitRate == null ? '—' : `${data.profitRate.toFixed(1)}%`}
          </td>
        </tr>
        <tr>
          <td className="border border-black px-2 py-1 text-center text-xs text-neutral-600">
            내역
          </td>
          <td
            className="border border-black px-2 py-1 text-xs text-neutral-600"
            colSpan={6}
          >
            매출 {formatWon(data.salesRevenue)}
            {data.specialIncomeTotal > 0
              ? ` + 특이수입 ${formatWon(data.specialIncomeTotal)}`
              : ''}
            {' · '}
            원재료비=판매수량×메뉴원가
            {data.purchaseTotal > 0
              ? ` · 물품구입 지출 ${formatWon(data.purchaseTotal)}`
              : ''}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

export function ExpenseDetailTable({
  title,
  lines,
}: {
  title: string
  lines: PeriodSettlement['materialLines']
}) {
  const total = lines.reduce((s, l) => s + l.amount, 0)
  return (
    <section className="mb-4">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <table className="report-table w-full border-collapse text-sm">
        <thead>
          <tr className="bg-neutral-100">
            <th className="border border-black px-2 py-1.5 w-24">구분</th>
            <th className="border border-black px-2 py-1.5">품명</th>
            <th className="border border-black px-2 py-1.5 w-28">거래처</th>
            <th className="border border-black px-2 py-1.5 w-16">일자</th>
            <th className="border border-black px-2 py-1.5 w-28 text-right">
              금액
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="border border-black px-2 py-4 text-center text-neutral-500"
              >
                등록된 내역 없음
              </td>
            </tr>
          ) : (
            lines.map((l, i) => (
              <tr key={`${l.date}-${l.description}-${i}`}>
                <td className="border border-black px-2 py-1">{l.category}</td>
                <td className="border border-black px-2 py-1">{l.description}</td>
                <td className="border border-black px-2 py-1">
                  {l.vendor || '—'}
                </td>
                <td className="border border-black px-2 py-1 font-mono text-xs tabular-nums">
                  {l.date.slice(5)}
                </td>
                <td className="border border-black px-2 py-1 text-right font-mono tabular-nums">
                  {formatWon(l.amount)}
                </td>
              </tr>
            ))
          )}
          <tr className="bg-neutral-50 font-medium">
            <td className="border border-black px-2 py-1.5" colSpan={4}>
              계
            </td>
            <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums">
              {formatWon(total)}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

export function MenuSalesTable({
  rows,
}: {
  rows: PeriodSettlement['menuTotals']
}) {
  const totalRev = rows.reduce((s, r) => s + r.revenue, 0)
  const totalUnits = rows.reduce((s, r) => s + r.units, 0)
  return (
    <section className="mb-2">
      <h2 className="mb-2 text-sm font-semibold">메뉴별 매출 (등록 매출 집계)</h2>
      <table className="report-table w-full border-collapse text-sm">
        <thead>
          <tr className="bg-neutral-100">
            <th className="border border-black px-2 py-1.5">메뉴</th>
            <th className="border border-black px-2 py-1.5 w-20 text-right">
              수량
            </th>
            <th className="border border-black px-2 py-1.5 w-28 text-right">
              매출
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                className="border border-black px-2 py-4 text-center text-neutral-500"
              >
                매출 데이터 없음
              </td>
            </tr>
          ) : (
            <>
              {rows.map((m) => (
                <tr key={m.menuId}>
                  <td className="border border-black px-2 py-1">{m.name}</td>
                  <td className="border border-black px-2 py-1 text-right font-mono tabular-nums">
                    {m.units}
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-mono tabular-nums">
                    {formatWon(m.revenue)}
                  </td>
                </tr>
              ))}
              <tr className="bg-neutral-50 font-medium">
                <td className="border border-black px-2 py-1.5">계</td>
                <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums">
                  {totalUnits}
                </td>
                <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums">
                  {formatWon(totalRev)}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </section>
  )
}

export function CogsTable({ rows }: { rows: PeriodSettlement['cogsByMenu'] }) {
  const totalCogs = rows.reduce((s, r) => s + r.cogs, 0)
  const totalUnits = rows.reduce((s, r) => s + r.units, 0)
  return (
    <section className="mb-4">
      <h2 className="mb-2 text-sm font-semibold">
        ○ 원재료비 (판매수량 × 메뉴 원가)
      </h2>
      <table className="report-table w-full border-collapse text-sm">
        <thead>
          <tr className="bg-neutral-100">
            <th className="border border-black px-2 py-1.5">메뉴</th>
            <th className="border border-black px-2 py-1.5 w-16 text-right">
              수량
            </th>
            <th className="border border-black px-2 py-1.5 w-24 text-right">
              원가
            </th>
            <th className="border border-black px-2 py-1.5 w-28 text-right">
              원재료비
            </th>
            <th className="border border-black px-2 py-1.5 w-28 text-right">
              매출
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="border border-black px-2 py-4 text-center text-neutral-500"
              >
                판매 데이터 없음
              </td>
            </tr>
          ) : (
            <>
              {rows.map((r) => (
                <tr key={r.menuId}>
                  <td className="border border-black px-2 py-1">{r.name}</td>
                  <td className="border border-black px-2 py-1 text-right font-mono tabular-nums">
                    {r.units}
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-mono tabular-nums">
                    {formatWon(r.unitCost)}
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-mono tabular-nums">
                    {formatWon(r.cogs)}
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-mono tabular-nums">
                    {formatWon(r.revenue)}
                  </td>
                </tr>
              ))}
              <tr className="bg-neutral-50 font-medium">
                <td className="border border-black px-2 py-1.5">계</td>
                <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums">
                  {totalUnits}
                </td>
                <td className="border border-black px-2 py-1.5" />
                <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums">
                  {formatWon(totalCogs)}
                </td>
                <td className="border border-black px-2 py-1.5 text-right font-mono tabular-nums">
                  {formatWon(rows.reduce((s, r) => s + r.revenue, 0))}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </section>
  )
}

export function SaleTxnTable({
  rows,
}: {
  rows: PeriodSettlement['saleTxns']
}) {
  return (
    <section className="mb-4">
      <h2 className="mb-2 text-sm font-semibold">○ 매출 거래 내역</h2>
      <table className="report-table w-full border-collapse text-sm">
        <thead>
          <tr className="bg-neutral-100">
            <th className="border border-black px-2 py-1.5 w-14">시간</th>
            <th className="border border-black px-2 py-1.5">항목</th>
            <th className="border border-black px-2 py-1.5 w-16">결제</th>
            <th className="border border-black px-2 py-1.5 w-28 text-right">
              금액
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="border border-black px-2 py-4 text-center text-neutral-500"
              >
                등록된 매출 없음
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td className="border border-black px-2 py-1 font-mono text-xs tabular-nums">
                  {r.time}
                </td>
                <td className="border border-black px-2 py-1">
                  {r.itemSummary}
                  {r.memo ? (
                    <span className="text-neutral-500"> · {r.memo}</span>
                  ) : null}
                </td>
                <td className="border border-black px-2 py-1">{r.paymentLabel}</td>
                <td className="border border-black px-2 py-1 text-right font-mono tabular-nums">
                  {formatWon(r.total)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}
