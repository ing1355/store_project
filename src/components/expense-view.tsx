import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { formatFullDate, formatWon, todayKey, toDateKey } from '@/lib/format'
import { expensesOnDate, sumAmounts } from '@/lib/analytics'
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
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/stat-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function ExpenseView() {
  const {
    expenseCategories,
    expenses,
    addExpenseCategory,
    renameExpenseCategory,
    deleteExpenseCategory,
    addExpense,
    deleteExpense,
  } = useStore()

  const [dateKey, setDateKey] = useState(todayKey())
  const [category, setCategory] = useState(
    expenseCategories[0]?.name ?? '',
  )
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('')
  const [memo, setMemo] = useState('')

  const [catName, setCatName] = useState('')
  const [editCat, setEditCat] = useState<{
    open: boolean
    id: string
    name: string
  }>({ open: false, id: '', name: '' })

  useEffect(() => {
    if (
      expenseCategories.length > 0 &&
      !expenseCategories.some((c) => c.name === category)
    ) {
      setCategory(expenseCategories[0].name)
    }
  }, [expenseCategories, category])

  const dayExpenses = useMemo(
    () => expensesOnDate(expenses, dateKey),
    [expenses, dateKey],
  )
  const dayTotal = sumAmounts(dayExpenses)

  const categoryItems = useMemo(
    () =>
      Object.fromEntries(expenseCategories.map((c) => [c.name, c.name])) as Record<
        string,
        string
      >,
    [expenseCategories],
  )

  async function registerExpense() {
    const amt = Number(amount)
    if (!category) {
      toast.error('지출 분류를 선택하세요.')
      return
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('금액을 입력하세요.')
      return
    }
    await addExpense({
      date: dateKey,
      category,
      description: description.trim() || category,
      amount: Math.round(amt),
      vendor: vendor.trim() || undefined,
      memo: memo.trim() || undefined,
    })
    toast.success(`${formatWon(amt)} 지출 등록`)
    setDescription('')
    setAmount('')
    setVendor('')
    setMemo('')
  }

  async function addCategory() {
    try {
      await addExpenseCategory(catName)
      toast.success('지출 분류 추가됨')
      setCatName('')
      if (!category) setCategory(catName.trim())
    } catch {
      /* toasted in store */
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">지출 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          운영지출(물품구입 등) 목록과 분류 마스터를 관리합니다.
        </p>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">일일 지출</TabsTrigger>
          <TabsTrigger value="categories">분류 마스터</TabsTrigger>
          <TabsTrigger value="all">전체 목록</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4 flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatCard
                label="당일 지출"
                value={formatWon(dayTotal)}
                icon={<Wallet />}
              />
              <StatCard label="건수" value={`${dayExpenses.length}건`} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="expense-date" className="text-xs">
                날짜 선택
              </Label>
              <Input
                id="expense-date"
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

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">지출 등록</CardTitle>
                <CardDescription>
                  {formatFullDate(dateKey)} 운영지출을 입력합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label>분류</Label>
                  <Select
                    items={categoryItems}
                    value={category}
                    onValueChange={(v) => {
                      if (v) setCategory(v)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="분류 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="exp-desc">내용</Label>
                  <Input
                    id="exp-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="예: 주방용품 구매"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="exp-vendor">거래처</Label>
                  <Input
                    id="exp-vendor"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="예: 동원PNB"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="exp-amt">금액</Label>
                  <Input
                    id="exp-amt"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value.replace(/[^0-9]/g, ''))
                    }
                    className="font-mono"
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="exp-memo">메모</Label>
                  <Input
                    id="exp-memo"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                  />
                </div>
                <Button onClick={() => void registerExpense()}>
                  <Plus />
                  지출 등록
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">당일 지출 목록</CardTitle>
                  <Badge variant="secondary">{dayExpenses.length}건</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {dayExpenses.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    이 날짜에 등록된 지출이 없습니다.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>분류</TableHead>
                        <TableHead>내용</TableHead>
                        <TableHead>거래처</TableHead>
                        <TableHead className="text-right">금액</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayExpenses.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>
                            <Badge variant="outline">{e.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{e.description}</span>
                            {e.memo ? (
                              <span className="ml-1 text-xs text-muted-foreground">
                                · {e.memo}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {e.vendor || '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatWon(e.amount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              aria-label="지출 삭제"
                              onClick={() => {
                                void deleteExpense(e.id).then(() =>
                                  toast.success('지출 삭제됨'),
                                )
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
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">지출 분류</CardTitle>
              <CardDescription>
                일일 입력·결산에서 사용하는 운영지출 분류입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Input
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="새 분류명"
                  className="max-w-xs"
                />
                <Button onClick={() => void addCategory()}>
                  <Plus />
                  추가
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>분류명</TableHead>
                    <TableHead className="w-24 text-right">순서</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseCategories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {c.sortOrder}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label="수정"
                          onClick={() =>
                            setEditCat({ open: true, id: c.id, name: c.name })
                          }
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label="삭제"
                          onClick={() => {
                            void deleteExpenseCategory(c.id).then(() =>
                              toast.success('분류 삭제됨'),
                            )
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">전체 지출 목록</CardTitle>
              <CardDescription>최근 등록순</CardDescription>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  등록된 지출이 없습니다.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>날짜</TableHead>
                      <TableHead>분류</TableHead>
                      <TableHead>내용</TableHead>
                      <TableHead>거래처</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.slice(0, 100).map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs tabular-nums">
                          {e.date}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{e.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{e.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {e.vendor || '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatWon(e.amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="삭제"
                            onClick={() => {
                              void deleteExpense(e.id).then(() =>
                                toast.success('지출 삭제됨'),
                              )
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
        </TabsContent>
      </Tabs>

      <Dialog
        open={editCat.open}
        onOpenChange={(open) => setEditCat((s) => ({ ...s, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>지출 분류 수정</DialogTitle>
            <DialogDescription>
              기존 지출 기록의 분류명도 함께 변경됩니다.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={editCat.name}
            onChange={(e) =>
              setEditCat((s) => ({ ...s, name: e.target.value }))
            }
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline">취소</Button>} />
            <Button
              onClick={() => {
                void renameExpenseCategory(editCat.id, editCat.name).then(
                  () => {
                    toast.success('분류 수정됨')
                    setEditCat({ open: false, id: '', name: '' })
                  },
                )
              }}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
