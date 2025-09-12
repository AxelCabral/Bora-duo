'use client'
import { useMatchmakingEstimate, formatTime, formatEstimate } from '@/hooks/useMatchmakingEstimate'
import { GameMode, LolRank, LolRole } from '@/types/database'
import styles from './MatchmakingStats.module.css'

interface MatchmakingStatsProps {
  gameMode: GameMode
  preferredRoles: LolRole[]
  requiredRankMin?: LolRank | null
  requiredRankMax?: LolRank | null
  playstyleTags?: string[]
  currentRankSolo?: LolRank
  currentRankFlex?: LolRank
  startTime: string | null
  isLobby?: boolean
  lobbySlots?: number
  className?: string
}

export default function MatchmakingStats({
  gameMode,
  preferredRoles,
  requiredRankMin,
  requiredRankMax,
  playstyleTags,
  currentRankSolo,
  currentRankFlex,
  startTime,
  isLobby = false,
  lobbySlots,
  className = ''
}: MatchmakingStatsProps) {
  const estimate = useMatchmakingEstimate(
    {
      gameMode,
      preferredRoles,
      requiredRankMin,
      requiredRankMax,
      playstyleTags,
      currentRankSolo,
      currentRankFlex,
      isLobby,
      lobbySlots
    },
    startTime,
    !!startTime
  )

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'var(--success)'
      case 'medium': return 'var(--warning)'
      case 'low': return 'var(--error)'
      default: return 'var(--text-muted)'
    }
  }

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'Alta'
      case 'medium': return 'Média'
      case 'low': return 'Baixa'
      default: return 'Desconhecida'
    }
  }

  if (!startTime) return null

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Timer Principal */}
      <div className={styles.mainTimer}>
        <div className={styles.timerValue}>
          {formatTime(estimate.timeInQueue)}
        </div>
        <div className={styles.timerLabel}>
          {isLobby ? 'Aguardando jogadores' : 'Na fila'}
        </div>
      </div>

      {/* Estimativa */}
      <div className={styles.estimate}>
        <div className={styles.estimateValue}>
          {formatEstimate(estimate.estimatedWaitTime)}
        </div>
        <div className={styles.estimateLabel}>
          <span>Estimativa</span>
          <span 
            className={styles.confidence}
            style={{ color: getConfidenceColor(estimate.confidence) }}
          >
            ({getConfidenceLabel(estimate.confidence)})
          </span>
        </div>
      </div>

      {/* Mensagem motivacional baseada na confiança */}
      <div className={styles.motivationalMessage}>
        {estimate.confidence === 'high' && (
          <p>🚀 Match em breve!</p>
        )}
        {estimate.confidence === 'medium' && (
          <p>🎯 Procurando jogadores compatíveis...</p>
        )}
        {estimate.confidence === 'low' && (
          <p>⏳ Aguarde um pouco mais, vale a pena!</p>
        )}
      </div>

      {/* Loading indicator */}
      {estimate.isLoading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span>Atualizando dados...</span>
        </div>
      )}

      {/* Error state */}
      {estimate.error && (
        <div className={styles.error}>
          Erro ao calcular estimativa
        </div>
      )}
    </div>
  )
}
