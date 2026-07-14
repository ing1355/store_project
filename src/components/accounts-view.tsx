import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AccountRow {
  id: string
  username: string
  display_name: string
}

export function AccountsView() {
  const { user, profile, refreshProfile } = useAuth()
  const [rows, setRows] = useState<AccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState<AccountRow | null>(null)

  async function load() {
    const sb = getSupabase()
    if (!sb) return
    setLoading(true)
    try {
      const { data, error } = await sb
        .from('profiles')
        .select('id, username, display_name')
        .order('username')
      if (error) throw error
      setRows((data ?? []) as AccountRow[])
    } catch (err) {
      toast.error(
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : '계정 목록을 불러오지 못했습니다.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleDelete(row: AccountRow) {
    if (row.id === user?.id) {
      toast.error('자기 자신은 삭제할 수 없습니다.')
      return
    }
    const sb = getSupabase()
    if (!sb) return
    try {
      const { error } = await sb.rpc('admin_delete_account', {
        p_user_id: row.id,
      })
      if (error) throw error
      toast.success(`'${row.username}' 계정이 삭제되었습니다.`)
      await load()
    } catch (err) {
      toast.error(
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : '삭제 실패',
      )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">계정 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            아이디 · 이름 · 비밀번호를 관리합니다.
            {profile ? ` (로그인: ${profile.username})` : ''}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          계정 추가
        </Button>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">계정 목록</CardTitle>
          </div>
          <CardDescription>
            로그인은 아이디/비밀번호로 합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              불러오는 중…
            </p>
          ) : (
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead>아이디</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead className="w-28 text-center">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono font-medium">
                      {row.username}
                      {row.id === user?.id ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (나)
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{row.display_name}</TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="수정"
                          onClick={() => setEditOpen(row)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="삭제"
                          disabled={row.id === user?.id}
                          onClick={() => void handleDelete(row)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateAccountDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false)
          await load()
        }}
      />
      <EditAccountDialog
        account={editOpen}
        onClose={() => setEditOpen(null)}
        onSaved={async () => {
          setEditOpen(null)
          await load()
          await refreshProfile()
        }}
      />
    </div>
  )
}

function CreateAccountDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setUsername('')
      setName('')
      setPassword('')
    }
  }, [open])

  async function submit() {
    const sb = getSupabase()
    if (!sb) return
    setSaving(true)
    try {
      const { error } = await sb.rpc('admin_create_account', {
        p_username: username,
        p_display_name: name,
        p_password: password,
      })
      if (error) throw error
      toast.success('계정이 추가되었습니다.')
      await onCreated()
    } catch (err) {
      toast.error(
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : '추가 실패',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>계정 추가</DialogTitle>
          <DialogDescription>
            아이디 · 이름 · 비밀번호를 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <Label>아이디</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="영문/숫자/_"
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label>이름</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="표시 이름"
            />
          </div>
          <div className="grid gap-2">
            <Label>비밀번호</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">취소</Button>} />
          <Button disabled={saving} onClick={() => void submit()}>
            추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditAccountDialog({
  account,
  onClose,
  onSaved,
}: {
  account: AccountRow | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (account) {
      setName(account.display_name)
      setPassword('')
    }
  }, [account])

  async function submit() {
    if (!account) return
    const sb = getSupabase()
    if (!sb) return
    setSaving(true)
    try {
      const { error: nameErr } = await sb.rpc('admin_update_profile', {
        p_user_id: account.id,
        p_display_name: name,
      })
      if (nameErr) throw nameErr
      if (password.trim()) {
        const { error: pwErr } = await sb.rpc('admin_set_password', {
          p_user_id: account.id,
          p_password: password,
        })
        if (pwErr) throw pwErr
      }
      toast.success('계정이 수정되었습니다.')
      await onSaved()
    } catch (err) {
      toast.error(
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : '수정 실패',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(account)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>계정 수정</DialogTitle>
          <DialogDescription>
            아이디 <span className="font-mono">{account?.username}</span> — 이름과
            비밀번호를 변경할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <Label>이름</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>새 비밀번호 (변경 시에만 입력)</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비워 두면 유지"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">취소</Button>} />
          <Button disabled={saving} onClick={() => void submit()}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
