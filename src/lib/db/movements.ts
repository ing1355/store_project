import { getSupabase } from '@/lib/supabase'
import {
  movementFromRow,
  movementToInsert,
  type StockMovementRow,
} from '@/lib/db/types'
import type { StockMovement } from '@/lib/domain'

function sb() {
  const client = getSupabase()
  if (!client) throw new Error('데이터베이스가 설정되지 않았습니다.')
  return client
}

export async function fetchMovements(): Promise<StockMovement[]> {
  const { data, error } = await sb()
    .from('stock_movements')
    .select('*')
    .order('movement_date', { ascending: false })
  if (error) throw error
  return ((data ?? []) as StockMovementRow[]).map(movementFromRow)
}

/** 해당일 입고량 설정(덮어쓰기). qty<=0 이면 삭제 */
export async function upsertInboundRow(
  date: string,
  menuId: string,
  qty: number,
): Promise<StockMovement | null> {
  const client = sb()
  const { error: delError } = await client
    .from('stock_movements')
    .delete()
    .eq('movement_date', date)
    .eq('menu_id', menuId)
    .eq('type', 'in')
    .eq('manual', false)
  if (delError) throw delError

  if (qty <= 0) return null

  const { data, error } = await client
    .from('stock_movements')
    .insert(
      movementToInsert({
        date,
        menuId,
        type: 'in',
        qty,
      }),
    )
    .select('*')
    .single()
  if (error) throw error
  return movementFromRow(data as StockMovementRow)
}

/** 해당일 수동 출고 보정. qty<=0 이면 삭제 */
export async function upsertManualOutboundRow(
  date: string,
  menuId: string,
  qty: number,
): Promise<StockMovement | null> {
  const client = sb()
  const { error: delError } = await client
    .from('stock_movements')
    .delete()
    .eq('movement_date', date)
    .eq('menu_id', menuId)
    .eq('type', 'out')
    .eq('manual', true)
  if (delError) throw delError

  if (qty <= 0) return null

  const { data, error } = await client
    .from('stock_movements')
    .insert(
      movementToInsert({
        date,
        menuId,
        type: 'out',
        qty,
        manual: true,
        memo: '수동 보정',
      }),
    )
    .select('*')
    .single()
  if (error) throw error
  return movementFromRow(data as StockMovementRow)
}
