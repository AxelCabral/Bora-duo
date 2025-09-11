'use client'
import { useSearchParams } from 'next/navigation'

export default function TestRedirectPage() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Teste de Redirecionamento</h1>
      
      <div style={{ 
        padding: '1rem', 
        backgroundColor: '#1a1a1a', 
        borderRadius: '8px',
        fontFamily: 'monospace'
      }}>
        <p>redirectTo na URL: {redirectTo || 'Nenhum'}</p>
        <p>URL completa: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3>Teste de Redirecionamento:</h3>
        <button 
          onClick={() => window.location.href = '/login?redirectTo=%2Fperfil'}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#c89b3c', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '1rem'
          }}
        >
          Ir para Login com redirectTo
        </button>
        
        <button 
          onClick={() => window.location.href = '/perfil'}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#dc2626', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Ir para Perfil Direto
        </button>
      </div>
    </div>
  )
}
