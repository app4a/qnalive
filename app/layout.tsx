import type { Metadata } from 'next'
import { Inter, Noto_Sans_KR } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import AuthSessionProvider from '@/components/providers/session-provider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const notoSansKR = Noto_Sans_KR({ subsets: ['latin'], variable: '--font-noto-sans-kr', weight: ['400', '500', '700'] })

export const metadata: Metadata = {
  title: 'QnALive - Interactive Event Platform',
  description: 'Engage your audience with live Q&A and polls',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className={`${inter.variable} ${notoSansKR.variable}`}>
      <body className="font-inter">
        <AuthSessionProvider>
          {children}
          <Toaster />
        </AuthSessionProvider>
      </body>
    </html>
  )
}

