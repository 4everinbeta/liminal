import './globals.css'
import type { Metadata } from 'next'
import AuthGate from '@/components/AuthGate'
import AppSidebar from '@/components/AppSidebar'
import TrustedTypesPolyfill from '@/components/TrustedTypesPolyfill'

export const metadata: Metadata = {
// ... existing metadata ...
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-gray-50 text-text antialiased">
        <TrustedTypesPolyfill />
        <AuthGate>
          <AppSidebar />
          <main className="min-h-screen md:pl-16 pb-20 md:pb-0">
            {children}
          </main>
        </AuthGate>
      </body>
    </html>
  )
}
