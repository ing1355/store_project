import { useMemo, useState } from 'react'
import { AlertTriangle, Package } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { formatFullDate, formatNumber, todayKey, toDateKey } from '@/lib/format'
import { stockStatus, type StockStatus } from '@/lib/stock'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatCard } from '@/components/stat-card'
import { cn } from '@/lib/utils'

const STATUS_META: Record<
  StockStatus,
  { label: string; className: string }
> = {
  out: { label: '소진', className: 'bg-destructive/15 text-destructive' },
  low: { label: '부족', className: 'bg-chart-3/20 text-chart-3' },
  ok: { label: '정상', className: 'bg-chart-2/15 text-chart-2' },
}

export function InventoryView() {
  const { menus, getDayRows, upsertInbound, settings } = useStore()
  const [dateKey, setDateKey] = useState(todayKey())
  const threshold = settings.lowStockThreshold

  const rows = useMemo(() => {
    const dayRows = getDayRows(dateKey)
    const byId = new Map(dayRows.map((r) => [r.menuId, r]))
    return [...menus]
      .sort((a, b) => a.code.localeCompare(b.code, 'ko', { numeric: true }))
      .map((menu, index) => {
        const row = byId.get(menu.id)!
        const status = stockStatus(row.stock, threshold)
        return { menu, row, status, index: index + 1 }
      })
  }, [menus, getDayRows, dateKey, threshold])

  const lowItems = rows.filter((r) => r.status !== 'ok')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">재고 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatFullDate(dateKey)} 메뉴별 입고를 입력하고 금일 잔량을
            확인합니다.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="inv-date" className="text-xs">
            날짜 선택
          </Label>
          <Input
            id="inv-date"
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="전체 메뉴"
          value={`${menus.length}개`}
          icon={<Package />}
        />
        <StatCard
          label="정상"
          value={`${rows.filter((r) => r.status === 'ok').length}개`}
        />
        <StatCard
          label="부족"
          value={`${rows.filter((r) => r.status === 'low').length}개`}
        />
        <StatCard
          label="소진"
          value={`${rows.filter((r) => r.status === 'out').length}개`}
        />
      </div>

      {lowItems.length > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-chart-3/40 bg-chart-3/10 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-chart-3" />
          <div>
            <p className="text-sm font-medium">
              잔량이 부족한 메뉴가 있습니다
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {lowItems.map((i) => i.menu.name).join(', ')}
            </p>
          </div>
        </div>
      ) : null}

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle className="text-base">일일 입고 · 잔량</CardTitle>
          <CardDescription>
            전일잔량 + 금일입고 − 금일출고 = 금일잔량. 입고량은 아래에서 바로
            입력하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="text-[13px]">
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="w-14 text-center">번호</TableHead>
                <TableHead className="w-24 text-center">대분류</TableHead>
                <TableHead className="w-24 text-center">상품코드</TableHead>
                <TableHead>상품명</TableHead>
                <TableHead className="w-24 text-right">전일잔량</TableHead>
                <TableHead className="w-28 text-right">금일입고</TableHead>
                <TableHead className="w-24 text-right">금일출고</TableHead>
                <TableHead className="w-24 text-right">금일잔량</TableHead>
                <TableHead className="w-20 text-center">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ menu, row, status, index }) => {
                const meta = STATUS_META[status]
                return (
                  <TableRow
                    key={menu.id}
                    className="odd:bg-background even:bg-muted/20"
                  >
                    <TableCell className="text-center tabular-nums text-muted-foreground">
                      {index}
                    </TableCell>
                    <TableCell className="text-center">{menu.category}</TableCell>
                    <TableCell className="text-center font-mono tabular-nums">
                      {menu.code}
                    </TableCell>
                    <TableCell className="font-medium">{menu.name}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatNumber(row.prevStock)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        key={`${dateKey}-${menu.id}-${row.inbound}`}
                        inputMode="numeric"
                        defaultValue={row.inbound || ''}
                        placeholder="0"
                        className="ml-auto h-8 w-24 text-right font-mono"
                        onBlur={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '')
                          const qty = raw === '' ? 0 : Number(raw)
                          if (qty === row.inbound) return
                          upsertInbound(dateKey, menu.id, qty)
                          toast.success(
                            `${menu.name} 입고 ${formatNumber(qty)} 반영`,
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
                      className={cn(
                        'text-right font-mono tabular-nums font-medium',
                        status === 'out' && 'text-destructive',
                        status === 'low' && 'text-chart-3',
                      )}
                    >
                      {formatNumber(row.stock)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          meta.className,
                        )}
                      >
                        {meta.label}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
