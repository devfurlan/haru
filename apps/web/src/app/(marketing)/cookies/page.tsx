import type { Metadata } from 'next';
import Link from 'next/link';

import { CookiePreferencesButton } from '@/components/cookie-preferences-button';

export const metadata: Metadata = {
  title: 'Política de Cookies - Demandaê',
  description:
    'O que são cookies, quais o Demandaê utiliza e como você pode gerenciá-los na plataforma de agendamento e pagamentos do Demandaê - app do cliente, página pública e painel.',
};

const LAST_UPDATED = '17 de julho de 2026';

export default function CookiePolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Política de Cookies</h1>
      <p className="text-muted-foreground mt-2 text-sm">Última atualização: {LAST_UPDATED}</p>

      <div className="text-foreground mt-8 space-y-8 text-sm leading-relaxed">
        <section className="space-y-3">
          <p>
            Esta Política de Cookies explica o que são cookies, como o Demandaê
            (&ldquo;Demandaê&rdquo;, &ldquo;nós&rdquo;) os utiliza e quais opções você tem para
            gerenciá-los. Ela complementa a nossa{' '}
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
          <p>Organizamos os cookies e tecnologias equivalentes em três categorias:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Essenciais.</strong> Indispensáveis para o funcionamento da plataforma - sem
              eles, recursos como login e área autenticada não operam. Não dependem de consentimento
              prévio, por serem necessários à prestação do serviço solicitado por você, e ficam
              sempre ativos.
            </li>
            <li>
              <strong>De análise.</strong> Ajudam a entender como o site é usado (páginas mais
              acessadas, onde os visitantes encontram dificuldade) para melhorarmos o produto. Só
              são ativados <strong>com o seu consentimento</strong>.
            </li>
            <li>
              <strong>De publicidade.</strong> Servem para medir a eficácia de eventuais anúncios em
              plataformas como Meta e Google. Só são ativados{' '}
              <strong>com o seu consentimento</strong>. No momento não veiculamos anúncios, então
              nenhum cookie desta categoria é definido hoje; a opção existe para quando isso mudar.
            </li>
          </ul>
          <p>
            As categorias de análise e de publicidade vêm <strong>desativadas por padrão</strong>.
            Ao acessar o site você vê um aviso onde pode aceitar, recusar ou escolher categoria por
            categoria - e nada dessas duas categorias é carregado antes da sua escolha. Você pode
            rever essa decisão a qualquer momento (veja a seção 7).
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
                  <td className="py-2 pr-4 align-top font-mono text-xs">
                    sb-&lt;referência-do-projeto&gt;-auth-token
                  </td>
                  <td className="py-2 pr-4 align-top">
                    Mantém a sessão autenticada do usuário (Supabase Auth). Pode ser dividido em
                    partes (por exemplo, com sufixos como .0 e .1) por limite de tamanho do
                    navegador.
                  </td>
                  <td className="py-2 align-top">Essencial</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 align-top font-mono text-xs">_ga, _ga_&lt;id&gt;</td>
                  <td className="py-2 pr-4 align-top">
                    Google Analytics 4: distingue visitantes e sessões para medir o uso do site de
                    forma agregada. Só é definido após o consentimento de análise.
                  </td>
                  <td className="py-2 align-top">Análise</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 align-top font-mono text-xs">_clck, _clsk</td>
                  <td className="py-2 pr-4 align-top">
                    Microsoft Clarity: liga as páginas de uma mesma visita para reconstruir o
                    percurso (mapas de calor e gravações de sessão anônimas), ajudando a achar onde
                    a tela trava. Só é definido após o consentimento de análise.
                  </td>
                  <td className="py-2 align-top">Análise</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            O nome exato do cookie de sessão inclui a referência do projeto de autenticação e pode
            variar conforme a configuração do provedor. Os cookies de análise (Google Analytics e
            Microsoft Clarity) são carregados por meio do Google Tag Manager e{' '}
            <strong>somente depois do seu consentimento</strong> - quem recusa não recebe nenhum
            deles. Não veiculamos anúncios no momento, portanto nenhum cookie de publicidade (como
            os do Pixel da Meta ou do Google Ads) é definido hoje; caso isso mude, dependerá do seu
            consentimento na categoria de publicidade. O site também usa uma meta tag de verificação
            de domínio do Facebook e o fluxo de cadastro incorporado (Embedded Signup) do WhatsApp,
            que não são pixels de anúncios nem rastreiam a sua navegação.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Conteúdo de terceiros carregado nas páginas</h2>
          <p>
            Além dos cookies, algumas páginas carregam conteúdo hospedado por terceiros. Nesses
            casos, mesmo sem cookies, o seu <strong>endereço IP</strong> e informações básicas do
            seu navegador tornam-se conhecidos por esse terceiro, porque é o seu dispositivo que faz
            a requisição:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Mapas (OpenStreetMap).</strong> A miniatura de mapa exibida na página pública
              do estabelecimento e na tela do agendamento é montada com imagens baixadas diretamente
              dos servidores do OpenStreetMap pelo seu navegador ou aplicativo. Ocorre mesmo sem
              login e não depende da permissão de localização do seu dispositivo: o que é enviado é
              o seu IP e a área do mapa exibida, que corresponde ao endereço do estabelecimento, não
              ao seu.
            </li>
            <li>
              <strong>Sugestões de endereço (Photon/komoot).</strong> Apenas no painel do
              estabelecimento, ao digitar o endereço do negócio, as sugestões são buscadas pelo
              navegador de quem preenche o cadastro diretamente no serviço Photon, na Alemanha.
            </li>
          </ul>
          <p>
            Esses terceiros tratam os dados conforme as políticas de privacidade deles. Para mais
            detalhes sobre esse compartilhamento e a base legal aplicável, consulte as seções 10, 12
            e 17 da{' '}
            <Link href="/privacidade" className="font-medium underline underline-offset-4">
              Política de Privacidade
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Armazenamento local no aplicativo</h2>
          <p>
            No aplicativo móvel do Demandaê não utilizamos cookies de navegador, mas empregamos o
            armazenamento local do dispositivo para finalidades equivalentes: manter a sua sessão
            autenticada, guardar a sua preferência de notificações (ligadas ou desligadas),
            armazenar o token de notificações (push) e lembrar o que você já viu no seu cartão de
            fidelidade, para destacar novidades. Esses dados são necessários ao funcionamento do
            aplicativo e ficam no seu aparelho.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Cookies de terceiros</h2>
          <p>
            Alguns serviços que integram a plataforma (como provedores de autenticação,
            infraestrutura e pagamentos) podem definir seus próprios cookies, sujeitos às
            respectivas políticas de privacidade. Recomendamos consultar as políticas desses
            terceiros para mais detalhes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Como gerenciar cookies</h2>
          <p>
            As categorias de análise e de publicidade podem ser revistas a qualquer momento, sem
            precisar mexer no navegador:
          </p>
          <p>
            <CookiePreferencesButton className="text-coral font-semibold underline underline-offset-4" />
          </p>
          <p>
            Você também pode configurar o seu navegador para bloquear ou apagar cookies. No entanto,
            ao desativar cookies essenciais, partes da plataforma - incluindo o login - podem deixar
            de funcionar. As instruções variam conforme o navegador (Chrome, Firefox, Safari, Edge,
            entre outros) e costumam estar disponíveis na seção de configurações de privacidade.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Alterações desta política</h2>
          <p>
            Podemos atualizar esta Política de Cookies periodicamente. A versão vigente será sempre
            publicada nesta página, com a data de última atualização indicada no topo.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Contato</h2>
          <p>
            Em caso de dúvidas sobre o uso de cookies, entre em contato pelo e-mail{' '}
            <strong>contato@demandae.com</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
