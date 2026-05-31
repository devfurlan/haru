import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Cookies — Demandaê',
  description:
    'O que são cookies, quais o Demandaê utiliza e como você pode gerenciá-los na plataforma de agendamento e pagamentos pelo WhatsApp.',
};

const LAST_UPDATED = '28 de maio de 2026';

export default function CookiePolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Política de Cookies</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última atualização: {LAST_UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground">
        <section className="space-y-3">
          <p>
            Esta Política de Cookies explica o que são cookies, como o Demandaê (&ldquo;Demandaê&rdquo;,
            &ldquo;nós&rdquo;) os utiliza e quais opções você tem para gerenciá-los. Ela complementa
            a nossa{' '}
            <Link href="/privacidade" className="font-medium underline underline-offset-4">
              Política de Privacidade
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. O que são cookies</h2>
          <p>
            Cookies são pequenos arquivos de texto armazenados no seu navegador quando você acessa
            um site. Eles permitem que a aplicação reconheça o seu dispositivo, mantenha você
            autenticado e funcione corretamente entre as páginas. Tecnologias semelhantes, como o
            armazenamento local (<em>local storage</em>), podem ser usadas com finalidades
            equivalentes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Como usamos cookies</h2>
          <p>
            Utilizamos primordialmente <strong>cookies essenciais</strong>, indispensáveis para o
            funcionamento da plataforma. Sem eles, recursos como login e área autenticada não
            funcionam. Esses cookies não dependem de consentimento prévio, por serem necessários à
            prestação do serviço solicitado por você.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Cookies que utilizamos</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 font-semibold">Cookie</th>
                  <th className="py-2 pr-4 font-semibold">Finalidade</th>
                  <th className="py-2 font-semibold">Tipo</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b">
                  <td className="py-2 pr-4 align-top font-mono text-xs">sb-access-token</td>
                  <td className="py-2 pr-4 align-top">
                    Mantém a sessão autenticada do usuário (Supabase Auth).
                  </td>
                  <td className="py-2 align-top">Essencial</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 align-top font-mono text-xs">sb-refresh-token</td>
                  <td className="py-2 pr-4 align-top">
                    Renova a sessão autenticada sem exigir novo login.
                  </td>
                  <td className="py-2 align-top">Essencial</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Os nomes exatos dos cookies de sessão podem variar conforme a configuração do provedor
            de autenticação. Atualmente não utilizamos cookies de publicidade ou de rastreamento
            para fins de marketing.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Cookies de terceiros</h2>
          <p>
            Alguns serviços que integram a plataforma (como provedores de autenticação,
            infraestrutura e pagamentos) podem definir seus próprios cookies, sujeitos às respectivas
            políticas de privacidade. Recomendamos consultar as políticas desses terceiros para mais
            detalhes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Como gerenciar cookies</h2>
          <p>
            Você pode configurar o seu navegador para bloquear ou apagar cookies. No entanto, ao
            desativar cookies essenciais, partes da plataforma — incluindo o login — podem deixar de
            funcionar. As instruções variam conforme o navegador (Chrome, Firefox, Safari, Edge,
            entre outros) e costumam estar disponíveis na seção de configurações de privacidade.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Alterações desta política</h2>
          <p>
            Podemos atualizar esta Política de Cookies periodicamente. A versão vigente será sempre
            publicada nesta página, com a data de última atualização indicada no topo.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Contato</h2>
          <p>
            Em caso de dúvidas sobre o uso de cookies, entre em contato pelo e-mail{' '}
            <strong>contato@demandae.com</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
