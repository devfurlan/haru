import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidade - Demandaê',
  description:
    'Como o Demandaê coleta, usa, compartilha e protege dados pessoais na plataforma de agendamento e pagamentos para negócios de serviço - app do cliente, página pública e painel.',
};

const LAST_UPDATED = '17 de julho de 2026';

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
      <p className="text-muted-foreground mt-2 text-sm">Última atualização: {LAST_UPDATED}</p>

      <div className="text-foreground mt-8 space-y-8 text-sm leading-relaxed">
        <section className="space-y-3">
          <p>
            Esta Política de Privacidade descreve como o Demandaê (&ldquo;Demandaê&rdquo;,
            &ldquo;nós&rdquo;) coleta, utiliza, compartilha e protege dados pessoais ao oferecer uma
            plataforma de agendamento e pagamentos para negócios de serviço (barbearias, clínicas,
            podólogas e similares), composta por um aplicativo móvel, uma página pública de
            agendamento e um painel de gestão, por meio dos quais o cliente final cria uma conta
            para encontrar estabelecimentos, agendar, pagar e acompanhar seus atendimentos. O
            WhatsApp é um canal de avisos.
          </p>
          <p>
            Estamos comprometidos com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados - LGPD).
            Ao utilizar a plataforma, você concorda com as práticas descritas neste documento.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Quem trata os seus dados</h2>
          <p>
            O responsável pelo tratamento dos dados pessoais é{' '}
            <strong>Cuidly Tecnologia Ltda</strong>, inscrita no CNPJ sob nº{' '}
            <strong>63.813.138/0001-20</strong>, com sede na Alameda Rio Negro, 503, Sala 2020,
            Alphaville Centro Industrial e Empresarial, Barueri/SP, CEP 06454-000. O canal do
            Encarregado de Proteção de Dados (DPO) está descrito na seção 18.
          </p>
          <p>
            Dependendo do dado, o Demandaê atua em papéis diferentes previstos na LGPD - como{' '}
            <strong>controlador</strong> (quando decide as finalidades e os meios do tratamento) ou
            como <strong>operador</strong> (quando trata dados por conta e ordem de um negócio
            cadastrado). A distinção está detalhada na seção 2.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Quem controla os seus dados (papel duplo)</h2>
          <p>O Demandaê atua em dois papéis distintos, com fronteira definida por tipo de dado:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Demandaê como controlador.</strong> Quando você cria uma conta diretamente
              conosco - seja o dono/equipe de um negócio no painel, seja o cliente final no site ou
              no aplicativo - somos o controlador dos dados dessa conta. A conta do cliente final é{' '}
              <strong>única e vale para todos os estabelecimentos</strong> que usam o Demandaê (é
              uma conta da relação entre você e o Demandaê, não uma conta por estabelecimento).
              Nesse papel decidimos as finalidades e os meios do tratamento de: e-mail, senha, nome
              e foto de perfil, identificador de login, telefone verificado, CPF do pagador, data de
              nascimento, registro de aceite dos Termos, preferência de e-mails, token de
              notificação (push), favoritos, avaliações que você publica, localização usada na
              busca, conversas de suporte pelo aplicativo, os avisos que enviamos a você pelo nosso
              próprio número de WhatsApp e a visão agregada do seu histórico entre negócios
              diferentes (incluindo os seus cartões de fidelidade reunidos em um só lugar).
            </li>
            <li>
              <strong>Demandaê como operador.</strong> Os dados que cada negócio insere, importa ou
              mantém no contexto da própria agenda - o cadastro de contato daquele cliente no
              negócio (nome, telefone, e-mail, CPF/CNPJ, data de nascimento), as conversas de
              WhatsApp entre o cliente e o negócio, os agendamentos, o registro de comparecimento e
              os pagamentos daquele estabelecimento - são controlados pelo <strong>negócio</strong>.
              Aqui o Demandaê apenas processa esses dados por conta e ordem dele, seguindo as suas
              instruções, nos termos do artigo 39 da LGPD, e não os utiliza para finalidades
              próprias. Por isso, se você excluir a sua conta Demandaê, os registros que já
              pertencem a cada negócio permanecem sob a responsabilidade do respectivo
              estabelecimento (veja as seções 13 e 18).
            </li>
          </ul>
          <p>
            <strong>Uma nota importante sobre os avisos que enviamos.</strong> Para viabilizar o
            serviço contratado pelo estabelecimento, o Demandaê envia mensagens diretamente a você,
            cliente final, pelo <strong>número de WhatsApp da plataforma</strong> (e não pelo número
            do estabelecimento): lembretes, cancelamentos, remarcações, avisos de vaga na fila de
            espera e avisos da sua assinatura de serviços. Nesse envio específico o Demandaê deixa
            de ser mero operador e atua como controlador, na medida em que somos nós quem operamos o
            canal e respondemos por ele. O conteúdo é sempre relativo aos seus próprios atendimentos
            e nunca é publicidade nossa. Você pode interromper esses avisos respondendo{' '}
            <strong>PARAR</strong> ou <strong>SAIR</strong>; para voltar a recebê-los, fale com o
            canal da seção 18.
          </p>
          <p>
            Como operador, ao recebermos uma solicitação de titular relativa a dados controlados por
            um negócio, encaminhamos o pedido ao estabelecimento responsável, em regra em até 5 dias
            úteis, informando você sobre o encaminhamento. A resposta e a decisão sobre o pedido
            cabem ao negócio, na qualidade de controlador.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Dados que coletamos</h2>
          <p>Coletamos diferentes categorias de dados conforme o uso da plataforma:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Dados de cadastro do negócio:</strong> nome, e-mail, senha (armazenada de
              forma criptografada pelo provedor de autenticação), nome e endereço do
              estabelecimento, número de telefone do WhatsApp, foto de perfil e dados de
              configuração da conta.
            </li>
            <li>
              <strong>Dados da equipe do estabelecimento:</strong> nome, e-mail e foto de cada
              usuário do painel. Quando o dono marca alguém como profissional, o{' '}
              <strong>nome e a foto passam a ser exibidos na página pública</strong> do
              estabelecimento, acessível sem login e indexável por buscadores. Quem decide essa
              publicação é o estabelecimento (veja a seção 6).
            </li>
            <li>
              <strong>Dados de conta do cliente final:</strong> e-mail e senha (armazenados pelo
              provedor de autenticação) ou login com o Google, nome, foto de perfil, identificador
              de login, telefone, registro de aceite dos Termos e da Política de Privacidade (data e
              versão) e preferência de e-mails sobre os seus agendamentos. O telefone é opcional: só
              passa a valer como telefone confirmado - e a reunir o seu histórico entre
              estabelecimentos - depois que você confirma a posse dele por um código enviado por
              SMS.
            </li>
            <li>
              <strong>Dados de clientes finais tratados em nome do negócio:</strong> quando um
              cliente conversa com o negócio pelo WhatsApp, é cadastrado por ele ou consta de uma
              base importada por ele (veja a seção 5), tratamos nome, número de telefone, e-mail,
              CPF/CNPJ, data de nascimento, conteúdo das mensagens trocadas e informações de
              agendamento (serviço, profissional, data, horário e recorrência).
            </li>
            <li>
              <strong>Registro de comparecimento:</strong> o estabelecimento registra se você
              compareceu ou faltou a um atendimento. Agendamentos passados não revisados por ele são
              encerrados automaticamente como atendidos. Esse registro tem efeitos descritos na
              seção 8.
            </li>
            <li>
              <strong>Avaliações:</strong> a nota de 1 a 5, os selos de opinião e o comentário que
              você escreve sobre um estabelecimento. Publicamos essas informações{' '}
              <strong>junto com o seu nome</strong> na página pública dele (veja a seção 6).
            </li>
            <li>
              <strong>Fidelidade:</strong> a contagem de atendimentos que forma o seu cartão é
              calculada a partir do seu histórico de agendamentos, e registramos o resgate do prêmio
              (data e regra vigente).
            </li>
            <li>
              <strong>Fila de espera:</strong> o registro de que você quer determinado dia e
              profissional em um estabelecimento, a sua posição na fila e as ofertas de vaga
              enviadas a você. É um dado de intenção, e não apenas cadastral.
            </li>
            <li>
              <strong>Assinaturas de serviço do estabelecimento:</strong> o plano assinado, o
              histórico de cobranças e a movimentação de créditos (concessão, consumo, expiração).
            </li>
            <li>
              <strong>CPF/CNPJ e data de nascimento:</strong> o CPF ou CNPJ do pagador é coletado
              quando você realiza um pagamento ou assina um plano de serviços (é exigido pelo
              provedor de pagamento para emitir a cobrança) e pode ser informado por você no perfil
              para agilizar checkouts futuros. A data de nascimento é coletada de forma opcional no
              perfil. Os dois também podem constar de uma base que o estabelecimento cadastre ou
              importe.
            </li>
            <li>
              <strong>Localização:</strong> no aplicativo e no site, mediante a sua permissão,
              usamos a localização aproximada do dispositivo para mostrar estabelecimentos próximos
              na busca. As coordenadas são usadas apenas para essa consulta no momento da busca, não
              são armazenadas por nós e não são enviadas a terceiros. Sobre o mapa exibido na página
              do estabelecimento, veja a seção 10.
            </li>
            <li>
              <strong>Notificações (push):</strong> quando você autoriza notificações no aplicativo,
              coletamos e armazenamos o token de push do dispositivo e a plataforma (Android ou iOS)
              para enviar lembretes de agendamento e avisos da fila e da sua assinatura.
            </li>
            <li>
              <strong>Conteúdo do suporte:</strong> o texto que você digita no canal de suporte
              dentro do aplicativo ou do painel (veja a seção 9).
            </li>
            <li>
              <strong>Áudio:</strong> quando você envia uma mensagem de voz ao WhatsApp de um
              estabelecimento que usa o atendimento por inteligência artificial, o arquivo de áudio
              é armazenado por nós e transcrito para texto por um provedor terceiro (veja a seção
              9).
            </li>
            <li>
              <strong>Favoritos e histórico:</strong> os estabelecimentos que você marca como
              favoritos e o histórico agregado dos seus agendamentos e pagamentos.
            </li>
            <li>
              <strong>Dados de pagamento:</strong> valor, forma de pagamento, dados da cobrança (por
              exemplo, código Pix) e status.{' '}
              <strong>Não coletamos nem armazenamos dados do seu cartão de crédito</strong>: quando
              aplicável, você os informa diretamente na página segura do provedor de pagamento.
            </li>
            <li>
              <strong>Dados técnicos e de uso:</strong> endereço IP (utilizado, por exemplo, para
              limitar tentativas de abuso), tipo de dispositivo/navegador, páginas acessadas e
              cookies (consulte nossa{' '}
              <Link href="/cookies" className="font-medium underline underline-offset-4">
                Política de Cookies
              </Link>
              ).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Como e por que usamos os dados</h2>
          <p>
            Tratamos dados pessoais para as finalidades abaixo, cada uma com a sua base legal
            determinada nos termos da LGPD:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Manter a sua conta e prestar o serviço</strong> - base legal:{' '}
              <strong>execução de contrato</strong> (art. 7º, V). Autenticar o acesso, manter o seu
              perfil, verificar a posse do seu telefone por código via SMS, gerenciar agendamentos
              (inclusive séries recorrentes), processar mensagens do WhatsApp e enviar confirmações
              operacionais.
            </li>
            <li>
              <strong>Conta única e reunião do histórico entre estabelecimentos</strong> - base
              legal: <strong>execução de contrato</strong> (art. 7º, V), na medida em que é o
              serviço contratado por você ao criar a conta única. Após confirmar a posse do seu
              telefone, vinculamos à sua conta os atendimentos que você já teve em diferentes
              negócios, oferecendo uma visão única do seu histórico e dos seus cartões de
              fidelidade.
            </li>
            <li>
              <strong>Atendimento automatizado por inteligência artificial</strong> - base legal:{' '}
              <strong>execução de contrato</strong> (art. 7º, V). As mensagens trocadas no WhatsApp
              (inclusive áudios, que são transcritos) e as conversas do suporte podem ser
              processadas por modelos de inteligência artificial para interpretar pedidos,
              responder, efetuar ou confirmar agendamentos e gerar cobranças de forma automática
              (veja as seções 9 e 14).
            </li>
            <li>
              <strong>Avisos sobre os seus atendimentos</strong> (lembretes, confirmações,
              cancelamentos e remarcações), por e-mail e por WhatsApp, inclusive pelo número da
              plataforma - bases legais: <strong>execução de contrato</strong> (art. 7º, V) quanto
              ao serviço que você contratou conosco e <strong>legítimo interesse</strong> (art. 7º,
              IX) em garantir o comparecimento e a boa prestação do serviço agendado. Você pode se
              opor a esse tratamento a qualquer momento, desligando os e-mails no seu perfil ou
              respondendo PARAR no WhatsApp.
            </li>
            <li>
              <strong>Fila de espera</strong> (avisar você quando vaga um horário e reservar
              temporariamente o horário durante a oferta) - base legal:{' '}
              <strong>execução de contrato</strong> (art. 7º, V): é o serviço que você pede ao
              entrar na fila. Você pode sair da fila a qualquer momento.
            </li>
            <li>
              <strong>Assinaturas de serviço do estabelecimento</strong> (processar a cobrança
              recorrente, conceder e consumir créditos, avisar sobre ativação, renovação, falha de
              pagamento e cancelamento) - base legal: <strong>execução de contrato</strong> (art.
              7º, V).
            </li>
            <li>
              <strong>Programa de fidelidade</strong> (contar os atendimentos e registrar o resgate)
              - base legal: <strong>execução de contrato</strong> (art. 7º, V) entre você e o
              estabelecimento, para o qual atuamos como operador.
            </li>
            <li>
              <strong>Avaliações</strong> (publicar a sua nota e o seu comentário com o seu nome na
              página do estabelecimento) - base legal: <strong>consentimento</strong> (art. 7º, I),
              manifestado ao enviar a avaliação sabendo que ela é pública. Você pode revogá-lo a
              qualquer momento, editando ou apagando a sua avaliação.
            </li>
            <li>
              <strong>Notificações push</strong> - base legal: <strong>consentimento</strong> (art.
              7º, I), manifestado ao autorizar as notificações no seu dispositivo. Você pode revogar
              esse consentimento a qualquer momento desativando as notificações no aplicativo ou no
              sistema operacional.
            </li>
            <li>
              <strong>Busca por proximidade (geolocalização)</strong> - base legal:{' '}
              <strong>consentimento</strong> (art. 7º, I), manifestado ao conceder a permissão de
              localização do seu dispositivo. Você pode revogá-lo a qualquer momento nas
              configurações do sistema operacional ou do navegador; sem a permissão, a busca por
              proximidade não é realizada.
            </li>
            <li>
              <strong>Pagamentos e obrigações fiscais</strong> - bases legais:{' '}
              <strong>execução de contrato</strong> (art. 7º, V) para processar a cobrança e{' '}
              <strong>cumprimento de obrigação legal/regulatória</strong> (art. 7º, II) para
              conservar os registros fiscais e emitir nota fiscal pelos prazos exigidos. O CPF/CNPJ
              do pagador é exigido pelo provedor de pagamento para emitir a cobrança.
            </li>
            <li>
              <strong>Gestão do negócio pelo estabelecimento</strong> (relatórios e métricas do
              próprio negócio, incluindo o resumo semanal enviado ao dono, taxa de comparecimento e
              a identificação de clientes que deixaram de retornar) - base legal:{' '}
              <strong>execução de contrato</strong> (art. 7º, V) com o estabelecimento, para o qual
              atuamos como operador. Esses relatórios são entregues ao estabelecimento a que os
              dados já pertencem e não são usados por nós para finalidades próprias nem
              compartilhados com outros estabelecimentos.
            </li>
            <li>
              <strong>Segurança, prevenção a fraudes e estabilidade</strong> - base legal:{' '}
              <strong>legítimo interesse</strong> (art. 7º, IX). Limitar tentativas de abuso dos
              nossos endereços públicos por endereço IP e monitorar erros e estabilidade dos
              sistemas. Realizamos avaliação de legítimo interesse e limitamos os dados ao
              necessário.
            </li>
            <li>
              <strong>Medição de consumo dos recursos de inteligência artificial</strong> (para
              faturamento, controle de custo e dimensionamento do serviço adicional) - base legal:{' '}
              <strong>legítimo interesse</strong> (art. 7º, IX). Registramos apenas metadados de
              consumo (modelo, contagem de tokens e custo), nunca o conteúdo das mensagens.
            </li>
            <li>
              <strong>Aprimoramento do produto a partir do feedback de suporte</strong> - base
              legal: <strong>legítimo interesse</strong> (art. 7º, IX). Você pode se opor a esse
              tratamento a qualquer momento.
            </li>
            <li>
              <strong>Avisos operacionais</strong> (por exemplo, mudanças de serviço, cobrança,
              segurança) - base legal: <strong>execução de contrato</strong> (art. 7º, V).
            </li>
            <li>
              <strong>Medição de audiência e análise de uso do site</strong> (entender páginas mais
              acessadas e onde os visitantes têm dificuldade, com ferramentas como Google Analytics
              e Microsoft Clarity) - base legal: <strong>consentimento</strong> (art. 7º, I),
              manifestado no aviso de cookies. Essas ferramentas só são ativadas se você consentir e
              você pode revogar a qualquer momento (veja a{' '}
              <Link href="/cookies" className="font-medium underline underline-offset-4">
                Política de Cookies
              </Link>
              ).
            </li>
            <li>
              <strong>Comunicações de marketing</strong> - base legal:{' '}
              <strong>consentimento</strong> (art. 7º, I). Só as enviamos quando você autoriza, e
              você pode revogar o consentimento a qualquer momento.
            </li>
          </ul>
          <p>
            Quando indicamos legítimo interesse, você tem direito de oposição; quando indicamos
            consentimento, você pode revogá-lo a qualquer momento, sem afetar a licitude do
            tratamento realizado antes da revogação.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Dados importados pelo estabelecimento</h2>
          <p>
            O painel permite que o estabelecimento importe, por planilha, a sua base de clientes,
            serviços, agendamentos e histórico. Nesses casos, os dados chegam até nós{' '}
            <strong>por meio do estabelecimento</strong>, e não diretamente de você: ele é o
            controlador desses dados e responde pela base legal que autoriza tratá-los e contatá-lo,
            atuando o Demandaê exclusivamente como operador. Agendamentos futuros importados passam
            a gerar lembretes automáticos, que podem ser enviados pelo número da plataforma.
          </p>
          <p>
            Se você recebeu uma mensagem nossa e não sabe por que os seus dados estão em um
            estabelecimento, escreva para o canal da seção 18: identificamos a origem e encaminhamos
            o seu pedido ao estabelecimento responsável, que é quem pode eliminá-los.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            6. Dados publicados na página do estabelecimento
          </h2>
          <p>
            Cada estabelecimento tem uma página pública, acessível sem login e indexável por
            buscadores. Nela podem aparecer dados pessoais:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>A sua avaliação.</strong> A nota, os selos de opinião e o comentário são
              publicados com o <strong>seu nome</strong> e a data aproximada. Não há moderação
              prévia: o conteúdo vai ao ar assim que você envia. Recomendamos não incluir dados
              pessoais seus ou de terceiros no comentário. Você pode editar ou apagar a sua
              avaliação a qualquer momento no aplicativo ou no site; ela também é removida se você
              excluir a sua conta. O estabelecimento não pode editar nem remover a sua avaliação.
              Pedidos de remoção de conteúdo ilegal ou que viole os Termos podem ser dirigidos ao
              canal da seção 18.
            </li>
            <li>
              <strong>Nome e foto dos profissionais.</strong> São publicados por decisão do
              estabelecimento, que é quem responde por informar a equipe e obter a autorização. Se
              você é profissional e quer deixar de ser exibido, fale com o estabelecimento ou com o
              canal da seção 18.
            </li>
          </ul>
          <p>
            As fotos de perfil, de capa e as imagens de profissionais ficam armazenadas em um
            repositório de acesso público: quem tiver o endereço do arquivo consegue abri-lo, mesmo
            sem estar logado.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Fila de espera e assinaturas de serviço</h2>
          <p>
            <strong>Fila de espera.</strong> Ao entrar na fila, registramos que você quer
            determinado dia com determinado profissional. Quando vaga um horário, avisamos
            automaticamente as pessoas da fila, em ordem de entrada e em grupos, por notificação no
            aplicativo ou por WhatsApp pelo número da plataforma. O aviso inclui um link direto de
            confirmação que <strong>não exige login</strong>, para permitir a resposta rápida: quem
            tiver o link consegue ver os dados daquela oferta e confirmar em seu nome, por isso não
            o encaminhe. Você pode sair da fila a qualquer momento.
          </p>
          <p>
            <strong>Assinaturas de serviço.</strong> Ao assinar um plano de um estabelecimento, o
            seu nome, e-mail, telefone e CPF/CNPJ são enviados à conta do provedor de pagamento{' '}
            <strong>do próprio estabelecimento</strong> (atualmente o Asaas), necessária para criar
            a cobrança recorrente. A partir daí, esses dados também ficam disponíveis ao
            estabelecimento no painel do provedor, sob a responsabilidade dele. Registramos o
            histórico de cobranças e a movimentação de créditos, e o estabelecimento vê a situação
            da sua assinatura, inclusive a falta de pagamento.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Registro de comparecimento e fidelidade</h2>
          <p>
            O estabelecimento registra se você compareceu ou faltou a cada atendimento, e esse
            registro fica associado ao seu cadastro no negócio. Agendamentos passados que o
            estabelecimento não revisar são encerrados automaticamente como atendidos - o sistema
            nunca registra falta sozinho. O registro de falta é uma decisão do estabelecimento e tem
            efeitos concretos: não gera carimbo no cartão de fidelidade, impede avaliar aquele
            estabelecimento e, quando o atendimento era coberto por uma assinatura, o crédito é
            consumido sem devolução.
          </p>
          <p>
            Você vê o registro nos seus agendamentos, no aplicativo e no site. Se discorda dele,
            fale com o estabelecimento, que pode corrigi-lo a qualquer momento; se preferir, use o
            canal da seção 18 e encaminharemos o pedido, garantida a revisão prevista na seção 14.
          </p>
          <p>
            No cartão de fidelidade, a contagem é derivada do seu histórico de atendimentos naquele
            estabelecimento e a regra é definida por ele, que pode alterá-la, pausar ou encerrar o
            programa - inclusive com efeito sobre cartões em andamento e sobre o histórico de
            resgates. Reunimos os seus cartões de diferentes estabelecimentos em um só lugar para
            você; nenhum estabelecimento vê o seu cartão em outro.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Suporte e inteligência artificial</h2>
          <p>
            O canal de suporte dentro do aplicativo e do painel é atendido por um assistente que
            utiliza inteligência artificial de um provedor terceiro (atualmente a OpenAI). O texto
            que você digita, junto com o histórico recente da conversa, é enviado a esse provedor
            para gerar a resposta e é retido por ele conforme os termos aplicáveis do provedor.
            Recomendamos não inserir dados sensíveis nesse canal.
          </p>
          <p>
            Quando você registra uma dúvida, crítica ou sugestão, a conversa pode ser encaminhada
            por e-mail à nossa equipe (contendo o seu nome, e-mail e o texto que você escreveu),
            para que possamos responder e aprimorar o serviço. As conversas de suporte também ficam
            armazenadas em nossos sistemas; sobre a sua retenção, veja a seção 13.
          </p>
          <p>
            <strong>Atendimento no WhatsApp.</strong> Nos estabelecimentos que contratam o
            atendimento por inteligência artificial, as mensagens trocadas com o negócio são
            enviadas ao mesmo provedor para interpretar o pedido e responder, e ficam retidas nele
            conforme os termos aplicáveis. Para isso, o conteúdo enviado inclui os dados de contato
            e os agendamentos daquele cliente no estabelecimento. Mensagens de{' '}
            <strong>áudio</strong> são armazenadas por nós e transcritas para texto pelo provedor.
            Fotos, vídeos e documentos não são processados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Mapas e endereços</h2>
          <p>
            A página pública do estabelecimento e a tela do agendamento exibem uma miniatura de mapa
            com a localização do negócio. As imagens do mapa são carregadas{' '}
            <strong>diretamente pelo seu navegador ou aplicativo</strong> a partir dos servidores do
            OpenStreetMap. Nesse carregamento, o seu <strong>endereço IP</strong> e a área do mapa
            solicitada tornam-se conhecidos por esse terceiro, sujeito à política de privacidade
            dele. Isso ocorre mesmo se você não estiver logado e não depende da permissão de
            localização do seu dispositivo (que é assunto separado, descrito na seção 3).
          </p>
          <p>
            No painel, ao digitar o endereço do estabelecimento, as sugestões vêm do serviço Photon
            (komoot, na Alemanha), chamado diretamente pelo navegador do dono; a conversão do
            endereço final em coordenadas é feita pelos nossos servidores junto ao Nominatim/
            OpenStreetMap.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">11. Registro do aceite</h2>
          <p>
            O seu aceite dos Termos de Serviço e desta Política de Privacidade é coletado no momento
            do cadastro e registrado como prova, com o carimbo de data e hora do aceite e a versão
            do documento vigente naquele momento. Ao continuar com o Google (login) você também
            aceita os Termos e esta Política, nos termos da seção 1 dos{' '}
            <Link href="/termos" className="font-medium underline underline-offset-4">
              Termos de Serviço
            </Link>
            . Quando publicamos uma nova versão relevante, podemos solicitar novo aceite. Para saber
            qual versão você aceitou ou revogar consentimentos, use o canal indicado na seção 18.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">12. Compartilhamento com terceiros</h2>
          <p>
            Não vendemos dados pessoais. Compartilhamos dados apenas com prestadores
            (subprocessadores) que viabilizam o funcionamento da plataforma, na medida necessária:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Meta Platforms (WhatsApp Cloud API):</strong> envio e recebimento de mensagens
              pelo WhatsApp, tanto pelo número da plataforma quanto pelo número do estabelecimento.
            </li>
            <li>
              <strong>OpenAI:</strong> processamento por inteligência artificial das mensagens do
              WhatsApp e das conversas do bot de suporte para gerar respostas automáticas, e
              transcrição de mensagens de áudio.
            </li>
            <li>
              <strong>Supabase:</strong> autenticação (e-mail/senha, login com Google e sessão),
              banco de dados e armazenamento de arquivos (como a foto de perfil e os áudios
              recebidos).
            </li>
            <li>
              <strong>Google:</strong> autenticação por meio do &ldquo;Entrar com o Google&rdquo;,
              quando você opta por esse login; e, mediante o seu consentimento no aviso de cookies,
              medição de audiência do site (Google Analytics), gerenciamento de tags (Google Tag
              Manager) e eventual medição de anúncios (Google Ads). Sem consentimento, essas
              ferramentas de medição não são carregadas.
            </li>
            <li>
              <strong>Microsoft (Clarity):</strong> mediante o seu consentimento no aviso de
              cookies, mapas de calor e gravações de sessão anônimas do site, para entender o uso e
              melhorar a experiência. Sem consentimento, não é carregado.
            </li>
            <li>
              <strong>Twilio (Verify):</strong> envio e verificação do código por SMS (OTP) para
              confirmar a posse do seu telefone.
            </li>
            <li>
              <strong>Asaas:</strong> gateway de pagamento atualmente ativo, que processa a cobrança
              da assinatura do negócio, a emissão da nota fiscal dessa assinatura e os pagamentos
              feitos ao negócio pelo cliente final (Pix/cartão dos agendamentos e das assinaturas de
              serviço). Exige o CPF/CNPJ do pagador para emitir a cobrança. Nas assinaturas de
              serviço, os dados são enviados à conta do provedor mantida pelo próprio
              estabelecimento (veja a seção 7). Conforme o provedor de pagamento configurado por
              cada negócio, o pagamento ao estabelecimento poderá, no futuro, ser processado por
              outro provedor; hoje o provedor ativo é o Asaas.
            </li>
            <li>
              <strong>Expo / EAS (com Google FCM e Apple APNs):</strong> emissão do token e entrega
              das notificações push ao aplicativo.
            </li>
            <li>
              <strong>Resend:</strong> envio de e-mails transacionais (confirmações e lembretes de
              agendamento, avisos de cobrança, relatório semanal do dono e encaminhamento de
              feedback de suporte).
            </li>
            <li>
              <strong>Upstash (Redis):</strong> limitação de abuso por endereço IP (efêmero) e
              estado temporário das conversas do bot.
            </li>
            <li>
              <strong>Sentry:</strong> monitoramento de erros e desempenho do serviço de mensagens
              para garantir a estabilidade, com remoção de credenciais de autenticação e sem envio
              de dados pessoais por padrão.
            </li>
            <li>
              <strong>OpenStreetMap (OSMF):</strong> imagens do mapa exibido nas páginas dos
              estabelecimentos, carregadas pelo seu dispositivo (veja a seção 10), e conversão do
              endereço do estabelecimento em coordenadas pelos nossos servidores.
            </li>
            <li>
              <strong>Photon / komoot:</strong> sugestões de endereço no painel do estabelecimento,
              chamadas pelo navegador de quem está preenchendo o cadastro.
            </li>
            <li>
              <strong>Provedores de hospedagem</strong> (Vercel, para o site e o painel, e Railway,
              para o serviço de mensagens): infraestrutura necessária para operar a aplicação.
            </li>
            <li>
              <strong>Destinos configurados pelo estabelecimento:</strong> o negócio pode configurar
              um endereço de webhook (por exemplo, Discord, Slack, Zapier ou n8n) para receber
              avisos de agendamento contendo nome e telefone do cliente. A escolha do destino e o
              que acontece com os dados lá são de responsabilidade do estabelecimento, na qualidade
              de controlador.
            </li>
            <li>
              <strong>Autoridades públicas,</strong> quando exigido por lei ou ordem judicial.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">13. Retenção e exclusão dos dados</h2>
          <p>
            Nossa política é reter os dados pessoais apenas pelo tempo necessário às finalidades
            descritas, às obrigações legais e regulatórias e ao exercício de direitos em eventuais
            processos. Como critérios de retenção:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Dados fiscais e de pagamento:</strong> conservados por 5 anos, em observância
              aos prazos fiscais aplicáveis (art. 173 do Código Tributário Nacional).
            </li>
            <li>
              <strong>Dados da conta, favoritos, avaliações e histórico:</strong> mantidos enquanto
              a conta estiver ativa e por um prazo razoável após a inatividade ou o encerramento.
            </li>
            <li>
              <strong>Registros da agenda do estabelecimento</strong> (cadastro de contato,
              agendamentos, comparecimento, fila de espera, fidelidade e assinaturas): mantidos
              enquanto o estabelecimento mantiver a conta e o vínculo com você, conforme as
              instruções dele, que é o controlador desses dados.
            </li>
            <li>
              <strong>Token de push:</strong> removido quando você desativa as notificações, faz
              logout ou solicita a exclusão da conta.
            </li>
            <li>
              <strong>Conversas de suporte e áudios recebidos:</strong> ficam armazenados em nossos
              sistemas e, no caso do conteúdo enviado ao provedor de inteligência artificial,
              permanecem retidos nele conforme os termos dele. As conversas de suporte não são
              necessariamente eliminadas junto com a exclusão da conta.
            </li>
          </ul>
          <p>
            Findos os prazos aplicáveis, é nossa política eliminar ou anonimizar os dados. Essa
            política define os critérios que aplicamos; ela não substitui uma solicitação sua de
            exclusão, que você pode fazer pelo canal da seção 18.
          </p>
          <p>
            <strong>Exclusão da conta do cliente final.</strong> Você pode excluir a sua conta
            diretamente no aplicativo ou no site, em Perfil, sem precisar falar conosco. A exclusão
            remove a conta, os favoritos, as avaliações publicadas e os tokens de notificação
            vinculados a ela. Antes de excluir, cancele as assinaturas de serviço que mantiver: a
            exclusão da conta não interrompe, por si só, a cobrança recorrente no provedor de
            pagamento do estabelecimento. Permanecem os dados que devemos conservar por obrigação
            legal (como registros fiscais), as conversas de suporte, na forma acima, e os cadastros,
            agendamentos e pagamentos que já pertencem a cada negócio (nos quais o Demandaê atua
            como operador) - para eliminá-los, o pedido deve ser dirigido ao negócio, que é o
            controlador desses dados, e nós podemos encaminhar a sua solicitação (veja a seção 2).
          </p>
          <p>
            <strong>Encerramento da conta do estabelecimento.</strong> É solicitado pelo canal do
            Encarregado (seção 18).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">14. Decisões automatizadas</h2>
          <p>
            Nos termos do art. 20 da LGPD, você tem o direito de solicitar a{' '}
            <strong>
              revisão de decisões tomadas unicamente com base em tratamento automatizado
            </strong>{' '}
            que afetem os seus interesses, bem como o direito a informações claras e adequadas a
            respeito dos critérios e da lógica desse tratamento, observados os segredos comercial e
            industrial. Para exercer esse direito, use o canal indicado na seção 18; garantimos a
            análise da solicitação por uma pessoa da nossa equipe. As decisões automatizadas em
            funcionamento hoje são:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Inteligência artificial no atendimento:</strong> pode interpretar pedidos e
              efetuar ou confirmar agendamentos e gerar cobranças, sem intervenção humana em cada
              etapa (seção 9).
            </li>
            <li>
              <strong>Fila de espera:</strong> a ordem da fila, quem é avisado em cada grupo e o
              prazo para confirmar são definidos automaticamente pela ordem de entrada. Durante uma
              oferta, os horários daquele profissional naquele dia ficam temporariamente
              indisponíveis também para quem não está na fila.
            </li>
            <li>
              <strong>Encerramento automático de agendamentos passados:</strong> agendamentos que o
              estabelecimento não revisar são encerrados como atendidos. O sistema nunca registra
              falta sozinho - a falta é sempre apontada pelo estabelecimento e por ele corrigível
              (seção 8).
            </li>
            <li>
              <strong>Fidelidade:</strong> a contagem de carimbos e o direito ao prêmio são apurados
              automaticamente a partir do seu histórico, conforme a regra definida pelo
              estabelecimento (seção 8).
            </li>
            <li>
              <strong>Créditos de assinatura:</strong> o consumo do crédito ao agendar, a renovação
              a cada ciclo pago, a expiração ao fim do ciclo e a suspensão em caso de falta de
              pagamento são automáticos (seção 7).
            </li>
            <li>
              <strong>Agendamentos recorrentes:</strong> ao criar uma série, as datas indisponíveis
              são descartadas automaticamente e a série é criada apenas com as viáveis.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">15. Segurança e acesso interno</h2>
          <p>
            Adotamos medidas técnicas e organizacionais para proteger os dados pessoais contra
            acesso não autorizado, perda, alteração ou divulgação indevida, incluindo{' '}
            <strong>criptografia em trânsito</strong> (TLS), controle de acesso e autenticação
            segura. O CPF/CNPJ informado na sua conta e as credenciais de integração de gateway de
            pagamento são armazenados de forma cifrada. Não armazenamos dados de cartão de crédito.
            Nenhum sistema é totalmente imune a riscos, mas trabalhamos continuamente para
            mitigá-los.
          </p>
          <p>
            O acesso de funcionários do Demandaê aos dados é restrito ao necessário para operar e
            dar suporte à plataforma, e o painel interno que utilizamos para administrar as contas
            dos estabelecimentos não expõe a agenda, os cadastros de clientes nem as conversas do
            negócio.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">16. Dados sensíveis e de saúde</h2>
          <p>
            O Demandaê não solicita nem exige dados de saúde ou outros dados sensíveis para operar a
            plataforma, e recomenda que você não os insira em campos livres, como mensagens, o canal
            de suporte ou o comentário de uma avaliação.
          </p>
          <p>
            Alguns negócios atendidos atuam na área de saúde (por exemplo, clínicas e podólogas). Se
            um negócio inserir ou tratar dados de saúde da própria clientela (como procedimento ou
            condição) no contexto da sua agenda, esse negócio é o <strong>controlador</strong>{' '}
            desses dados sensíveis e responde pela base legal específica do art. 11 da LGPD (em
            regra, a tutela da saúde exercida por profissional ou serviço de saúde, ou o
            consentimento específico e destacado do titular). Nesse fluxo, o Demandaê atua apenas
            como <strong>operador</strong>, sob as instruções do negócio.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">17. Transferência internacional</h2>
          <p>
            Alguns dos prestadores acima tratam dados em servidores fora do Brasil, especialmente
            nos Estados Unidos - entre eles Meta, OpenAI, Supabase, Google, Microsoft, Twilio, Expo
            (e os gateways de push Google FCM e Apple APNs), Resend, Upstash, Sentry,
            Nominatim/OpenStreetMap, Vercel e Railway - e na Europa, no caso do Photon/komoot
            (Alemanha) e da OpenStreetMap Foundation (Reino Unido). Nesses casos, a transferência
            internacional se apoia nas hipóteses do art. 33 da LGPD, em regra mediante a adoção de{' '}
            <strong>cláusulas contratuais específicas ou cláusulas-padrão contratuais</strong> nos
            contratos de tratamento de dados (DPAs) firmados com esses subprocessadores, que impõem
            garantias de proteção compatíveis com a LGPD. No caso dos serviços públicos e gratuitos
            de mapa (OpenStreetMap e Photon/komoot), com os quais não há contrato de tratamento, a
            transferência limita-se ao endereço IP e à área do mapa consultada e se apoia no art.
            33, IX, por ser necessária à execução do contrato de exibição da página solicitada por
            você. O provedor de pagamento Asaas trata os dados no Brasil.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">18. Seus direitos e o Encarregado (DPO)</h2>
          <p>Como titular de dados, você pode, nos termos da LGPD, solicitar a qualquer momento:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>confirmação da existência de tratamento e acesso aos seus dados;</li>
            <li>correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>
              anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados
              em desconformidade com a lei;
            </li>
            <li>portabilidade dos dados a outro fornecedor de serviço ou produto;</li>
            <li>
              eliminação dos dados pessoais tratados com base no consentimento, ressalvadas as
              hipóteses de conservação previstas em lei;
            </li>
            <li>informação sobre as entidades com as quais compartilhamos os seus dados;</li>
            <li>
              informação sobre a possibilidade de não fornecer consentimento e sobre as
              consequências da negativa;
            </li>
            <li>revogação do consentimento, a qualquer momento;</li>
            <li>oposição a tratamento fundado em legítimo interesse;</li>
            <li>
              revisão de decisões tomadas unicamente com base em tratamento automatizado (art. 20),
              conforme a seção 14;
            </li>
            <li>
              peticionar perante a Autoridade Nacional de Proteção de Dados (ANPD) contra o
              tratamento dos seus dados.
            </li>
          </ul>
          <p>
            O canal do <strong>Encarregado de Proteção de Dados (DPO)</strong> do Demandaê para
            receber comunicações dos titulares e da ANPD, esclarecer dúvidas e processar
            solicitações relativas a esta Política é o e-mail <strong>contato@demandae.com</strong>.
            Ao escrever para esse endereço tratando de proteção de dados, identifique o assunto como
            &ldquo;Proteção de Dados / Encarregado&rdquo; para o correto direcionamento. O
            responsável pelo tratamento é a Cuidly Tecnologia Ltda, qualificada na seção 1.
          </p>
          <p>
            Responderemos no menor prazo possível e, em regra, em até 15 dias. Quando o dado for
            controlado por um negócio (veja a seção 2), encaminharemos ou apoiaremos o
            encaminhamento da sua solicitação ao estabelecimento responsável. Parte dos direitos
            você exerce diretamente no produto: corrigir dados e a preferência de e-mails no seu
            perfil, editar ou apagar a sua avaliação, sair da fila, cancelar uma assinatura e
            excluir a sua conta.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">19. Dados de menores</h2>
          <p>
            A criação de conta e a contratação do serviço destinam-se a maiores de 18 anos. Não
            coletamos intencionalmente dados de menores para a criação de contas no Demandaê e, caso
            identifiquemos esse uso sem o consentimento dos responsáveis legais, tomaremos as
            medidas cabíveis.
          </p>
          <p>
            Situação distinta é a do dado de menor que um negócio pode inserir na própria agenda
            (por exemplo, o agendamento de um atendimento para uma criança ou adolescente). Nesse
            fluxo, o Demandaê atua como <strong>operador</strong> e é do negócio, na condição de
            controlador, a responsabilidade de observar o melhor interesse do menor e obter o
            consentimento específico e em destaque de pelo menos um dos pais ou do responsável
            legal, nos termos do art. 14 da LGPD.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">20. Cookies e armazenamento local</h2>
          <p>
            Utilizamos cookies essenciais no site e no painel, e armazenamento local no aplicativo
            móvel, para o funcionamento da plataforma. Mediante o seu consentimento, usamos também
            cookies de análise (Google Analytics e Microsoft Clarity) e, no futuro, poderemos usar
            cookies de publicidade - ambos desativados por padrão e reversíveis a qualquer momento.
            Para detalhes e para gerenciar as suas preferências, consulte nossa{' '}
            <Link href="/cookies" className="font-medium underline underline-offset-4">
              Política de Cookies
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">21. Alterações desta política</h2>
          <p>
            Podemos atualizar esta Política de Privacidade periodicamente. A versão vigente será
            sempre publicada nesta página, com a data de última atualização indicada no topo.
          </p>
        </section>
      </div>
    </main>
  );
}
