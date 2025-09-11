'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setResult('Testando conexão...')

    try {
      // Testar conexão básica
      const { data, error } = await supabase.from('profiles').select('count').limit(1)
      
      if (error) {
        setResult(`❌ Erro na conexão: ${error.message}`)
      } else {
        setResult('✅ Conexão com Supabase funcionando!')
      }
    } catch (err) {
      setResult(`❌ Erro inesperado: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const testAuth = async () => {
    setLoading(true)
    setResult('Testando autenticação...')

    try {
      // Testar se consegue acessar auth
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        setResult(`❌ Erro na autenticação: ${error.message}`)
      } else {
        setResult(`✅ Auth funcionando! Sessão: ${data.session ? 'Ativa' : 'Inativa'}`)
      }
    } catch (err) {
      setResult(`❌ Erro inesperado: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Teste de Conexão Supabase</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <button 
          onClick={testConnection}
          disabled={loading}
          style={{ marginRight: '1rem', padding: '0.5rem 1rem' }}
        >
          Testar Conexão
        </button>
        
        <button 
          onClick={testAuth}
          disabled={loading}
          style={{ padding: '0.5rem 1rem' }}
        >
          Testar Auth
        </button>
      </div>

      <div style={{ 
        padding: '1rem', 
        backgroundColor: '#1a1a1a', 
        borderRadius: '8px',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap'
      }}>
        {result || 'Clique em um dos botões para testar'}
      </div>

      <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
        <h3>Variáveis de ambiente:</h3>
        <p>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Definida' : '❌ Não definida'}</p>
        <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Definida' : '❌ Não definida'}</p>
      </div>
    </div>
  )
}
