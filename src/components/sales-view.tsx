import { useMemo, useState } from 'react'
import { Plus, Receipt, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  PAYMENT_METHODS,
  paymentLabel,
  useStore,
  type PaymentMethod,
  type SaleLine,
} from '@/lib/store'
import {
  formatFullDate,
  formatNumber,
  formatWon,
  todayKey,
  toDateKey,
} from '@/lib/format'
import { paymentBreakdown, salesOnDate, sumSales } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatCard } from '@/components/stat-card'

const PAYMENT_ITEMS = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label]),
) as Record<string, string>

export function SalesView() {
  const {
    menus,
    sales,
    movements,
    addSale,
    deleteSale,
    getDayRows,
    upsertManualOutbound,
  } = useStore()
  const [dateKey, setDateKey] = useState<string>(todayKey())

  // draft transaction state
  const [lines, setLines] = useState<SaleLine[]>([])
  const [selectedMenu, setSelectedMenu] = useState<string>(
    menus[0]?.id ?? '',
  )
  const [qty, setQty] = useState('1')
  const [payment, setPayment] = useState<PaymentMethod>('card')
  const [memo, setMemo] = useState('')

  const menuItems = useMemo(
    () =>
      Object.fromEntries(
        menus.map((m) => [m.id, `${m.name} · ${formatWon(m.price)}`]),
      ) as Record<string, string>,
    [menus],
  )

  const daySales = useMemo(
    () => salesOnDate(sales, dateKey).sort((a, b) => b.time.localeCompare(a.time)),
    [sales, dateKey],
  )
  const dayTotals = useMemo(() => sumSales(daySales), [daySales])
  const breakdown = useMemo(() => paymentBreakdown(daySales), [daySales])

  const stockRows = useMemo(() => {
    const dayRows = getDayRows(dateKey)
    const byId = new Map(dayRows.map((r) => [r.menuId, r]))
    return [...menus]
      .sort((a, b) => a.code.localeCompare(b.code, 'ko', { numeric: true }))
      .map((menu) => {
        const row = byId.get(menu.id)!
        const saleOut = movements
          .filter(
            (mv) =>
              mv.type === 'out' &&
              mv.menuId === menu.id &&
              mv.date === dateKey &&
              !mv.manual,
          )
          .reduce((s, mv) => s + mv.qty, 0)
        const manualOut = movements
          .filter(
            (mv) =>
              mv.type === 'out' &&
              mv.menuId === menu.id &&
              mv.date === dateKey &&
              mv.manual,
          )
          .reduce((s, mv) => s + mv.qty, 0)
        return { menu, row, saleOut, manualOut }
      })
  }, [menus, getDayRows, dateKey, movements])

  const draftTotal = lines.reduce((s, l) => s + l.price * l.qty, 0)

  function addLine() {
    const menu = menus.find((m) => m.id === selectedMenu)
    if (!menu) {
      toast.error('메뉴를 선택하세요.')
      return
    }
    const q = Math.max(1, Number(qty) || 1)
    setLines((prev) => {
      const existing = prev.find((l) => l.menuId === menu.id)
      if (existing) {
        return prev.map((l) =>
          l.menuId === menu.id ? { ...l, qty: l.qty + q } : l,
        )
      }
      return [
        ...prev,
        { menuId: menu.id, name: menu.name, price: menu.price, qty: q },
      ]
    })
    setQty('1')
  }

  function removeLine(menuId: string) {
    setLines((prev) => prev.filter((l) => l.menuId !== menuId))
  }

  function register() {
    if (lines.length === 0) {
      toast.error('판매 항목을 추가하세요.')
      return
    }
    const isToday = dateKey === todayKey()
    const now = new Date()
    const time = isToday
      ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      : '12:00'
    addSale({
      date: dateKey,
      time,
      items: lines,
      paymentMethod: payment,
      total: draftTotal,
      memo: memo.trim() || undefined,
    })
    toast.success(
      `${formatWon(draftTotal)} 매출 등록 (${paymentLabel(payment)})`,
    )
    setLines([])
    setMemo('')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            일일 매출 결산
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatFullDate(dateKey)} 매출을 등록하면 메뉴 출고가 자동
            반영됩니다. 잔량까지 함께 확인하세요.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sales-date" className="text-xs">
            날짜 선택
          </Label>
          <Input
            id="sales-date"
            type="date"
            value={dateKey}
            max={todayKey()}
            onChange={(e) =>
              setDateKey(e.target.value || toDateKey(new Date()))
            }
            className="w-44 font-mono"
          />
        </div>
      </div>

      {/* day summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="총 매출"
          value={formatWon(dayTotals.revenue)}
          icon={<Receipt />}
        />
        <StatCard label="거래 건수" value={`${dayTotals.count}건`} />
        <StatCard label="판매 수량" value={`${dayTotals.units}개`} />
        <StatCard
          label="객단가"
          value={formatWon(
            dayTotals.count ? dayTotals.revenue / dayTotals.count : 0,
          )}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* register form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">결산 등록</CardTitle>
            <CardDescription>
              판매 항목을 담고 결제수단을 선택해 등록합니다. 수량은 출고로
              반영됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>메뉴</Label>
              <Select
                items={menuItems}
                value={selectedMenu}
                onValueChange={(v) => {
                  if (v) setSelectedMenu(v)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {menus.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} · {formatWon(m.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <div className="grid w-24 gap-2">
                <Label htmlFor="qty">수량</Label>
                <Input
                  id="qty"
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) =>
                    setQty(e.target.value.replace(/[^0-9]/g, ''))
                  }
                  className="font-mono"
                />
              </div>
              <Button variant="secondary" onClick={addLine} className="flex-1">
                <Plus />
                항목 추가
              </Button>
            </div>

            <Separator />

            {lines.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                담긴 항목이 없습니다.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {lines.map((l) => (
                  <li
                    key={l.menuId}
                    className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatWon(l.price)} × {l.qty}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm tabular-nums">
                        {formatWon(l.price * l.qty)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`${l.name} 제거`}
                        onClick={() => removeLine(l.menuId)}
                      >
                        <X />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid gap-2">
              <Label>결제수단</Label>
              <Select
                items={PAYMENT_ITEMS}
                value={payment}
                onValueChange={(v) => setPayment(v as PaymentMethod)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="memo">메모 (선택)</Label>
              <Input
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="예: 단체 주문"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2.5">
              <span className="text-sm font-medium">합계</span>
              <span className="font-mono text-lg font-semibold tabular-nums text-primary">
                {formatWon(draftTotal)}
              </span>
            </div>
            <Button onClick={register} disabled={lines.length === 0}>
              <Receipt />
              결산 등록
            </Button>
          </CardContent>
        </Card>

        {/* payment breakdown + list */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">결제수단별 집계</CardTitle>
              <CardDescription>
                {formatFullDate(dateKey)} 기준
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {PAYMENT_METHODS.map((m) => {
                  const b = breakdown[m.value]
                  const pct =
                    dayTotals.revenue > 0
                      ? (b.revenue / dayTotals.revenue) * 100
                      : 0
                  return (
                    <div
                      key={m.value}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: m.color }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {m.label}
                        </span>
                      </div>
                      <p className="mt-1.5 font-mono text-base font-semibold tabular-nums">
                        {formatWon(b.revenue)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {b.count}건 · {pct.toFixed(0)}%
                      </p>
                    </div>
                  )
                })}
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
                  <span className="text-sm text-muted-foreground">계</span>
                  <p className="mt-1.5 font-mono text-base font-semibold tabular-nums text-primary">
                    {formatWon(dayTotals.revenue)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dayTotals.count}건
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">거래 내역</CardTitle>
                <Badge variant="secondary">{daySales.length}건</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {daySales.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  이 날짜에 등록된 거래가 없습니다.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">시간</TableHead>
                      <TableHead>항목</TableHead>
                      <TableHead className="w-20">결제</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {daySales.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                          {s.time}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {s.items[0]?.name}
                            {s.items.length > 1
                              ? ` 외 ${s.items.length - 1}건`
                              : ''}
                          </span>
                          {s.memo ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              · {s.memo}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {paymentLabel(s.paymentMethod)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatWon(s.total)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="거래 삭제"
                            onClick={() => {
                              deleteSale(s.id)
                              toast.success('거래 삭제됨')
                            }}
                          >
                            <Trash2 />
                          </Button>
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

      {/* 금일 출고·잔량 결산 */}
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle className="text-base">금일 메뉴별 출고 · 잔량</CardTitle>
          <CardDescription>
            매출 등록 출고와 수동 보정(파손·폐기 등)을 합산한 뒤 금일 잔량을
            보여 줍니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {stockRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              등록된 메뉴가 없습니다.
            </p>
          ) : (
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="w-24 text-center">상품코드</TableHead>
                  <TableHead>상품명</TableHead>
                  <TableHead className="w-24 text-right">금일입고</TableHead>
                  <TableHead className="w-24 text-right">매출출고</TableHead>
                  <TableHead className="w-28 text-right">보정출고</TableHead>
                  <TableHead className="w-24 text-right">출고합계</TableHead>
                  <TableHead className="w-24 text-right">금일잔량</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockRows.map(({ menu, row, saleOut, manualOut }) => (
                  <TableRow
                    key={menu.id}
                    className="odd:bg-background even:bg-muted/20"
                  >
                    <TableCell className="text-center font-mono tabular-nums">
                      {menu.code}
                    </TableCell>
                    <TableCell className="font-medium">{menu.name}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatNumber(row.inbound)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatNumber(saleOut)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        key={`${dateKey}-${menu.id}-manual-${manualOut}`}
                        inputMode="numeric"
                        defaultValue={manualOut || ''}
                        placeholder="0"
                        className="ml-auto h-8 w-24 text-right font-mono"
                        onBlur={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '')
                          const next = raw === '' ? 0 : Number(raw)
                          if (next === manualOut) return
                          upsertManualOutbound(dateKey, menu.id, next)
                          toast.success(
                            `${menu.name} 보정 출고 ${formatNumber(next)} 반영`,
                          )
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            ;(e.target as HTMLInputElement).blur()
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatNumber(row.outbound)}
                    </TableCell>
                    <TableCell
                      className={
                        row.stock <= 0
                          ? 'text-right font-mono tabular-nums font-medium text-destructive'
                          : 'text-right font-mono tabular-nums font-medium'
                      }
                    >
                      {formatNumber(row.stock)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
