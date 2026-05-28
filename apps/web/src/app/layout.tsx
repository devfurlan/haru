import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'haru — agendamento e pagamento via WhatsApp',
  description:
    'Plataforma de agendamento e pagamentos pelo WhatsApp para barbearias, clínicas, podólogas e outros negócios de serviço.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
