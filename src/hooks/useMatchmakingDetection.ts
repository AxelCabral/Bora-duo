import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Lobby, QueueEntry, Profile, LolRank, LolRole } from '@/types/database'

interface MatchFound {
  id: string
  lobby: Lobby & { creator_profile: Profile }
  queuePlayer: QueueEntry & { profile: Profile }
  compatibilityScore: number
}

interface MatchmakingDetectionResult {
  potentialMatches: MatchFound[]
  isLoading: boolean
  error: string | null
  acceptMatch: (matchId: string) => Promise<void>
  rejectMatch: (matchId: string) => Promise<void>
}

const RANK_VALUES: Record<LolRank, number> = {
  iron: 1,
  bronze: 2,
  silver: 3,
  gold: 4,
  platinum: 5,
  emerald: 6,
  diamond: 7,
  master: 8,
  grandmaster: 9,
  challenger: 10
}

export function useMatchmakingDetection(
  userId: string | null,
  enabled: boolean = true
): MatchmakingDetectionResult {
  const [potentialMatches, setPotentialMatches] = useState<MatchFound[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('🔍 Hook useEffect executado - userId:', userId, 'enabled:', enabled)
    if (!userId || !enabled) {
      console.log('🔍 Hook desabilitado - userId:', userId, 'enabled:', enabled)
      return
    }

    const detectMatches = async () => {
      setIsLoading(true)
      setError(null)
      
      console.log('🔍 MATCHMAKING DEBUG - Iniciando detecção para usuário:', userId)

      try {
        const supabase = createClient()

        // Verificar se o usuário tem lobbies criados aguardando jogadores
        console.log('📋 Buscando lobbies do usuário:', userId)
        const { data: userLobbies, error: lobbiesError } = await supabase
          .from('lobbies')
          .select('*')
          .eq('creator_id', userId)
          .eq('status', 'waiting')
          .lt('current_members', 5) // ✅ Usar número fixo em vez de coluna

        if (lobbiesError) {
          console.error('❌ Erro ao buscar lobbies:', lobbiesError)
          throw lobbiesError
        }
        
        console.log('📋 Lobbies encontrados:', userLobbies?.length || 0)
        if (userLobbies && userLobbies.length > 0) {
          userLobbies.forEach(lobby => {
            console.log(`📋 Lobby: ${lobby.id} | ${lobby.current_members}/${lobby.max_members} membros | Status: ${lobby.status} | Game: ${lobby.game_mode}`)
          })
        }

        if (userLobbies && userLobbies.length > 0) {
          // Buscar perfil do usuário (criador do lobby) uma vez
          const { data: creatorProfile, error: creatorProfileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()
          
          if (creatorProfileError) {
            console.error('❌ Erro ao buscar perfil do criador:', creatorProfileError)
          }

        // Buscar jogadores na queue compatíveis com os lobbies do usuário
        for (const lobby of userLobbies) {
          console.log(`🔍 Buscando jogadores para lobby: ${lobby.id} (${lobby.current_members}/${lobby.max_members})`)
          
          // Verificar se o lobby ainda tem espaço
          if (lobby.current_members >= lobby.max_members) {
            console.log('⚠️ Lobby cheio, pulando busca')
            continue
          }
          
          if (lobby.status === 'full') {
            console.log('⚠️ Lobby com status full, pulando busca')
            continue
          }
          
          const compatiblePlayers = await findCompatiblePlayers(lobby, supabase)
            
            for (const player of compatiblePlayers) {
              const compatibilityScore = calculateCompatibility(lobby, player)
              
              setPotentialMatches(prev => [
                ...prev.filter(m => m.id !== `${lobby.id}-${player.id}`),
                {
                  id: `${lobby.id}-${player.id}`,
                  lobby: { 
                    ...lobby, 
                    creator_profile: creatorProfile || { 
                      nickname: 'Criador', 
                      icon_url: null, 
                      riot_id: null 
                    }
                  },
                  queuePlayer: player,
                  compatibilityScore
                }
              ])
            }
          }
        }

        // Verificar se o usuário está na queue e buscar lobbies compatíveis
        console.log('🎯 Verificando se usuário está na queue:', userId)
        const { data: userQueueEntry, error: queueError } = await supabase
          .from('queue_entries')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()

        if (queueError) {
          console.error('❌ Erro ao buscar entry da queue:', queueError)
          throw queueError
        }
        
        console.log('🎯 Entry da queue encontrada:', !!userQueueEntry, userQueueEntry?.game_mode)

        if (userQueueEntry) {
          // Buscar perfil do usuário na queue
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()

          const compatibleLobbies = await findCompatibleLobbies(userQueueEntry, supabase)
          console.log('🏠 Lobbies compatíveis encontrados:', compatibleLobbies.length)
          
          for (const lobby of compatibleLobbies) {
            const compatibilityScore = calculateCompatibility(lobby, userQueueEntry)
            
            setPotentialMatches(prev => [
              ...prev.filter(m => m.id !== `${lobby.id}-${userQueueEntry.id}`),
              {
                id: `${lobby.id}-${userQueueEntry.id}`,
                lobby: { 
                  ...lobby, 
                  creator_profile: lobby.creator_profile || { 
                    nickname: 'Criador', 
                    icon_url: null, 
                    riot_id: null 
                  }
                },
                queuePlayer: { 
                  ...userQueueEntry, 
                  profile: userProfile || { 
                    nickname: 'Jogador', 
                    icon_url: null, 
                    riot_id: null 
                  }
                },
                compatibilityScore
              }
            ])
          }
        }

        console.log(`🎉 MATCHMAKING CONCLUÍDO: ${potentialMatches.length} matches encontrados`)

      } catch (err: any) {
        console.error('❌ Erro na detecção de matches:', err)
        
        // Log específico para erros de foreign key
        if (err?.code === 'PGRST200') {
          console.error('🚨 ERRO FOREIGN KEY DETECTADO:', {
            code: err.code,
            message: err.message,
            details: err.details,
            hint: err.hint
          })
        }
        
        setError('Erro ao buscar matches')
      } finally {
        setIsLoading(false)
      }
    }

    // Detectar matches imediatamente
    detectMatches()

    // Repetir a cada 10 segundos para matches em tempo real  
    const interval = setInterval(detectMatches, 10000)

    return () => clearInterval(interval)
  }, [userId, enabled])

  const acceptMatch = async (matchId: string) => {
    const match = potentialMatches.find(m => m.id === matchId)
    if (!match) return

    try {
      const supabase = createClient()

      // Encontrar a role específica que foi compatível
      const compatibleRole = findCompatibleRole(match.lobby.preferred_roles, match.queuePlayer.preferred_roles)
      console.log('🎯 Role compatível encontrada:', compatibleRole, 'para lobby:', match.lobby.preferred_roles, 'player:', match.queuePlayer.preferred_roles)

      // Adicionar jogador ao lobby
      const { error: memberError } = await supabase
        .from('lobby_members')
        .insert({
          lobby_id: match.lobby.id,
          user_id: match.queuePlayer.user_id,
          role: compatibleRole
        })

      if (memberError) throw memberError

      // Atualizar contador de membros do lobby
      const { error: lobbyError } = await supabase
        .from('lobbies')
        .update({ 
          current_members: match.lobby.current_members + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', match.lobby.id)

      if (lobbyError) throw lobbyError

      // Remover jogador da queue
      const { error: queueError } = await supabase
        .from('queue_entries')
        .delete()
        .eq('id', match.queuePlayer.id)

      if (queueError) throw queueError

      // Remover match da lista
      setPotentialMatches(prev => prev.filter(m => m.id !== matchId))

    } catch (err) {
      console.error('Erro ao aceitar match:', err)
      setError('Erro ao aceitar match')
    }
  }

  const rejectMatch = async (matchId: string) => {
    const match = potentialMatches.find(m => m.id === matchId)
    if (!match) return

    try {
      const supabase = createClient()

      // Remover jogador da queue para evitar re-detecção
      const { error: queueError } = await supabase
        .from('queue_entries')
        .delete()
        .eq('id', match.queuePlayer.id)

      if (queueError) {
        console.error('Erro ao remover jogador da queue:', queueError)
      }

      // Remover match da lista
      setPotentialMatches(prev => prev.filter(m => m.id !== matchId))
      
      console.log(`❌ Match rejeitado e jogador removido da queue: ${match.queuePlayer.user_id}`)

    } catch (err) {
      console.error('Erro ao rejeitar match:', err)
      // Mesmo com erro, remover da lista para não mostrar novamente
      setPotentialMatches(prev => prev.filter(m => m.id !== matchId))
    }
  }

  return {
    potentialMatches,
    isLoading,
    error,
    acceptMatch,
    rejectMatch
  }
}

async function findCompatiblePlayers(lobby: any, supabase: any) {
  console.log(`👥 Buscando jogadores para lobby ${lobby.id} (${lobby.game_mode})`)
  
  const { data: queuePlayers, error: playersError } = await supabase
    .from('queue_entries')
    .select('*')
    .eq('game_mode', lobby.game_mode)
    .neq('user_id', lobby.creator_id) // Não incluir o próprio criador

  if (playersError) {
    console.error('❌ Erro ao buscar jogadores na queue:', playersError)
    return []
  }

  console.log(`👥 Jogadores na queue encontrados: ${queuePlayers?.length || 0}`)

  if (!queuePlayers) return []

  // Buscar perfis dos jogadores separadamente
  const playersWithProfiles = []
  for (const player of queuePlayers) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', player.user_id)
        .maybeSingle()

      playersWithProfiles.push({
        ...player,
        profile: profile || {
          nickname: 'Jogador',
          icon_url: null,
          riot_id: null
        }
      })
    } catch (error) {
      // Se não conseguir buscar o perfil, continuar com dados de fallback
      playersWithProfiles.push({
        ...player,
        profile: {
          nickname: 'Jogador',
          icon_url: null,
          riot_id: null
        }
      })
    }
  }

  console.log(`🔍 Verificando compatibilidade para ${playersWithProfiles.length} jogadores:`)
  
  const compatiblePlayers = playersWithProfiles.filter(player => {
    console.log(`\n👤 Player: ${player.profile.nickname} (${player.user_id})`)
    console.log(`   Game Mode: ${player.game_mode} | Roles: ${player.preferred_roles?.join(', ') || 'N/A'}`)
    console.log(`   Rank Solo: ${player.rank_solo || 'N/A'} | Rank Flex: ${player.rank_flex || 'N/A'}`)
    
    // Verificar compatibilidade de rank
    const rankCompatible = isRankCompatibleForLobby(lobby, player)
    console.log(`   🎖️ Rank compatível: ${rankCompatible}`)
    if (!rankCompatible) {
      console.log(`   ❌ REJEITADO: Rank incompatível`)
      return false
    }

    // Verificar se tem roles compatíveis
    const rolesCompatible = hasCompatibleRoles(lobby.preferred_roles, player.preferred_roles)
    console.log(`   🎯 Roles compatíveis: ${rolesCompatible} (Lobby: ${lobby.preferred_roles?.join(', ') || 'N/A'})`)
    if (!rolesCompatible) {
      console.log(`   ❌ REJEITADO: Roles incompatíveis`)
      return false
    }

    // Verificar playstyle tags se especificadas
    if (lobby.playstyle_tags && player.playstyle_tags) {
      const commonTags = lobby.playstyle_tags.filter((tag: string) => 
        player.playstyle_tags.includes(tag)
      )
      console.log(`   🏷️ Playstyle tags: ${commonTags.length} em comum (${commonTags.join(', ')})`)
      if (commonTags.length === 0) {
        console.log(`   ❌ REJEITADO: Nenhuma tag de playstyle em comum`)
        return false
      }
    }

    console.log(`   ✅ ACEITO: Player totalmente compatível!`)
    return true
  })
  
  console.log(`\n🎉 RESULTADO: ${compatiblePlayers.length}/${playersWithProfiles.length} jogadores compatíveis`)
  return compatiblePlayers
}

async function findCompatibleLobbies(queueEntry: any, supabase: any) {
  console.log('🏠 Buscando lobbies compatíveis para entry:', queueEntry.id, 'game_mode:', queueEntry.game_mode)
  
  const { data: lobbies, error: lobbiesError } = await supabase
    .from('lobbies')
    .select('*')
    .eq('game_mode', queueEntry.game_mode)
    .eq('status', 'waiting')
    .lt('current_members', 5) // ✅ Usar número fixo em vez de coluna
    .neq('creator_id', queueEntry.user_id) // Não incluir próprios lobbies

  if (lobbiesError) {
    console.error('❌ Erro ao buscar lobbies compatíveis:', lobbiesError)
    return []
  }

  console.log('🏠 Lobbies disponíveis encontrados:', lobbies?.length || 0)

  if (!lobbies) return []

  // Buscar perfis dos criadores separadamente
  const lobbiesWithProfiles = []
  for (const lobby of lobbies) {
    try {
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', lobby.creator_id)
        .maybeSingle()

      lobbiesWithProfiles.push({
        ...lobby,
        creator_profile: creatorProfile || {
          nickname: 'Criador',
          icon_url: null,
          riot_id: null
        }
      })
    } catch (error) {
      // Se não conseguir buscar o perfil, continuar com dados de fallback
      lobbiesWithProfiles.push({
        ...lobby,
        creator_profile: {
          nickname: 'Criador',
          icon_url: null,
          riot_id: null
        }
      })
    }
  }

  const filteredLobbies = lobbiesWithProfiles.filter(lobby => {
    // Verificar compatibilidade de rank
    const rankCompatible = isRankCompatibleForQueue(queueEntry, lobby)
    console.log('🎖️ Rank compatível para lobby', lobby.id, ':', rankCompatible)
    if (!rankCompatible) return false

    // Verificar se tem roles compatíveis
    const rolesCompatible = hasCompatibleRoles(lobby.preferred_roles, queueEntry.preferred_roles)
    console.log('🎯 Roles compatíveis para lobby', lobby.id, ':', rolesCompatible, 
               'lobby:', lobby.preferred_roles, 'queue:', queueEntry.preferred_roles)
    if (!rolesCompatible) return false

    console.log('✅ Lobby', lobby.id, 'é totalmente compatível!')
    return true
  })
  
  console.log('🏠 Total de lobbies após filtro:', filteredLobbies.length)
  return filteredLobbies
}

function isRankCompatibleForLobby(lobby: any, player: any): boolean {
  const gameMode = lobby.game_mode
  const playerRank = gameMode === 'ranked_flex' ? player.rank_flex : player.rank_solo
  
  if (!playerRank) {
    return true // Sem rank definido, compatível
  }

  const playerRankValue = RANK_VALUES[playerRank as LolRank]

  // Verificar requisitos do lobby
  if (lobby.required_rank_min) {
    const minRankValue = RANK_VALUES[lobby.required_rank_min as LolRank]
    if (playerRankValue < minRankValue) {
      return false
    }
  }

  if (lobby.required_rank_max) {
    const maxRankValue = RANK_VALUES[lobby.required_rank_max as LolRank]
    if (playerRankValue > maxRankValue) {
      return false
    }
  }

  return true
}

function isRankCompatibleForQueue(queueEntry: any, lobby: any): boolean {
  const gameMode = queueEntry.game_mode
  const playerRank = gameMode === 'ranked_flex' ? queueEntry.rank_flex : queueEntry.rank_solo
  
  if (!playerRank) {
    return true // Sem rank definido, compatível
  }

  const playerRankValue = RANK_VALUES[playerRank as LolRank]

  // Verificar requisitos do jogador na queue
  if (queueEntry.required_rank_min) {
    const minRankValue = RANK_VALUES[queueEntry.required_rank_min as LolRank]
    if (playerRankValue < minRankValue) {
      return false
    }
  }

  if (queueEntry.required_rank_max) {
    const maxRankValue = RANK_VALUES[queueEntry.required_rank_max as LolRank]
    if (playerRankValue > maxRankValue) {
      return false
    }
  }

  return true
}

function hasCompatibleRoles(availableRoles: LolRole[], requiredRoles: LolRole[]): boolean {
  // Se alguma das listas inclui 'fill', é compatível
  if (availableRoles.includes('fill') || requiredRoles.includes('fill')) {
    return true
  }
  
  // Verificar se há sobreposição nas roles
  return availableRoles.some(role => requiredRoles.includes(role))
}

function findCompatibleRole(lobbyRoles: LolRole[], playerRoles: LolRole[]): LolRole | null {
  // Se o jogador tem 'fill', usar a primeira role do lobby
  if (playerRoles.includes('fill')) {
    return lobbyRoles[0] || null
  }
  
  // Se o lobby tem 'fill', usar a primeira role do jogador
  if (lobbyRoles.includes('fill')) {
    return playerRoles[0] || null
  }
  
  // Encontrar a primeira role que ambos têm em comum
  const commonRole = lobbyRoles.find(role => playerRoles.includes(role))
  return commonRole || null
}

function calculateCompatibility(lobby: any, player: any): number {
  let score = 0

  // Compatibilidade de roles (50 pontos máximo)
  const roleCompatibility = hasCompatibleRoles(lobby.preferred_roles, player.preferred_roles)
  if (roleCompatibility) {
    score += 50
    
    // Bonus se há match exato de role
    const exactRoleMatch = lobby.preferred_roles.some((role: LolRole) => 
      player.preferred_roles.includes(role) && role !== 'fill'
    )
    if (exactRoleMatch) score += 20
  }

  // Compatibilidade de rank (30 pontos máximo)
  const gameMode = lobby.game_mode
  const playerRank = gameMode === 'ranked_flex' ? player.rank_flex : player.rank_solo
  
  if (playerRank && lobby.required_rank_min && lobby.required_rank_max) {
    const playerRankValue = RANK_VALUES[playerRank as LolRank]
    const minRankValue = RANK_VALUES[lobby.required_rank_min as LolRank]
    const maxRankValue = RANK_VALUES[lobby.required_rank_max as LolRank]
    
    // Calcular quão próximo o player está do centro da faixa desejada
    const centerRank = (minRankValue + maxRankValue) / 2
    const distance = Math.abs(playerRankValue - centerRank)
    const maxDistance = Math.max(centerRank - minRankValue, maxRankValue - centerRank)
    
    score += Math.max(0, 30 - (distance / maxDistance) * 30)
  }

  // Playstyle tags (20 pontos máximo)
  if (lobby.playstyle_tags && player.playstyle_tags) {
    const commonTags = lobby.playstyle_tags.filter((tag: string) => 
      player.playstyle_tags.includes(tag)
    )
    score += Math.min(20, commonTags.length * 10)
  }

  return Math.round(score)
}
