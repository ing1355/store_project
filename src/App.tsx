import { AppShell } from '@/components/app-shell'
import { LoginView } from '@/components/login-view'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider, useAuth } from '@/lib/auth'
import { StoreProvider } from '@/lib/store'

function AppGate() {
  const { skipAuth, loading: authLoading, session } = useAuth()

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">인증 확인 중…</p>
      </div>
    )
  }

  if (!skipAuth && !session) {
    return <LoginView />
  }

  return (
    <StoreProvider enabled>
      <AppShell />
    </StoreProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
      <Toaster position="top-center" />
    </AuthProvider>
  )
}
