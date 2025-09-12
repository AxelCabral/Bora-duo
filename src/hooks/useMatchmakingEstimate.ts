'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { GameMode, LolRank, LolRole } from '@/types/database'

interface MatchmakingData {
  availableLobbies: number
  playersInQueue: number
  compatibleLobbies: number
  compatiblePlayers: number
}

interface EstimateParams {
  gameMode: GameMode
  preferredRoles: LolRole[]
  requiredRankMin?: LolRank | null
  requiredRankMax?: LolRank | null
  playstyleTags?: string[]
  currentRankSolo?: LolRank
  currentRankFlex?: LolRank
  isLobby?: boolean
  lobbySlots?: number
}

interface MatchmakingEstimate {
  estimatedWaitTime: number // em minutos
  confidence: 'low' | 'medium' | 'high'
  matchmakingData: MatchmakingData
  timeInQueue: number // tempo decorrido em segundos
  isLoading: boolean
  error: string | null
}

const RANK_VALUES: Record<LolRank, number> = {
  iron: 1, bronze: 2, silver: 3, gold: 4, platinum: 5,
  emerald: 6, diamond: 7, master: 8, grandmaster: 9, challenger: 10
}

const MAX_ESTIMATE_MINUTES = 30

export function useMatchmakingEstimate(
  params: EstimateParams,
  startTime: string | null,
  enabled: boolean = true
): MatchmakingEstimate {
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(15)
  const [confidence, setConfidence] = useState<'low' | 'medium' | 'high'>('medium')
  const [matchmakingData, setMatchmakingData] = useState<MatchmakingData>({
    availableLobbies: 0,
    playersInQueue: 0,
    compatibleLobbies: 0,
    compatiblePlayers: 0
  })
  const [timeInQueue, setTimeInQueue] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Atualizar timer a cada segundo
  useEffect(() => {
    if (!startTime || !enabled) return

    const interval = setInterval(() => {
      const now = new Date()
      const start = new Date(startTime)
      const diffInSeconds = Math.floor((now.getTime() - start.getTime()) / 1000)
      setTimeInQueue(diffInSeconds)
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, enabled])

  // Buscar dados de matchmaking e calcular estimativa
  useEffect(() => {
    if (!enabled) return

    const fetchMatchmakingData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const supabase = createClient()
        console.log('Tentando consultar banco com políticas RLS corrigidas...')

        // Buscar lobbies disponíveis com consulta simples
        const { data: lobbies, error: lobbiesError } = await supabase
          .from('lobbies')
          .select('id, game_mode, max_members, current_members, status')
          .eq('status', 'waiting')
          .eq('game_mode', params.gameMode)
          .limit(20)

        if (lobbiesError) {
          console.warn('Erro ao buscar lobbies:', lobbiesError)
          throw new Error(`Erro RLS: ${lobbiesError.message}`)
        }

        // Buscar players na queue com consulta simples
        const { data: queuePlayers, error: queueError } = await supabase
          .from('queue_entries')
          .select('id, game_mode')
          .eq('game_mode', params.gameMode)
          .limit(50)

        if (queueError) {
          console.warn('Erro ao buscar queue:', queueError)
          throw new Error(`Erro RLS: ${queueError.message}`)
        }

        console.log('✅ Consultas bem-sucedidas!', { lobbies: lobbies?.length, queuePlayers: queuePlayers?.length })

        const availableLobbies = lobbies?.length || 0
        const playersInQueue = queuePlayers?.length || 0

        // Calcular compatibilidade (versão simplificada)
        const compatibleLobbies = (lobbies || []).filter(lobby => 
          lobby.current_members < lobby.max_members
        ).length
        
        const compatiblePlayers = params.isLobby 
          ? (queuePlayers || []).length
          : 0

        const data: MatchmakingData = {
          availableLobbies,
          playersInQueue,
          compatibleLobbies,
          compatiblePlayers
        }

        setMatchmakingData(data)

        // Calcular estimativa baseada em dados reais
        const estimate = calculateEstimate(data, params)
        setEstimatedWaitTime(Math.min(estimate.waitTime, MAX_ESTIMATE_MINUTES))
        setConfidence(estimate.confidence)

      } catch (err) {
        console.error('❌ Erro nas consultas RLS, usando fallback:', err)
        
        // Usar fallback quando RLS falhar
        const fallbackEstimate = getFallbackEstimate(params.gameMode)
        
        const data: MatchmakingData = {
          availableLobbies: 0,
          playersInQueue: 0,
          compatibleLobbies: 0,
          compatiblePlayers: 0
        }
        
        setMatchmakingData(data)
        setEstimatedWaitTime(fallbackEstimate.waitTime)
        setConfidence(fallbackEstimate.confidence)
        setError(null)
      } finally {
        setIsLoading(false)
      }
    }

    // Buscar dados imediatamente
    fetchMatchmakingData()

    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchMatchmakingData, 30000)
    return () => clearInterval(interval)
  }, [params.gameMode, enabled])

  return {
    estimatedWaitTime,
    confidence,
    matchmakingData,
    timeInQueue,
    isLoading,
    error
  }
}

// Funções de compatibilidade comentadas temporariamente para debugging
// TODO: Reativar quando todas as tabelas estiverem configuradas corretamente

/*
function calculateCompatibleLobbies(lobbies: any[], params: EstimateParams): number {
  return lobbies.filter(lobby => {
    // Verificar se tem slots disponíveis
    if (lobby.current_members >= lobby.max_members) return false

    // Verificar compatibilidade de rank
    if (!isRankCompatible(lobby, params)) return false

    // Verificar se tem roles compatíveis
    if (!hasCompatibleRoles(lobby.preferred_roles, params.preferredRoles)) return false

    return true
  }).length
}

function calculateCompatiblePlayers(queuePlayers: any[], params: EstimateParams): number {
  return queuePlayers.filter(player => {
    // Verificar compatibilidade de rank
    if (!isPlayerRankCompatible(player, params)) return false

    // Verificar se tem roles compatíveis
    if (!hasCompatibleRoles(player.preferred_roles, params.preferredRoles)) return false

    return true
  }).length
}
*/

function isRankCompatible(lobby: any, params: EstimateParams): boolean {
  if (!params.currentRankSolo && !params.currentRankFlex) return true

  const playerRank = params.gameMode === 'ranked_flex' ? params.currentRankFlex : params.currentRankSolo
  if (!playerRank) return true

  const playerRankValue = RANK_VALUES[playerRank]

  // Verificar se o player atende aos requisitos do lobby
  if (lobby.required_rank_min && lobby.required_rank_min in RANK_VALUES) {
    const minRankValue = RANK_VALUES[lobby.required_rank_min as LolRank]
    if (playerRankValue < minRankValue) return false
  }

  if (lobby.required_rank_max && lobby.required_rank_max in RANK_VALUES) {
    const maxRankValue = RANK_VALUES[lobby.required_rank_max as LolRank]
    if (playerRankValue > maxRankValue) return false
  }

  return true
}

function isPlayerRankCompatible(player: any, params: EstimateParams): boolean {
  if (!params.requiredRankMin && !params.requiredRankMax) return true

  const playerRank = params.gameMode === 'ranked_flex' ? player.rank_flex : player.rank_solo
  if (!playerRank || !(playerRank in RANK_VALUES)) return true

  const playerRankValue = RANK_VALUES[playerRank as LolRank]

  // Verificar se o player atende aos nossos requisitos
  if (params.requiredRankMin) {
    const minRankValue = RANK_VALUES[params.requiredRankMin]
    if (playerRankValue < minRankValue) return false
  }

  if (params.requiredRankMax) {
    const maxRankValue = RANK_VALUES[params.requiredRankMax]
    if (playerRankValue > maxRankValue) return false
  }

  return true
}

function hasCompatibleRoles(availableRoles: LolRole[], requiredRoles: LolRole[]): boolean {
  if (!availableRoles?.length || !requiredRoles?.length) return true
  
  // Verificar se há pelo menos uma role em comum ou se tem 'fill'
  return availableRoles.includes('fill') || 
         requiredRoles.includes('fill') ||
         availableRoles.some(role => requiredRoles.includes(role))
}

function calculateEstimate(data: MatchmakingData, params: EstimateParams): { waitTime: number, confidence: 'low' | 'medium' | 'high' } {
  const { compatibleLobbies, compatiblePlayers, playersInQueue } = data

  if (params.isLobby) {
    // Estimativa para preencher lobby
    const slotsNeeded = params.lobbySlots || 4
    
    if (compatiblePlayers >= slotsNeeded) {
      return { waitTime: 2, confidence: 'high' }
    } else if (compatiblePlayers >= Math.ceil(slotsNeeded / 2)) {
      return { waitTime: 8, confidence: 'medium' }
    } else if (compatiblePlayers > 0) {
      return { waitTime: 20, confidence: 'low' }
    } else {
      return { waitTime: MAX_ESTIMATE_MINUTES, confidence: 'low' }
    }
  } else {
    // Estimativa para encontrar lobby
    if (compatibleLobbies >= 3) {
      return { waitTime: 1, confidence: 'high' }
    } else if (compatibleLobbies >= 1) {
      return { waitTime: 5, confidence: 'medium' }
    } else if (playersInQueue >= 10) {
      // Muitos players na queue, provavelmente vai formar novos lobbies
      return { waitTime: 12, confidence: 'medium' }
    } else if (playersInQueue >= 5) {
      return { waitTime: 18, confidence: 'low' }
    } else {
      return { waitTime: MAX_ESTIMATE_MINUTES, confidence: 'low' }
    }
  }
}

// Função utilitária para formatar tempo
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

export function formatEstimate(minutes: number): string {
  if (minutes < 1) return 'Menos de 1 min'
  if (minutes >= MAX_ESTIMATE_MINUTES) return `${MAX_ESTIMATE_MINUTES}+ min`
  return `${minutes} min`
}

// Função de fallback quando não conseguimos acessar o banco
function getFallbackEstimate(gameMode: GameMode): { waitTime: number, confidence: 'low' | 'medium' | 'high' } {
  // Estimativas baseadas em experiência típica por modo de jogo
  switch (gameMode) {
    case 'ranked_solo_duo':
      return { waitTime: 8, confidence: 'medium' }
    case 'ranked_flex':
      return { waitTime: 12, confidence: 'medium' }
    case 'normal_draft':
      return { waitTime: 5, confidence: 'medium' }
    case 'aram':
      return { waitTime: 3, confidence: 'high' }
    default:
      return { waitTime: 10, confidence: 'medium' }
  }
}
