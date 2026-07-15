import { useMemo, useState } from 'react'
import { CalendarRange, PiggyBank, Printer, Receipt, Wallet } from 'lucide-react'
import {
  SPECIAL_INCOME_TYPES,
  useStore,
} from '@/lib/store'
import {
  formatFullDate,
  formatWon,
  monthKeyOf,
  todayKey,
  yearOf,
} from '@/lib/format'
import {
  datesInWeekOfMonth,
  expenseByCategory,
  expensesInMonth,
  inDateSet,
  popularMenus,
  salesInMonth,
  specialIncomeByType,
  specialIncomesInMonth,
  sumAmounts,
  sumSales,
  weekOfMonth,
} from '@/lib/analytics'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/stat-card'
import {
  ReportPrintView,
  type ReportPreset,
} from '@/components/report-print-view'

function currentMonthKey(): string {
  return monthKeyOf(todayKey())
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function SettlementView() {
  const { sales, expenses, specialIncomes } = useStore()
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const [week, setWeek] = useState(String(weekOfMonth(todayKey())))
  const [tab, setTab] = useState('monthly')
  const [reportPreset, setReportPreset] = useState<ReportPreset | null>(null)

  function openReport(preset: Omit<ReportPreset, 'nonce'>) {
    setReportPreset({ ...preset, nonce: Date.now() })
    setTab('print')
  }

  const monthSales = useMemo(
    () => salesInMonth(sales, monthKey),
    [sales, monthKey],
  )
  const monthExpenses = useMemo(
    () => expensesInMonth(expenses, monthKey),
    [expenses, monthKey],
  )
  const monthIncomes = useMemo(
    () => specialIncomesInMonth(specialIncomes, monthKey),
    [specialIncomes, monthKey],
  )

  const monthRevenue = sumSales(monthSales).revenue
  const monthExpenseTotal = sumAmounts(monthExpenses)
  const monthSpecialTotal = sumAmounts(monthIncomes)
  const net = monthRevenue + monthSpecialTotal - monthExpenseTotal

  const menuTotals = useMemo(() => popularMenus(monthSales), [monthSales])
  const expenseCats = useMemo(
    () => expenseByCategory(monthExpenses),
    [monthExpenses],
  )
  const incomeTypes = useMemo(
    () => specialIncomeByType(monthIncomes),
    [monthIncomes],
  )

  const weekDates = useMemo(
    () => datesInWeekOfMonth(monthKey, Number(week)),
    [monthKey, week],
  )

  const weekSales = useMemo(
    () => sales.filter((s) => inDateSet(s.date, weekDates)),
    [sales, weekDates],
  )
  const weekExpenses = useMemo(
    () => expenses.filter((e) => inDateSet(e.date, weekDates)),
    [expenses, weekDates],
  )
  const weekIncomes = useMemo(
    () => specialIncomes.filter((i) => inDateSet(i.date, weekDates)),
    [specialIncomes, weekDates],
  )

  const weekRevenue = sumSales(weekSales).revenue
  const weekExpenseTotal = sumAmounts(weekExpenses)
  const weekSpecialTotal = sumAmounts(weekIncomes)
  const weekNet = weekRevenue + weekSpecialTotal - weekExpenseTotal

  const weekMenuTotals = useMemo(() => popularMenus(weekSales), [weekSales])

  const daysInMonth = useMemo(() => {
    const [y, m] = monthKey.split('-').map(Number)
    return new Date(y, m, 0).getDate()
  }, [monthKey])

  const dailyRows = useMemo(() => {
    const rows = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${monthKey}-${String(d).padStart(2, '0')}`
      const [y, mo, day] = dateKey.split('-').map(Number)
      const dow = new Date(y, mo - 1, day).getDay()
      const daySales = sales.filter((s) => s.date === dateKey)
      const dayExp = expenses.filter((e) => e.date === dateKey)
      const dayInc = specialIncomes.filter((i) => i.date === dateKey)
      const revenue = sumSales(daySales).revenue
      const expense = sumAmounts(dayExp)
      const special = sumAmounts(dayInc)
      const hasData =
        daySales.length > 0 || dayExp.length > 0 || dayInc.length > 0
      rows.push({
        dateKey,
        day: d,
        dow,
        revenue,
        expense,
        special,
        net: revenue + special - expense,
        hasData,
      })
    }
    return rows
  }, [monthKey, daysInMonth, sales, expenses, specialIncomes])

  const weekItems = {
    '1': '1주차',
    '2': '2주차',
    '3': '3주차',
    '4': '4주차',
    '5': '5주차',
  }

  const years = useMemo(() => {
    const set = new Set<string>()
    for (const s of sales) set.add(yearOf(s.date))
    for (const e of expenses) set.add(yearOf(e.date))
    for (const i of specialIncomes) set.add(yearOf(i.date))
    set.add(yearOf(todayKey()))
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [sales, expenses, specialIncomes])

  const [ySel, mSel] = monthKey.split('-')

  return (
    <div className="flex flex-col gap-6 print:gap-0">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">결산</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            일일·주간·월간 합산과 결산 보고서 출력. 데이터 없는 날은 공란으로
            둡니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">연도</Label>
            <Select
              items={Object.fromEntries(years.map((y) => [y, `${y}년`]))}
              value={ySel}
              onValueChange={(v) => {
                if (v) setMonthKey(`${v}-${mSel}`)
              }}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="settle-month" className="text-xs">
              월
            </Label>
            <Input
              id="settle-month"
              type="month"
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value || currentMonthKey())}
              className="w-40 font-mono"
            />
          </div>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={setTab}
      >
        <TabsList className="print:hidden">
          <TabsTrigger value="monthly">월간 결산</TabsTrigger>
          <TabsTrigger value="weekly">주간 결산</TabsTrigger>
          <TabsTrigger value="daily">일일 현황</TabsTrigger>
          <TabsTrigger value="print">결산 보고서 출력</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-4 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <p className="text-sm text-muted-foreground">
              선택한 월의 실시간 집계입니다.
            </p>
            <Button
              variant="outline"
              onClick={() =>
                openReport({ kind: 'monthly', monthKey })
              }
            >
              <Printer />
              월간 보고서 출력
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="매출 합계"
              value={formatWon(monthRevenue)}
              icon={<Receipt />}
            />
            <StatCard
              label="특이수입"
              value={formatWon(monthSpecialTotal)}
              icon={<PiggyBank />}
            />
            <StatCard
              label="운영지출"
              value={formatWon(monthExpenseTotal)}
              icon={<Wallet />}
            />
            <StatCard
              label="순액"
              value={formatWon(net)}
              icon={<CalendarRange />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">메뉴별 매출</CardTitle>
                <CardDescription>
                  {ySel}년 {Number(mSel)}월 판매 합산
                </CardDescription>
              </CardHeader>
              <CardContent>
                {menuTotals.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    매출 데이터가 없습니다.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>메뉴</TableHead>
                        <TableHead className="text-right">수량</TableHead>
                        <TableHead className="text-right">매출</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {menuTotals.map((m) => (
                        <TableRow key={m.menuId}>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {m.units}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatWon(m.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">특이사항 · 수입</CardTitle>
                  <CardDescription>쿠폰 / 기부 / 기타</CardDescription>
                </CardHeader>
                <CardContent>
                  {incomeTypes.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      특이수입 없음
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {SPECIAL_INCOME_TYPES.map((t) => {
                        const row = incomeTypes.find((i) => i.type === t.value)
                        return (
                          <li
                            key={t.value}
                            className="flex items-center justify-between rounded-lg border px-3 py-2"
                          >
                            <span className="text-sm">{t.label}</span>
                            <span className="font-mono text-sm tabular-nums">
                              {formatWon(row?.amount ?? 0)}
                              {row ? (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({row.count}건)
                                </span>
                              ) : null}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">운영지출</CardTitle>
                  <CardDescription>분류별 합산</CardDescription>
                </CardHeader>
                <CardContent>
                  {expenseCats.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      지출 없음
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>분류</TableHead>
                          <TableHead className="text-right">건수</TableHead>
                          <TableHead className="text-right">금액</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenseCats.map((c) => (
                          <TableRow key={c.category}>
                            <TableCell>
                              <Badge variant="outline">{c.category}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {c.count}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatWon(c.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="mt-4 flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-4">
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
              <p className="text-sm text-muted-foreground">
                {weekDates[0] ? formatFullDate(weekDates[0]) : '—'} ~{' '}
                {weekDates.at(-1) ? formatFullDate(weekDates.at(-1)!) : '—'}
              </p>
            </div>
            <Button
              variant="outline"
              className="print:hidden"
              onClick={() =>
                openReport({ kind: 'weekly', monthKey, week })
              }
            >
              <Printer />
              주간 보고서 출력
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="주간 매출" value={formatWon(weekRevenue)} />
            <StatCard label="특이수입" value={formatWon(weekSpecialTotal)} />
            <StatCard label="운영지출" value={formatWon(weekExpenseTotal)} />
            <StatCard label="순액" value={formatWon(weekNet)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {week}주차 메뉴별 매출
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weekMenuTotals.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  이 주차에 매출이 없습니다. (휴일 등은 공란 유지)
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>메뉴</TableHead>
                      <TableHead className="text-right">수량</TableHead>
                      <TableHead className="text-right">매출</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weekMenuTotals.map((m) => (
                      <TableRow key={m.menuId}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {m.units}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatWon(m.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="mt-4 flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
            <p className="text-sm text-muted-foreground">
              월별 일일 현황표입니다. 특정 날짜 보고서는 「일일 보고서
              출력」을 이용하세요.
            </p>
            <Button
              variant="outline"
              onClick={() =>
                openReport({
                  kind: 'daily',
                  dateKey: todayKey(),
                  monthKey,
                })
              }
            >
              <Printer />
              일일 보고서 출력
            </Button>
          </div>
          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b bg-muted/40 py-3">
              <CardTitle className="text-base">
                {Number(mSel)}월 일일 결산 현황
              </CardTitle>
              <CardDescription>
                데이터 없는 날(일·월·공휴일 등)은 금액을 비워 둡니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="text-[13px]">
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead className="w-20">일자</TableHead>
                    <TableHead className="w-12 text-center">요일</TableHead>
                    <TableHead className="text-right">매출</TableHead>
                    <TableHead className="text-right">특이수입</TableHead>
                    <TableHead className="text-right">지출</TableHead>
                    <TableHead className="text-right">순액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyRows.map((r) => {
                    const weekend = r.dow === 0 || r.dow === 6
                    return (
                      <TableRow
                        key={r.dateKey}
                        className={
                          weekend
                            ? 'bg-muted/30 odd:bg-muted/30'
                            : 'odd:bg-background even:bg-muted/10'
                        }
                      >
                        <TableCell className="font-mono tabular-nums">
                          {r.day}일
                        </TableCell>
                        <TableCell
                          className={`text-center ${
                            r.dow === 0
                              ? 'text-destructive'
                              : r.dow === 6
                                ? 'text-primary'
                                : ''
                          }`}
                        >
                          {WEEKDAYS[r.dow]}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                          {r.hasData && r.revenue > 0
                            ? formatWon(r.revenue)
                            : r.hasData
                              ? formatWon(0)
                              : ''}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                          {r.hasData && r.special > 0
                            ? formatWon(r.special)
                            : ''}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                          {r.hasData && r.expense > 0
                            ? formatWon(r.expense)
                            : ''}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-medium">
                          {r.hasData ? formatWon(r.net) : ''}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="print" className="mt-4">
          <ReportPrintView
            preset={reportPreset}
            sharedMonthKey={monthKey}
            sharedWeek={week}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
