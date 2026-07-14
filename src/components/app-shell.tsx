import { useState, type ReactNode } from 'react'
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  Store,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { DashboardView } from '@/components/dashboard-view'
import { MenuView } from '@/components/menu-view'
import { SalesView } from '@/components/sales-view'
import { InventoryView } from '@/components/inventory-view'
import { SettingsView } from '@/components/settings-view'
import { AccountsView } from '@/components/accounts-view'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type ViewKey =
  | 'dashboard'
  | 'sales'
  | 'menu'
  | 'inventory'
  | 'settings'
  | 'accounts'

const NAV: {
  key: ViewKey
  label: string
  desc: string
  icon: ReactNode
}[] = [
  {
    key: 'dashboard',
    label: '대시보드',
    desc: '성과 · 현황',
    icon: <LayoutDashboard />,
  },
  { key: 'sales', label: '일일 매출', desc: '결산 · 출고', icon: <Receipt /> },
  {
    key: 'menu',
    label: '메뉴 관리',
    desc: '상품 관리',
    icon: <UtensilsCrossed />,
  },
  { key: 'inventory', label: '재고 관리', desc: '일일 입고', icon: <Boxes /> },
  { key: 'settings', label: '관리', desc: '기준 · 대분류', icon: <Settings /> },
  { key: 'accounts', label: '계정 관리', desc: '로그인 계정', icon: <Users /> },
]

export function AppShell() {
  const [view, setView] = useState<ViewKey>('dashboard')
  const { loading, ready, usingLocal, error, refresh } = useStore()
  const { profile, signOut, skipAuth } = useAuth()

  if (loading && !ready) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 bg-muted/30">
        <p className="text-sm font-medium">데이터를 불러오는 중…</p>
        <p className="text-xs text-muted-foreground">잠시만 기다려 주세요.</p>
      </div>
    )
  }

  if (error && !ready) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-muted/30 px-4">
        <p className="text-sm text-destructive">DB 연결 실패: {error}</p>
        <Button variant="outline" onClick={() => void refresh()}>
          다시 시도
        </Button>
        {!skipAuth ? (
          <Button
            variant="ghost"
            onClick={() =>
              void signOut().catch(() => toast.error('로그아웃 실패'))
            }
          >
            로그아웃
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-muted/30 lg:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 z-20 hidden h-svh w-64 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">스토어 매니저</p>
            <p className="text-xs text-muted-foreground">
              {profile
                ? `${profile.displayName} (@${profile.username})`
                : '매출 · 재고 관리'}
            </p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {NAV.filter((item) => skipAuth ? item.key !== 'accounts' : true).map(
            (item) => (
            <NavButton
              key={item.key}
              active={view === item.key}
              onClick={() => setView(item.key)}
              icon={item.icon}
              label={item.label}
              desc={item.desc}
            />
            ),
          )}
        </nav>
        <div className="space-y-2 px-5 py-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {usingLocal
              ? '로컬 샘플 모드입니다.'
              : '로그인되어 있습니다.'}
          </p>
          {!skipAuth ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                void signOut()
                  .then(() => toast.success('로그아웃되었습니다.'))
                  .catch(() => toast.error('로그아웃 실패'))
              }
            >
              <LogOut className="size-4" />
              로그아웃
            </Button>
          ) : null}
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-sidebar px-4 py-3 lg:hidden">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Store className="size-4" />
        </div>
        <p className="text-sm font-semibold">스토어 매니저</p>
      </header>

      {/* Mobile nav (bottom) */}
      <nav className="sticky bottom-0 z-20 order-last flex border-t bg-sidebar lg:hidden">
        {NAV.filter((item) => (skipAuth ? item.key !== 'accounts' : true)).map(
          (item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setView(item.key)}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors [&_svg]:size-5',
              view === item.key
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.icon}
            {item.label}
          </button>
          ),
        )}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {view === 'dashboard' && <DashboardView />}
          {view === 'sales' && <SalesView />}
          {view === 'menu' && <MenuView />}
          {view === 'inventory' && <InventoryView />}
          {view === 'settings' && <SettingsView />}
          {view === 'accounts' && <AccountsView />}
        </div>
      </main>
    </div>
  )
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  desc,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors [&_svg]:size-4.5 [&_svg]:shrink-0',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground/70 hover:bg-muted hover:text-foreground',
      )}
    >
      {icon}
      <span className="leading-tight">
        <span className="block text-sm font-medium">{label}</span>
        <span
          className={cn(
            'block text-xs',
            active ? 'text-primary-foreground/80' : 'text-muted-foreground',
          )}
        >
          {desc}
        </span>
      </span>
    </button>
  )
}
