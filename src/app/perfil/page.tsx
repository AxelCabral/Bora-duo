'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase-client'
import { Profile, LolRole, LolRank } from '@/types/database'
import Link from 'next/link'
import styles from './perfil.module.css'

const TIERS = [
  'iron',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'emerald',
  'diamond',
  'master',
  'grandmaster',
  'challenger'
] as const

const formatTier = (tier: string) => {
  return tier.charAt(0).toUpperCase() + tier.slice(1)
}

const ROLES: LolRole[] = ['top', 'jungle', 'mid', 'adc', 'support', 'fill']

const PLAYSTYLE_TAGS = [
  'tryhard',
  'casual'
]

export default function PerfilPage() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    if (!user) return

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        setError('Erro ao carregar perfil: ' + error.message)
        return
      }

      if (data) {
        setProfile(data)
      } else {
        // Criar perfil inicial se não existir
        const newProfile: Omit<Profile, 'created_at' | 'updated_at'> = {
          user_id: user.id,
          nickname: user.email?.split('@')[0] || 'Jogador',
          roles_preference: [],
          playstyle_tags: []
        }
        setProfile(newProfile as Profile)
      }
    } catch (err) {
      setError('Erro ao carregar perfil')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    if (!user || !profile) return

    setSaving(true)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .upsert(profile)

      if (error) {
        setError('Erro ao salvar perfil: ' + error.message)
        return
      }

      alert('Perfil salvo com sucesso!')
    } catch (err) {
      setError('Erro ao salvar perfil')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const updateProfile = (updates: Partial<Profile>) => {
    if (!profile) return
    setProfile({ ...profile, ...updates })
  }

  const toggleRole = (role: LolRole) => {
    if (!profile) return
    const roles = profile.roles_preference || []
    const newRoles = roles.includes(role)
      ? roles.filter(r => r !== role)
      : [...roles, role]
    updateProfile({ roles_preference: newRoles })
  }

  const togglePlaystyleTag = (tag: string) => {
    if (!profile) return
    const tags = profile.playstyle_tags || []
    const newTags = tags.includes(tag)
      ? tags.filter(t => t !== tag)
      : [...tags, tag]
    updateProfile({ playstyle_tags: newTags })
  }

  const updateRank = (type: 'solo' | 'flex', value: string) => {
    if (!profile) return
    const rankKey = type === 'solo' ? 'rank_solo' : 'rank_flex'
    updateProfile({ [rankKey]: value || null })
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando perfil...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.error}>
        <h2>Erro de Autenticação</h2>
        <p>Você precisa estar logado para acessar esta página.</p>
        <a href="/login">Fazer Login</a>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.logo}>
            <img src="/logo-boraduo.png" alt="Bora Duo Logo" className={styles.logoImage} />
          </Link>
          
          <div className={styles.userInfo}>
            <span className={styles.userEmail}>{profile?.riot_id}</span>
            <button onClick={signOut} className={styles.logoutButton}>
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.header}>
            <h2>Meu Perfil</h2>
            <p>Configure suas informações para encontrar jogadores compatíveis</p>
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.sections}>
            {/* Informações Básicas */}
            <section className={styles.section}>
              <h3>Informações Básicas</h3>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <label>Nome Completo</label>
                  <input
                    value={profile?.full_name || ''}
                    onChange={e => updateProfile({ full_name: e.target.value })}
                    placeholder="Seu nome real"
                  />
                </div>
                
                <div className={styles.field}>
                  <label>Nickname</label>
                  <input
                    value={profile?.nickname || ''}
                    onChange={e => updateProfile({ nickname: e.target.value })}
                    placeholder="Como gosta de ser chamado"
                    required
                  />
                </div>
                
                <div className={styles.field}>
                  <label>Data de Nascimento</label>
                  <input
                    type="date"
                    value={profile?.birth_date || ''}
                    onChange={e => updateProfile({ birth_date: e.target.value })}
                  />
                </div>
                
                <div className={styles.field}>
                  <label>Riot ID</label>
                  <input
                    value={profile?.riot_id || ''}
                    onChange={e => updateProfile({ riot_id: e.target.value })}
                    placeholder="Seu nome no jogo"
                  />
                </div>
              </div>
            </section>

            {/* Ranked Solo/Duo */}
            <section className={styles.section}>
              <h3>Ranked Solo/Duo</h3>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <label>Tier</label>
                  <select
                    value={profile?.rank_solo || ''}
                    onChange={e => updateRank('solo', e.target.value)}
                  >
                    <option value="">Selecione seu tier</option>
                    {TIERS.map(tier => (
                      <option key={tier} value={tier}>{formatTier(tier)}</option>
                    ))}
                  </select>
                </div>
                
              </div>
            </section>

            {/* Ranked Flex 5v5 */}
            <section className={styles.section}>
              <h3>Ranked Flex 5v5</h3>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <label>Tier</label>
                  <select
                    value={profile?.rank_flex || ''}
                    onChange={e => updateRank('flex', e.target.value)}
                  >
                    <option value="">Selecione seu tier</option>
                    {TIERS.map(tier => (
                      <option key={tier} value={tier}>{formatTier(tier)}</option>
                    ))}
                  </select>
                </div>
                
              </div>
            </section>

            {/* Preferências de Jogo */}
            <section className={styles.section}>
              <h3>Preferências de Jogo</h3>
              
              <div className={styles.field}>
                <label>Roles Preferidas</label>
                <div className={styles.checkboxes}>
                  {ROLES.map(role => (
                    <label key={role} className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={profile?.roles_preference?.includes(role) || false}
                        onChange={() => toggleRole(role)}
                      />
                      <span className={styles.checkmark}></span>
                      <span className={styles.checkboxLabel}>{role}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <label>Estilo de Jogo</label>
                <div className={styles.checkboxes}>
                  {PLAYSTYLE_TAGS.map(tag => (
                    <label key={tag} className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={profile?.playstyle_tags?.includes(tag) || false}
                        onChange={() => togglePlaystyleTag(tag)}
                      />
                      <span className={styles.checkmark}></span>
                      <span className={styles.checkboxLabel}>{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              onClick={saveProfile}
              disabled={saving}
              className={styles.saveButton}
            >
              {saving ? 'Salvando...' : 'Salvar Perfil'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
