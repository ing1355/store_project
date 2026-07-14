import { getSupabase } from '@/lib/supabase'
import type {
  Expense,
  ExpenseCategory,
  SpecialIncome,
  SpecialIncomeType,
} from '@/lib/domain'

interface ExpenseCategoryRow {
  id: string
  name: string
  sort_order: number
}

interface ExpenseRow {
  id: string
  expense_date: string
  category: string
  description: string
  amount: number
  memo: string | null
}

interface SpecialIncomeRow {
  id: string
  income_date: string
  type: SpecialIncomeType
  amount: number
  memo: string | null
}

function sb() {
  const client = getSupabase()
  if (!client) throw new Error('데이터베이스가 설정되지 않았습니다.')
  return client
}

function categoryFromRow(row: ExpenseCategoryRow): ExpenseCategory {
  return { id: row.id, name: row.name, sortOrder: row.sort_order }
}

function expenseFromRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    date: row.expense_date,
    category: row.category,
    description: row.description,
    amount: row.amount,
    memo: row.memo ?? undefined,
  }
}

function expenseToInsert(expense: Omit<Expense, 'id'>): Omit<ExpenseRow, 'id'> {
  return {
    expense_date: expense.date,
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    memo: expense.memo ?? null,
  }
}

function specialIncomeFromRow(row: SpecialIncomeRow): SpecialIncome {
  return {
    id: row.id,
    date: row.income_date,
    type: row.type,
    amount: row.amount,
    memo: row.memo ?? undefined,
  }
}

function specialIncomeToInsert(
  income: Omit<SpecialIncome, 'id'>,
): Omit<SpecialIncomeRow, 'id'> {
  return {
    income_date: income.date,
    type: income.type,
    amount: income.amount,
    memo: income.memo ?? null,
  }
}

export async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data, error } = await sb()
    .from('expense_categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return ((data ?? []) as ExpenseCategoryRow[]).map(categoryFromRow)
}

export async function insertExpenseCategory(
  name: string,
  sortOrder: number,
): Promise<ExpenseCategory> {
  const { data, error } = await sb()
    .from('expense_categories')
    .insert({ name: name.trim(), sort_order: sortOrder, meta: {} })
    .select('*')
    .single()
  if (error) throw error
  return categoryFromRow(data as ExpenseCategoryRow)
}

export async function updateExpenseCategoryRow(
  id: string,
  patch: { name?: string; sortOrder?: number },
): Promise<ExpenseCategory> {
  const row: Partial<ExpenseCategoryRow> = {}
  if (patch.name !== undefined) row.name = patch.name.trim()
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
  const { data, error } = await sb()
    .from('expense_categories')
    .update(row)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return categoryFromRow(data as ExpenseCategoryRow)
}

export async function renameExpenseCategoryOnExpenses(
  from: string,
  to: string,
): Promise<void> {
  const { error } = await sb()
    .from('expenses')
    .update({ category: to })
    .eq('category', from)
  if (error) throw error
}

export async function deleteExpenseCategoryRow(id: string): Promise<void> {
  const { error } = await sb().from('expense_categories').delete().eq('id', id)
  if (error) throw error
}

export async function fetchExpenses(): Promise<Expense[]> {
  const { data, error } = await sb()
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as ExpenseRow[]).map(expenseFromRow)
}

export async function insertExpense(
  expense: Omit<Expense, 'id'>,
): Promise<Expense> {
  const { data, error } = await sb()
    .from('expenses')
    .insert({ ...expenseToInsert(expense), meta: {} })
    .select('*')
    .single()
  if (error) throw error
  return expenseFromRow(data as ExpenseRow)
}

export async function deleteExpenseRow(id: string): Promise<void> {
  const { error } = await sb().from('expenses').delete().eq('id', id)
  if (error) throw error
}

export async function fetchSpecialIncomes(): Promise<SpecialIncome[]> {
  const { data, error } = await sb()
    .from('special_incomes')
    .select('*')
    .order('income_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as SpecialIncomeRow[]).map(specialIncomeFromRow)
}

export async function insertSpecialIncome(
  income: Omit<SpecialIncome, 'id'>,
): Promise<SpecialIncome> {
  const { data, error } = await sb()
    .from('special_incomes')
    .insert({ ...specialIncomeToInsert(income), meta: {} })
    .select('*')
    .single()
  if (error) throw error
  return specialIncomeFromRow(data as SpecialIncomeRow)
}

export async function deleteSpecialIncomeRow(id: string): Promise<void> {
  const { error } = await sb().from('special_incomes').delete().eq('id', id)
  if (error) throw error
}
