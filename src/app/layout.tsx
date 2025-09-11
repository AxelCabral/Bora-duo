import './globals.css'
import AuthProvider from '@/components/AuthProvider'

export const metadata = { 
  title: 'Bora Duo?', 
  description: 'Encontre sua premade ideal no League of Legends',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo-boraduo.png', type: 'image/png' }
    ],
    shortcut: '/favicon.ico',
    apple: '/logo-boraduo.png',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" href="/logo-boraduo.png" />
        <meta name="theme-color" content="#c89b3c" />
        <meta property="og:title" content="Bora Duo?" />
        <meta property="og:description" content="Encontre sua premade ideal no League of Legends" />
        <meta property="og:image" content="/logo-boraduo.png" />
        <meta property="og:type" content="website" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
