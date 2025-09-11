'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-client'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Obter sessão inicial
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('AuthProvider - Sessão inicial:', session ? 'Presente' : 'Ausente', error)
        setUser(session?.user ?? null)
      } catch (err) {
        console.error('Erro ao obter sessão inicial:', err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('AuthProvider - Mudança de auth:', event, session ? 'Usuário presente' : 'Usuário ausente')
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      // Limpar localStorage e sessionStorage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      // Recarregar a página para garantir limpeza completa
      window.location.href = '/'
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  const value = {
    user,
    loading,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
