import { toDateKey } from '@/lib/format'

export interface StockMenuRef {
  id: string
  initialStock: number
}

export interface StockMovementRef {
  menuId: string
  date: string
  type: 'in' | 'out'
  qty: number
}

export interface DayStockRow {
  menuId: string
  prevStock: number
  inbound: number
  outbound: number
  stock: number
}

function addDays(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d + delta)
  return toDateKey(date)
}

export function sumMovements(
  movements: StockMovementRef[],
  menuId: string,
  type: 'in' | 'out',
  opts?: { onOrBefore?: string; onDate?: string },
): number {
  let total = 0
  for (const mv of movements) {
    if (mv.menuId !== menuId || mv.type !== type) continue
    if (opts?.onDate && mv.date !== opts.onDate) continue
    if (opts?.onOrBefore && mv.date > opts.onOrBefore) continue
    total += mv.qty
  }
  return total
}

/** 해당일 종료 시점 잔량 = 기초재고 + 누적입고 − 누적출고 (당일 포함) */
export function getStockAt(
  menu: StockMenuRef,
  movements: StockMovementRef[],
  dateKey: string,
): number {
  const inbound = sumMovements(movements, menu.id, 'in', {
    onOrBefore: dateKey,
  })
  const outbound = sumMovements(movements, menu.id, 'out', {
    onOrBefore: dateKey,
  })
  return menu.initialStock + inbound - outbound
}

/** 전일 종료 잔량 */
export function getPrevStock(
  menu: StockMenuRef,
  movements: StockMovementRef[],
  dateKey: string,
): number {
  return getStockAt(menu, movements, addDays(dateKey, -1))
}

export function getDayInbound(
  movements: StockMovementRef[],
  menuId: string,
  dateKey: string,
): number {
  return sumMovements(movements, menuId, 'in', { onDate: dateKey })
}

export function getDayOutbound(
  movements: StockMovementRef[],
  menuId: string,
  dateKey: string,
): number {
  return sumMovements(movements, menuId, 'out', { onDate: dateKey })
}

/** 날짜별 메뉴 입·출고·잔량 요약 */
export function getDayStockRows(
  menus: StockMenuRef[],
  movements: StockMovementRef[],
  dateKey: string,
): DayStockRow[] {
  return menus.map((menu) => {
    const inbound = getDayInbound(movements, menu.id, dateKey)
    const outbound = getDayOutbound(movements, menu.id, dateKey)
    const prevStock = getPrevStock(menu, movements, dateKey)
    return {
      menuId: menu.id,
      prevStock,
      inbound,
      outbound,
      stock: prevStock + inbound - outbound,
    }
  })
}

export type StockStatus = 'out' | 'low' | 'ok'

export function stockStatus(
  stock: number,
  safetyStock: number,
): StockStatus {
  if (stock <= 0) return 'out'
  if (stock <= safetyStock) return 'low'
  return 'ok'
}
