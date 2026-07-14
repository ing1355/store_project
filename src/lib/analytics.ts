import type { PaymentMethod, Sale } from '@/lib/store'
import { monthKeyOf, yearOf } from '@/lib/format'

export interface Totals {
  revenue: number
  count: number // transaction count
  units: number // item quantity sold
}

const emptyTotals = (): Totals => ({ revenue: 0, count: 0, units: 0 })

export function sumSales(sales: Sale[]): Totals {
  const t = emptyTotals()
  for (const s of sales) {
    t.revenue += s.total
    t.count += 1
    t.units += s.items.reduce((a, i) => a + i.qty, 0)
  }
  return t
}

export function salesOnDate(sales: Sale[], dateKey: string): Sale[] {
  return sales.filter((s) => s.date === dateKey)
}

export function salesInMonth(sales: Sale[], monthKey: string): Sale[] {
  return sales.filter((s) => monthKeyOf(s.date) === monthKey)
}

export function salesInYear(sales: Sale[], year: string): Sale[] {
  return sales.filter((s) => yearOf(s.date) === year)
}

/** Payment method breakdown for a set of sales. */
export function paymentBreakdown(
  sales: Sale[],
): Record<PaymentMethod, { revenue: number; count: number }> {
  const out = {
    cash: { revenue: 0, count: 0 },
    card: { revenue: 0, count: 0 },
    point: { revenue: 0, count: 0 },
    credit: { revenue: 0, count: 0 },
    etc: { revenue: 0, count: 0 },
  } as Record<PaymentMethod, { revenue: number; count: number }>
  for (const s of sales) {
    out[s.paymentMethod].revenue += s.total
    out[s.paymentMethod].count += 1
  }
  return out
}

export interface MenuRank {
  menuId: string
  name: string
  units: number
  revenue: number
}

/** Rank menus by units sold (desc). */
export function popularMenus(sales: Sale[]): MenuRank[] {
  const map = new Map<string, MenuRank>()
  for (const s of sales) {
    for (const line of s.items) {
      const cur =
        map.get(line.menuId) ??
        { menuId: line.menuId, name: line.name, units: 0, revenue: 0 }
      cur.units += line.qty
      cur.revenue += line.qty * line.price
      map.set(line.menuId, cur)
    }
  }
  return [...map.values()].sort((a, b) => b.units - a.units)
}

/** Daily revenue series for a given month key (YYYY-MM). */
export function dailySeries(
  sales: Sale[],
  monthKey: string,
): { label: string; day: number; revenue: number }[] {
  const [y, m] = monthKey.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const series = Array.from({ length: daysInMonth }, (_, i) => ({
    label: `${i + 1}`,
    day: i + 1,
    revenue: 0,
  }))
  for (const s of salesInMonth(sales, monthKey)) {
    const day = Number(s.date.slice(8, 10))
    series[day - 1].revenue += s.total
  }
  return series
}

/** Monthly revenue series (12 months) for a given year. */
export function monthlySeries(
  sales: Sale[],
  year: string,
): { label: string; month: number; revenue: number }[] {
  const series = Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}월`,
    month: i + 1,
    revenue: 0,
  }))
  for (const s of salesInYear(sales, year)) {
    const month = Number(s.date.slice(5, 7))
    series[month - 1].revenue += s.total
  }
  return series
}

/** Yearly revenue series across all years present in the data. */
export function yearlySeries(
  sales: Sale[],
): { label: string; year: string; revenue: number }[] {
  const map = new Map<string, number>()
  for (const s of sales) {
    const y = yearOf(s.date)
    map.set(y, (map.get(y) ?? 0) + s.total)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, revenue]) => ({ label: `${year}년`, year, revenue }))
}

export function availableYears(sales: Sale[]): string[] {
  const set = new Set(sales.map((s) => yearOf(s.date)))
  return [...set].sort((a, b) => b.localeCompare(a))
}

export function availableMonths(sales: Sale[], year: string): string[] {
  const set = new Set(
    salesInYear(sales, year).map((s) => monthKeyOf(s.date)),
  )
  return [...set].sort((a, b) => b.localeCompare(a))
}
