import { getSupabase } from '@/lib/supabase'
import type { AppSettings, MenuCategory } from '@/lib/domain'
import { DEFAULT_APP_SETTINGS } from '@/lib/domain'

interface SettingsRow {
  id: number
  low_stock_threshold: number
  meta?: Record<string, unknown> | null
}

interface CategoryRow {
  id: string
  name: string
  sort_order: number
}

function sb() {
  const client = getSupabase()
  if (!client) throw new Error('데이터베이스가 설정되지 않았습니다.')
  return client
}

function metaString(
  meta: Record<string, unknown> | null | undefined,
  key: string,
  fallback: string,
): string {
  const v = meta?.[key]
  return typeof v === 'string' && v.trim() ? v.trim() : fallback
}

export function settingsFromRow(row: SettingsRow): AppSettings {
  const meta = row.meta ?? {}
  return {
    lowStockThreshold: row.low_stock_threshold,
    storeName: metaString(meta, 'storeName', DEFAULT_APP_SETTINGS.storeName),
    approverLeft: metaString(
      meta,
      'approverLeft',
      DEFAULT_APP_SETTINGS.approverLeft,
    ),
    approverRight: metaString(
      meta,
      'approverRight',
      DEFAULT_APP_SETTINGS.approverRight,
    ),
  }
}

export function categoryFromRow(row: CategoryRow): MenuCategory {
  return { id: row.id, name: row.name, sortOrder: row.sort_order }
}

export async function fetchSettings(): Promise<AppSettings> {
  const { data, error } = await sb()
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw error
  if (!data) return { ...DEFAULT_APP_SETTINGS }
  return settingsFromRow(data as SettingsRow)
}

export async function updateSettingsRow(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const current = await fetchSettings()
  const next: AppSettings = { ...current, ...patch }

  const row: {
    low_stock_threshold?: number
    meta?: Record<string, string>
  } = {}

  if (patch.lowStockThreshold !== undefined) {
    row.low_stock_threshold = patch.lowStockThreshold
  }

  if (
    patch.storeName !== undefined ||
    patch.approverLeft !== undefined ||
    patch.approverRight !== undefined
  ) {
    row.meta = {
      storeName: next.storeName,
      approverLeft: next.approverLeft,
      approverRight: next.approverRight,
    }
  }

  const { data, error } = await sb()
    .from('app_settings')
    .update(row)
    .eq('id', 1)
    .select('*')
    .single()
  if (error) throw error
  return settingsFromRow(data as SettingsRow)
}

export async function fetchCategories(): Promise<MenuCategory[]> {
  const { data, error } = await sb()
    .from('menu_categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return ((data ?? []) as CategoryRow[]).map(categoryFromRow)
}

export async function insertCategory(
  name: string,
  sortOrder: number,
): Promise<MenuCategory> {
  const { data, error } = await sb()
    .from('menu_categories')
    .insert({ name: name.trim(), sort_order: sortOrder, meta: {} })
    .select('*')
    .single()
  if (error) throw error
  return categoryFromRow(data as CategoryRow)
}

export async function updateCategoryRow(
  id: string,
  patch: { name?: string; sortOrder?: number },
): Promise<MenuCategory> {
  const row: Partial<CategoryRow> = {}
  if (patch.name !== undefined) row.name = patch.name.trim()
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
  const { data, error } = await sb()
    .from('menu_categories')
    .update(row)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return categoryFromRow(data as CategoryRow)
}

export async function deleteCategoryRow(id: string): Promise<void> {
  const { error } = await sb().from('menu_categories').delete().eq('id', id)
  if (error) throw error
}

export async function renameCategoryOnMenus(
  oldName: string,
  newName: string,
): Promise<void> {
  const { error } = await sb()
    .from('menus')
    .update({ category: newName })
    .eq('category', oldName)
  if (error) throw error
}
