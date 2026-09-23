import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Galymer — Independent AI Technology Partner Matching',
  description:
    'Describe your business problem once. Galymer matches you to the three technology partners that actually fit — scored on problem fit, implementation complexity, company size and your existing stack, never on vendor marketing spend.',
  metadataBase: new URL('https://galymer.ai'),
};

export const viewport: Viewport = {
  themeColor: '#08090b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-ink-950 text-mist-100 font-body antialiased">{children}</body>
    </html>
  );
}
