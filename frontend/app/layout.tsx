import './globals.css'
import type { Metadata } from 'next'
import AuthGate from '@/components/AuthGate'
import AppSidebar from '@/components/AppSidebar'
import TrustedTypesPolyfill from '@/components/TrustedTypesPolyfill'
import GlobalChatWidget from '@/components/GlobalChatWidget'
import WebSocketManager from '@/components/WebSocketManager'
import { GlobalQuickCapture } from '@/components/GlobalQuickCapture'

export const metadata: Metadata = {
  title: 'Liminal',
  description: 'ADHD-friendly productivity',
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
        <WebSocketManager />
        <AuthGate>
          <AppSidebar />
          <GlobalChatWidget />
          <GlobalQuickCapture />
          <main className="min-h-screen md:pl-16 pb-20 md:pb-0">
            {children}
          </main>
        </AuthGate>
      </body>
    </html>
  )
}
