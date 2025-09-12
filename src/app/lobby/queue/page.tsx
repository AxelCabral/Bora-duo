'use client'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { GameMode, LolRole, LolRank, Profile } from '@/types/database'
import MatchmakingStats from '@/components/MatchmakingStats'
import MatchNotification from '@/components/MatchNotification'
import { useMatchmakingDetection } from '@/hooks/useMatchmakingDetection'
import styles from './queue.module.css'

const GAME_MODES: GameMode[] = ['ranked_solo_duo', 'ranked_flex', 'normal_draft', 'aram']

const GAME_MODE_LABELS: Record<GameMode, string> = {
  ranked_solo_duo: 'Ranqueada Solo/Duo',
  ranked_flex: 'Ranqueada Flexível',
  normal_draft: 'Normal Draft',
  aram: 'ARAM'
}

const ROLES: LolRole[] = ['top', 'jungle', 'mid', 'adc', 'support', 'fill']

const ROLE_LABELS: Record<LolRole, string> = {
  top: 'Top',
  jungle: 'Jungle',
  mid: 'Mid',
  adc: 'ADC',
  support: 'Support',
  fill: 'Fill'
}

const RANKS: LolRank[] = [
  'iron', 'bronze', 'silver', 'gold', 'platinum', 
  'emerald', 'diamond', 'master', 'grandmaster', 'challenger'
]

const RANK_LABELS: Record<LolRank, string> = {
  iron: 'Ferro',
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  platinum: 'Platina',
  emerald: 'Esmeralda',
  diamond: 'Diamante',
  master: 'Mestre',
  grandmaster: 'Grão-Mestre',
  challenger: 'Desafiante'
}

const PLAYSTYLE_OPTIONS = [
  { value: 'tryhard', label: 'Try Hard', desc: 'Foco em ganhar, competitivo' },
  { value: 'casual', label: 'Casual', desc: 'Jogo relaxado, diversão' },
  { value: 'friendly', label: 'Amigável', desc: 'Ambiente positivo, sem toxicidade' },
  { value: 'learning', label: 'Aprendizado', desc: 'Foco em melhorar e aprender' },
  { value: 'chill', label: 'Tranquilo', desc: 'Sem pressão, jogabilidade leve' }
]

interface QueueForm {
  gameMode: GameMode | ''
  preferredRoles: LolRole[]
  requiredRankMin: LolRank | ''
  requiredRankMax: LolRank | ''
  playstyleTags: string[]
}

export default function QueuePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [queueChecked, setQueueChecked] = useState(false)
  const [isInQueue, setIsInQueue] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [queueStartTime, setQueueStartTime] = useState<string | null>(null)

  // Hook de detecção de matchmaking
  const { 
    potentialMatches, 
    acceptMatch, 
    rejectMatch, 
    isLoading: isMatchmakingLoading 
  } = useMatchmakingDetection(user?.id || null, isInQueue)

  // Handlers para matches
  const handleAcceptMatch = async (matchId: string) => {
    try {
      await acceptMatch(matchId)
      // Redirecionar para o lobby após aceitar
      const match = potentialMatches.find(m => m.id === matchId)
      if (match) {
        router.push(`/lobby/${match.lobby.id}`)
      }
    } catch (err) {
      console.error('Erro ao aceitar match:', err)
      setError('Erro ao aceitar o match. Tente novamente.')
    }
  }

  const handleRejectMatch = async (matchId: string) => {
    try {
      await rejectMatch(matchId)
    } catch (err) {
      console.error('Erro ao rejeitar match:', err)
    }
  }
  
  const [form, setForm] = useState<QueueForm>({
    gameMode: '',
    preferredRoles: [],
    requiredRankMin: '',
    requiredRankMax: '',
    playstyleTags: []
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && mounted && !profileLoaded) {
      loadProfile()
    }
    if (user && mounted && !queueChecked) {
      checkIfInQueue()
    }
  }, [user, mounted, profileLoaded, queueChecked])

  // Verificar periodicamente se o usuário ainda está na queue
  useEffect(() => {
    if (!isInQueue || !user) return

    const interval = setInterval(() => {
      checkIfInQueue()
    }, 5000) // Verificar a cada 5 segundos

    return () => clearInterval(interval)
  }, [isInQueue, user])

  const loadProfile = async () => {
    if (!user) return

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Erro ao carregar perfil:', error)
        setProfileLoaded(true) // Marcar como carregado mesmo com erro
        return
      }

      setProfile(data)
      setProfileLoaded(true)
      
      // Só pré-preencher se o formulário estiver vazio (primeira vez)
      setForm(prevForm => {
        // Se já há roles selecionadas manualmente, não sobrescrever
        if (prevForm.preferredRoles.length > 0) {
          return prevForm
        }
        
        const updatedForm = { ...prevForm }
        
        // Pré-preencher com preferências do perfil apenas se vazio
        if (data.roles_preference && data.roles_preference.length > 0) {
          updatedForm.preferredRoles = data.roles_preference
        }
        
        // Pré-preencher com tags de estilo do perfil apenas se vazio
        if (data.playstyle_tags && data.playstyle_tags.length > 0 && prevForm.playstyleTags.length === 0) {
          updatedForm.playstyleTags = data.playstyle_tags
        }
        
        return updatedForm
      })
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
      setProfileLoaded(true) // Marcar como carregado mesmo com erro
    }
  }

  const checkIfInQueue = async () => {
    if (!user) return

    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()  // ✅ Usar maybeSingle() em vez de single()

      if (data) {
        setIsInQueue(true)
        setQueueStartTime(data.created_at)
        setForm({
          gameMode: data.game_mode,
          preferredRoles: data.preferred_roles,
          requiredRankMin: data.required_rank_min || '',
          requiredRankMax: data.required_rank_max || '',
          playstyleTags: data.playstyle_tags || []
        })
      } else {
        setIsInQueue(false)
        setQueueStartTime(null)
      }
      
      setQueueChecked(true) // Marcar que foi verificado
    } catch (error) {
      // Usuário não está na queue, tudo bem
      setQueueChecked(true) // Marcar que foi verificado mesmo com erro
    }
  }

  const handleRoleToggle = (role: LolRole) => {
    setForm(prev => ({
      ...prev,
      preferredRoles: prev.preferredRoles.includes(role)
        ? prev.preferredRoles.filter(r => r !== role)
        : [...prev.preferredRoles, role]
    }))
  }

  const handlePlaystyleToggle = (tag: string) => {
    setForm(prev => ({
      ...prev,
      playstyleTags: prev.playstyleTags.includes(tag)
        ? prev.playstyleTags.filter(t => t !== tag)
        : [...prev.playstyleTags, tag]
    }))
  }

  const handleEnterQueue = async () => {
    if (!user || !profile) return

    setIsLoading(true)
    setError('')

    try {
      if (!form.gameMode) {
        throw new Error('Selecione um modo de jogo')
      }

      if (form.preferredRoles.length === 0) {
        throw new Error('Selecione pelo menos uma role')
      }

      const supabase = createClient()
      
      const queueData = {
        user_id: user.id,
        game_mode: form.gameMode as GameMode,
        preferred_roles: form.preferredRoles,
        rank_solo: profile.rank_solo,
        rank_flex: profile.rank_flex,
        required_rank_min: form.requiredRankMin || null,
        required_rank_max: form.requiredRankMax || null,
        playstyle_tags: form.playstyleTags.length > 0 ? form.playstyleTags : null
      }

      const { error } = await supabase
        .from('queue_entries')
        .insert([queueData])

      if (error) {
        throw error
      }

      setIsInQueue(true)
      setQueueStartTime(new Date().toISOString())
      // Resetar para permitir nova verificação quando sair da queue
      setQueueChecked(false)
      
    } catch (err) {
      console.error('Erro ao entrar na fila:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeaveQueue = async () => {
    if (!user) return

    setIsLoading(true)
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('queue_entries')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      setIsInQueue(false)
      setQueueStartTime(null)
      // Resetar para permitir nova verificação quando entrar na queue novamente
      setQueueChecked(false)
      
    } catch (err) {
      console.error('Erro ao sair da fila:', err)
      setError(err instanceof Error ? err.message : 'Erro ao sair da fila')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || !mounted) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className={styles.container}>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Fila de Matchmaking</h1>
            <p className={styles.subtitle}>
              {isInQueue 
                ? 'Você está na fila! Aguarde enquanto procuramos jogadores compatíveis.'
                : 'Configure suas preferências e entre na fila para encontrar um time.'
              }
            </p>
          </div>

          {isInQueue ? (
            // Estado: Na fila
            <div className={styles.queueActive}>
              <div className={styles.queueCard}>
                <div className={styles.queueIcon}>
                  <div className={styles.pulseAnimation}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                <h2 className={styles.queueTitle}>Procurando Jogadores...</h2>
                
                {/* Estatísticas de Matchmaking */}
                <MatchmakingStats
                  gameMode={form.gameMode as GameMode}
                  preferredRoles={form.preferredRoles}
                  requiredRankMin={form.requiredRankMin || null}
                  requiredRankMax={form.requiredRankMax || null}
                  playstyleTags={form.playstyleTags}
                  currentRankSolo={profile?.rank_solo}
                  currentRankFlex={profile?.rank_flex}
                  startTime={queueStartTime}
                  isLobby={false}
                  className={styles.matchmakingStats}
                />
                
                <div className={styles.queueInfo}>
                  <div className={styles.queueDetail}>
                    <strong>Modo:</strong> {GAME_MODE_LABELS[form.gameMode as GameMode]}
                  </div>
                  <div className={styles.queueDetail}>
                    <strong>Roles:</strong> 
                    <div className={styles.queueRoles}>
                      {form.preferredRoles.map(role => (
                        <span key={role} className={styles.queueRole}>
                          {ROLE_LABELS[role]}
                        </span>
                      ))}
                    </div>
                  </div>
                  {(form.requiredRankMin || form.requiredRankMax) && (
                    <div className={styles.queueDetail}>
                      <strong>Elo Desejado:</strong> 
                      {form.requiredRankMin ? RANK_LABELS[form.requiredRankMin] : 'Qualquer'} - {' '}
                      {form.requiredRankMax ? RANK_LABELS[form.requiredRankMax] : 'Qualquer'}
                    </div>
                  )}
                  {form.playstyleTags.length > 0 && (
                    <div className={styles.queueDetail}>
                      <strong>Estilo:</strong>
                      <div className={styles.queueRoles}>
                        {form.playstyleTags.map(tag => (
                          <span key={tag} className={styles.queueTag}>
                            {PLAYSTYLE_OPTIONS.find(opt => opt.value === tag)?.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleLeaveQueue}
                  disabled={isLoading}
                  className={styles.leaveButton}
                >
                  {isLoading ? 'Saindo...' : 'Sair da Fila'}
                </button>
              </div>
            </div>
          ) : (
            // Estado: Não na fila
            <div className={styles.queueForm}>
              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}

              <div className={styles.formCard}>
                <h2 className={styles.formTitle}>Configure suas Preferências</h2>

                {/* Modo de Jogo */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Modo de Jogo *</label>
                  <div className={styles.gameModeGrid}>
                    {GAME_MODES.map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, gameMode: mode }))}
                        className={`${styles.gameModeButton} ${
                          form.gameMode === mode ? styles.active : ''
                        }`}
                      >
                        {GAME_MODE_LABELS[mode]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Roles */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Suas Roles *</label>
                  <div className={styles.rolesGrid}>
                    {ROLES.map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleRoleToggle(role)}
                        className={`${styles.roleButton} ${
                          form.preferredRoles.includes(role) ? styles.active : ''
                        }`}
                      >
                        {ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtros de Elo */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Elo Desejado do Lobby</label>
                  <div className={styles.formRow}>
                    <div className={styles.formColumn}>
                      <label className={styles.sublabel}>Mínimo</label>
                      <select
                        value={form.requiredRankMin}
                        onChange={(e) => setForm(prev => ({ ...prev, requiredRankMin: e.target.value as LolRank | '' }))}
                        className={styles.select}
                      >
                        <option value="">Qualquer</option>
                        {RANKS.map(rank => (
                          <option key={rank} value={rank}>
                            {RANK_LABELS[rank]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formColumn}>
                      <label className={styles.sublabel}>Máximo</label>
                      <select
                        value={form.requiredRankMax}
                        onChange={(e) => setForm(prev => ({ ...prev, requiredRankMax: e.target.value as LolRank | '' }))}
                        className={styles.select}
                      >
                        <option value="">Qualquer</option>
                        {RANKS.map(rank => (
                          <option key={rank} value={rank}>
                            {RANK_LABELS[rank]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className={styles.helpText}>
                    Ex: Mestre+ para lobbies competitivos, ou Ouro-Platina para faixas específicas
                  </p>
                </div>

                {/* Estilo de Jogo */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Estilo de Jogo Desejado</label>
                  <div className={styles.playstyleGrid}>
                    {PLAYSTYLE_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handlePlaystyleToggle(option.value)}
                        className={`${styles.playstyleButton} ${
                          form.playstyleTags.includes(option.value) ? styles.active : ''
                        }`}
                      >
                        <div className={styles.playstyleLabel}>{option.label}</div>
                        <div className={styles.playstyleDesc}>{option.desc}</div>
                      </button>
                    ))}
                  </div>
                  <p className={styles.helpText}>
                    Selecione o(s) estilo(s) de jogo que você procura no lobby
                  </p>
                </div>

                <div className={styles.formActions}>
                  <Link href="/lobby" className={styles.cancelButton}>
                    Voltar
                  </Link>
                  <button
                    onClick={handleEnterQueue}
                    disabled={isLoading || !form.gameMode || form.preferredRoles.length === 0}
                    className={styles.enterButton}
                  >
                    {isLoading ? 'Entrando...' : 'Entrar na Fila'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Notificações de Match Encontrado */}
      <MatchNotification 
        matches={potentialMatches}
        onAccept={handleAcceptMatch}
        onReject={handleRejectMatch}
        isProcessing={isMatchmakingLoading}
      />
    </div>
  )
}
