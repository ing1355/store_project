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

type ReportKind = 'daily' | 'material' | 'weekly' | 'monthly'

const REPORT_LABELS: Record<ReportKind, string> = {
  daily: '일일 결산',
  material: '원재료비 결산',
  weekly: '주간 결산',
  monthly: '월간 결산',
}

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

export function ReportPrintView() {
  const { sales, expenses, specialIncomes, menus, settings } = useStore()

  const activityDate = useMemo(
    () => latestActivityDate(sales, expenses, specialIncomes),
    [sales, expenses, specialIncomes],
  )

  const [kind, setKind] = useState<ReportKind>('daily')
  const [dateKey, setDateKey] = useState(
    () => activityDate ?? todayKey(),
  )
  const [monthKey, setMonthKey] = useState(() =>
    monthKeyOf(activityDate ?? todayKey()),
  )
  const [week, setWeek] = useState(() =>
    String(weekOfMonth(activityDate ?? todayKey())),
  )
  const [didInit, setDidInit] = useState(false)

  // 데이터 로드 후 최근 활동일로 기본 기간 맞춤
  useEffect(() => {
    if (didInit || !activityDate) return
    setDateKey(activityDate)
    setMonthKey(monthKeyOf(activityDate))
    setWeek(String(weekOfMonth(activityDate)))
    setDidInit(true)
  }, [activityDate, didInit])

  const period = useMemo(() => {
    if (kind === 'daily') {
      return buildPeriodDates([dateKey], formatFullDate(dateKey))
    }
    if (kind === 'weekly') {
      const dates = datesInWeekOfMonth(monthKey, Number(week))
      const [y, m] = monthKey.split('-')
      return buildPeriodDates(dates, `${y}년 ${Number(m)}월 ${week}주차`)
    }
    if (kind === 'material') {
      // 원재료비: 선택한 일과 같은 월 전체 + 일 선택 지원을 위해
      // 월 기준으로 집계 (일별은 daily에서 COGS 확인)
      const dates = daysInMonth(monthKey)
      const [y, m] = monthKey.split('-')
      return buildPeriodDates(dates, `${y}년 ${Number(m)}월 원재료비`)
    }
    const dates = daysInMonth(monthKey)
    const [y, m] = monthKey.split('-')
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

  const kindItems = Object.fromEntries(
    Object.entries(REPORT_LABELS),
  ) as Record<string, string>

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
          <CardTitle className="text-base">양식 출력</CardTitle>
          <CardDescription>
            일일 입력·지출 관리에 등록된 실제 매출·지출·메뉴 원가로
            집계합니다. PDF는 인쇄 대화상자에서 저장하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">양식</Label>
              <Select
                items={kindItems}
                value={kind}
                onValueChange={(v) => {
                  if (v) setKind(v as ReportKind)
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(REPORT_LABELS) as ReportKind[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {REPORT_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
