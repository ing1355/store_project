export function formatWon(value: number): string {
  return '₩' + Math.round(value).toLocaleString('ko-KR')
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('ko-KR')
}

/** Returns a YYYY-MM-DD string in local time. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** "2026-07-15" -> "7월 15일 (화)" */
export function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${m}월 ${d}일 (${WEEKDAYS[date.getDay()]})`
}

/** "2026-07-15" -> "2026년 7월 15일" */
export function formatFullDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return `${y}년 ${m}월 ${d}일`
}

export function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7)
}

export function yearOf(dateKey: string): string {
  return dateKey.slice(0, 4)
}
