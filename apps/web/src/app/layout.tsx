import type { Metadata } from 'next';
import { Fraunces, Hanken_Grotesk } from 'next/font/google';

import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  style: ['normal', 'italic'],
  display: 'swap',
});

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Demandaê — agendamento por WhatsApp com atendente de IA',
  description:
    'Atendente de IA que agenda, remarca e cancela conversando no WhatsApp do seu negócio. Para barbearias, salões, clínicas, podólogas e outros negócios de serviço.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon0.svg', type: 'image/svg+xml' },
      { url: '/icon1.png', type: 'image/png' },
      { url: '/favicon.ico', rel: 'shortcut icon' },
    ],
    apple: [{ url: '/apple-icon.png' }],
  },
  other: {
    'apple-mobile-web-app-title': 'Demandaê',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${hanken.variable}`}>
      <body>{children}</body>
    </html>
  );
}
