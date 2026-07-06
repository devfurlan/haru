# Onboarding concierge - primeiros 30 clientes

Roteiro de ativação assistida (mão na massa) para os 30 primeiros clientes do Demandaê.
Objetivo: cada cliente sai da contratação com a agenda montada, o WhatsApp conectado e o
primeiro agendamento acontecendo em **até 48h**. Concierge = a gente puxa, não espera o
cliente se virar sozinho.

Tom: humano, direto, sem script robótico. A pessoa acabou de confiar o negócio dela na
gente - trata como parceria, não como suporte de nível 1.

---

## Antes do contato (5 min de preparo)

- [ ] Confirme no painel admin: assinatura **ativa**, plano contratado, e se tem addon
      "Atendente IA" (e qual canal: **número Demandaê** ou **número próprio**).
- [ ] Olhe o segmento do negócio (barbearia, estética, clínica...) pra falar a língua dele.
- [ ] Tenha à mão o link público de agendamento dele: `demandae.app/<slug>`.

## 1. Boas-vindas (dia 0, logo após a contratação)

Canal: WhatsApp pessoal do dono (o mesmo do cadastro). O e-mail de boas-vindas automático
já saiu - aqui é o toque humano.

> Oi, [nome]! Aqui é o [você] do Demandaê 👋 Vi que você acabou de assinar o [plano] -
> que bom ter você com a gente! Nos próximos 2 dias eu te ajudo a deixar tudo pronto pra
> sua agenda começar a encher. Posso te ligar rapidinho hoje ou amanhã pra configurar
> junto? Leva uns 15 min.

Expectativa que você DEVE deixar clara:
- O que o Demandaê faz (cliente agenda sozinho pelo WhatsApp/link, sem você responder um a um).
- O que precisa dele agora (serviços, horários, conectar o WhatsApp).
- Que a garantia é de **30 dias** - se não curtir, devolve o dinheiro, sem burocracia.

## 2. Setup guiado (dia 0-1, ~15 min, de preferência em call/vídeo)

Faça NA TELA junto com o cliente, na ordem:

1. **Serviços** - cadastrar os principais (nome, duração, preço). Comece com 3-5, dá pra
   crescer depois. Serviço sem duração/preço trava agendamento.
2. **Horários de atendimento** - os `ScheduleBlock` por dia da semana. Confirme fuso
   (`America/Sao_Paulo` é o padrão) e intervalos de almoço/folga.
3. **Conectar o WhatsApp** - Embedded Signup da Meta em `/settings`. É o passo mais
   sensível; acompanhe até aparecer "conectado". Se travar, veja o FAQ de suporte.
4. **Perfil público** - foto/logo, endereço, descrição curta. É a cara da página de
   agendamento.
5. **Testar o primeiro agendamento** - você mesmo agenda pelo link público e confirma que
   caiu na agenda + chegou a notificação. Nada convence mais que ver funcionando.

### Se tem addon "Atendente IA"

- **Número Demandaê (compartilhado):** já ativa na hora. Entregue o link `wa.me` pra ele
  divulgar e explique que o bot se apresenta como o negócio dele (confira o nome/tom que
  ele configurou).
- **Número próprio:** o setup (R$1.497) é o trabalho de configurar a WABA na Meta. Explique
  que leva **alguns dias úteis** e que a mensalidade do addon **só começa quando ficar no
  ar**. Assim que você concluir a config e ativar pelo admin, o cliente recebe o e-mail de
  "Atendente IA no ar".

## 3. Compartilhar e divulgar (dia 1)

- Ensine 3 lugares pra colar o link: bio do Instagram, status do WhatsApp, e resposta
  automática/fixada. O link parado não enche agenda.
- Sugira uma primeira mensagem pros clientes atuais dele ("agora dá pra agendar sozinho por
  aqui, ó: [link]").

## 4. Follow-up (a régua que segura o cliente)

| Quando | O que fazer |
| --- | --- |
| Dia 1 | Confirmar que o WhatsApp conectou e o 1º teste funcionou. Destravar o que parou. |
| Dia 3 | "Chegou algum agendamento?" Se não, revisar divulgação do link. |
| Dia 7 | Check de uso real. Mostrar onde ver a agenda/relatórios. Coletar 1ª impressão. |
| Dia 15 | Meio da garantia. Perguntar francamente se está valendo. Resolver qualquer atrito. |
| Dia 30 | Fim da garantia. Se está feliz, pedir depoimento/indicação. Se não, ouvir e decidir. |

## Sinais de alerta (aja rápido)

- WhatsApp não conectou em 48h → risco de churn silencioso. Ligue.
- Zero agendamento no dia 7 → problema de divulgação, não do produto. Ajude a divulgar.
- Reclamação de valor/complexidade perto do dia 25 → lembre da garantia e ouça de verdade;
  às vezes o downgrade de plano resolve melhor que o cancelamento.

## O que registrar (pra virar processo)

Pra cada cliente: canal de contato, onde travou, quanto tempo até o 1º agendamento, e a
frase que mais funcionou. Depois de 30 clientes, isso vira o onboarding self-service.
