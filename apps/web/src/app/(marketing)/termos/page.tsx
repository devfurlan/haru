import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Termos de Serviço — haru',
  description:
    'Termos e condições de uso da haru, plataforma de agendamento e pagamentos pelo WhatsApp para negócios de serviço.',
};

const LAST_UPDATED = '28 de maio de 2026';

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Termos de Serviço</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última atualização: {LAST_UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground">
        <section className="space-y-3">
          <p>
            Estes Termos de Serviço (&ldquo;Termos&rdquo;) regem o uso da haru
            (&ldquo;plataforma&rdquo;, &ldquo;serviço&rdquo;), operada por{' '}
            <strong>Cuidly Tecnologia Ltda</strong>, inscrita no CNPJ sob nº{' '}
            <strong>63.813.138/0001-20</strong>, com sede na Alameda Rio Negro, 503, Sala 2020,
            Alphaville Centro Industrial e Empresarial, Barueri/SP, CEP 06454-000
            (&ldquo;haru&rdquo;, &ldquo;nós&rdquo;).
          </p>
          <p>
            A haru oferece uma plataforma de agendamento e pagamentos por meio do WhatsApp para
            negócios de serviço. Ao criar uma conta ou utilizar a plataforma, você
            (&ldquo;Contratante&rdquo;, &ldquo;você&rdquo;) declara ter lido, compreendido e
            concordado com estes Termos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Aceitação dos termos</h2>
          <p>
            Ao acessar ou utilizar a plataforma, você concorda com estes Termos e com a nossa{' '}
            <Link href="/privacidade" className="font-medium underline underline-offset-4">
              Política de Privacidade
            </Link>
            . Caso não concorde, não utilize o serviço. Se você utiliza a plataforma em nome de uma
            pessoa jurídica, declara possuir poderes para vinculá-la a estes Termos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Descrição do serviço</h2>
          <p>
            A haru disponibiliza ferramentas para gerenciamento de agendamentos, atendimento
            automatizado de clientes pelo WhatsApp (inclusive com uso de inteligência artificial),
            envio de notificações e processamento de pagamentos. Os recursos disponíveis podem
            variar conforme o plano contratado e podem ser alterados, ampliados ou descontinuados ao
            longo do tempo.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Cadastro e conta</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Você deve fornecer informações verdadeiras, completas e atualizadas no cadastro e
              mantê-las atualizadas.
            </li>
            <li>
              Você é responsável por manter a confidencialidade das suas credenciais de acesso e por
              todas as atividades realizadas em sua conta.
            </li>
            <li>
              É necessário ser maior de 18 anos e ter capacidade civil para contratar o serviço.
            </li>
            <li>
              Notifique-nos imediatamente em caso de uso não autorizado ou suspeita de
              comprometimento da sua conta.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Integração com o WhatsApp</h2>
          <p>
            A plataforma se integra à WhatsApp Cloud API, fornecida pela Meta. Ao utilizar essa
            integração, você concorda em cumprir as políticas e os termos aplicáveis da Meta e do
            WhatsApp, incluindo as regras de mensagens comerciais. Você é o único responsável pelo
            conteúdo enviado aos seus clientes e por obter as autorizações necessárias para
            contatá-los.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Responsabilidades do Contratante</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Você é responsável pelos dados dos seus clientes finais inseridos ou processados na
              plataforma e atua como controlador desses dados, sendo a haru operadora, nos termos da
              LGPD.
            </li>
            <li>
              Cabe a você obter o consentimento ou possuir base legal adequada para tratar e
              contatar seus clientes pelo WhatsApp.
            </li>
            <li>
              Você deve utilizar o serviço em conformidade com a legislação aplicável e com estes
              Termos.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Uso aceitável</h2>
          <p>É vedado, ao utilizar a plataforma:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>enviar spam, mensagens não solicitadas ou conteúdo ilegal, enganoso ou abusivo;</li>
            <li>violar direitos de terceiros, incluindo propriedade intelectual e privacidade;</li>
            <li>
              tentar acessar indevidamente, interferir ou comprometer a segurança e a integridade da
              plataforma;
            </li>
            <li>
              utilizar o serviço para fins fraudulentos ou em desacordo com as políticas da Meta/
              WhatsApp;
            </li>
            <li>realizar engenharia reversa ou copiar partes da plataforma sem autorização.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Planos, pagamentos e cancelamento</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              O acesso a determinados recursos pode estar condicionado ao pagamento de assinatura ou
              tarifas, conforme o plano contratado.
            </li>
            <li>
              Os valores, a periodicidade e a forma de cobrança serão informados no momento da
              contratação e podem ser reajustados mediante aviso prévio.
            </li>
            <li>
              O não pagamento poderá resultar em suspensão ou cancelamento do acesso à plataforma.
            </li>
            <li>
              Você pode cancelar a assinatura a qualquer momento; salvo disposição em contrário, não
              há reembolso de valores já pagos referentes ao período em curso.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Propriedade intelectual</h2>
          <p>
            A plataforma, incluindo software, marca, layout e demais elementos, é de titularidade da
            haru e protegida pela legislação aplicável. Estes Termos não transferem qualquer direito
            de propriedade intelectual a você, concedendo apenas uma licença limitada, não exclusiva
            e revogável de uso do serviço enquanto vigente o contrato. O conteúdo e os dados que você
            insere permanecem de sua titularidade.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Privacidade e proteção de dados</h2>
          <p>
            O tratamento de dados pessoais é regido pela nossa{' '}
            <Link href="/privacidade" className="font-medium underline underline-offset-4">
              Política de Privacidade
            </Link>{' '}
            e pela{' '}
            <Link href="/cookies" className="font-medium underline underline-offset-4">
              Política de Cookies
            </Link>
            , que integram estes Termos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Disponibilidade e suporte</h2>
          <p>
            Empenhamo-nos para manter a plataforma disponível e segura, mas o serviço é fornecido
            &ldquo;no estado em que se encontra&rdquo;. Podem ocorrer interrupções para manutenção,
            atualizações ou por fatores fora do nosso controle, inclusive indisponibilidades de
            serviços de terceiros (como WhatsApp, provedores de pagamento e de infraestrutura).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">11. Limitação de responsabilidade</h2>
          <p>
            Na máxima extensão permitida pela lei, a haru não se responsabiliza por danos indiretos,
            lucros cessantes, perda de dados ou prejuízos decorrentes de indisponibilidade do
            serviço, de serviços de terceiros ou do uso indevido da plataforma. Não garantimos
            resultados específicos de negócio decorrentes do uso da plataforma.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">12. Suspensão e rescisão</h2>
          <p>
            Podemos suspender ou encerrar o acesso à plataforma em caso de violação destes Termos,
            uso indevido, inadimplência ou determinação legal. Você pode encerrar sua conta a
            qualquer momento. Após o encerramento, os dados serão tratados conforme a Política de
            Privacidade e a legislação aplicável.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">13. Alterações dos Termos</h2>
          <p>
            Podemos atualizar estes Termos periodicamente. A versão vigente será sempre publicada
            nesta página, com a data de última atualização indicada no topo. O uso continuado da
            plataforma após as alterações implica concordância com os Termos revisados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">14. Lei aplicável e foro</h2>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o
            foro da comarca de Barueri/SP para dirimir quaisquer controvérsias, com renúncia a
            qualquer outro, por mais privilegiado que seja.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">15. Contato</h2>
          <p>
            Em caso de dúvidas sobre estes Termos, entre em contato pelo e-mail{' '}
            <strong>contato@demandae.com</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
