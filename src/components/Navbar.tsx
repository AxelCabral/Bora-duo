'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { Profile } from '@/types/database'
import styles from './Navbar.module.css'

interface NavbarProps {
  className?: string
}

export default function Navbar({ className }: NavbarProps) {
  const { user, loading, signOut } = useAuth()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)

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

      if (error) {
        console.error('Erro ao carregar perfil:', error)
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    }
  }

  const isActive = (path: string) => {
    return pathname.startsWith(path)
  }

  if (loading) {
    return (
      <header className={`${styles.header} ${className || ''}`}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.logo}>
            <img src="/logo-boraduo.png" alt="Bora Duo Logo" className={styles.logoImage} />
          </Link>
          
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className={`${styles.header} ${className || ''}`}>
      <div className={styles.headerContent}>
        <Link href="/" className={styles.logo}>
          <img src="/logo-boraduo.png" alt="Bora Duo Logo" className={styles.logoImage} />
        </Link>
        
        {user ? (
          <nav className={styles.nav}>
            <div className={styles.navLinks}>
              <Link 
                href="/perfil" 
                className={`${styles.navLink} ${isActive('/perfil') ? styles.active : ''}`}
              >
                Meu Perfil
              </Link>
              <Link 
                href="/lobby" 
                className={`${styles.navLink} ${isActive('/lobby') ? styles.active : ''}`}
              >
                Lobbies
              </Link>
            </div>
            
            <div className={styles.userInfo}>
              <span className={styles.userDisplay}>
                {profile?.riot_id || profile?.nickname || 'Usuário'}
              </span>
              <button onClick={signOut} className={styles.logoutButton}>
                Sair
              </button>
            </div>
          </nav>
        ) : (
          <nav className={styles.nav}>
            <Link href="/login" className={styles.navLink}>
              Entrar
            </Link>
            <Link href="/signup" className={styles.navButton}>
              Criar Conta
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}
