'use client'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import styles from './lobby.module.css'

export default function LobbyPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [checkingCurrentLobby, setCheckingCurrentLobby] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Verificar se o usuário já está em um lobby
  useEffect(() => {
    if (!user || loading || !mounted) return

    const checkCurrentLobby = async () => {
      try {
        const supabase = createClient()
        
        // Verificar se o usuário é membro de algum lobby ativo (não saiu ainda)
        const { data: memberData, error: memberError } = await supabase
          .from('lobby_members')
          .select(`
            lobby_id,
            lobbies!inner(
              id,
              status,
              title
            )
          `)
          .eq('user_id', user.id)
          .is('left_at', null) // Só considerar se ainda não saiu
          .in('lobbies.status', ['waiting', 'full'])
          .maybeSingle()

        if (memberError) {
          console.error('Erro ao verificar lobby atual:', memberError)
        }

        if (memberData) {
          console.log('🏠 Usuário já está no lobby:', memberData.lobby_id)
          router.push(`/lobby/${memberData.lobby_id}`)
          return
        }

        // Verificar se o usuário é criador de algum lobby ativo
        const { data: creatorData, error: creatorError } = await supabase
          .from('lobbies')
          .select('id, status, title')
          .eq('creator_id', user.id)
          .in('status', ['waiting', 'full'])
          .maybeSingle()

        if (creatorError) {
          console.error('Erro ao verificar lobby criado:', creatorError)
        }

        if (creatorData) {
          console.log('🏠 Usuário é criador do lobby:', creatorData.id)
          router.push(`/lobby/${creatorData.id}`)
          return
        }

        console.log('✅ Usuário não está em nenhum lobby ativo')
      } catch (err) {
        console.error('Erro ao verificar lobby atual:', err)
      } finally {
        setCheckingCurrentLobby(false)
      }
    }

    checkCurrentLobby()
  }, [user, loading, mounted, router])

  if (loading || !mounted || checkingCurrentLobby) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>{checkingCurrentLobby ? 'Verificando lobby atual...' : 'Carregando...'}</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className={styles.container}>
      <Navbar />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Sistema de Matchmaking</h1>
            <p className={styles.subtitle}>
              Crie um lobby específico ou entre na fila para encontrar jogadores compatíveis
            </p>
          </div>

          <div className={styles.optionsGrid}>
            {/* Criar Lobby */}
            <div className={styles.option}>
              <div className={styles.optionIcon}>
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 5V19M5 12H19"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className={styles.optionTitle}>Criar Lobby</h3>
              <p className={styles.optionDescription}>
                Monte um lobby específico com requisitos definidos. O sistema buscará jogadores compatíveis automaticamente.
              </p>
              <div className={styles.optionFeatures}>
                <span className={styles.feature}>🎮 Escolha o modo de jogo</span>
                <span className={styles.feature}>🎯 Defina roles necessárias</span>
                <span className={styles.feature}>📊 Configure requisitos de elo</span>
              </div>
              <Link href="/lobby/create" className={styles.optionButton}>
                Criar Novo Lobby
              </Link>
            </div>

            {/* Entrar na Fila */}
            <div className={styles.option}>
              <div className={styles.optionIcon}>
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 6v6l4 2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className={styles.optionTitle}>Entrar na Fila</h3>
              <p className={styles.optionDescription}>
                Entre na fila de matchmaking. O sistema encontrará um lobby compatível ou criará um novo para você.
              </p>
              <div className={styles.optionFeatures}>
                <span className={styles.feature}>⚡ Matchmaking automático</span>
                <span className={styles.feature}>📊 Baseado no seu elo</span>
                <span className={styles.feature}>🎯 Suas roles preferidas</span>
                <span className={styles.feature}>🔄 Notificação quando encontrar</span>
              </div>
              <Link href="/lobby/queue" className={styles.optionButton}>
                Entrar na Fila
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
