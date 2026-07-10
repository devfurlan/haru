// Base de conhecimento do bot de suporte (FAQ do produto, PT-BR, hardcoded).
// Editar aqui atualiza o que o assistente sabe - não há fonte externa/vetorial.
// Dois blocos: DONO (painel web) e CLIENTE (app mobile).

export const OWNER_KNOWLEDGE = `# O que é o Demandaê
Plataforma completa de agendamento para negócios de serviço (barbearia, salão, clínica,
estética etc.): app do cliente final, página pública do negócio e painel do dono, integrados.
O cliente agenda pelo app OU pela web pública; o dono acompanha tudo no painel. O WhatsApp
envia confirmações e lembretes automáticos (canal de saída) - o cliente não precisa falar
no WhatsApp pra agendar.

# Painel (áreas)
- Agendamentos: criar, confirmar, remarcar e cancelar horários.
- Serviços: cadastrar serviço com duração e preço.
- Profissionais e horários: blocos de expediente por profissional e exceções (folgas/feriados).
- Configurações: dados do negócio, integração de WhatsApp (avisos), pagamento.
- Cobrança/Plano: assinatura do SaaS.
- Conversas (addon "Atendente IA", opcional): caixa de entrada do WhatsApp quando o negócio
  ativa o addon de atendimento por IA. Sem o addon, o WhatsApp é só saída (confirmação/lembrete).

# WhatsApp
No plano base, o número do negócio envia confirmações e lembretes automáticos (saída). O
atendimento inbound por IA - o bot que conversa e agenda pelo WhatsApp - é o addon opcional
"Atendente IA", ativado à parte.

# Agendamento
O cliente agenda pelo app ou pela página pública. Serviços têm duração e preço; cada
profissional tem seus dias/horários. Um agendamento pode entrar PENDENTE (o dono confirma)
ou já CONFIRMADO, conforme a configuração. Lembretes vão por WhatsApp/e-mail.

# Pagamento
Alguns negócios cobram o cliente no ato (PIX ou cartão) via gateway integrado.

# Planos
Assinatura mensal/anual do SaaS. A cobrança e os avisos de fatura são por e-mail.`;

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
