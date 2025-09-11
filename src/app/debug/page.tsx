'use client'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

export default function DebugPage() {
  const { user, loading, signOut } = useAuth()
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [cookies, setCookies] = useState<string>('')

  useEffect(() => {
    const getSessionInfo = async () => {
      const { data, error } = await supabase.auth.getSession()
      setSessionInfo({ data, error })
    }
    getSessionInfo()

    // Mostrar cookies
    if (typeof document !== 'undefined') {
      setCookies(document.cookie)
    }
  }, [])

  const clearAll = async () => {
    await signOut()
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Debug de Autenticação</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>Estado do AuthProvider:</h2>
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#1a1a1a', 
          borderRadius: '8px',
          fontFamily: 'monospace'
        }}>
          <p>Loading: {loading ? 'Sim' : 'Não'}</p>
          <p>Usuário: {user ? user.email : 'Nenhum'}</p>
          <p>ID do usuário: {user?.id || 'N/A'}</p>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Informações da Sessão:</h2>
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#1a1a1a', 
          borderRadius: '8px',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap'
        }}>
          {sessionInfo ? JSON.stringify(sessionInfo, null, 2) : 'Carregando...'}
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Cookies:</h2>
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#1a1a1a', 
          borderRadius: '8px',
          fontFamily: 'monospace',
          wordBreak: 'break-all'
        }}>
          {cookies || 'Nenhum cookie encontrado'}
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Ações:</h2>
        <button 
          onClick={clearAll}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#dc2626', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Limpar Tudo e Fazer Logout
        </button>
      </div>
    </div>
  )
}
