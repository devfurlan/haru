// Base de conhecimento do bot de suporte (FAQ do produto, PT-BR, hardcoded).
// Editar aqui atualiza o que o assistente sabe - não há fonte externa/vetorial.
// Dois blocos: DONO (painel web) e CLIENTE (app mobile).

export const OWNER_KNOWLEDGE = `# O que é o Demandaê
Plataforma de agendamento e atendimento por IA no WhatsApp para negócios de serviço
(barbearia, salão, clínica, estética etc.). O dono configura serviços, horários e
profissionais; um bot de WhatsApp agenda pelos clientes no número do negócio.

# Painel (áreas)
- Agendamentos: agenda do negócio; criar, confirmar, remarcar e cancelar horários.
- Conversas: caixa de entrada das conversas de WhatsApp com os clientes. O bot atende
  sozinho, e o dono pode "assumir" uma conversa (handoff) para responder manualmente e
  depois devolver pro bot.
- Serviços: cadastrar serviço com duração e preço.
- Profissionais e horários: definir os blocos de expediente por profissional (dias e
  faixas de horário) e exceções (folgas/feriados).
- Configurações: dados do negócio, integração de WhatsApp, pagamento.
- Cobrança/Plano: assinatura do SaaS.

# WhatsApp
O número do negócio é conectado via Embedded Signup da Meta. Depois de conectado, o bot
responde os clientes automaticamente e faz os agendamentos.

# Agendamento
Serviços têm duração e preço. Cada profissional tem seus dias/horários de expediente.
Um agendamento pode entrar como PENDENTE (o dono confirma no painel) ou já CONFIRMADO,
conforme a configuração do negócio. Lembretes são enviados por WhatsApp/e-mail.

# Pagamento
Alguns negócios cobram o cliente no ato (PIX ou cartão) via gateway integrado.

# Planos
É uma assinatura mensal/anual do SaaS. A cobrança e os avisos de fatura são por e-mail.`;

export const CUSTOMER_KNOWLEDGE = `# O que é o app Demandaê
App para o cliente final acompanhar e fazer agendamentos em vários estabelecimentos num
lugar só.

# Como agendar
Na tela inicial, toque em "Agendar em um negócio", busque o estabelecimento, escolha o
serviço, o profissional e um horário livre.

# Remarcar ou cancelar
Abra o agendamento na lista e use as opções de remarcar ou cancelar. Remarcar mostra os
horários livres do mesmo profissional.

# Telefone
Alguns fluxos pedem confirmar o telefone por um código (SMS/WhatsApp) antes de agendar.

# Pagamento
Alguns estabelecimentos cobram no ato do agendamento (PIX ou cartão). O app mostra o
status do pagamento no agendamento.

# Importante
Você (assistente) NÃO agenda, remarca nem cancela pelo cliente - isso é feito nas telas do
app. Você ajuda explicando como fazer e tirando dúvidas.`;
