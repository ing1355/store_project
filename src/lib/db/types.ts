import type {
  MenuItem,
  PaymentMethod,
  Sale,
  SaleLine,
  StockMovement,
} from '@/lib/domain'

/* ------------------------------------------------------------------ */
/* DB row shapes (snake_case JSON from PostgREST)                     */
/* ------------------------------------------------------------------ */

export interface MenuRow {
  id: string
  code: string
  category: string
  name: string
  price: number
  cost: number
  initial_stock: number
  safety_stock: number
  meta?: Record<string, unknown>
}

export interface SaleItemJson {
  menu_id: string
  name: string
  price: number
  qty: number
}

export interface SaleRow {
  id: string
  sale_date: string
  sale_time: string
  payment_method: PaymentMethod
  total: number
  memo: string | null
  items: SaleItemJson[]
  meta?: Record<string, unknown>
}

export interface StockMovementRow {
  id: string
  movement_date: string
  menu_id: string
  type: 'in' | 'out'
  qty: number
  memo: string | null
  sale_id: string | null
  manual: boolean
  meta?: Record<string, unknown>
}

/* ------------------------------------------------------------------ */
/* Mappers                                                            */
/* ------------------------------------------------------------------ */

export function menuFromRow(row: MenuRow): MenuItem {
  return {
    id: row.id,
    code: row.code,
    category: row.category,
    name: row.name,
    price: row.price,
    cost: row.cost,
    initialStock: row.initial_stock,
    safetyStock: row.safety_stock,
  }
}

export function menuToInsert(menu: Omit<MenuItem, 'id'>): Omit<MenuRow, 'id'> {
  return {
    code: menu.code,
    category: menu.category,
    name: menu.name,
    price: menu.price,
    cost: menu.cost,
    initial_stock: menu.initialStock,
    safety_stock: menu.safetyStock,
    meta: {},
  }
}

export function menuToPatch(
  patch: Partial<Omit<MenuItem, 'id'>>,
): Partial<MenuRow> {
  const row: Partial<MenuRow> = {}
  if (patch.code !== undefined) row.code = patch.code
  if (patch.category !== undefined) row.category = patch.category
  if (patch.name !== undefined) row.name = patch.name
  if (patch.price !== undefined) row.price = patch.price
  if (patch.cost !== undefined) row.cost = patch.cost
  if (patch.initialStock !== undefined) row.initial_stock = patch.initialStock
  if (patch.safetyStock !== undefined) row.safety_stock = patch.safetyStock
  return row
}

export function saleLineToJson(line: SaleLine): SaleItemJson {
  return {
    menu_id: line.menuId,
    name: line.name,
    price: line.price,
    qty: line.qty,
  }
}

export function saleLineFromJson(item: SaleItemJson): SaleLine {
  return {
    menuId: item.menu_id,
    name: item.name,
    price: item.price,
    qty: item.qty,
  }
}

export function saleFromRow(row: SaleRow): Sale {
  const items = Array.isArray(row.items) ? row.items : []
  return {
    id: row.id,
    date: row.sale_date,
    time: row.sale_time,
    paymentMethod: row.payment_method,
    total: row.total,
    memo: row.memo ?? undefined,
    items: items.map(saleLineFromJson),
  }
}

export function saleToInsert(sale: Omit<Sale, 'id'>): Omit<SaleRow, 'id'> {
  return {
    sale_date: sale.date,
    sale_time: sale.time,
    payment_method: sale.paymentMethod,
    total: sale.total,
    memo: sale.memo ?? null,
    items: sale.items.map(saleLineToJson),
    meta: {},
  }
}

export function movementFromRow(row: StockMovementRow): StockMovement {
  return {
    id: row.id,
    date: row.movement_date,
    menuId: row.menu_id,
    type: row.type,
    qty: row.qty,
    memo: row.memo ?? undefined,
    saleId: row.sale_id ?? undefined,
    manual: row.manual || undefined,
  }
}

export function movementToInsert(
  mv: Omit<StockMovement, 'id'>,
): Omit<StockMovementRow, 'id'> {
  return {
    movement_date: mv.date,
    menu_id: mv.menuId,
    type: mv.type,
    qty: mv.qty,
    memo: mv.memo ?? null,
    sale_id: mv.saleId ?? null,
    manual: Boolean(mv.manual),
    meta: {},
  }
}
