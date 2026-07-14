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

/* ------------------------------------------------------------------ */
/* Settlement helpers (expenses / special incomes)                    */
/* ------------------------------------------------------------------ */

export function expensesOnDate<T extends { date: string }>(
  expenses: T[],
  dateKey: string,
): T[] {
  return expenses.filter((e) => e.date === dateKey)
}

export function expensesInMonth<T extends { date: string }>(
  expenses: T[],
  monthKey: string,
): T[] {
  return expenses.filter((e) => monthKeyOf(e.date) === monthKey)
}

export function sumAmounts(rows: { amount: number }[]): number {
  return rows.reduce((s, r) => s + r.amount, 0)
}

export function specialIncomesInMonth<T extends { date: string }>(
  incomes: T[],
  monthKey: string,
): T[] {
  return incomes.filter((i) => monthKeyOf(i.date) === monthKey)
}

/** Week of month: day 1–7 → 1, 8–14 → 2, …, 29–31 → 5 */
export function weekOfMonth(dateKey: string): number {
  const day = Number(dateKey.slice(8, 10))
  return Math.min(5, Math.ceil(day / 7))
}

export function datesInWeekOfMonth(
  monthKey: string,
  week: number,
): string[] {
  const [y, m] = monthKey.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const start = (week - 1) * 7 + 1
  const end = Math.min(week * 7, daysInMonth)
  if (start > daysInMonth) return []
  const out: string[] = []
  for (let d = start; d <= end; d++) {
    out.push(`${monthKey}-${String(d).padStart(2, '0')}`)
  }
  return out
}

export function inDateSet(
  dateKey: string,
  dates: string[],
): boolean {
  return dates.includes(dateKey)
}

export interface CategoryTotal {
  category: string
  amount: number
  count: number
}

export function expenseByCategory(
  expenses: { category: string; amount: number }[],
): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>()
  for (const e of expenses) {
    const key = e.category || '미분류'
    const cur = map.get(key) ?? { category: key, amount: 0, count: 0 }
    cur.amount += e.amount
    cur.count += 1
    map.set(key, cur)
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount)
}

export function specialIncomeByType(
  incomes: { type: string; amount: number }[],
): { type: string; amount: number; count: number }[] {
  const map = new Map<string, { type: string; amount: number; count: number }>()
  for (const i of incomes) {
    const cur = map.get(i.type) ?? { type: i.type, amount: 0, count: 0 }
    cur.amount += i.amount
    cur.count += 1
    map.set(i.type, cur)
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount)
}
