import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { SocketProvider } from '../context/SocketContext';
import { Navbar } from '../components/Navbar';
import { MobileNav } from '../components/MobileNav';
import { Footer } from '../components/Footer';

export const metadata: Metadata = {
  title: 'PlayNear | Local Sports & Indoor Games Partner Finder',
  description:
    'Find nearby partners for badminton, chess, carrom, table tennis, cricket, and board games in your neighborhood or society clubhouse.',
  keywords: [
    'sports partner finder',
    'badminton near me',
    'chess partner',
    'society clubhouse sports',
    'indoor games partner',
    'local turf cricket',
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex flex-col min-h-screen bg-slate-50 font-sans antialiased text-slate-900 selection:bg-emerald-500 selection:text-white">
        <AuthProvider>
          <ToastProvider>
            <SocketProvider>
              <Navbar />
              <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
              </main>
              <MobileNav />
              <Footer />
            </SocketProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
