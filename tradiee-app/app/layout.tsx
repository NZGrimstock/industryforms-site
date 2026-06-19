import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'

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
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
