import './globals.css'
import type { Metadata } from 'next'
import AuthGate from '@/components/AuthGate'
import AppSidebar from '@/components/AppSidebar'
import TrustedTypesPolyfill from '@/components/TrustedTypesPolyfill'
import GlobalChatWidget from '@/components/GlobalChatWidget'
import WebSocketManager from '@/components/WebSocketManager'
import { GlobalQuickCapture } from '@/components/GlobalQuickCapture'
import { UndoBanner } from '@/components/UndoBanner'
import { BottomTabBar } from '@/components/BottomTabBar'
import { OfflineBanner } from '@/components/OfflineBanner'
import { MobileProviders } from '@/components/MobileProviders'

export const metadata: Metadata = {
  title: 'Liminal',
  description: 'ADHD-friendly productivity',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
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
        <MobileProviders />
        <AuthGate>
          <AppSidebar />
          <GlobalChatWidget />
          <GlobalQuickCapture />
          <UndoBanner />
          <OfflineBanner />
          <main className="min-h-screen md:pl-16 pb-[calc(56px+env(safe-area-inset-bottom,0px))] md:pb-0">
            {children}
          </main>
          <BottomTabBar />
        </AuthGate>
      </body>
    </html>
  )
}
