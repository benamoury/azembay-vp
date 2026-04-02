import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Azembay — Vente Privée Off-Market',
  description: 'Plateforme de gestion de la vente privée du projet immobilier Azembay RIPT 1, Sidi Bou Naim',
  robots: 'noindex, nofollow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
