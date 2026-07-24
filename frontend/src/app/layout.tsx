import type { Metadata, Viewport } from 'next';
import { Syne, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppProvider } from '@/contexts/AppContext';
import { ConfirmProvider } from '@/contexts/ConfirmContext';
import CommandPalette from '@/components/layout/CommandPalette';


const syne = Syne({
  variable: '--font-syne-var',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-grotesk-var',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Invictus OS', template: '%s — Invictus OS' },
  description: 'Agency Operations Platform for Invictus Global Tech Pvt. Ltd.',
};

export const viewport: Viewport = {
  themeColor: '#2AB182',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${spaceGrotesk.variable}`} data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Anti-flash handled by ThemeProvider directly or server injection */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL,GRAD,opsz@100..700,0..1,-50..200,20..48&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="h-full antialiased" style={{ background: 'var(--c-bg)', color: 'var(--c-text)' }}>
        <AuthProvider>
          <ThemeProvider>
            <ConfirmProvider>
              <AppProvider>
                {children}
                <CommandPalette />
              </AppProvider>
            </ConfirmProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
