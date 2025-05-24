
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
  manifest: '/manifest.json', // Link to the manifest file
  themeColor: '#202A73', // Primary theme color
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TotoConnect',
    // startupImage: [], // You can add splash screen images here
  },
  icons: {
    icon: '/icons/icon-192x192.png', // Default icon
    apple: '/icons/apple-touch-icon.png', // Apple touch icon
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* It's good practice to include theme-color meta tag here too, though Metadata API also handles it */}
        <meta name="theme-color" content="#202A73" />
      </head>
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
