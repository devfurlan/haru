import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Termos de Serviço - Demandaê',
  description:
    'Termos e condições de uso do Demandaê - plataforma completa de agendamento e pagamentos para negócios de serviço: app do cliente, página pública e painel. WhatsApp como canal de avisos.',
};

const LAST_UPDATED = '15 de julho de 2026';

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
            de avisos (confirmações e lembretes) e, quando contratado o serviço de atendimento por
            IA, de atendimento conversacional. Ao criar uma conta ou utilizar a plataforma, você
            declara ter lido, compreendido e concordado com estes Termos.
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
            O Demandaê disponibiliza ferramentas para gerenciamento de agendamentos (avulsos e
            recorrentes), registro de comparecimento, fila de espera, programa de fidelidade,
            avaliações, planos de assinatura do estabelecimento para os seus clientes, vitrine
            pública, importação de dados, envio de notificações, relatórios do negócio, atendimento
            automatizado de clientes pelo WhatsApp (inclusive com uso de inteligência artificial),
            suporte por inteligência artificial e processamento de pagamentos. Para o cliente final,
            oferece uma conta única para encontrar estabelecimentos, agendar, pagar e acompanhar
            atendimentos. Os recursos disponíveis podem variar conforme o plano contratado e podem
            ser alterados, ampliados ou descontinuados ao longo do tempo.
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
              É necessário ser maior de 18 anos e ter capacidade civil para criar conta e utilizar o
              serviço.
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
            , na qual o Demandaê atua como controlador.
          </p>
          <p>
            O telefone é opcional na criação da conta. Ao confirmar a posse do seu telefone por meio
            de um código enviado por SMS, os atendimentos registrados com aquele número nos
            estabelecimentos que usam a plataforma passam a ser vinculados à sua conta, reunindo o
            seu histórico em um só lugar. Enquanto o telefone não for confirmado, esse vínculo não é
            feito. Você pode excluir a sua conta a qualquer momento, diretamente no aplicativo ou no
            site, conforme a seção 22.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            5. Canais de mensagem e integração com o WhatsApp
          </h2>
          <p>
            A plataforma se integra à WhatsApp Cloud API, fornecida pela Meta. Existem dois modos de
            envio, e é importante saber qual se aplica a você:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Número do Demandaê (padrão).</strong> Nos planos sem o serviço de atendimento
              por IA em número próprio, os avisos aos clientes finais do estabelecimento (lembretes,
              cancelamentos, remarcações, avisos da fila de espera e da assinatura de serviços) são
              enviados <strong>pelo número da plataforma Demandaê</strong>, por meio de modelos de
              mensagem previamente aprovados pela Meta. Nesse modo, o Demandaê é o remetente e
              responde perante a Meta pela operação do canal. Os alertas de uso, cobrança e o
              relatório semanal enviados ao dono também usam esse número.
            </li>
            <li>
              <strong>Número próprio do estabelecimento.</strong> Disponível como parte do serviço
              adicional de atendimento por IA em número próprio, mediante conexão da sua conta na
              Meta (Embedded Signup) e pagamento da taxa de ativação. Nesse modo, você é o
              remetente: cumpre as políticas e os termos aplicáveis da Meta e do WhatsApp, incluindo
              as regras de mensagens comerciais, e é o único responsável pelo conteúdo enviado aos
              seus clientes e por obter as autorizações necessárias para contatá-los.
            </li>
          </ul>
          <p>
            Em ambos os modos, você é responsável pela veracidade e pela licitude dos dados de
            contato que insere na plataforma e pelo direito de contatar as pessoas cujos dados você
            cadastra ou importa (seção 8). O cliente final pode pedir a interrupção dos avisos por
            WhatsApp respondendo <strong>PARAR</strong> ou <strong>SAIR</strong>; para voltar a
            recebê-los, deve solicitar pelo canal de atendimento. A entrega das mensagens depende da
            Meta e das regras dela, inclusive de aprovação de modelos e de limites de qualidade, e
            pode ser suspensa por decisão dela, sem que isso configure falha do Demandaê.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            6. Atendimento automatizado por inteligência artificial
          </h2>
          <p>
            A plataforma utiliza serviços de terceiros (atualmente a OpenAI) para gerar respostas
            automáticas e, quando configurado, para interpretar pedidos e efetuar ou confirmar
            agendamentos de forma automática - tanto no atendimento aos seus clientes pelo WhatsApp,
            que é um serviço adicional contratado à parte, quanto no canal de suporte dentro do
            aplicativo e do painel, disponível a todos. Quando o atendimento por IA está ativo, o
            assistente pode, a pedido do cliente e sem intervenção humana em cada etapa, criar,
            remarcar e cancelar agendamentos e séries de agendamentos, além de gerar cobranças (Pix
            ou link de cartão). Mensagens de áudio enviadas ao WhatsApp são transcritas
            automaticamente para texto por um serviço de terceiro.
          </p>
          <p>
            As respostas são geradas automaticamente e podem conter imprecisões, erros ou
            informações desatualizadas. Você é responsável por configurar adequadamente as
            informações do seu negócio, revisar o atendimento e confirmar dados sensíveis, como
            preços, horários e disponibilidade. O Demandaê não garante a exatidão das respostas
            geradas por inteligência artificial e não se responsabiliza por agendamentos,
            cancelamentos ou compromissos firmados automaticamente. Ao utilizar a integração, você
            também se sujeita às políticas de uso aplicáveis dos provedores de inteligência
            artificial.
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
              Você é responsável pelos dados dos seus clientes finais que insere, importa ou
              processa na agenda do seu negócio (como cadastros de contato, mensagens de WhatsApp,
              agendamentos e pagamentos daquele estabelecimento) e atua como controlador desses
              dados, sendo o Demandaê operador, nos termos da LGPD. Essa condição não abrange a
              conta que o cliente final cria diretamente com o Demandaê (descrita na seção 4), em
              relação à qual o Demandaê é o controlador.
            </li>
            <li>
              Cabe a você obter o consentimento ou possuir base legal adequada para tratar e
              contatar seus clientes, inclusive pelo WhatsApp e inclusive quando o envio é feito
              pelo número da plataforma (seção 5).
            </li>
            <li>
              Caso trate dados sensíveis ou de saúde da sua clientela (por exemplo, em clínicas ou
              atendimentos de podologia) ou dados de menores, você é o controlador desses dados e
              responde pela respectiva base legal (arts. 11 e 14 da LGPD), atuando o Demandaê apenas
              como operador.
            </li>
            <li>
              <strong>Envio a destinos configurados por você.</strong> Se você configurar um
              endereço de webhook para receber avisos de agendamento (por exemplo, Discord, Slack,
              Zapier ou n8n), a plataforma enviará a esse destino dados dos agendamentos, incluindo
              nome e telefone do cliente final. A escolha do destino, a base legal desse
              compartilhamento e o que acontece com os dados depois de entregues são de sua inteira
              responsabilidade.
            </li>
            <li>
              <strong>Dados da sua equipe.</strong> Ao marcar um membro da equipe como profissional,
              o nome e a foto dele passam a ser exibidos na sua página pública, que é aberta e
              indexável por buscadores. Cabe a você informar essas pessoas e obter a autorização
              necessária.
            </li>
            <li>
              Você deve utilizar o serviço em conformidade com a legislação aplicável e com estes
              Termos.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Importação de dados pelo Contratante</h2>
          <p>
            O painel permite importar, por planilha, a sua base de clientes, serviços, agendamentos
            e histórico. Ao importar dados, você declara que possui base legal adequada para tratá-
            los e para transferi-los ao Demandaê, e que as pessoas cujos dados você importa podem
            ser legitimamente contatadas por você. O Demandaê atua, nesse fluxo, exclusivamente como
            operador, seguindo as suas instruções.
          </p>
          <p>
            Atenção a um efeito prático relevante: agendamentos futuros importados entram como
            confirmados e passam a gerar lembretes automáticos aos respectivos clientes, que podem
            ser enviados pelo número da plataforma. Antes de importar, confirme que essas pessoas
            esperam ser contatadas. O envio de mensagens a quem não as autorizou viola estes Termos
            e as políticas da Meta, e pode levar à suspensão do serviço (seção 22).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Uso aceitável</h2>
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
          <h2 className="text-xl font-semibold">10. Vitrine pública</h2>
          <p>
            Cada estabelecimento tem uma página pública, acessível sem login e indexável por
            buscadores, com os dados que o Contratante informa (nome, segmento, endereço e mapa,
            descrição, comodidades, fotos, redes sociais, serviços e preços), o nome e a foto dos
            profissionais marcados como tal e as avaliações recebidas (seção 11). O conteúdo
            publicado é de responsabilidade do Contratante, que declara ter os direitos necessários
            sobre os textos e as imagens enviados. O Demandaê pode remover conteúdo que viole estes
            Termos ou a lei.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">11. Avaliações</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              O cliente final que já teve um atendimento marcado em um estabelecimento pode avaliá-
              lo com uma nota de 1 a 5 e um comentário opcional. É uma avaliação por
              estabelecimento: avaliar de novo substitui a anterior.
            </li>
            <li>
              <strong>A avaliação é pública.</strong> A nota, o comentário e o{' '}
              <strong>seu nome</strong> ficam visíveis na página pública do estabelecimento, aberta
              a qualquer pessoa e indexável por buscadores. Os selos de opinião que você seleciona
              ao avaliar compõem o texto publicado. Não publique dados pessoais seus ou de
              terceiros, nem informações sensíveis, no comentário.
            </li>
            <li>
              As notas alimentam a média e a contagem exibidas no perfil do estabelecimento e nas
              listagens.
            </li>
            <li>
              A avaliação deve refletir uma experiência real e é de responsabilidade exclusiva de
              quem a escreve. É vedado publicar conteúdo ilegal, difamatório, discriminatório, que
              viole direitos de terceiros ou que não corresponda a um atendimento efetivamente
              contratado.
            </li>
            <li>
              O Demandaê não edita nem endossa as avaliações, e o estabelecimento não pode alterá-
              las ou removê-las. O autor pode editar ou apagar a própria avaliação a qualquer
              momento, editando-a no aplicativo ou no site, ou excluindo a sua conta. O
              estabelecimento e terceiros mencionados podem solicitar a remoção de conteúdo ilegal
              ou que viole estes Termos pelo canal da seção 25; analisaremos o pedido e poderemos
              remover o conteúdo.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">12. Programa de fidelidade</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              O estabelecimento pode manter um programa de fidelidade: a cada número definido de
              atendimentos, o cliente tem direito a um prêmio (serviço grátis ou desconto). O
              Demandaê apenas fornece a ferramenta que conta os atendimentos e registra o resgate.
            </li>
            <li>
              <strong>
                O prêmio é oferecido e honrado pelo estabelecimento, não pelo Demandaê.
              </strong>{' '}
              Quem responde pela oferta, pela sua validade e pela entrega do prêmio é o
              estabelecimento.
            </li>
            <li>
              A contagem é automática: cada atendimento passado que não foi cancelado e não foi
              registrado como falta vale um carimbo. Um atendimento registrado como falta (seção 15)
              não gera carimbo.
            </li>
            <li>
              O estabelecimento pode, a qualquer momento, alterar a regra do programa, pausá-lo ou
              encerrá-lo. A alteração da regra vale imediatamente, inclusive para carimbos já
              acumulados, e o encerramento apaga os cartões e o histórico de resgates. Ou seja, um
              cartão em andamento pode ser modificado ou deixar de existir por decisão do
              estabelecimento.
            </li>
            <li>
              O cartão é pessoal, não tem valor monetário, não é conversível em dinheiro e não é
              transferível.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">13. Fila de espera</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Quando um dia está sem horários livres, o cliente pode entrar na fila de espera de um
              profissional naquele dia. Entrar na fila <strong>não reserva</strong> horário nem
              garante atendimento.
            </li>
            <li>
              Se um horário vagar, a plataforma avisa automaticamente as pessoas da fila, em ordem
              de entrada e em grupos, por notificação no aplicativo ou por WhatsApp. Quem confirmar
              primeiro fica com o horário; a chance é por prazo limitado e, esgotado o prazo, passa
              ao grupo seguinte.
            </li>
            <li>
              Enquanto uma oferta está aberta, os horários livres daquele profissional naquele dia
              ficam temporariamente indisponíveis para novos agendamentos, inclusive para quem não
              está na fila, até que alguém confirme ou o prazo termine.
            </li>
            <li>
              O aviso da vaga contém um link direto de confirmação, que dispensa login para
              facilitar a resposta rápida. <strong>Não encaminhe esse link:</strong> quem o tiver
              consegue ver os dados daquela oferta e confirmar o horário em seu nome.
            </li>
            <li>Você pode sair da fila a qualquer momento pelo aplicativo ou pelo site.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">14. Assinaturas de serviço do estabelecimento</h2>
          <p>
            Alguns estabelecimentos oferecem planos de assinatura aos seus clientes (por exemplo,
            &ldquo;4 atendimentos por mês&rdquo;). Aplicam-se as seguintes regras:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Com quem você contrata.</strong> A assinatura é um contrato entre você e o{' '}
              <strong>estabelecimento</strong>, que define os serviços cobertos, a quantidade de
              créditos e o preço, e é quem presta o atendimento. O Demandaê fornece a plataforma e
              intermedia a cobrança; o pagamento é processado pelo provedor de pagamento (atualmente
              o Asaas) e o valor é recebido diretamente pelo estabelecimento.
            </li>
            <li>
              <strong>Cobrança recorrente.</strong> A assinatura é cobrada automaticamente a cada
              ciclo, no meio de pagamento informado, até que seja cancelada. O CPF/CNPJ é exigido
              pelo provedor de pagamento para emitir a cobrança.
            </li>
            <li>
              <strong>Créditos.</strong> Cada ciclo pago concede os créditos do plano, consumidos
              automaticamente ao agendar um serviço coberto. Os créditos valem dentro do ciclo e{' '}
              <strong>não são acumulados para o ciclo seguinte</strong>. Créditos não utilizados não
              são convertidos em dinheiro.
            </li>
            <li>
              <strong>Falta de pagamento.</strong> Se a cobrança falhar, a assinatura fica suspensa
              e os créditos deixam de ser utilizáveis até a regularização; o provedor de pagamento
              pode tentar novamente. O estabelecimento vê a situação de inadimplência da assinatura.
            </li>
            <li>
              <strong>Cancelamento.</strong> Você pode cancelar a qualquer momento, pelo aplicativo
              ou pelo site, sem multa. O cancelamento interrompe as cobranças futuras e os créditos
              do ciclo já pago continuam válidos até o fim dele. Cancele antes de excluir a sua
              conta.
            </li>
            <li>
              O estabelecimento pode encerrar ou alterar os planos que oferece; alterações não
              retroagem ao ciclo já pago.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">15. Agendamentos recorrentes e comparecimento</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Recorrência.</strong> Um agendamento pode ser repetido automaticamente
              (semanal, quinzenal ou mensal), gerando na hora várias reservas futuras. Datas que
              caiam em horário ocupado, fora do expediente, em bloqueio de agenda ou além do
              horizonte permitido <strong>são puladas</strong>, e a série é criada apenas com as
              datas viáveis. Cada ocorrência gera o seu próprio lembrete e, quando coberta por
              assinatura, consome um crédito.
            </li>
            <li>
              <strong>Comparecimento.</strong> O estabelecimento registra quem compareceu e quem
              faltou. Agendamentos passados que o estabelecimento não tenha revisado são{' '}
              <strong>encerrados automaticamente como atendidos</strong> - o sistema nunca registra
              falta sozinho. O registro de falta é feito pelo estabelecimento, pode ser corrigido
              por ele a qualquer momento e tem efeitos: não gera carimbo de fidelidade, impede
              avaliar e, quando o atendimento era coberto por assinatura, consome o crédito sem
              devolução. Se você discorda de um registro de falta, fale primeiro com o
              estabelecimento, que pode corrigi-lo; o direito de revisão previsto na Política de
              Privacidade permanece disponível.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">16. Planos, pagamentos e cancelamento</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              O acesso a determinados recursos pode estar condicionado ao pagamento de assinatura ou
              tarifas, conforme o plano contratado. A cobrança da assinatura do negócio é processada
              pelo provedor de pagamento (atualmente o Asaas).
            </li>
            <li>
              Os valores, a periodicidade e a forma de cobrança serão informados no momento da
              contratação e podem ser reajustados mediante aviso prévio. A reprecificação de um
              plano não afeta quem já o assina, enquanto a assinatura permanecer vigente.
            </li>
            <li>
              <strong>Garantia de 30 dias.</strong> Se você cancelar a assinatura do plano dentro de
              30 dias contados da contratação, devolvemos integralmente a última cobrança paga, sem
              burocracia. O estorno é processado pelo provedor de pagamento e o prazo de crédito
              depende dele e do seu meio de pagamento. Passado esse período, o cancelamento
              interrompe as cobranças futuras e não há reembolso dos valores referentes ao período
              em curso, que segue disponível até o fim do ciclo já pago.
            </li>
            <li>
              <strong>Limites do plano.</strong> Os agendamentos são ilimitados em todos os planos.
              A quota do plano base é o número de lembretes por WhatsApp enviados pelo número da
              plataforma por mês. Avisamos quando o consumo se aproxima do limite e, ao atingi-lo, o
              envio de lembretes por WhatsApp é pausado até a virada do ciclo - os demais canais
              (e-mail e notificação no aplicativo) continuam funcionando e os clientes continuam
              agendando normalmente. Também há limite de profissionais por plano.
            </li>
            <li>
              <strong>Serviços adicionais.</strong> O atendimento por IA no WhatsApp é contratado à
              parte, tem cobrança própria por volume de conversas e{' '}
              <strong>taxa de ativação sempre devida</strong>, inclusive na contratação anual. A
              taxa de ativação não é abrangida pela garantia de 30 dias descrita acima.
            </li>
            <li>
              <strong>Mudança de plano.</strong> O aumento de plano vale imediatamente, com cobrança
              proporcional; a redução de plano passa a valer na próxima renovação.
            </li>
            <li>
              O não pagamento poderá resultar em suspensão ou cancelamento do acesso à plataforma,
              observado o aviso prévio de cobrança. A suspensão por falta de pagamento não afeta a
              conta que o cliente final mantém com o Demandaê.
            </li>
            <li>
              Emitimos nota fiscal de serviço referente às cobranças da assinatura da plataforma,
              conforme a legislação aplicável.
            </li>
            <li>
              Você pode cancelar a assinatura a qualquer momento, pelo painel ou pelo canal de
              atendimento.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">17. Propriedade intelectual</h2>
          <p>
            A plataforma, incluindo software, marca, layout e demais elementos, é de titularidade do
            Demandaê e protegida pela legislação aplicável. Estes Termos não transferem qualquer
            direito de propriedade intelectual a você, concedendo apenas uma licença limitada, não
            exclusiva e revogável de uso do serviço enquanto vigente o contrato. O conteúdo e os
            dados que você insere permanecem de sua titularidade. Ao publicar conteúdo na vitrine ou
            em uma avaliação, você concede ao Demandaê uma licença gratuita e não exclusiva para
            exibi-lo e distribuí-lo na plataforma e nos seus canais de divulgação, enquanto o
            conteúdo estiver publicado.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">18. Privacidade e proteção de dados</h2>
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
          <h2 className="text-xl font-semibold">19. Disponibilidade e suporte</h2>
          <p>
            Empenhamo-nos para manter a plataforma disponível e segura, mas o serviço é fornecido
            &ldquo;no estado em que se encontra&rdquo;. Podem ocorrer interrupções para manutenção,
            atualizações ou por fatores fora do nosso controle, inclusive indisponibilidades de
            serviços de terceiros (como WhatsApp, provedores de pagamento e de infraestrutura).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">20. Limitação de responsabilidade</h2>
          <p>
            Na máxima extensão permitida pela lei, o Demandaê não se responsabiliza por danos
            indiretos, lucros cessantes, perda de dados ou prejuízos decorrentes de
            indisponibilidade do serviço, de serviços de terceiros ou do uso indevido da plataforma.
            Não garantimos resultados específicos de negócio decorrentes do uso da plataforma. O
            Demandaê não é parte na relação entre o cliente final e o estabelecimento: a prestação
            do atendimento, a entrega de prêmios de fidelidade e o cumprimento dos planos de
            assinatura do estabelecimento são de responsabilidade dele. Nada nestes Termos afasta os
            direitos assegurados ao consumidor pela legislação aplicável.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">21. Suspensão e rescisão</h2>
          <p>
            Podemos suspender ou encerrar o acesso à plataforma em caso de violação destes Termos,
            uso indevido, inadimplência ou determinação legal.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">22. Encerramento da conta</h2>
          <p>
            <strong>Cliente final:</strong> você pode excluir a sua conta a qualquer momento, pelo
            aplicativo ou pelo site, em Perfil. A exclusão remove a sua conta, os favoritos, as
            avaliações e os dispositivos de notificação vinculados a ela. Cancele antes as
            assinaturas de serviço que mantiver, para interromper as cobranças. Os cadastros,
            agendamentos e pagamentos que pertencem a cada estabelecimento permanecem sob a
            responsabilidade dele, conforme a{' '}
            <Link href="/privacidade" className="font-medium underline underline-offset-4">
              Política de Privacidade
            </Link>
            .
          </p>
          <p>
            <strong>Contratante:</strong> o encerramento da conta do estabelecimento é solicitado
            pelo canal de atendimento indicado na seção 25. Após o encerramento, os dados serão
            tratados conforme a Política de Privacidade e a legislação aplicável.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">23. Alterações dos Termos</h2>
          <p>
            Podemos atualizar estes Termos periodicamente. A versão vigente será sempre publicada
            nesta página, com a data de última atualização indicada no topo. O uso continuado da
            plataforma após as alterações implica concordância com os Termos revisados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">24. Lei aplicável e foro</h2>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Para o cliente
            final consumidor, aplica-se o foro do seu domicílio. Nas demais hipóteses, fica eleito o
            foro da comarca de Barueri/SP para dirimir quaisquer controvérsias.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">25. Contato</h2>
          <p>
            Em caso de dúvidas sobre estes Termos, entre em contato pelo e-mail{' '}
            <strong>contato@demandae.com</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
