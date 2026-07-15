import { useEffect, useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { useStore } from '@/lib/store'
import {
  formatFullDate,
  formatWon,
  monthKeyOf,
  todayKey,
} from '@/lib/format'
import { datesInWeekOfMonth, weekOfMonth } from '@/lib/analytics'
import {
  buildPeriodDates,
  buildPeriodSettlement,
  latestActivityDate,
} from '@/lib/reports'
import { DailyReport } from '@/components/reports/daily-report'
import { MaterialReport } from '@/components/reports/material-report'
import { WeeklyReport } from '@/components/reports/weekly-report'
import { MonthlyReport } from '@/components/reports/monthly-report'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type ReportKind = 'daily' | 'weekly' | 'monthly' | 'material'

export interface ReportPreset {
  kind: ReportKind
  dateKey?: string
  monthKey?: string
  week?: string
  /** 같은 설정으로 다시 열 때 effect 재실행용 */
  nonce?: number
}

const REPORT_KINDS: { value: ReportKind; label: string; hint: string }[] = [
  { value: 'daily', label: '일일 결산', hint: '하루 단위 보고서' },
  { value: 'weekly', label: '주간 결산', hint: '1~5주차 보고서' },
  { value: 'monthly', label: '월간 결산', hint: '월 총괄 보고서' },
  { value: 'material', label: '원재료비', hint: '판매분 원가 집계' },
]

function daysInMonth(monthKey: string): string[] {
  const [y, m] = monthKey.split('-').map(Number)
  const n = new Date(y, m, 0).getDate()
  const out: string[] = []
  for (let d = 1; d <= n; d++) {
    out.push(`${monthKey}-${String(d).padStart(2, '0')}`)
  }
  return out
}

function currentMonthKey(): string {
  return monthKeyOf(todayKey())
}

export function ReportPrintView({
  preset,
  sharedMonthKey,
  sharedWeek,
}: {
  preset?: ReportPreset | null
  /** 결산 화면 상단에서 선택한 월과 동기화 */
  sharedMonthKey?: string
  sharedWeek?: string
}) {
  const { sales, expenses, specialIncomes, menus, settings } = useStore()

  const activityDate = useMemo(
    () => latestActivityDate(sales, expenses, specialIncomes),
    [sales, expenses, specialIncomes],
  )

  const [kind, setKind] = useState<ReportKind>(preset?.kind ?? 'daily')
  const [dateKey, setDateKey] = useState(
    () => preset?.dateKey ?? activityDate ?? todayKey(),
  )
  const [monthKey, setMonthKey] = useState(
    () =>
      preset?.monthKey ??
      sharedMonthKey ??
      monthKeyOf(activityDate ?? todayKey()),
  )
  const [week, setWeek] = useState(
    () =>
      preset?.week ??
      sharedWeek ??
      String(weekOfMonth(activityDate ?? todayKey())),
  )
  const [didInit, setDidInit] = useState(false)

  useEffect(() => {
    if (didInit || !activityDate) return
    if (!preset?.dateKey) setDateKey(activityDate)
    if (!preset?.monthKey && !sharedMonthKey) {
      setMonthKey(monthKeyOf(activityDate))
    }
    if (!preset?.week && !sharedWeek) {
      setWeek(String(weekOfMonth(activityDate)))
    }
    setDidInit(true)
  }, [activityDate, didInit, preset, sharedMonthKey, sharedWeek])

  // 결산 탭에서 「보고서 출력」으로 넘어올 때 종류·기간 반영
  useEffect(() => {
    if (!preset) return
    setKind(preset.kind)
    if (preset.dateKey) setDateKey(preset.dateKey)
    if (preset.monthKey) setMonthKey(preset.monthKey)
    if (preset.week) setWeek(preset.week)
  }, [preset, preset?.nonce, preset?.kind, preset?.dateKey, preset?.monthKey, preset?.week])

  // 상단 월/주차와 동기 (프리셋이 없을 때만)
  useEffect(() => {
    if (preset?.monthKey) return
    if (sharedMonthKey) setMonthKey(sharedMonthKey)
  }, [sharedMonthKey, preset?.monthKey])

  useEffect(() => {
    if (preset?.week) return
    if (sharedWeek) setWeek(sharedWeek)
  }, [sharedWeek, preset?.week])

  const period = useMemo(() => {
    if (kind === 'daily') {
      return buildPeriodDates([dateKey], formatFullDate(dateKey))
    }
    if (kind === 'weekly') {
      const dates = datesInWeekOfMonth(monthKey, Number(week))
      const [y, m] = monthKey.split('-')
      return buildPeriodDates(dates, `${y}년 ${Number(m)}월 ${week}주차`)
    }
    const dates = daysInMonth(monthKey)
    const [y, m] = monthKey.split('-')
    if (kind === 'material') {
      return buildPeriodDates(dates, `${y}년 ${Number(m)}월 원재료비`)
    }
    return buildPeriodDates(dates, `${y}년 ${Number(m)}월`)
  }, [kind, dateKey, monthKey, week])

  const data = useMemo(
    () =>
      buildPeriodSettlement({
        period,
        settings,
        sales,
        expenses,
        specialIncomes,
        menus,
      }),
    [period, settings, sales, expenses, specialIncomes, menus],
  )

  const weekItems = {
    '1': '1주차',
    '2': '2주차',
    '3': '3주차',
    '4': '4주차',
    '5': '5주차',
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">결산 보고서 출력</CardTitle>
          <CardDescription>
            일일·주간·월간·원재료비 보고서를 선택해 A4로 인쇄하거나 PDF로
            저장합니다. 등록된 매출·지출·메뉴 원가로 집계합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label className="text-xs">보고서 종류</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {REPORT_KINDS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setKind(item.value)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left transition-colors',
                    kind === item.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  <span className="block text-sm font-medium text-foreground">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[11px]">{item.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {kind === 'daily' ? (
              <div className="grid gap-1.5">
                <Label htmlFor="report-date" className="text-xs">
                  날짜
                </Label>
                <Input
                  id="report-date"
                  type="date"
                  value={dateKey}
                  max={todayKey()}
                  onChange={(e) => setDateKey(e.target.value || todayKey())}
                  className="w-44 font-mono"
                />
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label htmlFor="report-month" className="text-xs">
                  월
                </Label>
                <Input
                  id="report-month"
                  type="month"
                  value={monthKey}
                  onChange={(e) =>
                    setMonthKey(e.target.value || currentMonthKey())
                  }
                  className="w-40 font-mono"
                />
              </div>
            )}

            {kind === 'weekly' ? (
              <div className="grid gap-1.5">
                <Label className="text-xs">주차</Label>
                <Select
                  items={weekItems}
                  value={week}
                  onValueChange={(v) => {
                    if (v) setWeek(v)
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((w) => (
                      <SelectItem key={w} value={String(w)}>
                        {w}주차
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <Button onClick={() => window.print()}>
              <Printer />
              인쇄 / PDF
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={data.hasAnyData ? 'secondary' : 'outline'}>
              {data.hasAnyData ? '실데이터 집계' : '해당 기간 데이터 없음'}
            </Badge>
            <span className="text-muted-foreground">
              매출 {formatWon(data.salesRevenue)} · 원재료비{' '}
              {formatWon(data.materialTotal)} · 경상비{' '}
              {formatWon(data.opexTotal)} · 순액 {formatWon(data.net)}
            </span>
          </div>
        </CardContent>
      </Card>

      <div
        id="report-print-root"
        className="report-preview rounded-lg border bg-white p-4 shadow-sm sm:p-6 print:border-0 print:p-0 print:shadow-none"
      >
        {kind === 'daily' ? <DailyReport data={data} /> : null}
        {kind === 'material' ? <MaterialReport data={data} /> : null}
        {kind === 'weekly' ? <WeeklyReport data={data} /> : null}
        {kind === 'monthly' ? <MonthlyReport data={data} /> : null}
      </div>

      <p className="text-xs text-muted-foreground print:hidden">
        상호·결재란은 관리 → 결산 양식 정보에서 변경합니다. 원재료비는 메뉴
        관리의 원가 × 판매수량으로 계산됩니다.
      </p>
    </div>
  )
}
