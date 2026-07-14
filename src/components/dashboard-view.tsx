import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label as RLabel,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import { CreditCard, Package, Receipt, TrendingUp, Trophy } from 'lucide-react'
import { PAYMENT_METHODS, useStore } from '@/lib/store'
import { formatNumber, formatWon, monthKeyOf, todayKey, yearOf } from '@/lib/format'
import { stockStatus } from '@/lib/stock'
import {
  availableYears,
  dailySeries,
  monthlySeries,
  paymentBreakdown,
  popularMenus,
  salesInMonth,
  salesInYear,
  sumSales,
  yearlySeries,
} from '@/lib/analytics'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { StatCard } from '@/components/stat-card'

function compactWon(v: number): string {
  if (v >= 1e8) return `${(v / 1e8).toFixed(1)}억`
  if (v >= 1e4) return `${Math.round(v / 1e4)}만`
  return String(v)
}

const trendConfig = {
  revenue: { label: '매출', color: 'var(--chart-1)' },
} satisfies ChartConfig

const paymentConfig = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, { label: m.label, color: m.color }]),
) as ChartConfig

type Period = 'daily' | 'monthly' | 'yearly'

export function DashboardView() {
  const { sales, menus, getDayRows, settings } = useStore()
  const [period, setPeriod] = useState<Period>('daily')
  const threshold = settings.lowStockThreshold
  const today = todayKey()

  const stockAlerts = useMemo(() => {
    const rows = getDayRows(today)
    return menus
      .map((menu) => {
        const row = rows.find((r) => r.menuId === menu.id)
        const stock = row?.stock ?? 0
        const status = stockStatus(stock, threshold)
        return { menu, stock, status }
      })
      .filter((x) => x.status !== 'ok')
      .sort((a, b) => a.stock - b.stock)
  }, [menus, getDayRows, threshold, today])

  const years = useMemo(() => {
    const ys = availableYears(sales)
    const current = yearOf(today)
    if (!ys.includes(current)) ys.unshift(current)
    return ys.length ? ys : [current]
  }, [sales, today])

  const [year, setYear] = useState(() => yearOf(todayKey()))
  const [month, setMonth] = useState(() => monthKeyOf(todayKey()))

  const monthsOfYear = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`),
    [year],
  )

  // 연도 변경 시: 같은 월 번호 유지 (없으면 해당 연 1월)
  const activeMonth = month.startsWith(year)
    ? month
    : `${year}-${month.slice(5, 7)}`

  /* scope + trend data per period */
  const { scopeSales, trendData, headline } = useMemo(() => {
    if (period === 'daily') {
      const scope = salesInMonth(sales, activeMonth)
      const prevDate = new Date(
        Number(activeMonth.slice(0, 4)),
        Number(activeMonth.slice(5, 7)) - 2,
        1,
      )
      const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
      const prev = sumSales(salesInMonth(sales, prevKey)).revenue
      const cur = sumSales(scope).revenue
      return {
        scopeSales: scope,
        trendData: dailySeries(sales, activeMonth),
        headline: {
          label: '월 총매출',
          delta: prev > 0 ? ((cur - prev) / prev) * 100 : null,
          sub: '전월 대비',
        },
      }
    }
    if (period === 'monthly') {
      const scope = salesInYear(sales, year)
      const prev = sumSales(salesInYear(sales, String(Number(year) - 1))).revenue
      const cur = sumSales(scope).revenue
      return {
        scopeSales: scope,
        trendData: monthlySeries(sales, year),
        headline: {
          label: '연 총매출',
          delta: prev > 0 ? ((cur - prev) / prev) * 100 : null,
          sub: '전년 대비',
        },
      }
    }
    return {
      scopeSales: sales,
      trendData: yearlySeries(sales),
      headline: { label: '누적 총매출', delta: null, sub: '전체 기간' },
    }
  }, [period, sales, activeMonth, year])

  const totals = useMemo(() => sumSales(scopeSales), [scopeSales])
  const ranks = useMemo(
    () => popularMenus(scopeSales).slice(0, 6),
    [scopeSales],
  )
  const maxUnits = ranks[0]?.units ?? 1
  const breakdown = useMemo(
    () => paymentBreakdown(scopeSales),
    [scopeSales],
  )

  const pieData = useMemo(
    () =>
      PAYMENT_METHODS.map((m) => ({
        method: m.value,
        label: m.label,
        value: breakdown[m.value].revenue,
        fill: m.color,
      })).filter((d) => d.value > 0),
    [breakdown],
  )

  const nonZeroBuckets = trendData.filter((d) => d.revenue > 0).length
  const avg = nonZeroBuckets ? totals.revenue / nonZeroBuckets : 0
  const best = trendData.reduce(
    (mx, d) => (d.revenue > mx.revenue ? d : mx),
    trendData[0] ?? { label: '-', revenue: 0 },
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">대시보드</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            일·월·연 매출 성과와 인기 메뉴, 결제수단, 재고 현황을 한눈에
            확인합니다.
          </p>
        </div>
        <Tabs
          value={period}
          onValueChange={(v) => setPeriod(v as Period)}
        >
          <TabsList>
            <TabsTrigger value="daily">일별</TabsTrigger>
            <TabsTrigger value="monthly">월별</TabsTrigger>
            <TabsTrigger value="yearly">연별</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* period selectors */}
      <div className="flex flex-wrap gap-3">
        {period !== 'yearly' ? (
          <Select
            items={Object.fromEntries(years.map((y) => [y, `${y}년`]))}
            value={year}
            onValueChange={(v) => {
              if (v) setYear(v)
            }}
          >
            <SelectTrigger className="w-32">
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
        ) : null}
        {period === 'daily' ? (
          <Select
            items={Object.fromEntries(
              monthsOfYear.map((mk) => [mk, `${Number(mk.slice(5, 7))}월`]),
            )}
            value={activeMonth}
            onValueChange={(v) => {
              if (v) setMonth(v)
            }}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthsOfYear.map((mk) => (
                <SelectItem key={mk} value={mk}>
                  {Number(mk.slice(5, 7))}월
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={headline.label}
          value={formatWon(totals.revenue)}
          icon={<TrendingUp />}
          delta={headline.delta}
          sub={headline.sub}
        />
        <StatCard
          label={
            period === 'daily'
              ? '일 평균'
              : period === 'monthly'
                ? '월 평균'
                : '연 평균'
          }
          value={formatWon(avg)}
          icon={<Receipt />}
        />
        <StatCard
          label="최고 매출"
          value={formatWon(best.revenue)}
          sub={`${best.label} 기준`}
          icon={<Trophy />}
        />
        <StatCard
          label="거래 건수"
          value={`${totals.count.toLocaleString('ko-KR')}건`}
          icon={<CreditCard />}
        />
      </div>

      {stockAlerts.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="size-4 text-chart-3" />
              <CardTitle className="text-base">재고 주의</CardTitle>
            </div>
            <CardDescription>
              오늘 잔량이 부족 기준(
              {formatNumber(threshold)}개) 이하인 메뉴입니다. 입고·결산에서
              확인하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {stockAlerts.slice(0, 8).map(({ menu, stock, status }) => (
                <li
                  key={menu.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{menu.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {menu.category} · {menu.code}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        status === 'out'
                          ? 'font-mono text-sm font-medium tabular-nums text-destructive'
                          : 'font-mono text-sm font-medium tabular-nums text-chart-3'
                      }
                    >
                      잔량 {formatNumber(stock)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      기준 {formatNumber(threshold)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* trend chart */}
      <Tabs value={period}>
        <TabsContent value={period} className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {period === 'daily'
                  ? `${Number(activeMonth.slice(5, 7))}월 일별 매출`
                  : period === 'monthly'
                    ? `${year}년 월별 매출`
                    : '연도별 매출'}
              </CardTitle>
              <CardDescription>
                막대에 마우스를 올리면 상세 금액을 볼 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={trendConfig}
                className="h-72 w-full"
              >
                <BarChart
                  data={trendData as { label: string; revenue: number }[]}
                  margin={{ left: 4, right: 4 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    fontSize={12}
                    tickFormatter={(v) => compactWon(Number(v))}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <span className="font-mono tabular-nums">
                            {formatWon(Number(value))}
                          </span>
                        )}
                      />
                    }
                  />
                  <Bar
                    dataKey="revenue"
                    fill="var(--color-revenue)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* popular menus + payment pie */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">인기 메뉴 TOP 6</CardTitle>
            <CardDescription>판매 수량 기준</CardDescription>
          </CardHeader>
          <CardContent>
            {ranks.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                해당 기간의 판매 데이터가 없습니다.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {ranks.map((r, i) => (
                  <li key={r.menuId} className="flex items-center gap-3">
                    <span className="w-5 text-center font-mono text-sm font-semibold text-muted-foreground tabular-nums">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {r.name}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                          {r.units.toLocaleString('ko-KR')}개 ·{' '}
                          {formatWon(r.revenue)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${(r.units / maxUnits) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">결제수단 비중</CardTitle>
            <CardDescription>매출액 기준</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                데이터가 없습니다.
              </p>
            ) : (
              <>
                <ChartContainer
                  config={paymentConfig}
                  className="mx-auto aspect-square max-h-52"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          nameKey="label"
                          formatter={(value, name) => (
                            <div className="flex w-full justify-between gap-4">
                              <span className="text-muted-foreground">
                                {name}
                              </span>
                              <span className="font-mono tabular-nums">
                                {formatWon(Number(value))}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={55}
                      strokeWidth={3}
                    >
                      {pieData.map((d) => (
                        <Cell key={d.method} fill={d.fill} />
                      ))}
                      <RLabel
                        content={({ viewBox }) => {
                          if (
                            !viewBox ||
                            !('cx' in viewBox) ||
                            !('cy' in viewBox)
                          )
                            return null
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy ?? 0) - 6}
                                className="fill-muted-foreground text-xs"
                              >
                                총 매출
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy ?? 0) + 12}
                                className="fill-foreground font-mono text-sm font-semibold"
                              >
                                {compactWon(totals.revenue)}
                              </tspan>
                            </text>
                          )
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ul className="mt-4 flex flex-col gap-2">
                  {PAYMENT_METHODS.map((m) => {
                    const rev = breakdown[m.value].revenue
                    const pct =
                      totals.revenue > 0
                        ? (rev / totals.revenue) * 100
                        : 0
                    return (
                      <li
                        key={m.value}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: m.color }}
                        />
                        <span className="flex-1 text-muted-foreground">
                          {m.label}
                        </span>
                        <span className="font-mono tabular-nums">
                          {formatWon(rev)}
                        </span>
                        <span className="w-10 text-right font-mono text-xs text-muted-foreground tabular-nums">
                          {pct.toFixed(0)}%
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
