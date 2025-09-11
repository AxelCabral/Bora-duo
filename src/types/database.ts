export type LolRole = 'top' | 'jungle' | 'mid' | 'adc' | 'support' | 'fill'

export type LolRank = 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'emerald' | 'diamond' | 'master' | 'grandmaster' | 'challenger'

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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'user_id' | 'created_at' | 'updated_at'>>
      }
    }
  }
}
