import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import { toDateKey } from '@/lib/format'
import {
  getDayStockRows,
  getStockAt,
  type DayStockRow,
} from '@/lib/stock'
import { isSupabaseConfigured } from '@/lib/supabase'
import {
  deleteMenuRow,
  fetchMenus,
  insertMenu,
  updateMenuRow,
} from '@/lib/db/menus'
import { deleteSaleRow, fetchSales, insertSale } from '@/lib/db/sales'
import {
  fetchMovements,
  upsertInboundRow,
  upsertManualOutboundRow,
} from '@/lib/db/movements'
import {
  deleteCategoryRow,
  fetchCategories,
  fetchSettings,
  insertCategory,
  renameCategoryOnMenus,
  updateCategoryRow,
  updateSettingsRow,
} from '@/lib/db/settings'
import type {
  AppSettings,
  MenuCategory,
  MenuItem,
  PaymentMethod,
  Sale,
  SaleLine,
  StockMovement,
} from '@/lib/domain'
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_MENU_CATEGORIES,
} from '@/lib/domain'

export type {
  AppSettings,
  MenuCategory,
  MenuItem,
  PaymentMethod,
  Sale,
  SaleLine,
  StockMovement,
} from '@/lib/domain'
export {
  DEFAULT_APP_SETTINGS,
  DEFAULT_MENU_CATEGORIES,
  MENU_CATEGORIES,
  PAYMENT_METHODS,
  paymentLabel,
} from '@/lib/domain'

/* ------------------------------------------------------------------ */
/* Local seed (used when Supabase env is missing)                     */
/* ------------------------------------------------------------------ */

const SEED_MENUS: Omit<MenuItem, 'id'>[] = [
  { code: '00001', category: '고기류', name: '삼겹살', price: 12000, cost: 7000, initialStock: 80, safetyStock: 15 },
  { code: '00002', category: '고기류', name: '목살', price: 13000, cost: 7500, initialStock: 60, safetyStock: 12 },
  { code: '00003', category: '고기류', name: '항정살', price: 15000, cost: 9000, initialStock: 40, safetyStock: 8 },
  { code: '00018', category: '식사류', name: '공기밥', price: 1000, cost: 300, initialStock: 200, safetyStock: 40 },
  { code: '00019', category: '식사류', name: '된장찌개', price: 3000, cost: 1200, initialStock: 50, safetyStock: 10 },
  { code: '00020', category: '식사류', name: '김치찌개', price: 3500, cost: 1400, initialStock: 50, safetyStock: 10 },
  { code: '00025', category: '식사류', name: '볶음밥', price: 5000, cost: 2000, initialStock: 45, safetyStock: 10 },
  { code: '00026', category: '식사류', name: '라면', price: 3500, cost: 1000, initialStock: 80, safetyStock: 15 },
  { code: '00032', category: '주류', name: '맥주', price: 4000, cost: 1800, initialStock: 120, safetyStock: 24 },
  { code: '00033', category: '주류', name: '소주', price: 4000, cost: 2000, initialStock: 150, safetyStock: 30 },
  { code: '00034', category: '주류', name: '청하', price: 4500, cost: 2200, initialStock: 40, safetyStock: 8 },
  { code: '00040', category: '음료', name: '콜라', price: 2000, cost: 800, initialStock: 100, safetyStock: 20 },
  { code: '00041', category: '음료', name: '사이다', price: 2000, cost: 800, initialStock: 100, safetyStock: 20 },
  { code: '00042', category: '음료', name: '이온음료', price: 2000, cost: 900, initialStock: 80, safetyStock: 16 },
  { code: '00050', category: '안주류', name: '감자튀김', price: 5000, cost: 1800, initialStock: 60, safetyStock: 12 },
  { code: '00051', category: '안주류', name: '치킨너겟', price: 6000, cost: 2500, initialStock: 50, safetyStock: 10 },
]

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

function randomPayment(): PaymentMethod {
  const r = Math.random()
  if (r < 0.55) return 'card'
  if (r < 0.78) return 'cash'
  if (r < 0.88) return 'point'
  if (r < 0.94) return 'etc'
  return 'credit'
}

function pickWeightedMenu(menus: MenuItem[]): MenuItem {
  const weighted: MenuItem[] = []
  for (const m of menus) {
    let w = 1
    if (m.category === '음료' || m.category === '주류') w = 4
    else if (m.category === '식사류') w = 3
    else if (m.category === '고기류') w = 2
    else w = 1
    for (let i = 0; i < w; i++) weighted.push(m)
  }
  return weighted[Math.floor(Math.random() * weighted.length)]
}

/** 다음 상품코드 제안 */
export function nextMenuCode(menus: MenuItem[]): string {
  let max = 0
  for (const m of menus) {
    const n = Number.parseInt(m.code.replace(/\D/g, ''), 10)
    if (!Number.isNaN(n) && n > max) max = n
  }
  return String(max + 1).padStart(5, '0')
}

function generateSales(menus: MenuItem[]): Sale[] {
  const sales: Sale[] = []
  const today = new Date()
  const start = new Date(today.getFullYear() - 1, 0, 1)

  for (
    let d = new Date(start);
    d <= today;
    d.setDate(d.getDate() + 1)
  ) {
    const dateKey = toDateKey(d)
    const dow = d.getDay()
    const month = d.getMonth()

    let base = 6
    if (dow === 0 || dow === 6) base += 4
    if (dow === 5) base += 2
    if (month >= 5 && month <= 7) base += 3
    if (month === 11 || month === 0) base += 2
    const growth = d.getFullYear() === today.getFullYear() ? 1.15 : 1

    const txCount = Math.max(
      1,
      Math.round((base + (Math.random() * 4 - 2)) * growth),
    )

    for (let t = 0; t < txCount; t++) {
      const lineCount = 1 + Math.floor(Math.random() * 3)
      const items: SaleLine[] = []
      for (let l = 0; l < lineCount; l++) {
        const menu = pickWeightedMenu(menus)
        const existing = items.find((i) => i.menuId === menu.id)
        if (existing) {
          existing.qty += 1
        } else {
          items.push({
            menuId: menu.id,
            name: menu.name,
            price: menu.price,
            qty: 1 + Math.floor(Math.random() * 2),
          })
        }
      }
      const total = items.reduce((s, i) => s + i.price * i.qty, 0)
      const hour = 8 + Math.floor(Math.random() * 13)
      const minute = Math.floor(Math.random() * 60)
      sales.push({
        id: makeId('sale'),
        date: dateKey,
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        items,
        paymentMethod: randomPayment(),
        total,
      })
    }
  }
  return sales
}

function generateStockMovements(
  menus: MenuItem[],
  sales: Sale[],
  days = 30,
): StockMovement[] {
  const movements: StockMovement[] = []
  const today = new Date()
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() - (days - 1))
  const cutoffKey = toDateKey(cutoff)

  for (let i = 0; i < days; i++) {
    const d = new Date(cutoff)
    d.setDate(cutoff.getDate() + i)
    const dateKey = toDateKey(d)
    for (const menu of menus) {
      const base =
        menu.category === '주류' || menu.category === '음료'
          ? 12
          : menu.category === '고기류'
            ? 8
            : 6
      movements.push({
        id: makeId('mv'),
        date: dateKey,
        menuId: menu.id,
        type: 'in',
        qty: base + Math.floor(Math.random() * 10),
        memo: '시드 입고',
      })
    }
  }

  for (const sale of sales) {
    if (sale.date < cutoffKey) continue
    for (const line of sale.items) {
      movements.push({
        id: makeId('mv'),
        date: sale.date,
        menuId: line.menuId,
        type: 'out',
        qty: line.qty,
        saleId: sale.id,
      })
    }
  }

  return movements
}

function defaultLocalCategories(): MenuCategory[] {
  return DEFAULT_MENU_CATEGORIES.map((name, i) => ({
    id: `cat_local_${i}`,
    name,
    sortOrder: i + 1,
  }))
}

function buildLocalState() {
  const menus: MenuItem[] = SEED_MENUS.map((m) => ({ ...m, id: makeId('menu') }))
  const sales = generateSales(menus)
  const movements = generateStockMovements(menus, sales)
  return {
    menus,
    sales,
    movements,
    settings: { ...DEFAULT_APP_SETTINGS },
    categories: defaultLocalCategories(),
  }
}

function movementsFromSale(sale: Sale): StockMovement[] {
  return sale.items.map((line) => ({
    id: makeId('mv'),
    date: sale.date,
    menuId: line.menuId,
    type: 'out' as const,
    qty: line.qty,
    saleId: sale.id,
  }))
}

function dbErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: string }).message)
  }
  return '알 수 없는 오류'
}

/* ------------------------------------------------------------------ */
/* Context                                                            */
/* ------------------------------------------------------------------ */

interface StoreContextValue {
  menus: MenuItem[]
  sales: Sale[]
  movements: StockMovement[]
  settings: AppSettings
  categories: MenuCategory[]
  loading: boolean
  ready: boolean
  usingLocal: boolean
  error: string | null
  refresh: () => Promise<void>
  addMenu: (menu: Omit<MenuItem, 'id'>) => Promise<void>
  updateMenu: (id: string, patch: Partial<Omit<MenuItem, 'id'>>) => Promise<void>
  deleteMenu: (id: string) => Promise<void>
  addSale: (sale: Omit<Sale, 'id'>) => Promise<void>
  deleteSale: (id: string) => Promise<void>
  upsertInbound: (date: string, menuId: string, qty: number) => Promise<void>
  upsertManualOutbound: (
    date: string,
    menuId: string,
    qty: number,
  ) => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
  addCategory: (name: string) => Promise<void>
  renameCategory: (id: string, name: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  getStockAtDate: (menuId: string, date: string) => number
  getDayRows: (date: string) => DayStockRow[]
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({
  children,
  enabled = true,
}: {
  children: ReactNode
  enabled?: boolean
}) {
  const usingLocal = !isSupabaseConfigured()
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    if (usingLocal) {
      const local = buildLocalState()
      setMenus(local.menus)
      setSales(local.sales)
      setMovements(local.movements)
      setSettings(local.settings)
      setCategories(local.categories)
      setError(null)
      setReady(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setReady(false)
    try {
      const [m, s, mv, st, cats] = await Promise.all([
        fetchMenus(),
        fetchSales(),
        fetchMovements(),
        fetchSettings(),
        fetchCategories(),
      ])
      setMenus(m)
      setSales(s)
      setMovements(mv)
      setSettings(st)
      setCategories(cats)
      setError(null)
      setReady(true)
    } catch (err) {
      const msg = dbErrorMessage(err)
      setError(msg)
      toast.error(`DB 로드 실패: ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [usingLocal, enabled])

  useEffect(() => {
    if (!enabled) return
    void refresh()
  }, [refresh, enabled])

  const addMenu = useCallback(
    async (menu: Omit<MenuItem, 'id'>) => {
      const known = categories.map((c) => c.name)
      if (!known.includes(menu.category)) {
        toast.error('관리에 등록된 대분류를 선택하세요.')
        throw new Error('invalid category')
      }
      if (usingLocal) {
        setMenus((prev) => [...prev, { ...menu, id: makeId('menu') }])
        return
      }
      try {
        const saved = await insertMenu(menu)
        setMenus((prev) =>
          [...prev, saved].sort((a, b) =>
            a.code.localeCompare(b.code, 'ko', { numeric: true }),
          ),
        )
      } catch (err) {
        toast.error(`메뉴 추가 실패: ${dbErrorMessage(err)}`)
        throw err
      }
    },
    [usingLocal, categories],
  )

  const updateMenu = useCallback(
    async (id: string, patch: Partial<Omit<MenuItem, 'id'>>) => {
      if (
        patch.category !== undefined &&
        !categories.some((c) => c.name === patch.category)
      ) {
        toast.error('관리에 등록된 대분류를 선택하세요.')
        throw new Error('invalid category')
      }
      if (usingLocal) {
        setMenus((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        )
        return
      }
      try {
        const saved = await updateMenuRow(id, patch)
        setMenus((prev) => prev.map((m) => (m.id === id ? saved : m)))
      } catch (err) {
        toast.error(`메뉴 수정 실패: ${dbErrorMessage(err)}`)
        throw err
      }
    },
    [usingLocal, categories],
  )

  const deleteMenu = useCallback(
    async (id: string) => {
      if (usingLocal) {
        setMenus((prev) => prev.filter((m) => m.id !== id))
        setMovements((prev) => prev.filter((mv) => mv.menuId !== id))
        return
      }
      try {
        await deleteMenuRow(id)
        setMenus((prev) => prev.filter((m) => m.id !== id))
        setMovements((prev) => prev.filter((mv) => mv.menuId !== id))
      } catch (err) {
        toast.error(`메뉴 삭제 실패: ${dbErrorMessage(err)}`)
        throw err
      }
    },
    [usingLocal],
  )

  const addSale = useCallback(
    async (sale: Omit<Sale, 'id'>) => {
      if (usingLocal) {
        const full: Sale = { ...sale, id: makeId('sale') }
        setSales((prev) => [...prev, full])
        setMovements((prev) => [...prev, ...movementsFromSale(full)])
        return
      }
      try {
        const { sale: saved, movements: outs } = await insertSale(sale)
        setSales((prev) => [...prev, saved])
        setMovements((prev) => [...prev, ...outs])
      } catch (err) {
        toast.error(`매출 등록 실패: ${dbErrorMessage(err)}`)
        throw err
      }
    },
    [usingLocal],
  )

  const deleteSale = useCallback(
    async (id: string) => {
      if (usingLocal) {
        setSales((prev) => prev.filter((s) => s.id !== id))
        setMovements((prev) =>
          prev.filter((mv) => !(mv.type === 'out' && mv.saleId === id)),
        )
        return
      }
      try {
        await deleteSaleRow(id)
        setSales((prev) => prev.filter((s) => s.id !== id))
        setMovements((prev) =>
          prev.filter((mv) => !(mv.type === 'out' && mv.saleId === id)),
        )
      } catch (err) {
        toast.error(`거래 삭제 실패: ${dbErrorMessage(err)}`)
        throw err
      }
    },
    [usingLocal],
  )

  const upsertInbound = useCallback(
    async (date: string, menuId: string, qty: number) => {
      if (usingLocal) {
        setMovements((prev) => {
          const without = prev.filter(
            (mv) =>
              !(mv.type === 'in' && mv.date === date && mv.menuId === menuId),
          )
          if (qty <= 0) return without
          return [
            ...without,
            { id: makeId('mv'), date, menuId, type: 'in', qty },
          ]
        })
        return
      }
      try {
        const saved = await upsertInboundRow(date, menuId, qty)
        setMovements((prev) => {
          const without = prev.filter(
            (mv) =>
              !(mv.type === 'in' && mv.date === date && mv.menuId === menuId),
          )
          return saved ? [...without, saved] : without
        })
      } catch (err) {
        toast.error(`입고 반영 실패: ${dbErrorMessage(err)}`)
        throw err
      }
    },
    [usingLocal],
  )

  const upsertManualOutbound = useCallback(
    async (date: string, menuId: string, qty: number) => {
      if (usingLocal) {
        setMovements((prev) => {
          const without = prev.filter(
            (mv) =>
              !(
                mv.type === 'out' &&
                mv.date === date &&
                mv.menuId === menuId &&
                mv.manual
              ),
          )
          if (qty <= 0) return without
          return [
            ...without,
            {
              id: makeId('mv'),
              date,
              menuId,
              type: 'out',
              qty,
              manual: true,
              memo: '수동 보정',
            },
          ]
        })
        return
      }
      try {
        const saved = await upsertManualOutboundRow(date, menuId, qty)
        setMovements((prev) => {
          const without = prev.filter(
            (mv) =>
              !(
                mv.type === 'out' &&
                mv.date === date &&
                mv.menuId === menuId &&
                mv.manual
              ),
          )
          return saved ? [...without, saved] : without
        })
      } catch (err) {
        toast.error(`출고 보정 실패: ${dbErrorMessage(err)}`)
        throw err
      }
    },
    [usingLocal],
  )

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      if (usingLocal) {
        setSettings((prev) => ({ ...prev, ...patch }))
        return
      }
      try {
        const saved = await updateSettingsRow(patch)
        setSettings(saved)
      } catch (err) {
        toast.error(`설정 저장 실패: ${dbErrorMessage(err)}`)
        throw err
      }
    },
    [usingLocal],
  )

  const addCategory = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) {
        toast.error('대분류명을 입력하세요.')
        throw new Error('대분류명을 입력하세요.')
      }
      if (usingLocal) {
        if (categories.some((c) => c.name === trimmed)) {
          toast.error('이미 있는 대분류입니다.')
          throw new Error('이미 있는 대분류입니다.')
        }
        const sortOrder =
          categories.reduce((m, c) => Math.max(m, c.sortOrder), 0) + 1
        setCategories((prev) => [
          ...prev,
          { id: makeId('cat'), name: trimmed, sortOrder },
        ])
        return
      }
      try {
        const sortOrder =
          categories.reduce((m, c) => Math.max(m, c.sortOrder), 0) + 1
        const saved = await insertCategory(trimmed, sortOrder)
        setCategories((prev) => [...prev, saved])
      } catch (err) {
        toast.error(`대분류 추가 실패: ${dbErrorMessage(err)}`)
        throw err
      }
    },
    [usingLocal, categories],
  )

  const renameCategory = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('대분류명을 입력하세요.')
      const current = categories.find((c) => c.id === id)
      if (!current) return

      if (usingLocal) {
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)),
        )
        setMenus((prev) =>
          prev.map((m) =>
            m.category === current.name ? { ...m, category: trimmed } : m,
          ),
        )
        return
      }
      try {
        const saved = await updateCategoryRow(id, { name: trimmed })
        if (current.name !== trimmed) {
          await renameCategoryOnMenus(current.name, trimmed)
        }
        setCategories((prev) => prev.map((c) => (c.id === id ? saved : c)))
        setMenus((prev) =>
          prev.map((m) =>
            m.category === current.name ? { ...m, category: trimmed } : m,
          ),
        )
      } catch (err) {
        toast.error(`대분류 수정 실패: ${dbErrorMessage(err)}`)
        throw err
      }
    },
    [usingLocal, categories],
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      if (usingLocal) {
        setCategories((prev) => prev.filter((c) => c.id !== id))
        return
      }
      try {
        await deleteCategoryRow(id)
        setCategories((prev) => prev.filter((c) => c.id !== id))
      } catch (err) {
        toast.error(`대분류 삭제 실패: ${dbErrorMessage(err)}`)
        throw err
      }
    },
    [usingLocal],
  )

  const getStockAtDate = useCallback(
    (menuId: string, date: string) => {
      const menu = menus.find((m) => m.id === menuId)
      if (!menu) return 0
      return getStockAt(menu, movements, date)
    },
    [menus, movements],
  )

  const getDayRows = useCallback(
    (date: string) => getDayStockRows(menus, movements, date),
    [menus, movements],
  )

  const value = useMemo<StoreContextValue>(
    () => ({
      menus,
      sales,
      movements,
      settings,
      categories,
      loading,
      ready,
      usingLocal,
      error,
      refresh,
      addMenu,
      updateMenu,
      deleteMenu,
      addSale,
      deleteSale,
      upsertInbound,
      upsertManualOutbound,
      updateSettings,
      addCategory,
      renameCategory,
      deleteCategory,
      getStockAtDate,
      getDayRows,
    }),
    [
      menus,
      sales,
      movements,
      settings,
      categories,
      loading,
      ready,
      usingLocal,
      error,
      refresh,
      addMenu,
      updateMenu,
      deleteMenu,
      addSale,
      deleteSale,
      upsertInbound,
      upsertManualOutbound,
      updateSettings,
      addCategory,
      renameCategory,
      deleteCategory,
      getStockAtDate,
      getDayRows,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
