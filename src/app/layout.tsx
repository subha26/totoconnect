
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import { RideProvider } from '@/contexts/ride-context';
import { ChatProvider } from '@/contexts/chat-context'; // Import ChatProvider

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'TotoConnect',
  description: 'Shared Toto rides for college commute.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <RideProvider>
            <ChatProvider> {/* Wrap with ChatProvider */}
              {children}
              <Toaster />
            </ChatProvider>
          </RideProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
