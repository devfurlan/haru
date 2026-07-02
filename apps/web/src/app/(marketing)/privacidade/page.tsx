import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidade - Demandaê',
  description:
    'Como o Demandaê coleta, usa, compartilha e protege dados pessoais na plataforma de agendamento e pagamentos pelo WhatsApp e no aplicativo para clientes.',
};

const LAST_UPDATED = '2 de julho de 2026';

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
            (barbearias, clínicas, podólogas e similares), bem como um site e um aplicativo móvel por
            meio dos quais o cliente final cria uma conta para encontrar estabelecimentos, agendar,
            pagar e acompanhar seus atendimentos.
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
            Encarregado de Proteção de Dados (DPO) está descrito na seção 15.
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
          <p>
            O Demandaê atua em dois papéis distintos, com fronteira definida por tipo de dado:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Demandaê como controlador.</strong> Quando você cria uma conta diretamente
              conosco - seja o dono/equipe de um negócio no painel, seja o cliente final no site ou
              no aplicativo - somos o controlador dos dados dessa conta. A conta do cliente final é{' '}
              <strong>única e vale para todos os estabelecimentos</strong> que usam o Demandaê (é
              uma conta da relação entre você e o Demandaê, não uma conta por estabelecimento).
              Nesse papel decidimos as finalidades e os meios do tratamento de: e-mail, senha, nome
              e foto de perfil, identificador de login, telefone verificado, CPF do pagador, data de
              nascimento, registro de aceite dos Termos, preferências de notificação, token de
              notificação (push), favoritos, localização usada na busca, conversas de suporte pelo
              aplicativo e a visão agregada do seu histórico entre negócios diferentes.
            </li>
            <li>
              <strong>Demandaê como operador.</strong> Os dados que cada negócio insere ou mantém no
              contexto da própria agenda - o cadastro de contato daquele cliente no negócio (nome,
              telefone, e-mail, CPF/CNPJ, data de nascimento), as conversas de WhatsApp entre o
              cliente e o negócio, os agendamentos e os pagamentos daquele estabelecimento - são
              controlados pelo <strong>negócio</strong>. Aqui o Demandaê apenas processa esses dados
              por conta e ordem dele, seguindo as suas instruções, nos termos do artigo 39 da LGPD,
              e não os utiliza para finalidades próprias. Por isso, se você excluir a sua conta
              Demandaê, os registros que já pertencem a cada negócio permanecem sob a
              responsabilidade do respectivo estabelecimento (veja as seções 8 e 12).
            </li>
          </ul>
          <p>
            Como operador, ao recebermos uma solicitação de titular relativa a dados controlados por
            um negócio, encaminhamos o pedido ao estabelecimento responsável, em regra em até 5 dias
            úteis, informando você sobre o encaminhamento. A resposta e a decisão sobre o pedido cabem
            ao negócio, na qualidade de controlador.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Dados que coletamos</h2>
          <p>Coletamos diferentes categorias de dados conforme o uso da plataforma:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Dados de cadastro do negócio:</strong> nome, e-mail, senha (armazenada de
              forma criptografada pelo provedor de autenticação), nome e endereço do estabelecimento,
              número de telefone do WhatsApp, foto de perfil e dados de configuração da conta.
            </li>
            <li>
              <strong>Dados de conta do cliente final:</strong> e-mail e senha (armazenados pelo
              provedor de autenticação) ou login com o Google, nome, foto de perfil, identificador
              de login, telefone (informado no cadastro e confirmado por código enviado por SMS),
              registro de aceite dos Termos e da Política de Privacidade (data e versão),
              preferências de notificação por e-mail e por push.
            </li>
            <li>
              <strong>Dados de clientes finais tratados em nome do negócio:</strong> quando um
              cliente conversa com o negócio pelo WhatsApp ou é cadastrado por ele, tratamos nome,
              número de telefone, e-mail, conteúdo das mensagens trocadas e informações de
              agendamento (serviço, profissional, data e horário).
            </li>
            <li>
              <strong>CPF/CNPJ e data de nascimento:</strong> o CPF ou CNPJ do pagador é coletado
              quando você realiza um pagamento (é exigido pelo provedor de pagamento para emitir a
              cobrança). A data de nascimento é coletada de forma opcional no perfil; caso não haja
              finalidade ativa para ela na sua relação com um negócio, você pode deixá-la em branco.
            </li>
            <li>
              <strong>Localização:</strong> no aplicativo, mediante a sua permissão, usamos a
              localização aproximada do dispositivo para mostrar estabelecimentos próximos na busca.
              As coordenadas são usadas apenas para essa consulta no momento da busca, não são
              armazenadas por nós e não são enviadas a terceiros.
            </li>
            <li>
              <strong>Notificações (push):</strong> quando você autoriza notificações no aplicativo,
              coletamos e armazenamos o token de push do dispositivo e a plataforma (Android ou iOS)
              para enviar lembretes de agendamento.
            </li>
            <li>
              <strong>Conteúdo do suporte:</strong> o texto que você digita no canal de suporte
              dentro do aplicativo ou do painel (veja a seção 5).
            </li>
            <li>
              <strong>Favoritos e histórico:</strong> os estabelecimentos que você marca como
              favoritos e o histórico agregado dos seus agendamentos e pagamentos.
            </li>
            <li>
              <strong>Dados de pagamento:</strong> valor, forma de pagamento, dados da cobrança (por
              exemplo, código Pix) e status. <strong>Não coletamos nem armazenamos dados do seu
              cartão de crédito</strong>: quando aplicável, você os informa diretamente na página
              segura do provedor de pagamento.
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
              perfil, verificar a posse do seu telefone por código via SMS, gerenciar agendamentos,
              processar mensagens do WhatsApp e enviar confirmações operacionais.
            </li>
            <li>
              <strong>Conta única e reunião do histórico entre estabelecimentos</strong> - base
              legal: <strong>execução de contrato</strong> (art. 7º, V), na medida em que é o serviço
              contratado por você ao criar a conta única. Após confirmar a posse do seu telefone,
              vinculamos à sua conta os atendimentos que você já teve em diferentes negócios,
              oferecendo uma visão única do seu histórico.
            </li>
            <li>
              <strong>Atendimento automatizado por inteligência artificial</strong> - base legal:{' '}
              <strong>execução de contrato</strong> (art. 7º, V). As mensagens trocadas no WhatsApp e
              as conversas do suporte podem ser processadas por modelos de inteligência artificial
              para interpretar pedidos, responder e efetuar ou confirmar agendamentos de forma
              automática (veja as seções 5 e 11).
            </li>
            <li>
              <strong>Lembretes de agendamento por e-mail</strong> - base legal:{' '}
              <strong>legítimo interesse</strong> (art. 7º, IX) em garantir o comparecimento e a boa
              prestação do serviço agendado. Você pode se opor a esse tratamento a qualquer momento.
            </li>
            <li>
              <strong>Notificações push</strong> - base legal:{' '}
              <strong>consentimento</strong> (art. 7º, I), manifestado ao autorizar as notificações
              no seu dispositivo. Você pode revogar esse consentimento a qualquer momento
              desativando as notificações no aplicativo ou no sistema operacional.
            </li>
            <li>
              <strong>Busca por proximidade (geolocalização)</strong> - base legal:{' '}
              <strong>consentimento</strong> (art. 7º, I), manifestado ao conceder a permissão de
              localização do seu dispositivo. Você pode revogá-lo a qualquer momento nas
              configurações do sistema operacional; sem a permissão, a busca por proximidade não é
              realizada.
            </li>
            <li>
              <strong>Pagamentos e obrigações fiscais</strong> - bases legais:{' '}
              <strong>execução de contrato</strong> (art. 7º, V) para processar a cobrança e{' '}
              <strong>cumprimento de obrigação legal/regulatória</strong> (art. 7º, II) para
              conservar os registros fiscais pelos prazos exigidos. O CPF/CNPJ do pagador é exigido
              pelo provedor de pagamento para emitir a cobrança.
            </li>
            <li>
              <strong>Segurança, prevenção a fraudes e estabilidade</strong> - base legal:{' '}
              <strong>legítimo interesse</strong> (art. 7º, IX). Limitar tentativas de abuso dos
              nossos endereços públicos por endereço IP e monitorar erros e estabilidade dos
              sistemas. Realizamos avaliação de legítimo interesse e limitamos os dados ao
              necessário.
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
          <h2 className="text-xl font-semibold">5. Suporte por inteligência artificial</h2>
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
            armazenadas em nossos sistemas; sobre a sua retenção, veja a seção 8.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Registro do aceite</h2>
          <p>
            O seu aceite dos Termos de Serviço e desta Política de Privacidade é coletado no momento
            do cadastro e registrado como prova, com o carimbo de data e hora do aceite e a versão do
            documento vigente naquele momento. Ao continuar com o Google (login) você também aceita os
            Termos e esta Política, nos termos da seção 1 dos{' '}
            <Link href="/termos" className="font-medium underline underline-offset-4">
              Termos de Serviço
            </Link>
            . Quando publicamos uma nova versão relevante, podemos solicitar novo aceite. Para saber
            qual versão você aceitou ou revogar consentimentos, use o canal indicado na seção 15.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Compartilhamento com terceiros</h2>
          <p>
            Não vendemos dados pessoais. Compartilhamos dados apenas com prestadores
            (subprocessadores) que viabilizam o funcionamento da plataforma, na medida necessária:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Meta Platforms (WhatsApp Cloud API):</strong> envio e recebimento de mensagens
              pelo WhatsApp.
            </li>
            <li>
              <strong>OpenAI:</strong> processamento por inteligência artificial das mensagens do
              WhatsApp e das conversas do bot de suporte para gerar respostas automáticas.
            </li>
            <li>
              <strong>Supabase:</strong> autenticação (e-mail/senha, login com Google e sessão),
              banco de dados e armazenamento de arquivos (como a foto de perfil).
            </li>
            <li>
              <strong>Google:</strong> autenticação por meio do &ldquo;Entrar com o Google&rdquo;,
              quando você opta por esse login.
            </li>
            <li>
              <strong>Twilio (Verify):</strong> envio e verificação do código por SMS (OTP) para
              confirmar a posse do seu telefone.
            </li>
            <li>
              <strong>Asaas:</strong> gateway de pagamento atualmente ativo, que processa tanto a
              cobrança da assinatura do negócio quanto os pagamentos feitos ao negócio pelo cliente
              final (Pix/cartão dos agendamentos). Exige o CPF/CNPJ do pagador para emitir a
              cobrança. Conforme o provedor de pagamento configurado por cada negócio, o pagamento ao
              estabelecimento poderá, no futuro, ser processado por outro provedor; hoje o provedor
              ativo é o Asaas.
            </li>
            <li>
              <strong>Expo / EAS (com Google FCM e Apple APNs):</strong> emissão do token e entrega
              das notificações push ao aplicativo.
            </li>
            <li>
              <strong>Resend:</strong> envio de e-mails transacionais (confirmações e lembretes de
              agendamento, avisos de cobrança e encaminhamento de feedback de suporte).
            </li>
            <li>
              <strong>Upstash (Redis):</strong> limitação de abuso por endereço IP (efêmero) e estado
              temporário das conversas do bot.
            </li>
            <li>
              <strong>Sentry:</strong> monitoramento de erros e desempenho do serviço de mensagens
              para garantir a estabilidade, com remoção de credenciais de autenticação e sem envio de
              dados pessoais por padrão.
            </li>
            <li>
              <strong>Nominatim / OpenStreetMap:</strong> conversão do endereço do estabelecimento
              (dado do negócio informado no painel, não a sua localização) em coordenadas para a
              busca por proximidade.
            </li>
            <li>
              <strong>Provedores de hospedagem</strong> (Vercel, para o site e o painel, e Railway,
              para o serviço de mensagens): infraestrutura necessária para operar a aplicação.
            </li>
            <li>
              <strong>Autoridades públicas,</strong> quando exigido por lei ou ordem judicial.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Retenção e exclusão dos dados</h2>
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
              <strong>Registros de acesso à aplicação:</strong> conservados por 6 meses, nos termos
              do art. 15 do Marco Civil da Internet.
            </li>
            <li>
              <strong>Dados da conta e favoritos:</strong> mantidos enquanto a conta estiver ativa e
              por um prazo razoável após a inatividade ou o encerramento.
            </li>
            <li>
              <strong>Token de push:</strong> removido quando você desativa as notificações, faz
              logout ou solicita a exclusão da conta.
            </li>
            <li>
              <strong>Conversas de suporte:</strong> ficam armazenadas em nossos sistemas e, além
              disso, permanecem retidas no provedor de inteligência artificial (atualmente a OpenAI)
              conforme os termos dele. Essas conversas não são necessariamente eliminadas junto com a
              exclusão da conta.
            </li>
          </ul>
          <p>
            Findos os prazos aplicáveis, é nossa política eliminar ou anonimizar os dados. Essa
            política define os critérios que aplicamos; ela não substitui uma solicitação sua de
            exclusão, que você pode fazer pelo canal da seção 15.
          </p>
          <p>
            A exclusão da sua conta Demandaê pode ser solicitada pelo canal do Encarregado (seção 15).
            A exclusão remove a conta, os favoritos e os tokens de notificação vinculados a ela,
            ressalvados os dados que devemos conservar por obrigação legal (como registros fiscais e
            de acesso) e as conversas de suporte, na forma acima. Os cadastros de contato,
            agendamentos e pagamentos que já pertencem a cada negócio (nos quais o Demandaê atua como
            operador) permanecem sob a responsabilidade do respectivo estabelecimento - para
            eliminá-los, o pedido deve ser dirigido ao negócio, que é o controlador desses dados, e
            nós podemos encaminhar a sua solicitação (veja a seção 2).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Segurança</h2>
          <p>
            Adotamos medidas técnicas e organizacionais para proteger os dados pessoais contra
            acesso não autorizado, perda, alteração ou divulgação indevida, incluindo{' '}
            <strong>criptografia em trânsito</strong> (TLS), controle de acesso e autenticação
            segura. Credenciais de integração de gateway de pagamento são armazenadas de forma
            cifrada. Nenhum sistema é totalmente imune a riscos, mas trabalhamos continuamente para
            mitigá-los.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Dados sensíveis e de saúde</h2>
          <p>
            O Demandaê não solicita nem exige dados de saúde ou outros dados sensíveis para operar a
            plataforma, e recomenda que você não os insira em campos livres, como mensagens ou o
            canal de suporte.
          </p>
          <p>
            Alguns negócios atendidos atuam na área de saúde (por exemplo, clínicas e podólogas). Se
            um negócio inserir ou tratar dados de saúde da própria clientela (como procedimento ou
            condição) no contexto da sua agenda, esse negócio é o <strong>controlador</strong> desses
            dados sensíveis e responde pela base legal específica do art. 11 da LGPD (em regra, a
            tutela da saúde exercida por profissional ou serviço de saúde, ou o consentimento
            específico e destacado do titular). Nesse fluxo, o Demandaê atua apenas como{' '}
            <strong>operador</strong>, sob as instruções do negócio.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">11. Decisões automatizadas</h2>
          <p>
            A plataforma utiliza inteligência artificial que pode interpretar pedidos e efetuar ou
            confirmar agendamentos de forma automática, sem intervenção humana em cada etapa. Nos
            termos do art. 20 da LGPD, você tem o direito de solicitar a{' '}
            <strong>revisão de decisões tomadas unicamente com base em tratamento automatizado</strong>{' '}
            que afetem os seus interesses, bem como o direito a informações claras e adequadas a
            respeito dos critérios e da lógica desse tratamento, observados os segredos comercial e
            industrial. Para exercer esse direito, use o canal indicado na seção 15; garantimos a
            análise da solicitação por uma pessoa da nossa equipe.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">12. Transferência internacional</h2>
          <p>
            Alguns dos prestadores acima tratam dados em servidores fora do Brasil, especialmente nos
            Estados Unidos - entre eles Meta, OpenAI, Supabase, Google, Twilio, Expo (e os gateways de
            push Google FCM e Apple APNs), Resend, Upstash, Sentry, Nominatim/OpenStreetMap, Vercel e
            Railway. Nesses casos, a transferência internacional se apoia na hipótese do art. 33 da
            LGPD consistente na adoção de <strong>cláusulas contratuais específicas ou
            cláusulas-padrão contratuais</strong> nos contratos de tratamento de dados (DPAs)
            firmados com esses subprocessadores, que impõem garantias de proteção compatíveis com a
            LGPD. O provedor de pagamento Asaas trata os dados no Brasil.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">13. Seus direitos</h2>
          <p>
            Como titular de dados, você pode, nos termos da LGPD, solicitar a qualquer momento:
          </p>
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
              informação sobre a possibilidade de não fornecer consentimento e sobre as consequências
              da negativa;
            </li>
            <li>revogação do consentimento, a qualquer momento;</li>
            <li>oposição a tratamento fundado em legítimo interesse;</li>
            <li>
              revisão de decisões tomadas unicamente com base em tratamento automatizado (art. 20),
              conforme a seção 11;
            </li>
            <li>
              peticionar perante a Autoridade Nacional de Proteção de Dados (ANPD) contra o tratamento
              dos seus dados.
            </li>
          </ul>
          <p>
            Para exercer esses direitos, use o canal do Encarregado indicado na seção 15.
            Responderemos no menor prazo possível e, em regra, em até 15 dias. Quando o dado for
            controlado por um negócio (veja a seção 2), encaminharemos ou apoiaremos o encaminhamento
            da sua solicitação ao estabelecimento responsável.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">14. Dados de menores</h2>
          <p>
            A criação de conta e a contratação do serviço destinam-se a maiores de 18 anos. Não
            coletamos intencionalmente dados de menores para a criação de contas no Demandaê e, caso
            identifiquemos esse uso sem o consentimento dos responsáveis legais, tomaremos as medidas
            cabíveis.
          </p>
          <p>
            Situação distinta é a do dado de menor que um negócio pode inserir na própria agenda (por
            exemplo, o agendamento de um atendimento para uma criança ou adolescente). Nesse fluxo, o
            Demandaê atua como <strong>operador</strong> e é do negócio, na condição de controlador, a
            responsabilidade de observar o melhor interesse do menor e obter o consentimento
            específico e em destaque de pelo menos um dos pais ou do responsável legal, nos termos do
            art. 14 da LGPD.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">15. Encarregado (DPO) e contato</h2>
          <p>
            O canal do <strong>Encarregado de Proteção de Dados (DPO)</strong> do Demandaê para
            receber comunicações dos titulares e da ANPD, esclarecer dúvidas e processar solicitações
            relativas a esta Política é o e-mail <strong>contato@demandae.com</strong>. Ao escrever
            para esse endereço tratando de proteção de dados, identifique o assunto como
            &ldquo;Proteção de Dados / Encarregado&rdquo; para o correto direcionamento. O responsável
            pelo tratamento é a Cuidly Tecnologia Ltda, qualificada na seção 1.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">16. Cookies e armazenamento local</h2>
          <p>
            Utilizamos cookies essenciais no site e no painel, e armazenamento local no aplicativo
            móvel, para o funcionamento da plataforma. Para detalhes, consulte nossa{' '}
            <Link href="/cookies" className="font-medium underline underline-offset-4">
              Política de Cookies
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">17. Alterações desta política</h2>
          <p>
            Podemos atualizar esta Política de Privacidade periodicamente. A versão vigente será
            sempre publicada nesta página, com a data de última atualização indicada no topo.
          </p>
        </section>
      </div>
    </main>
  );
}
