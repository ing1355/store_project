import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  nextMenuCode,
  useStore,
  type MenuItem,
} from '@/lib/store'
import { formatNumber, formatWon, todayKey } from '@/lib/format'
import { stockStatus } from '@/lib/stock'
import { Button } from '@/components/ui/button'
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function margin(item: MenuItem): number {
  if (item.price <= 0) return 0
  return ((item.price - item.cost) / item.price) * 100
}

interface EditorState {
  open: boolean
  editing: MenuItem | null
}

export function MenuView() {
  const {
    menus,
    categories,
    settings,
    addMenu,
    updateMenu,
    deleteMenu,
    getStockAtDate,
  } = useStore()
  const [editor, setEditor] = useState<EditorState>({
    open: false,
    editing: null,
  })
  const [filterCategory, setFilterCategory] = useState<string>('전체')
  const today = todayKey()
  const threshold = settings.lowStockThreshold

  const categoryNames = useMemo(() => {
    const set = new Set<string>(categories.map((c) => c.name))
    for (const m of menus) {
      if (m.category.trim()) set.add(m.category)
    }
    return ['전체', ...[...set].sort((a, b) => a.localeCompare(b, 'ko'))]
  }, [menus, categories])

  const sorted = useMemo(() => {
    const list =
      filterCategory === '전체'
        ? [...menus]
        : menus.filter((m) => m.category === filterCategory)
    return list.sort((a, b) => {
      const codeCmp = a.code.localeCompare(b.code, 'ko', { numeric: true })
      if (codeCmp !== 0) return codeCmp
      return a.name.localeCompare(b.name, 'ko')
    })
  }, [menus, filterCategory])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">메뉴 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            상품 마스터(대분류·코드·가격·기초재고)를 관리합니다. (총{' '}
            {menus.length}개)
          </p>
        </div>
        <Button
          onClick={() => {
            if (categories.length === 0) {
              toast.error('관리 페이지에서 대분류를 먼저 등록해 주세요.')
              return
            }
            setEditor({ open: true, editing: null })
          }}
        >
          <Plus />
          메뉴 추가
        </Button>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">상품 목록</CardTitle>
              <CardDescription>
                현재잔량은 오늘 기준(기초재고 + 누적입고 − 누적출고)입니다.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categoryNames.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={filterCategory === cat ? 'default' : 'outline'}
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="text-[13px]">
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="w-14 text-center">번호</TableHead>
                <TableHead className="w-24 text-center">대분류</TableHead>
                <TableHead className="w-24 text-center">상품코드</TableHead>
                <TableHead>상품명</TableHead>
                <TableHead className="w-28 text-right">판매가</TableHead>
                <TableHead className="w-24 text-right">기초재고</TableHead>
                <TableHead className="w-24 text-right">현재잔량</TableHead>
                <TableHead className="w-20 text-right">마진</TableHead>
                <TableHead className="w-24 text-center">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-muted-foreground"
                  >
                    등록된 메뉴가 없습니다. 메뉴를 추가해 주세요.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((item, index) => {
                  const stock = getStockAtDate(item.id, today)
                  const status = stockStatus(stock, threshold)
                  return (
                    <TableRow
                      key={item.id}
                      className="odd:bg-background even:bg-muted/20"
                    >
                      <TableCell className="text-center tabular-nums text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.category}
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums">
                        {item.code}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatWon(item.price)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {formatNumber(item.initialStock)}
                      </TableCell>
                      <TableCell
                        className={
                          status === 'out'
                            ? 'text-right font-mono tabular-nums font-medium text-destructive'
                            : status === 'low'
                              ? 'text-right font-mono tabular-nums font-medium text-chart-3'
                              : 'text-right font-mono tabular-nums font-medium'
                        }
                      >
                        {formatNumber(stock)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {margin(item).toFixed(0)}%
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${item.name} 수정`}
                            onClick={() =>
                              setEditor({ open: true, editing: item })
                            }
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${item.name} 삭제`}
                            onClick={() => {
                              deleteMenu(item.id)
                              toast.success(`'${item.name}' 삭제됨`)
                            }}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <MenuEditorDialog
        state={editor}
        suggestedCode={nextMenuCode(menus)}
        categoryOptions={[...categories]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((c) => c.name)}
        defaultSafetyStock={threshold}
        existingCodes={menus
          .filter((m) => m.id !== editor.editing?.id)
          .map((m) => m.code)}
        onClose={() => setEditor({ open: false, editing: null })}
        onSave={(data) => {
          if (editor.editing) {
            void updateMenu(editor.editing.id, data).then(() =>
              toast.success(`'${data.name}' 수정됨`),
            )
          } else {
            void addMenu(data).then(() =>
              toast.success(`'${data.name}' 추가됨`),
            )
          }
          setEditor({ open: false, editing: null })
        }}
      />
    </div>
  )
}

function MenuEditorDialog({
  state,
  suggestedCode,
  existingCodes,
  categoryOptions,
  defaultSafetyStock,
  onClose,
  onSave,
}: {
  state: EditorState
  suggestedCode: string
  existingCodes: string[]
  categoryOptions: string[]
  defaultSafetyStock: number
  onClose: () => void
  onSave: (data: Omit<MenuItem, 'id'>) => void
}) {
  return (
    <Dialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent showCloseButton className="sm:max-w-md">
        <MenuEditorForm
          key={state.editing?.id ?? `new-${suggestedCode}`}
          state={state}
          suggestedCode={suggestedCode}
          existingCodes={existingCodes}
          categoryOptions={categoryOptions}
          defaultSafetyStock={defaultSafetyStock}
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  )
}

function MenuEditorForm({
  state,
  suggestedCode,
  existingCodes,
  categoryOptions,
  defaultSafetyStock,
  onSave,
}: {
  state: EditorState
  suggestedCode: string
  existingCodes: string[]
  categoryOptions: string[]
  defaultSafetyStock: number
  onSave: (data: Omit<MenuItem, 'id'>) => void
}) {
  const editing = state.editing
  const orphanCategory =
    editing?.category && !categoryOptions.includes(editing.category)
      ? editing.category
      : null
  const defaultCat =
    editing?.category && categoryOptions.includes(editing.category)
      ? editing.category
      : (categoryOptions[0] ?? '')
  const [category, setCategory] = useState(defaultCat)
  const [code, setCode] = useState(editing?.code ?? suggestedCode)
  const [name, setName] = useState(editing?.name ?? '')
  const [price, setPrice] = useState(String(editing?.price ?? ''))
  const [cost, setCost] = useState(String(editing?.cost ?? ''))
  const [initialStock, setInitialStock] = useState(
    String(editing?.initialStock ?? '0'),
  )

  const priceNum = Number(price) || 0
  const costNum = Number(cost) || 0
  const initialNum = Number(initialStock) || 0
  const marginPct =
    priceNum > 0 ? (((priceNum - costNum) / priceNum) * 100).toFixed(0) : '0'

  function submit() {
    const trimmedCategory = category.trim()
    const trimmedCode = code.trim()
    const trimmedName = name.trim()

    if (categoryOptions.length === 0) {
      toast.error('관리 페이지에서 대분류를 먼저 등록해 주세요.')
      return
    }
    if (!trimmedCategory || !categoryOptions.includes(trimmedCategory)) {
      toast.error('관리에 등록된 대분류를 선택하세요.')
      return
    }
    if (!trimmedCode) {
      toast.error('상품코드를 입력하세요.')
      return
    }
    if (existingCodes.includes(trimmedCode)) {
      toast.error('이미 사용 중인 상품코드입니다.')
      return
    }
    if (!trimmedName) {
      toast.error('상품명을 입력하세요.')
      return
    }
    if (priceNum <= 0) {
      toast.error('판매가를 입력하세요.')
      return
    }

    onSave({
      category: trimmedCategory,
      code: trimmedCode,
      name: trimmedName,
      price: priceNum,
      cost: costNum,
      initialStock: initialNum,
      safetyStock: editing?.safetyStock ?? defaultSafetyStock,
    })
  }

  const categoryItems = Object.fromEntries(
    categoryOptions.map((c) => [c, c]),
  )

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? '메뉴 수정' : '메뉴 추가'}</DialogTitle>
        <DialogDescription>
          대분류, 상품코드, 상품명, 가격, 기초재고를 입력하세요. 부족 기준은
          관리 페이지에서 일괄 설정합니다.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-2">
        <div className="grid gap-2">
          <Label>대분류</Label>
          {categoryOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              관리 페이지에서 대분류를 먼저 등록해 주세요.
            </p>
          ) : (
            <>
              <Select
                items={categoryItems}
                value={category}
                onValueChange={(v) => {
                  if (v) setCategory(v)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="대분류 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {orphanCategory ? (
                <p className="text-xs text-muted-foreground">
                  기존 대분류 '{orphanCategory}'는 관리에 없습니다. 등록된
                  대분류로 다시 선택해 주세요.
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="menu-code">상품코드</Label>
          <Input
            id="menu-code"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/[^0-9A-Za-z-]/g, ''))
            }
            placeholder="00001"
            className="font-mono"
            maxLength={20}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="menu-name">상품명</Label>
          <Input
            id="menu-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 삼겹살"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="menu-price">판매가 (원)</Label>
            <Input
              id="menu-price"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0"
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="menu-cost">원가 (원)</Label>
            <Input
              id="menu-cost"
              inputMode="numeric"
              value={cost}
              onChange={(e) => setCost(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0"
              className="font-mono"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="menu-initial">기초재고</Label>
          <Input
            id="menu-initial"
            inputMode="numeric"
            value={initialStock}
            onChange={(e) =>
              setInitialStock(e.target.value.replace(/[^0-9]/g, ''))
            }
            placeholder="0"
            className="font-mono"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          예상 마진율{' '}
          <span className="font-medium text-foreground">{marginPct}%</span>
          {priceNum > 0 ? ` · 개당 ${formatWon(priceNum - costNum)}` : ''}
          {' · '}
          부족 기준 {defaultSafetyStock}개 (관리)
        </p>
      </div>

      <DialogFooter>
        <DialogClose render={<Button variant="outline">취소</Button>} />
        <Button onClick={submit} disabled={categoryOptions.length === 0}>
          {editing ? '저장' : '추가'}
        </Button>
      </DialogFooter>
    </>
  )
}
