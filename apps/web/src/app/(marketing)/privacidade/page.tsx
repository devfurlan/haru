import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidade - Demandaê',
  description:
    'Como o Demandaê coleta, usa, compartilha e protege dados pessoais na plataforma de agendamento e pagamentos pelo WhatsApp.',
};

const LAST_UPDATED = '28 de maio de 2026';

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última atualização: {LAST_UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground">
        <section className="space-y-3">
          <p>
            Esta Política de Privacidade descreve como o Demandaê (&ldquo;Demandaê&rdquo;,
            &ldquo;nós&rdquo;) coleta, utiliza, compartilha e protege dados pessoais ao oferecer uma
            plataforma de agendamento e pagamentos por meio do WhatsApp para negócios de serviço
            (barbearias, clínicas, podólogas e similares).
          </p>
          <p>
            Estamos comprometidos com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados
            &ndash; LGPD). Ao utilizar a plataforma, você concorda com as práticas descritas neste
            documento.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Controlador dos dados</h2>
          <p>
            O controlador responsável pelo tratamento dos dados pessoais é{' '}
            <strong>Cuidly Tecnologia Ltda</strong>, inscrita no CNPJ sob nº{' '}
            <strong>63.813.138/0001-20</strong>, com sede na Alameda Rio Negro, 503, Sala 2020,
            Alphaville Centro Industrial e Empresarial, Barueri/SP, CEP 06454-000. Para questões
            sobre privacidade, entre em contato pelo e-mail{' '}
            <strong>contato@demandae.com</strong>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Dados que coletamos</h2>
          <p>Coletamos diferentes categorias de dados conforme o uso da plataforma:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Dados de cadastro do negócio:</strong> nome, e-mail, senha (armazenada de
              forma criptografada), nome do estabelecimento, número de telefone do WhatsApp e dados
              de configuração da conta.
            </li>
            <li>
              <strong>Dados de clientes finais:</strong> quando um cliente conversa com o negócio
              pelo WhatsApp, tratamos nome, número de telefone, conteúdo das mensagens trocadas e
              informações de agendamento (serviço, data e horário).
            </li>
            <li>
              <strong>Dados de agendamento e atendimento:</strong> histórico de agendamentos,
              cancelamentos, reagendamentos e preferências.
            </li>
            <li>
              <strong>Dados de pagamento:</strong> quando aplicável, informações necessárias para
              processar cobranças. Dados sensíveis de cartão são tratados diretamente pelo provedor
              de pagamento, não sendo armazenados por nós.
            </li>
            <li>
              <strong>Dados técnicos e de uso:</strong> endereço IP, tipo de navegador, páginas
              acessadas e cookies (consulte nossa{' '}
              <Link href="/cookies" className="font-medium underline underline-offset-4">
                Política de Cookies
              </Link>
              ).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Como e por que usamos os dados</h2>
          <p>Tratamos dados pessoais para as seguintes finalidades e bases legais:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Prestação do serviço</strong> (execução de contrato): autenticar o acesso,
              gerenciar agendamentos, processar mensagens do WhatsApp e enviar notificações.
            </li>
            <li>
              <strong>Atendimento automatizado</strong> (execução de contrato): as mensagens
              trocadas no WhatsApp podem ser processadas por modelos de inteligência artificial para
              interpretar pedidos e responder de forma automática.
            </li>
            <li>
              <strong>Pagamentos</strong> (execução de contrato e obrigação legal): processar
              cobranças e cumprir obrigações fiscais.
            </li>
            <li>
              <strong>Melhoria e segurança</strong> (legítimo interesse): prevenir fraudes, garantir
              a segurança e aprimorar a plataforma.
            </li>
            <li>
              <strong>Comunicações</strong> (consentimento ou legítimo interesse): envio de avisos
              operacionais e, quando autorizado, comunicações de marketing.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Compartilhamento com terceiros</h2>
          <p>
            Não vendemos dados pessoais. Compartilhamos dados apenas com prestadores que viabilizam
            o funcionamento da plataforma, na medida necessária:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Meta Platforms (WhatsApp Cloud API):</strong> envio e recebimento de mensagens
              pelo WhatsApp.
            </li>
            <li>
              <strong>OpenAI:</strong> processamento por inteligência artificial do conteúdo das
              mensagens para gerar respostas automáticas.
            </li>
            <li>
              <strong>Supabase:</strong> autenticação e armazenamento de dados.
            </li>
            <li>
              <strong>Provedores de hospedagem e infraestrutura</strong> utilizados para operar a
              aplicação web e o serviço de mensagens.
            </li>
            <li>
              <strong>Provedor de pagamentos</strong> para processar transações financeiras.
            </li>
            <li>
              <strong>Autoridades públicas,</strong> quando exigido por lei ou ordem judicial.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Transferência internacional</h2>
          <p>
            Alguns dos prestadores acima (como Meta, OpenAI e provedores de infraestrutura) podem
            tratar dados em servidores fora do Brasil. Nesses casos, adotamos salvaguardas
            compatíveis com a LGPD para assegurar nível adequado de proteção.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Retenção dos dados</h2>
          <p>
            Mantemos os dados pessoais pelo tempo necessário para cumprir as finalidades descritas,
            atender obrigações legais e regulatórias e exercer direitos em eventuais processos. Após
            esse período, os dados são eliminados ou anonimizados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Segurança</h2>
          <p>
            Adotamos medidas técnicas e organizacionais para proteger os dados pessoais contra
            acesso não autorizado, perda, alteração ou divulgação indevida, incluindo criptografia
            em trânsito, controle de acesso e autenticação segura. Nenhum sistema é totalmente
            imune a riscos, mas trabalhamos continuamente para mitigá-los.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Seus direitos</h2>
          <p>
            Como titular de dados, você pode, nos termos da LGPD, solicitar a qualquer momento:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>confirmação da existência de tratamento e acesso aos seus dados;</li>
            <li>correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>
              anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em
              desconformidade com a lei;
            </li>
            <li>portabilidade dos dados a outro fornecedor;</li>
            <li>eliminação dos dados tratados com base no consentimento;</li>
            <li>informação sobre o compartilhamento dos seus dados;</li>
            <li>revogação do consentimento.</li>
          </ul>
          <p>
            Para exercer esses direitos, entre em contato pelo e-mail{' '}
            <strong>contato@demandae.com</strong>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Cookies</h2>
          <p>
            Utilizamos cookies essenciais para o funcionamento da plataforma. Para detalhes sobre
            quais cookies usamos e como gerenciá-los, consulte nossa{' '}
            <Link href="/cookies" className="font-medium underline underline-offset-4">
              Política de Cookies
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Dados de menores</h2>
          <p>
            A plataforma não se destina a menores de 18 anos. Não coletamos intencionalmente dados
            de menores sem o consentimento dos responsáveis legais.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">11. Alterações desta política</h2>
          <p>
            Podemos atualizar esta Política de Privacidade periodicamente. A versão vigente será
            sempre publicada nesta página, com a data de última atualização indicada no topo.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">12. Contato e encarregado (DPO)</h2>
          <p>
            Em caso de dúvidas sobre esta política ou sobre o tratamento dos seus dados, entre em
            contato com nosso encarregado de proteção de dados pelo e-mail{' '}
            <strong>contato@demandae.com</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
