import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'National Cybercrime Reporting Portal | Financial Crimes',
  description: 'Securely report financial cybercrime to the National Cybercrime Reporting Portal of India.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#003580',
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="bg-[#f4f7fb]"><body className={`${inter.className} antialiased`}>{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
