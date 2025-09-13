'use client'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { Lobby, LobbyMember, Profile, LolRank, GameMode } from '@/types/database'
import MatchmakingStats from '@/components/MatchmakingStats'
import MatchNotification from '@/components/MatchNotification'
import EvaluationModal from '@/components/EvaluationModal'
import { useMatchmakingDetection } from '@/hooks/useMatchmakingDetection'
import styles from './lobby.module.css'

interface LobbyWithMembers extends Lobby {
  members: (LobbyMember & { profile: Profile })[]
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

const GAME_MODE_LABELS: Record<GameMode, string> = {
  ranked_solo_duo: 'Ranqueada Solo/Duo',
  ranked_flex: 'Ranqueada Flexível',
  normal_draft: 'Normal Draft',
  aram: 'ARAM'
}

const ROLES = ['top', 'jungle', 'mid', 'adc', 'support', 'fill'] as const
const ROLE_LABELS = {
  top: 'Top',
  jungle: 'Jungle', 
  mid: 'Mid',
  adc: 'ADC',
  support: 'Support',
  fill: 'Fill'
}

interface EditLobbyModalProps {
  lobby: LobbyWithMembers
  onClose: () => void
  onSave: (updatedLobby: LobbyWithMembers) => void
}

function EditLobbyModal({ lobby, onClose, onSave }: EditLobbyModalProps) {
  const [title, setTitle] = useState(lobby.title)
  const [description, setDescription] = useState(lobby.description || '')
  const [maxMembers, setMaxMembers] = useState(lobby.max_members)
  const [requiredRankMin, setRequiredRankMin] = useState(lobby.required_rank_min || '')
  const [requiredRankMax, setRequiredRankMax] = useState(lobby.required_rank_max || '')
  const [preferredRoles, setPreferredRoles] = useState<string[]>(lobby.preferred_roles)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const handleRoleToggle = (role: string) => {
    setPreferredRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }

  const handleSave = async () => {
    if (title.trim().length < 3) {
      setError('O título deve ter pelo menos 3 caracteres')
      return
    }

    if (maxMembers < 2 || maxMembers > 5) {
      setError('O lobby deve ter entre 2 e 5 membros')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const supabase = createClient()
      
      const { data: updatedLobbyData, error: updateError } = await supabase
        .from('lobbies')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          max_members: maxMembers,
          required_rank_min: requiredRankMin || null,
          required_rank_max: requiredRankMax || null,
          preferred_roles: preferredRoles,
          updated_at: new Date().toISOString()
        })
        .eq('id', lobby.id)
        .select()
        .single()

      if (updateError) throw updateError

      // Atualizar o lobby local
      onSave({
        ...lobby,
        ...updatedLobbyData
      })

    } catch (err) {
      console.error('Erro ao salvar lobby:', err)
      setError('Erro ao salvar as alterações. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Editar Lobby</h2>
          <button onClick={onClose} className={styles.closeModal}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label>Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do seu lobby"
              maxLength={100}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva seu lobby..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Máximo de Membros</label>
            <select
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
            >
              <option value={2}>2 jogadores</option>
              <option value={3}>3 jogadores</option>
              <option value={4}>4 jogadores</option>
              <option value={5}>5 jogadores</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Elo Mínimo</label>
            <select
              value={requiredRankMin}
              onChange={(e) => setRequiredRankMin(e.target.value)}
            >
              <option value="">Qualquer</option>
              {Object.entries(RANK_LABELS).map(([rank, label]) => (
                <option key={rank} value={rank}>{label}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Elo Máximo</label>
            <select
              value={requiredRankMax}
              onChange={(e) => setRequiredRankMax(e.target.value)}
            >
              <option value="">Qualquer</option>
              {Object.entries(RANK_LABELS).map(([rank, label]) => (
                <option key={rank} value={rank}>{label}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Roles Desejadas</label>
            <div className={styles.roleSelector}>
              {ROLES.map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleToggle(role)}
                  className={`${styles.roleButton} ${
                    preferredRoles.includes(role) ? styles.selected : ''
                  }`}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.cancelButton}>
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={styles.saveButton}
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LobbyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: lobbyId } = use(params)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [lobby, setLobby] = useState<LobbyWithMembers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [isClosingLobby, setIsClosingLobby] = useState(false)
  const [isBeingRedirected, setIsBeingRedirected] = useState(false)
  const [isLeavingLobby, setIsLeavingLobby] = useState(false)
  const [showEvaluationModal, setShowEvaluationModal] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && mounted) {
      loadLobby()
    }
  }, [user, mounted, lobbyId])

  const loadLobby = async () => {
    try {
      const supabase = createClient()
      
      // Carregar lobby
      const { data: lobbyData, error: lobbyError } = await supabase
        .from('lobbies')
        .select('*')
        .eq('id', lobbyId)
        .maybeSingle()  // ✅ Usar maybeSingle() em vez de single()

      if (lobbyError) {
        throw lobbyError
      }

      if (!lobbyData) {
        throw new Error('Lobby não encontrado')
      }

      // Carregar membros ativos (que não saíram ainda) - apenas para mostrar na interface
      const { data: membersData, error: membersError } = await supabase
        .from('lobby_members')
        .select('*')  // ✅ Consulta simples sem JOIN
        .eq('lobby_id', lobbyId)
        .is('left_at', null)  // ✅ Apenas membros ativos para a interface do lobby
        .order('joined_at', { ascending: true })

      if (membersError) {
        console.warn('Erro ao carregar membros:', membersError)
        // Continuar mesmo sem membros
      }

      // Carregar perfis dos membros separadamente para evitar problemas RLS
      const membersWithProfiles = []
      if (membersData && membersData.length > 0) {
        for (const member of membersData) {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', member.user_id)
              .maybeSingle()
            
            membersWithProfiles.push({
              ...member,
              profile: profileData || { 
                user_id: member.user_id, 
                nickname: 'Usuário', 
                riot_id: null 
              }
            })
          } catch (profileError) {
            console.warn('Erro ao carregar perfil:', profileError)
            membersWithProfiles.push({
              ...member,
              profile: { 
                user_id: member.user_id, 
                nickname: 'Usuário', 
                riot_id: null 
              }
            })
          }
        }
      }

      setLobby({
        ...lobbyData,
        members: membersWithProfiles
      })

    } catch (err) {
      console.error('Erro ao carregar lobby:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar lobby')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseLobby = async () => {
    if (!lobby || !user || isClosingLobby) return
    
    // Verificar se é o criador
    if (lobby.creator_id !== user.id) {
      alert('Apenas o criador pode fechar o lobby')
      return
    }

    const confirmClose = window.confirm(
      'Tem certeza que deseja fechar este lobby? Esta ação não pode ser desfeita.'
    )

    if (!confirmClose) return

    setIsClosingLobby(true)
    
    try {
      const supabase = createClient()
      
      // Buscar todos os membros antes de fechar
      const { data: membersData, error: membersError } = await supabase
        .from('lobby_members')
        .select('user_id, joined_at, total_time_minutes, can_evaluate')
        .eq('lobby_id', lobbyId)

      if (membersError) {
        console.warn('Erro ao buscar membros:', membersError)
      }

      // Registrar todos os membros no histórico
      if (membersData && membersData.length > 0) {
        const leftAt = new Date().toISOString()
        const historyRecords = membersData.map(member => {
          const joinedAt = new Date(member.joined_at)
          const totalMinutes = Math.floor((new Date(leftAt).getTime() - joinedAt.getTime()) / (1000 * 60))
          
          return {
            user_id: member.user_id,
            lobby_id: lobbyId,
            lobby_title: lobby.title,
            game_mode: lobby.game_mode,
            joined_at: member.joined_at,
            left_at: leftAt,
            total_time_minutes: totalMinutes,
            participants_count: lobby.current_members
          }
        }).filter(record => record.total_time_minutes >= 5) // Apenas quem ficou 5+ minutos

        if (historyRecords.length > 0) {
          const { error: historyError } = await supabase
            .from('lobby_history')
            .insert(historyRecords)

          if (historyError) {
            console.warn('Erro ao registrar histórico:', historyError)
          }
        }
      }
      
      // Atualizar status do lobby para 'cancelled'
      const { error: updateError } = await supabase
        .from('lobbies')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', lobbyId)

      if (updateError) {
        throw updateError
      }

      // Remover todos os membros do lobby
      const { error: deleteMembersError } = await supabase
        .from('lobby_members')
        .delete()
        .eq('lobby_id', lobbyId)

      if (deleteMembersError) {
        console.warn('Erro ao remover membros:', deleteMembersError)
      }

      // Redirecionar para página de lobbies
      router.push('/lobby')
      
    } catch (err) {
      console.error('Erro ao fechar lobby:', err)
      alert('Erro ao fechar o lobby. Tente novamente.')
    } finally {
      setIsClosingLobby(false)
    }
  }

  // Verificar se o usuário atual é o criador do lobby
  const isCreator = lobby && user && lobby.creator_id === user.id
  const canModify = isCreator && lobby?.status === 'waiting'

  // Verificar se o usuário ainda é membro do lobby (detecção de kick)
  useEffect(() => {
    if (lobby && user && !isCreator && !isBeingRedirected) {
      const isMember = lobby.members.some(member => member.user_id === user.id)
      if (!isMember) {
        console.log('🚪 Usuário foi removido do lobby, redirecionando para queue...')
        setIsBeingRedirected(true)
        router.push('/lobby/queue')
        return
      }
    }
  }, [lobby, user, isCreator, router, isBeingRedirected])

  // Hook de detecção de matchmaking para criadores de lobby
  const { 
    potentialMatches, 
    acceptMatch, 
    rejectMatch, 
    isLoading: isMatchmakingLoading 
  } = useMatchmakingDetection(user?.id || null, Boolean(isCreator && lobby?.status === 'waiting' && lobby?.current_members < lobby?.max_members))

  // Handlers para matches
  const handleAcceptMatch = async (matchId: string) => {
    try {
      await acceptMatch(matchId)
      // Recarregar lobby para mostrar novo membro
      await loadLobby()
    } catch (err) {
      console.error('Erro ao aceitar match:', err)
      setError('Erro ao aceitar o jogador. Tente novamente.')
    }
  }

  const handleRejectMatch = async (matchId: string) => {
    try {
      await rejectMatch(matchId)
    } catch (err) {
      console.error('Erro ao rejeitar match:', err)
    }
  }

  const handleKickMember = async (userId: string) => {
    if (!lobby || !isCreator) return
    
    try {
      const supabase = createClient()
      
      // Buscar dados do membro antes de remover
      const { data: memberData, error: memberError } = await supabase
        .from('lobby_members')
        .select('joined_at, total_time_minutes, can_evaluate')
        .eq('lobby_id', lobby.id)
        .eq('user_id', userId)
        .single()

      if (memberError) {
        console.warn('Erro ao buscar dados do membro:', memberError)
      }

      // Atualizar left_at antes de remover
      const leftAt = new Date().toISOString()
      if (memberData) {
        const { error: updateError } = await supabase
          .from('lobby_members')
          .update({
            left_at: leftAt,
            total_time_minutes: 0, // Será calculado pelo trigger
            can_evaluate: true // Permitir avaliação se ficou 20+ minutos
          })
          .eq('lobby_id', lobby.id)
          .eq('user_id', userId)

        if (updateError) {
          console.warn('Erro ao atualizar dados do membro:', updateError)
        }

        // Calcular tempo total
        const joinedAt = new Date(memberData.joined_at)
        const totalMinutes = Math.floor((new Date(leftAt).getTime() - joinedAt.getTime()) / (1000 * 60))

        // Registrar no histórico se ficou pelo menos 20 minutos
        if (totalMinutes >= 20) {
          // Salvar histórico do usuário kickado
          const { error: historyError } = await supabase
            .from('lobby_history')
            .insert({
              user_id: userId,
              lobby_id: lobby.id,
              lobby_title: lobby.title,
              game_mode: lobby.game_mode,
              joined_at: memberData.joined_at,
              left_at: leftAt,
              total_time_minutes: totalMinutes,
              participants_count: lobby.current_members
            })

          if (historyError) {
            console.warn('Erro ao registrar histórico do kickado:', historyError)
          }

          // SALVAR HISTÓRICO BILATERAL para todos os outros participantes
          await saveHistoryForAllParticipants(lobby, userId, memberData.joined_at, leftAt, supabase)
        }
      }
      
      // NÃO deletar ainda - apenas marcar como saiu
      // Os dados serão mantidos para avaliação

      // Recarregar lobby para mostrar mudanças
      await loadLobby()
      
    } catch (err) {
      console.error('Erro ao remover membro:', err)
      setError('Erro ao remover membro do lobby.')
    }
  }

  const handleLeaveLobby = async () => {
    if (!lobby || !user || isCreator) return
    
    setIsLeavingLobby(true)
    try {
      const supabase = createClient()
      
      // Buscar dados do membro antes de sair
      const { data: memberData, error: memberError } = await supabase
        .from('lobby_members')
        .select('joined_at, total_time_minutes, can_evaluate')
        .eq('lobby_id', lobby.id)
        .eq('user_id', user.id)
        .single()

      if (memberError) throw memberError

      // Atualizar left_at e total_time_minutes antes de sair
      const leftAt = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('lobby_members')
        .update({
          left_at: leftAt,
          total_time_minutes: 0, // Será calculado pelo trigger
          can_evaluate: true // Permitir avaliação se ficou 20+ minutos
        })
        .eq('lobby_id', lobby.id)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      // Calcular tempo total
      const joinedAt = new Date(memberData.joined_at)
      const totalMinutes = Math.floor((new Date(leftAt).getTime() - joinedAt.getTime()) / (1000 * 60))

      // Registrar no histórico se ficou pelo menos 20 minutos
      if (totalMinutes >= 20) {
        // Salvar MEU histórico
        const { error: historyError } = await supabase
          .from('lobby_history')
          .insert({
            user_id: user.id,
            lobby_id: lobby.id,
            lobby_title: lobby.title,
            game_mode: lobby.game_mode,
            joined_at: memberData.joined_at,
            left_at: leftAt,
            total_time_minutes: totalMinutes,
            participants_count: lobby.current_members
          })

        if (historyError) {
          console.warn('Erro ao registrar meu histórico:', historyError)
        }

        // SALVAR HISTÓRICO BILATERAL - apenas se eu saí (não duplicar)
        await saveHistoryForAllParticipants(lobby, user.id, memberData.joined_at, leftAt, supabase)
      }

      // NÃO deletar ainda - apenas marcar como saiu
      // Os dados serão mantidos para avaliação
      
      console.log('🚪 Usuário saiu do lobby com sucesso')
      
      // Verificar se pode avaliar (20+ minutos)
      if (totalMinutes >= 20) {
        // Mostrar modal de avaliação
        setShowEvaluationModal(true)
      } else {
        // Redirecionar direto para queue
        router.push('/lobby/queue')
      }
    } catch (err) {
      console.error('Erro ao sair do lobby:', err)
      setError('Erro ao sair do lobby. Tente novamente.')
    } finally {
      setIsLeavingLobby(false)
    }
  }

  const handleEvaluationComplete = () => {
    setShowEvaluationModal(false)
    router.push('/lobby/queue')
  }

  // Função para salvar histórico bilateral de todos os participantes
  const saveHistoryForAllParticipants = async (lobby: any, leavingUserId: string, myJoinedAt: string, myLeftAt: string, supabase: any) => {
    try {
      // Buscar todos os outros membros do lobby
      const { data: allMembers, error: membersError } = await supabase
        .from('lobby_members')
        .select('user_id, joined_at, left_at')
        .eq('lobby_id', lobby.id)
        .neq('user_id', leavingUserId)

      if (membersError || !allMembers || allMembers.length === 0) {
        console.log('Nenhum outro membro encontrado para histórico bilateral')
        return
      }

      const myJoinedAtDate = new Date(myJoinedAt)
      const myLeftAtDate = new Date(myLeftAt)

      // Verificar históricos existentes em lote
      const { data: existingHistories } = await supabase
        .from('lobby_history')
        .select('user_id')
        .eq('lobby_id', lobby.id)
        .in('user_id', allMembers.map((m: any) => m.user_id))

      const existingUserIds = new Set(existingHistories?.map((h: any) => h.user_id) || [])

      // Para cada membro, verificar se compartilhou 1+ minuto comigo
      const historyRecords = []
      for (const member of allMembers) {
        // Pular se já tem histórico
        if (existingUserIds.has(member.user_id)) {
          continue
        }

        const memberJoinedAt = new Date(member.joined_at)
        const memberLeftAt = member.left_at ? new Date(member.left_at) : new Date()

        // Calcular sobreposição
        const overlapStart = new Date(Math.max(myJoinedAtDate.getTime(), memberJoinedAt.getTime()))
        const overlapEnd = new Date(Math.min(myLeftAtDate.getTime(), memberLeftAt.getTime()))
        const overlapMinutes = Math.max(0, Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)))

        // Se compartilharam 20+ minutos, salvar no histórico do membro
        if (overlapMinutes >= 20) {
          historyRecords.push({
            user_id: member.user_id,
            lobby_id: lobby.id,
            lobby_title: lobby.title,
            game_mode: lobby.game_mode,
            joined_at: member.joined_at,
            left_at: member.left_at || new Date().toISOString(),
            total_time_minutes: Math.floor((memberLeftAt.getTime() - memberJoinedAt.getTime()) / (1000 * 60)),
            participants_count: lobby.current_members
          })
        }
      }

      // Inserir todos os históricos de uma vez
      if (historyRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('lobby_history')
          .insert(historyRecords)

        if (insertError) {
          console.warn('Erro ao inserir histórico bilateral:', insertError)
        } else {
          console.log(`✅ Histórico bilateral salvo para ${historyRecords.length} participantes`)
        }
      } else {
        console.log('Nenhum novo histórico para salvar (todos já existem)')
      }
    } catch (err) {
      console.error('Erro na função de histórico bilateral:', err)
    }
  }

  if (authLoading || !mounted || loading || isBeingRedirected) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>{isBeingRedirected ? 'Você foi removido do lobby...' : 'Carregando lobby...'}</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (error || !lobby) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Erro</h2>
          <p>{error || 'Lobby não encontrado'}</p>
          <Link href="/lobby" className={styles.backButton}>
            Voltar aos Lobbies
          </Link>
        </div>
      </div>
    )
  }

  const isMember = lobby.members.some(member => member.user_id === user.id)
  // No novo sistema, usuários não podem entrar manualmente - apenas via matchmaking

  return (
    <div className={styles.container}>
      <Navbar />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          {/* Lobby Info */}
          <div className={styles.lobbyCard}>
            <div className={styles.lobbyHeader}>
              <div>
                <h1 className={styles.lobbyTitle}>{lobby.title}</h1>
                <div className={styles.lobbyMeta}>
                  <span className={`${styles.status} ${styles[lobby.status]}`}>
                    {lobby.status === 'waiting' ? 'Aguardando jogadores' : 
                     lobby.status === 'full' ? 'Lobby cheio' : 'Cancelado'}
                  </span>
                  <span className={styles.gameMode}>
                    🎮 {GAME_MODE_LABELS[lobby.game_mode]}
                  </span>
                  <span className={styles.members}>
                    👥 {lobby.current_members}/{lobby.max_members}
                  </span>
                </div>
              </div>

              {/* Botões de ação para o criador - sempre visível */}
              {isCreator && (
                <div className={styles.creatorActions}>
                  {canModify && (
                    <button 
                      onClick={() => setShowEditModal(true)}
                      className={styles.editButton}
                      title="Editar Lobby"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Editar
                    </button>
                  )}
                  
                  {lobby.status !== 'cancelled' && isCreator && (
                    <button 
                      onClick={handleCloseLobby}
                      disabled={isClosingLobby}
                      className={styles.closeButton}
                      title="Fechar Lobby"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="m15 9-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="m9 9 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {isClosingLobby ? 'Fechando...' : 'Fechar'}
                    </button>
                  )}
                </div>
              )}

              {/* Botão para membros saírem do lobby */}
              {!isCreator && lobby.status !== 'cancelled' && (
                <div className={styles.memberActions}>
                  <button 
                    onClick={handleLeaveLobby}
                    disabled={isLeavingLobby}
                    className={styles.leaveButton}
                    title="Sair do Lobby"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {isLeavingLobby ? 'Saindo...' : 'Sair do Lobby'}
                  </button>
                </div>
              )}
            </div>

            {lobby.description && (
              <div className={styles.description}>
                <h3>Descrição</h3>
                <p>{lobby.description}</p>
              </div>
            )}

            <div className={styles.requirements}>
              <h3>Requisitos</h3>
              <div className={styles.requirementsList}>
                {lobby.required_rank_min || lobby.required_rank_max ? (
                  <div className={styles.requirement}>
                    <span className={styles.requirementLabel}>Elo:</span>
                    <span>
                      {lobby.required_rank_min ? RANK_LABELS[lobby.required_rank_min] : 'Qualquer'} - {' '}
                      {lobby.required_rank_max ? RANK_LABELS[lobby.required_rank_max] : 'Qualquer'}
                    </span>
                  </div>
                ) : null}
                
                <div className={styles.requirement}>
                  <span className={styles.requirementLabel}>Roles necessárias:</span>
                  <div className={styles.rolesList}>
                    {lobby.preferred_roles.map(role => (
                      <span key={role} className={styles.role}>
                        {role.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

                {lobby.scheduled_time && (
                  <div className={styles.requirement}>
                    <span className={styles.requirementLabel}>Horário agendado:</span>
                    <span>
                      {new Date(lobby.scheduled_time).toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Estatísticas de Matchmaking - apenas para lobbies aguardando */}
            {lobby.status === 'waiting' && (
              <MatchmakingStats
                gameMode={lobby.game_mode}
                preferredRoles={lobby.preferred_roles}
                requiredRankMin={lobby.required_rank_min}
                requiredRankMax={lobby.required_rank_max}
                playstyleTags={[]} // Lobbies não têm playstyle_tags definidos diretamente
                currentRankSolo={undefined} // Não aplicável para criador de lobby
                currentRankFlex={undefined}
                startTime={lobby.created_at}
                isLobby={true}
                lobbySlots={lobby.max_members - lobby.current_members}
                className={styles.matchmakingStats}
              />
            )}
          </div>

          {/* Members List */}
          <div className={styles.membersCard}>
            <h3 className={styles.membersTitle}>
              Membros ({lobby.members.length})
            </h3>
            
            <div className={styles.membersList}>
              {lobby.members.map((member) => (
                <div key={member.id} className={styles.member}>
                  <div className={styles.memberInfo}>
                    <div className={styles.memberAvatar}>
                      {member.profile.icon_url ? (
                        <img src={member.profile.icon_url} alt={member.profile.riot_id || member.profile.nickname} />
                      ) : (
                        <div className={styles.avatarPlaceholder}>
                          {(member.profile.riot_id || member.profile.nickname).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className={styles.memberDetails}>
                      <div className={styles.memberName}>
                        {member.profile.riot_id || member.profile.nickname}
                        {member.user_id === lobby.creator_id && (
                          <span className={styles.creatorBadge}>Líder</span>
                        )}
                      </div>
                      
                      {member.role && (
                        <div className={styles.memberRole}>
                          Role: {member.role.toUpperCase()}
                        </div>
                      )}
                      
                      {(() => {
                        // Mostrar rank do modo de jogo correto
                        const gameMode = lobby.game_mode
                        const rank = gameMode === 'ranked_flex' ? member.profile.rank_flex : member.profile.rank_solo
                        return rank && (
                          <div className={styles.memberRank}>
                            {RANK_LABELS[rank]} ({gameMode === 'ranked_flex' ? 'Flex' : 'Solo/Duo'})
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                  
                  <div className={styles.memberActions}>
                    <span className={`${styles.statusBadge} ${styles.ready}`}>
                      ✓ No Lobby
                    </span>
                    
                    {/* Botão de kick - criador pode kickar sempre (exceto si mesmo) */}
                    {isCreator && member.user_id !== lobby.creator_id && (
                      <button 
                        onClick={() => handleKickMember(member.user_id)}
                        className={styles.kickButton}
                        title="Remover do lobby"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Empty slots */}
            {Array.from({ length: lobby.max_members - lobby.current_members }, (_, i) => (
              <div key={`empty-${i}`} className={styles.emptySlot}>
                <div className={styles.emptySlotContent}>
                  <div className={styles.emptyAvatar}>?</div>
                  <span>Aguardando jogador...</span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Modal de Edição */}
        {showEditModal && (
          <EditLobbyModal 
            lobby={lobby}
            onClose={() => setShowEditModal(false)}
            onSave={(updatedLobby) => {
              setLobby(updatedLobby)
              setShowEditModal(false)
            }}
          />
        )}

        {/* Modal de Avaliação */}
        {showEvaluationModal && lobby && (
          <EvaluationModal
            lobbyId={lobby.id}
            lobbyTitle={lobby.title}
            onClose={() => {
              setShowEvaluationModal(false)
              router.push('/lobby/queue')
            }}
            onComplete={handleEvaluationComplete}
          />
        )}

        {/* Notificações removidas - devem aparecer apenas na queue */}
      </main>
    </div>
  )
}
