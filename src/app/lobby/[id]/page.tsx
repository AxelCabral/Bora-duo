'use client'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { Lobby, LobbyMember, Profile, LolRank, GameMode } from '@/types/database'
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

export default function LobbyDetailsPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [lobby, setLobby] = useState<LobbyWithMembers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
  }, [user, mounted, params.id])

  const loadLobby = async () => {
    try {
      const supabase = createClient()
      
      // Carregar lobby
      const { data: lobbyData, error: lobbyError } = await supabase
        .from('lobbies')
        .select('*')
        .eq('id', params.id)
        .single()

      if (lobbyError) {
        throw new Error('Lobby não encontrado')
      }

      // Carregar membros com perfis
      const { data: membersData, error: membersError } = await supabase
        .from('lobby_members')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('lobby_id', params.id)
        .order('joined_at', { ascending: true })

      if (membersError) {
        throw membersError
      }

      setLobby({
        ...lobbyData,
        members: membersData || []
      })

    } catch (err) {
      console.error('Erro ao carregar lobby:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar lobby')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !mounted || loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando lobby...</p>
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

  const isCreator = lobby.creator_id === user.id
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
                        <img src={member.profile.icon_url} alt={member.profile.nickname} />
                      ) : (
                        <div className={styles.avatarPlaceholder}>
                          {member.profile.nickname.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className={styles.memberDetails}>
                      <div className={styles.memberName}>
                        {member.profile.nickname}
                        {member.user_id === lobby.creator_id && (
                          <span className={styles.creatorBadge}>Líder</span>
                        )}
                      </div>
                      
                      {member.role && (
                        <div className={styles.memberRole}>
                          Role: {member.role.toUpperCase()}
                        </div>
                      )}
                      
                      {member.profile.rank_flex && (
                        <div className={styles.memberRank}>
                          {RANK_LABELS[member.profile.rank_flex]}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.memberStatus}>
                    <span className={`${styles.statusBadge} ${styles.ready}`}>
                      ✓ No Lobby
                    </span>
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

          {/* Actions for creator */}
          {isCreator && (
            <div className={styles.creatorActions}>
              <h3>Ações do Líder</h3>
              <div className={styles.actionButtons}>
                <button className={styles.actionButton}>
                  Editar Sala
                </button>
                <button className={styles.actionButton + ' ' + styles.danger}>
                  Fechar Sala
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
