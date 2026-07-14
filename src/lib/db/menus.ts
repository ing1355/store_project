import { getSupabase } from '@/lib/supabase'
import {
  menuFromRow,
  menuToInsert,
  menuToPatch,
  type MenuRow,
} from '@/lib/db/types'
import type { MenuItem } from '@/lib/domain'

function sb() {
  const client = getSupabase()
  if (!client) throw new Error('데이터베이스가 설정되지 않았습니다.')
  return client
}

export async function fetchMenus(): Promise<MenuItem[]> {
  const { data, error } = await sb()
    .from('menus')
    .select('*')
    .order('code', { ascending: true })
  if (error) throw error
  return ((data ?? []) as MenuRow[]).map(menuFromRow)
}

export async function insertMenu(
  menu: Omit<MenuItem, 'id'>,
): Promise<MenuItem> {
  const { data, error } = await sb()
    .from('menus')
    .insert(menuToInsert(menu))
    .select('*')
    .single()
  if (error) throw error
  return menuFromRow(data as MenuRow)
}

export async function updateMenuRow(
  id: string,
  patch: Partial<Omit<MenuItem, 'id'>>,
): Promise<MenuItem> {
  const { data, error } = await sb()
    .from('menus')
    .update(menuToPatch(patch))
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return menuFromRow(data as MenuRow)
}

export async function deleteMenuRow(id: string): Promise<void> {
  const { error } = await sb().from('menus').delete().eq('id', id)
  if (error) throw error
}
