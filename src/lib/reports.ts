import {
  MATERIAL_EXPENSE_CATEGORY,
  paymentLabel,
  specialIncomeLabel,
  type AppSettings,
  type Expense,
  type MenuItem,
  type Sale,
  type SpecialIncome,
} from '@/lib/domain'
import {
  expenseByCategory,
  paymentBreakdown,
  popularMenus,
  sumAmounts,
  sumSales,
} from '@/lib/analytics'
import { formatFullDate, formatWon } from '@/lib/format'

export const MATERIAL_CATEGORY = MATERIAL_EXPENSE_CATEGORY

/** YYYY-MM-DD — PostgREST date may include time */
export function normalizeDateKey(value: string): string {
  return value.slice(0, 10)
}

export interface ReportPeriod {
  label: string
  startDate: string
  endDate: string
  dates: string[]
}

export interface ExpenseLine {
  category: string
  description: string
  vendor: string
  amount: number
  date: string
}

export interface SaleTxnRow {
  id: string
  date: string
  time: string
  paymentLabel: string
  itemSummary: string
  total: number
  memo?: string
}

export interface CogsMenuRow {
  menuId: string
  name: string
  units: number
  unitCost: number
  cogs: number
  revenue: number
}

export interface PeriodSettlement {
  period: ReportPeriod
  settings: Pick<AppSettings, 'storeName' | 'approverLeft' | 'approverRight'>
  salesRevenue: number
  specialIncomeTotal: number
  totalIncome: number
  /** 판매분 원가 Σ(qty × menu.cost) — 실제 매출 기반 */
  materialTotal: number
  /** 물품구입 지출 합계 */
  purchaseTotal: number
  opexTotal: number
  /** materialTotal + opexTotal (매출원가 + 경상비) */
  expenseTotal: number
  net: number
  profitRate: number | null
  materialLines: ExpenseLine[]
  purchaseLines: ExpenseLine[]
  opexLines: ExpenseLine[]
  allExpenseLines: ExpenseLine[]
  expenseByCategory: { category: string; amount: number; count: number }[]
  menuTotals: { menuId: string; name: string; units: number; revenue: number }[]
  cogsByMenu: CogsMenuRow[]
  estimatedCogs: number
  payment: ReturnType<typeof paymentBreakdown>
  specialByType: { type: string; label: string; amount: number; count: number }[]
  saleTxns: SaleTxnRow[]
  saleCount: number
  hasAnyData: boolean
}

function dateSet(dates: string[]): Set<string> {
  return new Set(dates.map(normalizeDateKey))
}

function toExpenseLine(e: Expense): ExpenseLine {
  return {
    category: e.category,
    description: e.description,
    vendor: e.vendor?.trim() || '',
    amount: e.amount,
    date: normalizeDateKey(e.date),
  }
}

function isPurchaseExpense(e: Expense): boolean {
  return e.category === MATERIAL_CATEGORY
}

export function buildPeriodDates(
  dates: string[],
  label: string,
): ReportPeriod {
  const sorted = [...new Set(dates.map(normalizeDateKey))].sort()
  return {
    label,
    startDate: sorted[0] ?? '',
    endDate: sorted.at(-1) ?? '',
    dates: sorted,
  }
}

export function estimatedCogsFromSales(
  sales: Sale[],
  menus: MenuItem[],
): number {
  return cogsRowsFromSales(sales, menus).reduce((s, r) => s + r.cogs, 0)
}

export function cogsRowsFromSales(
  sales: Sale[],
  menus: MenuItem[],
): CogsMenuRow[] {
  const costById = new Map(menus.map((m) => [m.id, m]))
  const map = new Map<string, CogsMenuRow>()
  for (const s of sales) {
    for (const line of s.items) {
      const menu = costById.get(line.menuId)
      const unitCost = menu?.cost ?? 0
      const cur =
        map.get(line.menuId) ??
        {
          menuId: line.menuId,
          name: line.name,
          units: 0,
          unitCost,
          cogs: 0,
          revenue: 0,
        }
      cur.units += line.qty
      cur.cogs += unitCost * line.qty
      cur.revenue += line.price * line.qty
      if (menu) cur.unitCost = menu.cost
      map.set(line.menuId, cur)
    }
  }
  return [...map.values()].sort((a, b) => b.cogs - a.cogs)
}

function saleTxnRows(sales: Sale[]): SaleTxnRow[] {
  return [...sales]
    .sort((a, b) => {
      const d = normalizeDateKey(b.date).localeCompare(normalizeDateKey(a.date))
      if (d !== 0) return d
      return b.time.localeCompare(a.time)
    })
    .map((s) => ({
      id: s.id,
      date: normalizeDateKey(s.date),
      time: s.time,
      paymentLabel: paymentLabel(s.paymentMethod),
      itemSummary:
        s.items.length === 0
          ? '—'
          : s.items.length === 1
            ? `${s.items[0].name} × ${s.items[0].qty}`
            : `${s.items[0].name} 외 ${s.items.length - 1}건`,
      total: s.total,
      memo: s.memo,
    }))
}

export function buildPeriodSettlement(args: {
  period: ReportPeriod
  settings: AppSettings
  sales: Sale[]
  expenses: Expense[]
  specialIncomes: SpecialIncome[]
  menus: MenuItem[]
}): PeriodSettlement {
  const { period, settings, menus } = args
  const dates = dateSet(period.dates)

  const sales = args.sales.filter((s) => dates.has(normalizeDateKey(s.date)))
  const expenses = args.expenses.filter((e) =>
    dates.has(normalizeDateKey(e.date)),
  )
  const specialIncomes = args.specialIncomes.filter((i) =>
    dates.has(normalizeDateKey(i.date)),
  )

  const salesRevenue = sumSales(sales).revenue
  const specialIncomeTotal = sumAmounts(specialIncomes)
  const totalIncome = salesRevenue + specialIncomeTotal

  const purchases = expenses.filter(isPurchaseExpense)
  const opex = expenses.filter((e) => !isPurchaseExpense(e))
  const purchaseTotal = sumAmounts(purchases)
  const opexTotal = sumAmounts(opex)

  const cogsByMenu = cogsRowsFromSales(sales, menus)
  const estimatedCogs = cogsByMenu.reduce((s, r) => s + r.cogs, 0)
  // 결산 요약의 원재료비 = 실제 판매분 원가 (메뉴 원가 × 판매수량)
  const materialTotal = estimatedCogs
  const expenseTotal = materialTotal + opexTotal
  const net = totalIncome - expenseTotal
  const profitRate = totalIncome > 0 ? (net / totalIncome) * 100 : null

  const typeMap = new Map<string, { amount: number; count: number }>()
  for (const i of specialIncomes) {
    const cur = typeMap.get(i.type) ?? { amount: 0, count: 0 }
    cur.amount += i.amount
    cur.count += 1
    typeMap.set(i.type, cur)
  }

  return {
    period,
    settings: {
      storeName: settings.storeName,
      approverLeft: settings.approverLeft,
      approverRight: settings.approverRight,
    },
    salesRevenue,
    specialIncomeTotal,
    totalIncome,
    materialTotal,
    purchaseTotal,
    opexTotal,
    expenseTotal,
    net,
    profitRate,
    materialLines: purchases.map(toExpenseLine),
    purchaseLines: purchases.map(toExpenseLine),
    opexLines: opex.map(toExpenseLine),
    allExpenseLines: expenses.map(toExpenseLine),
    expenseByCategory: expenseByCategory(expenses),
    menuTotals: popularMenus(sales),
    cogsByMenu,
    estimatedCogs,
    payment: paymentBreakdown(sales),
    specialByType: [...typeMap.entries()].map(([type, v]) => ({
      type,
      label: specialIncomeLabel(type as SpecialIncome['type']),
      amount: v.amount,
      count: v.count,
    })),
    saleTxns: saleTxnRows(sales),
    saleCount: sales.length,
    hasAnyData:
      sales.length > 0 || expenses.length > 0 || specialIncomes.length > 0,
  }
}

/** 매출·지출·특이수입이 있는 최근 날짜 (없으면 null) */
export function latestActivityDate(
  sales: Sale[],
  expenses: Expense[],
  specialIncomes: SpecialIncome[],
): string | null {
  let max = ''
  for (const s of sales) {
    const d = normalizeDateKey(s.date)
    if (d > max) max = d
  }
  for (const e of expenses) {
    const d = normalizeDateKey(e.date)
    if (d > max) max = d
  }
  for (const i of specialIncomes) {
    const d = normalizeDateKey(i.date)
    if (d > max) max = d
  }
  return max || null
}

export function formatPeriodRange(period: ReportPeriod): string {
  if (!period.startDate) return period.label
  if (period.startDate === period.endDate) {
    return formatFullDate(period.startDate)
  }
  return `${formatFullDate(period.startDate)} ~ ${formatFullDate(period.endDate)}`
}

export function formatWonOrBlank(n: number): string {
  if (!n) return ''
  return formatWon(n)
}

export function formatProfitRate(rate: number | null): string {
  if (rate == null) return '—'
  return `${rate.toFixed(1)}%`
}
