'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import styles from './signup.module.css'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return 'A senha deve ter pelo menos 6 caracteres'
    }
    return null
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validações
    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      setLoading(false)
      return
    }

    if (!acceptTerms) {
      setError('Você deve aceitar os termos de serviço')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({ email, password })
      
      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        // Criar perfil do usuário
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ 
            user_id: data.user.id,
            nickname: email.split('@')[0], // Usar parte do email como nickname inicial
            roles_preference: []
          })
        
        if (profileError) {
          console.error('Erro ao criar perfil:', profileError)
        }
      }

      setSuccess(true)
    } catch (err) {
      setError('Erro inesperado ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.leftPanel}>
          <div className={styles.formContainer}>
            <div className={styles.success}>
              <div className={styles.successIcon}>✅</div>
              <h1>Conta criada com sucesso!</h1>
              <p>Verifique seu email para confirmar a conta e começar a formar premades.</p>
              <Link href="/login" className={styles.submitButton}>
                Fazer Login
              </Link>
            </div>
          </div>
        </div>
        <div className={styles.rightPanel}>
          <div className={styles.gameArtwork}>
            <div className={styles.character}>🎉</div>
            <div className={styles.character}>⚔️</div>
            <div className={styles.character}>🏆</div>
          </div>
        </div>
      </div>
    )
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
              Criar conta
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className={styles.form}>
            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="email">EMAIL</label>
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
                placeholder="Mínimo 6 caracteres"
                required
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="confirmPassword">CONFIRMAR SENHA</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                required
                disabled={loading}
              />
            </div>

            {/* Terms Acceptance */}
            <div className={styles.terms}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={e => setAcceptTerms(e.target.checked)}
                />
                <span className={styles.checkmark}></span>
                Aceito os <Link href="/terms" className={styles.termsLink}>Termos de Serviço</Link> e <Link href="/privacy" className={styles.termsLink}>Política de Privacidade</Link>
              </label>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={loading || !acceptTerms}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 7L18 12L13 17M6 12H18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>

          {/* Footer Links */}
          <div className={styles.footer}>
            <Link href="/login" className={styles.footerLink}>
              JÁ TEM UMA CONTA? FAZER LOGIN
            </Link>
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
