export type LolRole = 'top' | 'jungle' | 'mid' | 'adc' | 'support' | 'fill'

export type LolRank = 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'emerald' | 'diamond' | 'master' | 'grandmaster' | 'challenger'

export type LobbyStatus = 'waiting' | 'full' | 'cancelled'

export type GameMode = 'ranked_solo_duo' | 'ranked_flex' | 'normal_draft' | 'aram'

export interface Profile {
  user_id: string
  nickname: string
  full_name?: string
  birth_date?: string
  icon_url?: string
  roles_preference: LolRole[]
  playstyle_tags?: string[]
  rank_solo?: LolRank
  rank_flex?: LolRank
  riot_id?: string
  created_at: string
  updated_at: string
}

export interface Lobby {
  id: string
  creator_id: string
  title: string
  description?: string
  game_mode: GameMode
  max_members: number
  current_members: number
  status: LobbyStatus
  required_rank_min?: LolRank
  required_rank_max?: LolRank
  preferred_roles: LolRole[]
  scheduled_time?: string
  created_at: string
  updated_at: string
}

export interface LobbyMember {
  id: string
  lobby_id: string
  user_id: string
  role?: LolRole
  joined_at: string
  left_at?: string
  total_time_minutes?: number
  can_evaluate?: boolean
}

export interface QueueEntry {
  id: string
  user_id: string
  game_mode: GameMode
  preferred_roles: LolRole[]
  rank_solo?: LolRank
  rank_flex?: LolRank
  // Filtros de matchmaking
  required_rank_min?: LolRank
  required_rank_max?: LolRank
  playstyle_tags?: string[]
  created_at: string
}

export interface UserEvaluation {
  id: string
  evaluator_id: string
  evaluated_id: string
  lobby_id: string
  rating: number
  comment?: string
  is_report: boolean
  report_reason?: string
  created_at: string
}

export interface LobbyHistory {
  id: string
  user_id: string
  lobby_id: string
  lobby_title: string
  game_mode: GameMode
  joined_at: string
  left_at: string
  total_time_minutes: number
  participants_count: number
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'user_id' | 'created_at' | 'updated_at'>>
      }
      lobbies: {
        Row: Lobby
        Insert: Omit<Lobby, 'id' | 'current_members' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Lobby, 'id' | 'creator_id' | 'created_at' | 'updated_at'>>
      }
      lobby_members: {
        Row: LobbyMember
        Insert: Omit<LobbyMember, 'id' | 'joined_at'>
        Update: Partial<Omit<LobbyMember, 'id' | 'lobby_id' | 'user_id' | 'joined_at'>>
      }
      queue_entries: {
        Row: QueueEntry
        Insert: Omit<QueueEntry, 'id' | 'created_at'>
        Update: Partial<Omit<QueueEntry, 'id' | 'user_id' | 'created_at'>>
      }
      user_evaluations: {
        Row: UserEvaluation
        Insert: Omit<UserEvaluation, 'id' | 'created_at'>
        Update: Partial<Omit<UserEvaluation, 'id' | 'evaluator_id' | 'evaluated_id' | 'lobby_id' | 'created_at'>>
      }
      lobby_history: {
        Row: LobbyHistory
        Insert: Omit<LobbyHistory, 'id' | 'created_at'>
        Update: Partial<Omit<LobbyHistory, 'id' | 'user_id' | 'lobby_id' | 'created_at'>>
      }
    }
  }
}
