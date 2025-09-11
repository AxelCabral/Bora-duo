'use client'
import { useAuth } from '@/components/AuthProvider'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import styles from './page.module.css'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Navbar />

      {/* Hero Section */}
      <main className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h2 className={styles.heroTitle}>
              Encontre sua <span className={styles.highlight}>premade</span> ideal
            </h2>
            <p className={styles.heroSubtitle}>
              Conecte-se com jogadores de League of Legends que combinam com seu estilo de jogo e elo.
              Forme equipes perfeitas para se divertir, fazer amizades e jogar juntos!
            </p>
            
            <div className={styles.heroActions}>
              {user ? (
                <>
                  <Link href="/lobby" className={styles.primaryButton}>
                    Encontrar Premade
                  </Link>
                  <Link href="/perfil" className={styles.secondaryButton}>
                    Meu Perfil
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/signup" className={styles.primaryButton}>
                    Começar Agora
                  </Link>
                  <Link href="/login" className={styles.secondaryButton}>
                    Já tenho conta
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className={styles.heroImage}>
            <img src="/teammates.png" alt="Jogadores de League of Legends" className={styles.teammatesImage} />
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.featuresContent}>
          <h3 className={styles.featuresTitle}>Por que escolher o Bora Duo?</h3>
          
          <div className={styles.featuresGrid}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="6"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
              </div>
              <h4>Matchmaking Inteligente</h4>
              <p>
                Algoritmo que analisa elo, roles e estilo de jogo para formar
                equipes compatíveis
              </p>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 8C7 6.34315 5.65685 5 4 5C2.34315 5 1 6.34315 1 8C1 9.65685 2.34315 11 4 11C4.9 11 5.71 10.64 6.32 10.08" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M1 18V17C1 15.3431 2.34315 14 4 14H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M17 8C17 6.34315 18.3431 5 20 5C21.6569 5 23 6.34315 23 8C23 9.65685 21.6569 11 20 11C19.1 11 18.29 10.64 17.68 10.08" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M23 18V17C23 15.3431 21.6569 14 20 14H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h4>Ranked Flex 5v5</h4>
              <p>
                Focado em formar equipes para Ranked Flexível com jogadores do
                seu nível
              </p>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h4>Sistema de Avaliação</h4>
              <p>
                Avalie seus companheiros e melhore a qualidade das próximas
                premades
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>&copy; 2025 Bora Duo? - Todos os direitos reservados</p>
          <p>Bora Duo? foi criado seguindo a política do “Lenga-Lenga Jurídico” da Riot Games com recursos pertencentes à Riot Games. 
          A Riot Games não endossa ou patrocina este projeto. League of Legends é uma marca registrada da Riot Games</p>
        </div>
      </footer>
    </div>
  )
}
