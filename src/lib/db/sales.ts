import { getSupabase } from '@/lib/supabase'
import {
  movementFromRow,
  movementToInsert,
  saleFromRow,
  saleToInsert,
  type SaleRow,
  type StockMovementRow,
} from '@/lib/db/types'
import type { Sale, StockMovement } from '@/lib/domain'

function sb() {
  const client = getSupabase()
  if (!client) throw new Error('데이터베이스가 설정되지 않았습니다.')
  return client
}

export async function fetchSales(): Promise<Sale[]> {
  const { data, error } = await sb()
    .from('sales')
    .select('*')
    .order('sale_date', { ascending: false })
    .order('sale_time', { ascending: false })
  if (error) throw error
  return ((data ?? []) as SaleRow[]).map(saleFromRow)
}

export async function insertSale(sale: Omit<Sale, 'id'>): Promise<{
  sale: Sale
  movements: StockMovement[]
}> {
  const client = sb()
  const { data: saleRow, error: saleError } = await client
    .from('sales')
    .insert(saleToInsert(sale))
    .select('*')
    .single()
  if (saleError) throw saleError

  const saved = saleFromRow(saleRow as SaleRow)
  const outbound = saved.items.map((line) => ({
    date: saved.date,
    menuId: line.menuId,
    type: 'out' as const,
    qty: line.qty,
    saleId: saved.id,
  }))

  if (outbound.length === 0) {
    return { sale: saved, movements: [] }
  }

  const { data: mvRows, error: mvError } = await client
    .from('stock_movements')
    .insert(outbound.map(movementToInsert))
    .select('*')
  if (mvError) throw mvError

  return {
    sale: saved,
    movements: ((mvRows ?? []) as StockMovementRow[]).map(movementFromRow),
  }
}

export async function deleteSaleRow(id: string): Promise<void> {
  // stock_movements.sale_id ON DELETE CASCADE
  const { error } = await sb().from('sales').delete().eq('id', id)
  if (error) throw error
}
