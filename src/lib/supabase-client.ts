import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Cliente para uso no browser
export const createClient = () => {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Cliente admin para operações privilegiadas
export const createAdminClient = () => {
  return createBrowserClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'
  )
}
