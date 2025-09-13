'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { UserEvaluation, Profile, LobbyMember } from '@/types/database'
import styles from './EvaluationModal.module.css'

interface EvaluationData {
  rating: number
  comment: string
  isReport: boolean
  reportReason: string
  alreadyEvaluated?: boolean
}

interface Participant {
  user_id: string
  profile: Profile
  canEvaluate: boolean
  timeTogether: number
}

interface EvaluationModalProps {
  lobbyId: string
  lobbyTitle: string
  onClose: () => void
  onComplete: () => void
}

const REPORT_REASONS = [
  'Comportamento tóxico',
  'Griefing/Sabotagem',
  'Spam/Flood',
  'Linguagem inadequada',
  'Assédio',
  'Outro'
]

export default function EvaluationModal({ 
  lobbyId, 
  lobbyTitle, 
  onClose, 
  onComplete 
}: EvaluationModalProps) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [evaluations, setEvaluations] = useState<Record<string, EvaluationData>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadParticipants()
  }, [lobbyId])

  const loadParticipants = async () => {
    try {
      const supabase = createClient()
      
      // Buscar participantes que compartilharam o lobby por 20+ minutos
      // Buscar usuário atual
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        setError('Usuário não autenticado')
        return
      }

      // Buscar avaliações já existentes para este lobby
      const { data: existingEvaluations } = await supabase
        .from('user_evaluations')
        .select('evaluated_id, rating, comment, is_report, report_reason')
        .eq('evaluator_id', currentUser.id)
        .eq('lobby_id', lobbyId)

      // Criar mapa das avaliações existentes
      const evaluationsMap = new Map()
      if (existingEvaluations) {
        existingEvaluations.forEach((evaluation: any) => {
          evaluationsMap.set(evaluation.evaluated_id, {
            rating: evaluation.rating,
            comment: evaluation.comment || '',
            isReport: evaluation.is_report,
            reportReason: evaluation.report_reason || '',
            alreadyEvaluated: true
          })
        })
      }

      // Primeiro, buscar MEU registro no lobby para saber quando entrei/saí
      const { data: myData, error: myError } = await supabase
        .from('lobby_members')
        .select('joined_at, left_at')
        .eq('lobby_id', lobbyId)
        .eq('user_id', currentUser.id)
        .single()

      if (myError || !myData) {
        setError('Não foi possível encontrar seus dados no lobby')
        return
      }

      const myJoinedAt = new Date(myData.joined_at)
      const myLeftAt = myData.left_at ? new Date(myData.left_at) : new Date()

      // Buscar TODOS os outros membros do lobby
      const { data: membersData, error: membersError } = await supabase
        .from('lobby_members')
        .select('user_id, joined_at, left_at')
        .eq('lobby_id', lobbyId)
        .neq('user_id', currentUser.id) // Não incluir o próprio usuário

      if (membersError) throw membersError

      // Calcular tempo de sobreposição com cada participante
      const participantsData = []
      if (membersData && membersData.length > 0) {
        for (const member of membersData) {
          try {
            const memberJoinedAt = new Date(member.joined_at)
            const memberLeftAt = member.left_at ? new Date(member.left_at) : new Date()
            
            // Calcular período de sobreposição
            const overlapStart = new Date(Math.max(myJoinedAt.getTime(), memberJoinedAt.getTime()))
            const overlapEnd = new Date(Math.min(myLeftAt.getTime(), memberLeftAt.getTime()))
            
            // Calcular minutos de sobreposição
            const overlapMinutes = Math.max(0, Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)))
            
            // Só incluir se compartilharam pelo menos 20 minutos juntos
            if (overlapMinutes >= 20) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', member.user_id)
                .maybeSingle()
              
              participantsData.push({
                user_id: member.user_id,
                profile: profileData || { 
                  user_id: member.user_id, 
                  nickname: 'Usuário', 
                  riot_id: null,
                  roles_preference: [],
                  playstyle_tags: []
                },
                canEvaluate: true, // Se chegou aqui, pode avaliar
                timeTogether: overlapMinutes // Tempo que ficaram JUNTOS
              })
            }
          } catch (profileError) {
            console.warn('Erro ao carregar perfil:', profileError)
          }
        }
      }

      setParticipants(participantsData)

      // Pré-popular avaliações existentes
      const initialEvaluations: Record<string, EvaluationData> = {}
      participantsData.forEach(participant => {
        const existingEval = evaluationsMap.get(participant.user_id)
        if (existingEval) {
          initialEvaluations[participant.user_id] = existingEval
        }
      })
      setEvaluations(initialEvaluations)

    } catch (err) {
      console.error('Erro ao carregar participantes:', err)
      setError('Erro ao carregar participantes para avaliação')
    } finally {
      setLoading(false)
    }
  }

  const updateEvaluation = (userId: string, updates: Partial<EvaluationData>) => {
    setEvaluations(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        ...updates
      }
    }))
  }

  const handleRatingChange = (userId: string, rating: number) => {
    updateEvaluation(userId, { rating })
  }

  const handleCommentChange = (userId: string, comment: string) => {
    updateEvaluation(userId, { comment })
  }

  const handleReportToggle = (userId: string, isReport: boolean) => {
    updateEvaluation(userId, { 
      isReport, 
      rating: isReport ? 0 : (evaluations[userId]?.rating || 0),
      reportReason: isReport ? evaluations[userId]?.reportReason || '' : ''
    })
  }

  const handleReportReasonChange = (userId: string, reason: string) => {
    updateEvaluation(userId, { reportReason: reason })
  }

  const handleSubmit = async () => {
    if (submitting) return

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const supabase = createClient()
      
      // Obter ID do usuário atual
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        setError('Usuário não autenticado')
        return
      }
      
      // Preparar avaliações para inserção (apenas novas avaliações)
      const evaluationsToInsert = Object.entries(evaluations)
        .filter(([_, data]) => !data.alreadyEvaluated && (data.rating > 0 || data.isReport))
        .map(([userId, data]) => ({
          evaluator_id: currentUser.id,
          evaluated_id: userId,
          lobby_id: lobbyId,
          rating: data.isReport ? 0 : (data.rating || 0),
          comment: data.comment || null,
          is_report: Boolean(data.isReport), // Garantir que seja boolean
          report_reason: data.isReport ? (data.reportReason || null) : null
        }))

      if (evaluationsToInsert.length === 0) {
        setError('Selecione pelo menos uma avaliação ou denúncia')
        return
      }

      // Inserir avaliações
      const { error: insertError } = await supabase
        .from('user_evaluations')
        .insert(evaluationsToInsert)

      if (insertError) throw insertError

      setSuccess('Avaliações enviadas com sucesso!')
      
      // Aguardar um pouco antes de fechar
      setTimeout(() => {
        onComplete()
      }, 1500)

    } catch (err) {
      console.error('Erro ao enviar avaliações:', err)
      setError('Erro ao enviar avaliações. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const getRatingText = (rating: number) => {
    const texts = ['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente']
    return texts[rating] || ''
  }

  if (loading) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Carregando participantes...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Avaliar Participantes</h2>
          <button onClick={onClose} className={styles.closeButton}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <p style={{ color: '#888', marginBottom: '20px' }}>
            Avalie os jogadores que compartilharam o lobby <strong>&quot;{lobbyTitle}&quot;</strong> com você por pelo menos 20 minutos.
          </p>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          {participants.length === 0 ? (
            <div className={styles.noParticipants}>
              <p>Nenhum participante encontrado para avaliação.</p>
              <p>Você precisa ter jogado pelo menos 20 minutos com alguém para poder avaliá-lo.</p>
            </div>
          ) : (
            participants.map((participant) => {
              const evaluation = evaluations[participant.user_id] || {
                rating: 0,
                comment: '',
                isReport: false,
                reportReason: ''
              }

              return (
                <div key={participant.user_id} className={styles.participant}>
                  <div className={styles.participantHeader}>
                    <div className={styles.avatar}>
                      {participant.profile.icon_url ? (
                        <img 
                          src={participant.profile.icon_url} 
                          alt={participant.profile.nickname} 
                        />
                      ) : (
                        participant.profile.nickname.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className={styles.participantInfo}>
                      <h4>{participant.profile.riot_id || participant.profile.nickname}</h4>
                      <p>Tempo juntos: {participant.timeTogether} minutos</p>
                    </div>
                  </div>

                  <div className={styles.evaluationSection}>
                    {!evaluation.isReport && (
                      <div className={styles.ratingSection}>
                        <label className={styles.ratingLabel}>
                          {evaluation.alreadyEvaluated ? 'Sua avaliação' : 'Avaliação (0-5 estrelas)'}
                        </label>
                        <div className={styles.stars}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              className={`${styles.star} ${
                                star <= evaluation.rating ? styles.filled : ''
                              } ${evaluation.alreadyEvaluated ? styles.readonly : ''}`}
                              onClick={() => !evaluation.alreadyEvaluated && handleRatingChange(participant.user_id, star)}
                              disabled={evaluation.alreadyEvaluated}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        {evaluation.rating > 0 && (
                          <div className={styles.ratingText}>
                            {getRatingText(evaluation.rating)}
                          </div>
                        )}
                        {evaluation.alreadyEvaluated && (
                          <div className={styles.alreadyEvaluated}>
                            ✅ Você já avaliou este jogador
                          </div>
                        )}
                      </div>
                    )}

                    <div className={styles.commentSection}>
                      <label className={styles.commentLabel}>
                        {evaluation.isReport ? 'Detalhes da denúncia' : 'Comentário (opcional)'}
                      </label>
                      <textarea
                        className={`${styles.commentInput} ${evaluation.alreadyEvaluated ? styles.readonly : ''}`}
                        value={evaluation.comment}
                        onChange={(e) => !evaluation.alreadyEvaluated && handleCommentChange(participant.user_id, e.target.value)}
                        placeholder={
                          evaluation.alreadyEvaluated 
                            ? 'Sem comentário'
                            : evaluation.isReport 
                            ? 'Descreva o que aconteceu...'
                            : 'Deixe um comentário sobre este jogador...'
                        }
                        rows={3}
                        maxLength={500}
                        readOnly={evaluation.alreadyEvaluated}
                      />
                    </div>

                    <div className={styles.reportSection}>
                      <div className={styles.reportToggle}>
                        <input
                          type="checkbox"
                          id={`report-${participant.user_id}`}
                          className={styles.reportCheckbox}
                          checked={Boolean(evaluation.isReport)}
                          onChange={(e) => !evaluation.alreadyEvaluated && handleReportToggle(participant.user_id, e.target.checked)}
                          disabled={evaluation.alreadyEvaluated}
                        />
                        <label 
                          htmlFor={`report-${participant.user_id}`}
                          className={styles.reportLabel}
                        >
                          Denunciar este jogador
                        </label>
                      </div>

                      {evaluation.isReport && (
                        <>
                          <div className={styles.reportReasons}>
                            {REPORT_REASONS.map((reason) => (
                              <button
                                key={reason}
                                type="button"
                                className={`${styles.reportReason} ${
                                  evaluation.reportReason === reason ? styles.selected : ''
                                }`}
                                onClick={() => handleReportReasonChange(participant.user_id, reason)}
                              >
                                {reason}
                              </button>
                            ))}
                          </div>
                          {evaluation.reportReason === 'Outro' && (
                            <input
                              type="text"
                              className={styles.reportReasonInput}
                              placeholder="Especifique o motivo..."
                              value={evaluation.comment}
                              onChange={(e) => handleCommentChange(participant.user_id, e.target.value)}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {participants.length > 0 && (
          <div className={styles.modalFooter}>
            <button 
              onClick={onClose} 
              className={styles.cancelButton}
              disabled={submitting}
            >
              Pular
            </button>
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className={styles.submitButton}
            >
              {submitting ? 'Enviando...' : 'Enviar Avaliações'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
