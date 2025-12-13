import './globals.css'
import type { Metadata } from 'next'
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
      <body className="font-sans">
        <main className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  )
}
