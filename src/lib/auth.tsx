import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

export interface Profile {
  id: string
  username: string
  displayName: string
}

interface AuthContextValue {
  /** true when Supabase is not configured (local demo) */
  skipAuth: boolean
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@store.local`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const skipAuth = !isSupabaseConfigured()
  const [loading, setLoading] = useState(!skipAuth)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProfile = useCallback(async (userId: string) => {
    const sb = getSupabase()
    if (!sb) return
    const { data, error } = await sb
      .from('profiles')
      .select('id, username, display_name')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw error
    if (data) {
      setProfile({
        id: data.id,
        username: data.username,
        displayName: data.display_name,
      })
    } else {
      setProfile(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!session?.user) {
      setProfile(null)
      return
    }
    await loadProfile(session.user.id)
  }, [session, loadProfile])

  useEffect(() => {
    if (skipAuth) {
      setLoading(false)
      return
    }
    const sb = getSupabase()
    if (!sb) {
      setLoading(false)
      return
    }

    let mounted = true
    void sb.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        try {
          await loadProfile(data.session.user.id)
        } catch {
          setProfile(null)
        }
      }
      setLoading(false)
    })

    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (next?.user) {
        void loadProfile(next.user.id).catch(() => setProfile(null))
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [skipAuth, loadProfile])

  const signIn = useCallback(async (username: string, password: string) => {
    const sb = getSupabase()
    if (!sb) throw new Error('데이터베이스가 설정되지 않았습니다.')
    const email = usernameToEmail(username)
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const sb = getSupabase()
    if (!sb) return
    const { error } = await sb.auth.signOut()
    if (error) throw error
    setProfile(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      skipAuth,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      signIn,
      signOut,
      refreshProfile,
    }),
    [skipAuth, loading, session, profile, signIn, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
