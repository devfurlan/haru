import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Termos de Serviço - Demandaê',
  description:
    'Termos e condições de uso do Demandaê - plataforma completa de agendamento e pagamentos para negócios de serviço: app do cliente, página pública e painel. WhatsApp como canal de avisos.',
};

const LAST_UPDATED = '2 de julho de 2026';

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Termos de Serviço</h1>
      <p className="text-muted-foreground mt-2 text-sm">Última atualização: {LAST_UPDATED}</p>

      <div className="text-foreground mt-8 space-y-8 text-sm leading-relaxed">
        <section className="space-y-3">
          <p>
            Estes Termos de Serviço (&ldquo;Termos&rdquo;) regem o uso do Demandaê
            (&ldquo;plataforma&rdquo;, &ldquo;serviço&rdquo;), operada por{' '}
            <strong>Cuidly Tecnologia Ltda</strong>, inscrita no CNPJ sob nº{' '}
            <strong>63.813.138/0001-20</strong>, com sede na Alameda Rio Negro, 503, Sala 2020,
            Alphaville Centro Industrial e Empresarial, Barueri/SP, CEP 06454-000
            (&ldquo;Demandaê&rdquo;, &ldquo;nós&rdquo;).
          </p>
          <p>
            O Demandaê oferece uma plataforma de agendamento e pagamentos para negócios de serviço,
            composta por um aplicativo móvel, uma página pública de agendamento e um painel de
            gestão, por meio dos quais o cliente final pode criar uma conta para encontrar
            estabelecimentos, agendar, pagar e acompanhar seus atendimentos. O WhatsApp é um canal
            opcional de avisos (confirmações e lembretes) e, quando contratado o serviço de
            atendimento por IA, de atendimento conversacional. Ao criar uma conta ou utilizar a
            plataforma, você declara ter lido, compreendido e concordado com estes Termos.
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
            pessoa jurídica, declara possuir poderes para vinculá-la a estes Termos. Ao criar sua
            conta - inclusive ao continuar com o Google - você aceita estes Termos e a Política de
            Privacidade. O seu aceite é registrado com a data e a hora e a versão do documento
            vigente naquele momento, como prova de ciência e concordância.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Descrição do serviço</h2>
          <p>
            O Demandaê disponibiliza ferramentas para gerenciamento de agendamentos, atendimento
            automatizado de clientes pelo WhatsApp (inclusive com uso de inteligência artificial),
            envio de notificações, suporte por inteligência artificial e processamento de
            pagamentos. Para o cliente final, oferece uma conta única para encontrar
            estabelecimentos, agendar, pagar e acompanhar atendimentos. Os recursos disponíveis podem
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
              É necessário ser maior de 18 anos e ter capacidade civil para criar conta e utilizar
              o serviço.
            </li>
            <li>
              Notifique-nos imediatamente em caso de uso não autorizado ou suspeita de
              comprometimento da sua conta.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Conta do cliente final</h2>
          <p>
            O cliente final pode criar uma conta única diretamente com o Demandaê, no site ou no
            aplicativo móvel, válida para todos os estabelecimentos que utilizam a plataforma. Essa
            relação é distinta do contrato firmado pelo dono do negócio (Contratante): nela, o
            Demandaê presta o serviço de conta, busca, agendamento, notificações e suporte
            diretamente a você, cliente. O tratamento dos dados dessa conta é regido pela nossa{' '}
            <Link href="/privacidade" className="font-medium underline underline-offset-4">
              Política de Privacidade
            </Link>
            , na qual o Demandaê atua como controlador. Para confirmar a posse do seu telefone e
            reunir seu histórico entre estabelecimentos, podemos enviar um código de verificação por
            SMS.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Integração com o WhatsApp</h2>
          <p>
            A plataforma se integra à WhatsApp Cloud API, fornecida pela Meta. Ao utilizar essa
            integração, você concorda em cumprir as políticas e os termos aplicáveis da Meta e do
            WhatsApp, incluindo as regras de mensagens comerciais. Você é o único responsável pelo
            conteúdo enviado aos seus clientes e por obter as autorizações necessárias para
            contatá-los.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            6. Atendimento automatizado por inteligência artificial
          </h2>
          <p>
            A plataforma utiliza serviços de terceiros (atualmente a OpenAI) para gerar respostas
            automáticas e, quando configurado, para interpretar pedidos e efetuar ou confirmar
            agendamentos de forma automática - tanto no atendimento aos seus clientes pelo WhatsApp
            quanto no canal de suporte dentro do aplicativo e do painel. As respostas são geradas
            automaticamente e podem conter imprecisões, erros ou informações desatualizadas. Você é
            responsável por configurar adequadamente as informações do seu negócio, revisar o
            atendimento e confirmar dados sensíveis, como preços, horários e disponibilidade. O
            Demandaê não garante a exatidão das respostas geradas por inteligência artificial e não
            se responsabiliza por agendamentos, cancelamentos ou compromissos firmados
            automaticamente. Ao utilizar a integração, você também se sujeita às políticas de uso
            aplicáveis dos provedores de inteligência artificial.
          </p>
          <p>
            Como algumas dessas interações podem ser realizadas unicamente por tratamento
            automatizado, o cliente final tem o direito de solicitar a revisão humana dessas
            decisões, nos termos do art. 20 da LGPD e da seção correspondente da{' '}
            <Link href="/privacidade" className="font-medium underline underline-offset-4">
              Política de Privacidade
            </Link>
            . O Demandaê mantém canal para essa revisão.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Responsabilidades do Contratante</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Você é responsável pelos dados dos seus clientes finais que insere ou processa na
              agenda do seu negócio (como cadastros de contato, mensagens de WhatsApp, agendamentos e
              pagamentos daquele estabelecimento) e atua como controlador desses dados, sendo o
              Demandaê operador, nos termos da LGPD. Essa condição não abrange a conta que o cliente
              final cria diretamente com o Demandaê (descrita na seção 4), em relação à qual o
              Demandaê é o controlador.
            </li>
            <li>
              Cabe a você obter o consentimento ou possuir base legal adequada para tratar e
              contatar seus clientes pelo WhatsApp.
            </li>
            <li>
              Caso trate dados sensíveis ou de saúde da sua clientela (por exemplo, em clínicas ou
              atendimentos de podologia) ou dados de menores, você é o controlador desses dados e
              responde pela respectiva base legal (arts. 11 e 14 da LGPD), atuando o Demandaê apenas
              como operador.
            </li>
            <li>
              Você deve utilizar o serviço em conformidade com a legislação aplicável e com estes
              Termos.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Uso aceitável</h2>
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
          <h2 className="text-xl font-semibold">9. Planos, pagamentos e cancelamento</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              O acesso a determinados recursos pode estar condicionado ao pagamento de assinatura ou
              tarifas, conforme o plano contratado. A cobrança da assinatura do negócio é processada
              pelo provedor de pagamento (atualmente o Asaas).
            </li>
            <li>
              Os valores, a periodicidade e a forma de cobrança serão informados no momento da
              contratação e podem ser reajustados mediante aviso prévio.
            </li>
            <li>
              <strong>Pagamentos do cliente final ao negócio:</strong> quando o negócio habilita
              pagamento online, o cliente final pode pagar o agendamento diretamente por meio do
              provedor de pagamento configurado pelo negócio (atualmente o Asaas). Nesse fluxo o
              Demandaê atua como operador do negócio; o CPF/CNPJ do pagador é exigido pelo provedor
              para emitir a cobrança, e os dados do cartão são informados diretamente na página
              segura do provedor, não sendo coletados pelo Demandaê.
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
          <h2 className="text-xl font-semibold">10. Propriedade intelectual</h2>
          <p>
            A plataforma, incluindo software, marca, layout e demais elementos, é de titularidade do
            Demandaê e protegida pela legislação aplicável. Estes Termos não transferem qualquer
            direito de propriedade intelectual a você, concedendo apenas uma licença limitada, não
            exclusiva e revogável de uso do serviço enquanto vigente o contrato. O conteúdo e os
            dados que você insere permanecem de sua titularidade.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">11. Privacidade e proteção de dados</h2>
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
          <h2 className="text-xl font-semibold">12. Disponibilidade e suporte</h2>
          <p>
            Empenhamo-nos para manter a plataforma disponível e segura, mas o serviço é fornecido
            &ldquo;no estado em que se encontra&rdquo;. Podem ocorrer interrupções para manutenção,
            atualizações ou por fatores fora do nosso controle, inclusive indisponibilidades de
            serviços de terceiros (como WhatsApp, provedores de pagamento e de infraestrutura).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">13. Limitação de responsabilidade</h2>
          <p>
            Na máxima extensão permitida pela lei, o Demandaê não se responsabiliza por danos
            indiretos, lucros cessantes, perda de dados ou prejuízos decorrentes de
            indisponibilidade do serviço, de serviços de terceiros ou do uso indevido da plataforma.
            Não garantimos resultados específicos de negócio decorrentes do uso da plataforma.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">14. Suspensão e rescisão</h2>
          <p>
            Podemos suspender ou encerrar o acesso à plataforma em caso de violação destes Termos,
            uso indevido, inadimplência ou determinação legal. Você pode encerrar sua conta a
            qualquer momento, solicitando o encerramento pelo canal de atendimento indicado na seção
            17. Após o encerramento, os dados serão tratados conforme a Política de Privacidade e a
            legislação aplicável.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">15. Alterações dos Termos</h2>
          <p>
            Podemos atualizar estes Termos periodicamente. A versão vigente será sempre publicada
            nesta página, com a data de última atualização indicada no topo. O uso continuado da
            plataforma após as alterações implica concordância com os Termos revisados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">16. Lei aplicável e foro</h2>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o
            foro da comarca de Barueri/SP para dirimir quaisquer controvérsias, com renúncia a
            qualquer outro, por mais privilegiado que seja.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">17. Contato</h2>
          <p>
            Em caso de dúvidas sobre estes Termos, entre em contato pelo e-mail{' '}
            <strong>contato@demandae.com</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
