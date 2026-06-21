import type { Metadata, Viewport } from 'next'
import { Figtree } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'

// Figtree = Monday.com's brand font (open-source on Google Fonts).
const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-figtree',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'IndustryForms — Job Management',
  description: 'Job management for NZ/AU tradespeople',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'IndustryForms',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${figtree.variable}`}>
      <body className="h-full bg-gray-50 font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
