
import type { Metadata, Viewport } from 'next'; // Added Viewport
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import { RideProvider } from '@/contexts/ride-context';
import { ChatProvider } from '@/contexts/chat-context';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'TotoConnect',
  description: 'Shared Toto rides for college commute.',
  manifest: '/manifest.json', // Link to the manifest file
  // themeColor: '#1A237E', // Removed from here
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

// Added viewport export for themeColor
export const viewport: Viewport = {
  themeColor: '#1A237E', // Primary color from your globals.css
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          The manifest link can also specify theme_color,
          but viewport export is the more modern way for Next.js.
          Ensure manifest.json also has "theme_color": "#1A237E"
        */}
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <RideProvider>
            <ChatProvider>
              {children}
              <Toaster />
            </ChatProvider>
          </RideProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
