export type PaymentMethod = 'cash' | 'card' | 'point' | 'credit' | 'etc'

export const PAYMENT_METHODS: {
  value: PaymentMethod
  label: string
  color: string
}[] = [
  { value: 'cash', label: '현금', color: 'var(--chart-1)' },
  { value: 'card', label: '카드', color: 'var(--chart-2)' },
  { value: 'point', label: '포인트', color: 'var(--chart-3)' },
  { value: 'credit', label: '외상', color: 'var(--chart-5)' },
  { value: 'etc', label: '기타', color: 'var(--chart-4)' },
]

export function paymentLabel(method: PaymentMethod): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method
}

export const DEFAULT_MENU_CATEGORIES = [
  '고기류',
  '식사류',
  '주류',
  '음료',
  '안주류',
  '기타',
] as const

/** @deprecated use store.categories — kept for local seed defaults */
export const MENU_CATEGORIES = DEFAULT_MENU_CATEGORIES

export interface MenuCategory {
  id: string
  name: string
  sortOrder: number
}

export interface AppSettings {
  lowStockThreshold: number
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  lowStockThreshold: 10,
}

export interface MenuItem {
  id: string
  code: string
  category: string
  name: string
  price: number
  cost: number
  initialStock: number
  safetyStock: number
}

export interface SaleLine {
  menuId: string
  name: string
  price: number
  qty: number
}

export interface Sale {
  id: string
  date: string
  time: string
  items: SaleLine[]
  paymentMethod: PaymentMethod
  total: number
  memo?: string
}

export interface StockMovement {
  id: string
  date: string
  menuId: string
  type: 'in' | 'out'
  qty: number
  memo?: string
  saleId?: string
  manual?: boolean
}
