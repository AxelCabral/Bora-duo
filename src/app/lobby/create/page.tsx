'use client'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { LolRole, LolRank, GameMode } from '@/types/database'
import styles from './create.module.css'

interface CreateLobbyForm {
  title: string
  description: string
  gameMode: GameMode | ''
  maxMembers: number
  requiredRankMin: LolRank | ''
  requiredRankMax: LolRank | ''
  preferredRoles: LolRole[]
  scheduledTime: string
}

const RANKS: LolRank[] = [
  'iron', 'bronze', 'silver', 'gold', 'platinum', 
  'emerald', 'diamond', 'master', 'grandmaster', 'challenger'
]

const ROLES: LolRole[] = ['top', 'jungle', 'mid', 'adc', 'support', 'fill']

const GAME_MODES: GameMode[] = ['ranked_solo_duo', 'ranked_flex', 'normal_draft', 'aram']

const GAME_MODE_LABELS: Record<GameMode, string> = {
  ranked_solo_duo: 'Ranqueada Solo/Duo',
  ranked_flex: 'Ranqueada Flexível',
  normal_draft: 'Normal Draft',
  aram: 'ARAM'
}

const ROLE_LABELS: Record<LolRole, string> = {
  top: 'Top',
  jungle: 'Jungle', 
  mid: 'Mid',
  adc: 'ADC',
  support: 'Support',
  fill: 'Fill'
}

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

export default function CreateLobbyPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState<CreateLobbyForm>({
    title: '',
    description: '',
    gameMode: '',
    maxMembers: 5,
    requiredRankMin: '',
    requiredRankMax: '',
    preferredRoles: [],
    scheduledTime: ''
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleRoleToggle = (role: LolRole) => {
    setForm(prev => ({
      ...prev,
      preferredRoles: prev.preferredRoles.includes(role)
        ? prev.preferredRoles.filter(r => r !== role)
        : [...prev.preferredRoles, role]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    setError('')

    try {
      const supabase = createClient()

      // Validações
      if (form.title.trim().length < 3) {
        throw new Error('O título deve ter pelo menos 3 caracteres')
      }

      if (!form.gameMode) {
        throw new Error('Selecione um modo de jogo')
      }

      if (form.preferredRoles.length === 0) {
        throw new Error('Selecione pelo menos uma role')
      }

      // Criar lobby
      const lobbyData = {
        creator_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        game_mode: form.gameMode as GameMode,
        max_members: form.maxMembers,
        required_rank_min: form.requiredRankMin || null,
        required_rank_max: form.requiredRankMax || null,
        preferred_roles: form.preferredRoles,
        scheduled_time: form.scheduledTime ? new Date(form.scheduledTime).toISOString() : null
      }

      const { data, error: createError } = await supabase
        .from('lobbies')
        .insert([lobbyData])
        .select()
        .single()

      if (createError) {
        throw createError
      }

      // Adicionar o criador como membro do lobby
      const { error: memberError } = await supabase
        .from('lobby_members')
        .insert([{
          lobby_id: data.id,
          user_id: user.id,
          role: form.preferredRoles[0] // Usar a primeira role preferida
        }])

      if (memberError) {
        console.error('Erro ao adicionar criador como membro:', memberError)
        // Não falhar a criação do lobby por isso
      }

      // Redirecionar para a página do lobby criado
      router.push(`/lobby/${data.id}`)

    } catch (err) {
      console.error('Erro ao criar lobby:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao criar lobby')
    } finally {
      setIsSubmitting(false)
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

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Criar Nova Sala</h1>
            <p className={styles.subtitle}>
              Configure sua sala e encontre jogadores compatíveis
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            {/* Título */}
            <div className={styles.formGroup}>
              <label htmlFor="title" className={styles.label}>
                Título do Lobby *
              </label>
              <input
                type="text"
                id="title"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                className={styles.input}
                placeholder="Ex: Ranked Flex Gold/Plat - Procurando ADC e Support"
                maxLength={100}
                required
              />
            </div>

            {/* Modo de Jogo */}
            <div className={styles.formGroup}>
              <label htmlFor="gameMode" className={styles.label}>
                Modo de Jogo *
              </label>
              <select
                id="gameMode"
                value={form.gameMode}
                onChange={(e) => setForm(prev => ({ ...prev, gameMode: e.target.value as GameMode | '' }))}
                className={styles.select}
                required
              >
                <option value="">Selecione um modo</option>
                {GAME_MODES.map(mode => (
                  <option key={mode} value={mode}>
                    {GAME_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div className={styles.formGroup}>
              <label htmlFor="description" className={styles.label}>
                Descrição
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className={styles.textarea}
                placeholder="Descreva o que vocês pretendem jogar, horários, estilo de jogo..."
                maxLength={500}
                rows={4}
              />
            </div>

            {/* Número máximo de membros */}
            <div className={styles.formGroup}>
              <label htmlFor="maxMembers" className={styles.label}>
                Máximo de Membros
              </label>
              <select
                id="maxMembers"
                value={form.maxMembers}
                onChange={(e) => setForm(prev => ({ ...prev, maxMembers: parseInt(e.target.value) }))}
                className={styles.select}
              >
                <option value={2}>2 jogadores</option>
                <option value={3}>3 jogadores</option>
                <option value={4}>4 jogadores</option>
                <option value={5}>5 jogadores</option>
              </select>
            </div>

            {/* Requisitos de Elo */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="requiredRankMin" className={styles.label}>
                  Elo Mínimo
                </label>
                <select
                  id="requiredRankMin"
                  value={form.requiredRankMin}
                  onChange={(e) => setForm(prev => ({ ...prev, requiredRankMin: e.target.value as LolRank | '' }))}
                  className={styles.select}
                >
                  <option value="">Sem restrição</option>
                  {RANKS.map(rank => (
                    <option key={rank} value={rank}>
                      {RANK_LABELS[rank]}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="requiredRankMax" className={styles.label}>
                  Elo Máximo
                </label>
                <select
                  id="requiredRankMax"
                  value={form.requiredRankMax}
                  onChange={(e) => setForm(prev => ({ ...prev, requiredRankMax: e.target.value as LolRank | '' }))}
                  className={styles.select}
                >
                  <option value="">Sem restrição</option>
                  {RANKS.map(rank => (
                    <option key={rank} value={rank}>
                      {RANK_LABELS[rank]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Roles Preferidas */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Roles Necessárias *
              </label>
              <div className={styles.rolesGrid}>
                {ROLES.map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleToggle(role)}
                    className={`${styles.roleButton} ${
                      form.preferredRoles.includes(role) ? styles.roleButtonActive : ''
                    }`}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>


            {/* Horário Agendado */}
            <div className={styles.formGroup}>
              <label htmlFor="scheduledTime" className={styles.label}>
                Horário Agendado (opcional)
              </label>
              <input
                type="datetime-local"
                id="scheduledTime"
                value={form.scheduledTime}
                onChange={(e) => setForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                className={styles.input}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            {/* Submit Button */}
            <div className={styles.formActions}>
              <Link href="/lobby" className={styles.cancelButton}>
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className={styles.submitButton}
              >
                {isSubmitting ? 'Criando...' : 'Criar Lobby'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
