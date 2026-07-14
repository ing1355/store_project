import { useEffect, useState } from 'react'
import { Pencil, Plus, Settings, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function SettingsView() {
  const {
    settings,
    categories,
    menus,
    updateSettings,
    addCategory,
    renameCategory,
    deleteCategory,
  } = useStore()

  const [threshold, setThreshold] = useState(
    String(settings.lowStockThreshold),
  )
  const [newCategory, setNewCategory] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setThreshold(String(settings.lowStockThreshold))
  }, [settings.lowStockThreshold])

  async function saveThreshold() {
    const n = Number(threshold)
    if (!Number.isFinite(n) || n < 0) {
      toast.error('0 이상의 숫자를 입력하세요.')
      return
    }
    setSaving(true)
    try {
      await updateSettings({ lowStockThreshold: Math.floor(n) })
      toast.success('부족 기준이 저장되었습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddCategory() {
    try {
      await addCategory(newCategory)
      setNewCategory('')
      toast.success('대분류가 추가되었습니다.')
    } catch {
      /* toasted in store */
    }
  }

  async function handleRename(id: string) {
    try {
      await renameCategory(id, editingName)
      setEditingId(null)
      toast.success('대분류가 수정되었습니다.')
    } catch {
      /* toasted */
    }
  }

  async function handleDelete(id: string, name: string) {
    const inUse = menus.some((m) => m.category === name)
    if (inUse) {
      toast.error(
        `'${name}'을(를) 쓰는 메뉴가 있어 삭제할 수 없습니다. 메뉴 대분류를 먼저 변경하세요.`,
      )
      return
    }
    try {
      await deleteCategory(id)
      toast.success('대분류가 삭제되었습니다.')
    } catch {
      /* toasted */
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          재고 부족 기준과 메뉴 대분류를 설정합니다. 변경 내용은 DB에
          저장됩니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">재고 부족 기준</CardTitle>
          </div>
          <CardDescription>
            잔량이 이 수량 이하이면 「부족」으로 표시합니다. (0이면 「소진」만
            구분)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid gap-2">
            <Label htmlFor="low-stock">부족 기준 수량</Label>
            <Input
              id="low-stock"
              inputMode="numeric"
              value={threshold}
              onChange={(e) =>
                setThreshold(e.target.value.replace(/[^0-9]/g, ''))
              }
              className="w-40 font-mono"
            />
          </div>
          <Button onClick={() => void saveThreshold()} disabled={saving}>
            저장
          </Button>
          <p className="w-full text-sm text-muted-foreground">
            현재 적용 중: 잔량 ≤{' '}
            <span className="font-medium text-foreground">
              {settings.lowStockThreshold}
            </span>
            개 → 부족
          </p>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle className="text-base">대분류 관리</CardTitle>
          <CardDescription>
            메뉴에 사용하는 대분류 목록입니다. 이름 변경 시 기존 메뉴에도
            반영됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="새 대분류명"
              className="max-w-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddCategory()
              }}
            />
            <Button onClick={() => void handleAddCategory()}>
              <Plus />
              추가
            </Button>
          </div>

          <Table className="text-[13px]">
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="w-16 text-center">순서</TableHead>
                <TableHead>대분류명</TableHead>
                <TableHead className="w-24 text-center">메뉴 수</TableHead>
                <TableHead className="w-28 text-center">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-20 text-center text-muted-foreground"
                  >
                    등록된 대분류가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => {
                  const count = menus.filter(
                    (m) => m.category === cat.name,
                  ).length
                  const isEditing = editingId === cat.id
                  return (
                    <TableRow key={cat.id}>
                      <TableCell className="text-center tabular-nums text-muted-foreground">
                        {cat.sortOrder}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="max-w-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void handleRename(cat.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                          />
                        ) : (
                          <span className="font-medium">{cat.name}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {count}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-0.5">
                          {isEditing ? (
                            <Button
                              size="sm"
                              onClick={() => void handleRename(cat.id)}
                            >
                              확인
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`${cat.name} 수정`}
                              onClick={() => {
                                setEditingId(cat.id)
                                setEditingName(cat.name)
                              }}
                            >
                              <Pencil />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${cat.name} 삭제`}
                            onClick={() => void handleDelete(cat.id, cat.name)}
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
    </div>
  )
}
