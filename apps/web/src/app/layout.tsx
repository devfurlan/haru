import type { Metadata } from 'next';
import { Fraunces, Hanken_Grotesk } from 'next/font/google';

import { CookieConsent } from '@/components/cookie-consent';
import { CONSENT_BOOTSTRAP_SCRIPT } from '@/lib/consent';

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
  title: 'Demandaê - seu cliente agenda pelo app ou pela web',
  description:
    'A plataforma completa de agendamento: app do cliente, página pública com a cara do seu negócio e um painel que junta tudo num lugar só. Confirmações e lembretes automáticos no WhatsApp. Para barbearias, salões, clínicas, podologia, estética, tatuagem e afins.',
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
  verification: {
    other: {
      'facebook-domain-verification': 'rkqs51hez0t038j7lytnp60z35xjqi',
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${hanken.variable}`}>
      <head>
        {/* Estado de consentimento ANTES de qualquer tag do Google. Script cru, não
            next/script: `beforeInteractive` + dangerouslySetInnerHTML é bug conhecido
            e não roda (vercel/next.js#31275), e o resto das estratégias roda tarde
            demais. Aqui é síncrono no HTML do servidor, então sempre ganha do GTM
            (que o @next/third-parties injeta como afterInteractive). */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
