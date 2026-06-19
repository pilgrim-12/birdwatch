import type { Metadata } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono } from 'next/font/google';
import Toasts from '@/components/Toasts';
import 'flag-icons/css/flag-icons.min.css';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BirdWatches — Real-time Satellite Tracker',
  description:
    'Track satellites in real-time on a 3D globe. Built for amateur radio operators and space enthusiasts.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark h-full`}>
      <head>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-R0ZX868VDH" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-R0ZX868VDH');
        `}</Script>
      </head>
      <body className="h-full bg-gray-950 text-gray-100 font-sans antialiased flex flex-col">
        {children}
        <Toasts />
      </body>
    </html>
  );
}
