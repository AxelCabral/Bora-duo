'use client'

import { useState } from 'react'
import styles from './MatchNotification.module.css'

interface MatchFound {
  id: string
  lobby: {
    id: string
    title: string
    description?: string
    game_mode: string
    max_members: number
    current_members: number
    creator_profile: {
      nickname: string
      icon_url?: string
      riot_id?: string
    }
  }
  queuePlayer: {
    profile: {
      nickname: string
      icon_url?: string
      riot_id?: string
    }
  }
  compatibilityScore: number
}

interface MatchNotificationProps {
  matches: MatchFound[]
  onAccept: (matchId: string) => Promise<void>
  onReject: (matchId: string) => Promise<void>
  isProcessing?: boolean
}

const GAME_MODE_LABELS: Record<string, string> = {
  ranked_solo_duo: 'Ranqueada Solo/Duo',
  ranked_flex: 'Ranqueada Flexível',
  normal_draft: 'Normal Draft',
  aram: 'ARAM'
}

export default function MatchNotification({ 
  matches, 
  onAccept, 
  onReject, 
  isProcessing = false 
}: MatchNotificationProps) {
  const [processingMatchId, setProcessingMatchId] = useState<string | null>(null)

  if (matches.length === 0) return null

  const handleAccept = async (matchId: string) => {
    setProcessingMatchId(matchId)
    try {
      await onAccept(matchId)
    } finally {
      setProcessingMatchId(null)
    }
  }

  const handleReject = async (matchId: string) => {
    setProcessingMatchId(matchId)
    try {
      await onReject(matchId)
    } finally {
      setProcessingMatchId(null)
    }
  }

  return (
    <div className={styles.overlay}>
      {matches.map((match) => (
        <div key={match.id} className={styles.notification}>
          <div className={styles.header}>
            <div className={styles.matchIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="2" fill="var(--primary-10)"/>
                <path d="m9 12 2 2 4-4" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className={styles.title}>
              <h2>Match Encontrado!</h2>
              <div className={styles.compatibility}>
                <span>Compatibilidade: {match.compatibilityScore}%</span>
              </div>
            </div>
          </div>

          <div className={styles.matchDetails}>
            <div className={styles.lobbyInfo}>
              <div className={styles.lobbyHeader}>
                <div className={styles.avatar}>
                  {match.lobby.creator_profile.icon_url ? (
                    <img 
                      src={match.lobby.creator_profile.icon_url} 
                      alt={match.lobby.creator_profile.nickname}
                    />
                  ) : (
                    <div className={styles.defaultAvatar}>
                      {match.lobby.creator_profile.nickname.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className={styles.creatorInfo}>
                  <h3>{match.lobby.title}</h3>
                  <div className={styles.creatorName}>
                    por {match.lobby.creator_profile.nickname}
                    {match.lobby.creator_profile.riot_id && (
                      <span className={styles.riotId}>({match.lobby.creator_profile.riot_id})</span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.lobbyMeta}>
                <span className={styles.gameMode}>
                  🎮 {GAME_MODE_LABELS[match.lobby.game_mode] || match.lobby.game_mode}
                </span>
                <span className={styles.slots}>
                  👥 {match.lobby.current_members + 1}/{match.lobby.max_members}
                </span>
              </div>

              {match.lobby.description && (
                <p className={styles.description}>{match.lobby.description}</p>
              )}
            </div>
          </div>

          <div className={styles.timer}>
            <div className={styles.timerBar}></div>
            <span>30s para responder</span>
          </div>

          <div className={styles.actions}>
            <button 
              onClick={() => handleReject(match.id)}
              disabled={processingMatchId === match.id || isProcessing}
              className={styles.rejectButton}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="m15 9-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="m9 9 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Recusar
            </button>

            <button 
              onClick={() => handleAccept(match.id)}
              disabled={processingMatchId === match.id || isProcessing}
              className={styles.acceptButton}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {processingMatchId === match.id ? 'Processando...' : 'Aceitar'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
