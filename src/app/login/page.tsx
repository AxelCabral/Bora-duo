'use client'
import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import styles from './login.module.css'

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  useEffect(() => {
    // Verificar se há erro na URL (vindo do callback)
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }
  }, [searchParams])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('Tentando fazer login com:', { email })

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      
      console.log('Resposta do login:', { data, error })
      
      if (error) {
        console.error('Erro no login:', error)
        setError(error.message)
        return
      }

      if (data.user) {
        console.log('Login bem-sucedido, usuário:', data.user.email)
        // Verificar se há redirectTo na URL
        const redirectTo = searchParams.get('redirectTo')
        const targetPath = redirectTo || '/perfil'
        
        console.log('Redirecionando para:', targetPath)
        
        // Aguardar um pouco para garantir que a sessão foi estabelecida
        setTimeout(() => {
          try {
            router.push(targetPath)
          } catch (err) {
            console.error('Erro ao usar router.push, usando window.location:', err)
            window.location.href = targetPath
          }
        }, 500)
      } else {
        setError('Erro: usuário não retornado')
      }
    } catch (err) {
      console.error('Erro inesperado:', err)
      setError('Erro inesperado ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <div className={styles.formContainer}>
          {/* Header com Logo e Botão Voltar */}
          <div className={styles.header}>
            <Link href="/" className={styles.backButton}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="/" className={styles.logo}>
              <img src="/logo-boraduo.png" alt="Bora Duo Logo" className={styles.logoImage} />
            </Link>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
              Fazer login
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className={styles.form}>
            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="email">NOME DE USUÁRIO</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Digite seu email"
                required
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">SENHA</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                disabled={loading}
              />
            </div>

            {/* Remember Me */}
            <div className={styles.rememberMe}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
                <span className={styles.checkmark}></span>
                Manter login
              </label>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={loading}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 7L18 12L13 17M6 12H18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>

          {/* Footer Links */}
          <div className={styles.footer}>
            <Link href="/signup" className={styles.footerLink}>
              NÃO CONSEGUE FAZER LOGIN?
            </Link>
            
            <div className={styles.footerText}>
              <div className={styles.footerLinks}>
                <Link href="/privacy" className={styles.footerLink}>POLÍTICA DE PRIVACIDADE</Link>
                <Link href="/terms" className={styles.footerLink}>TERMOS DE SERVIÇO</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Game Artwork */}
      <div className={styles.rightPanel}>
        <div className={styles.gameArtwork}>
          <div className={styles.character}>🎮</div>
          <div className={styles.character}>⚔️</div>
          <div className={styles.character}>🏆</div>
          <div className={styles.character}>⭐</div>
          <div className={styles.character}>🔥</div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LoginForm />
    </Suspense>
  )
}
