import type { Metadata } from 'next';
import { Sora, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { AnnouncementBar } from '@/components/AnnouncementBar';
import { Header } from '@/components/Header';
import { CartDrawer } from '@/components/ui/CartDrawer';
import { NotificationToast } from '@/components/ui/NotificationToast';
import { BottomNav } from '@/components/ui/BottomNav';
import { SearchBar } from '@/components/ui/SearchBar';
import { rootMetadata } from '@/lib/seo/metadata';
import { generateOrganizationSchema } from '@/lib/seo/structured-data';
import { JsonLd } from '@/components/common/JsonLd';

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = rootMetadata;

export const viewport = {
  themeColor: '#FF4500',
};

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="mn"
      suppressHydrationWarning
      className={`${sora.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col font-body antialiased bg-dark text-foreground">
        <JsonLd schema={generateOrganizationSchema()} />
        <Providers>
          <AnnouncementBar />
          <Header />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <BottomNav />
          <CartDrawer />
          <SearchBar />
          <NotificationToast />
        </Providers>
        {GA4_ID && <GoogleAnalytics gaId={GA4_ID} />}
      </body>
    </html>
  );
}
