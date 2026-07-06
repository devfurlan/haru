# FAQ interno de suporte

Respostas canônicas pra suporte responder de forma consistente. **Uso interno** - adapte o
tom pro cliente, mas não invente política diferente da daqui. Quando a resposta depender de
dado do cliente, confira no painel admin antes de responder.

Preços de referência (jul/2026): base **Solo R$69 / Time R$220 / Multi R$550** por mês.
Addon "Atendente IA": **Bot Solo R$99 / Bot Time R$249 / Bot Multi R$599** por mês + **setup
único de R$1.497** (só na variante "número próprio"). A fonte viva é o painel/assinatura do
cliente - se divergir daqui, o painel manda.

---

## Cobrança e pagamento

**Como sou cobrado?**
Assinatura recorrente via Asaas. Cartão renova automático a cada ciclo; Pix gera uma
cobrança por ciclo. O cartão nunca passa pelo nosso servidor - é digitado na fatura
hospedada do Asaas.

**Mensal ou anual?**
Os dois. O anual sai mais barato (equivale a ~10 meses) e pode ser à vista ou em 12x. A
troca de ciclo/plano é feita em `/assinatura`.

**Minha cobrança falhou, o que acontece?**
O acesso é pausado na hora (sem carência) e mandamos e-mail + aviso no painel com o botão
"Atualizar cartão". É só atualizar o cartão na fatura do Asaas que reativa sozinho no
próximo processamento. Nada é perdido - dados e agenda continuam lá.

**Como atualizo o cartão?**
Em `/assinatura`, botão "Atualizar cartão" - leva pra fatura pendente do Asaas onde troca o
cartão. Se não tiver fatura pendente, não há o que atualizar naquele momento.

**Recebi um aviso de que estou perto do limite. Vou ser cobrado a mais?**
Não. É um aviso (85/90/95%) de que você está chegando no teto de agendamentos/conversas do
plano. Nada é cobrado automaticamente por excedente. Ao **atingir 100%**, as **criações no
painel** (novos serviços, profissionais, agendamentos manuais) pausam - mas **seus clientes
continuam agendando normalmente**. Pra liberar mais volume, é upgrade de plano.

## Trocar de plano

**Upgrade (plano maior):** vale na hora. Limites e recursos mudam imediatamente e a
cobrança do ciclo é ajustada.

**Downgrade (plano menor):** não é retroativo. Você fica no plano atual até o fim do período
já pago; o plano menor entra na próxima renovação. Sem perder o que já pagou.

## Cancelamento e reembolso

**Como cancelo?**
Em `/assinatura`, "Cancelar assinatura". O que acontece depende da **garantia de 30 dias**:

- **Dentro de 30 dias da contratação:** reembolso **integral automático** e o acesso encerra
  na hora. O valor volta pro cartão/conta conforme o prazo do banco.
- **Depois de 30 dias:** sem reembolso, mas o acesso **continua até o fim do período já
  pago**. Você não é mais cobrado a partir daí.

**O setup do Atendente IA (R$1.497) é reembolsável?**
Não. O setup paga o trabalho real de configurar a conta oficial no WhatsApp (Meta), que já
foi feito. Ele não faz parte da garantia de satisfação da mensalidade. (Detalhes e exceções:
ver [playbook-reembolso.md](playbook-reembolso.md).)

**Mudei de ideia depois de cancelar.**
Dá pra reativar a qualquer momento em `/assinatura`. Se foi cancelamento por fim de ciclo e
ainda está dentro do período pago, é só voltar atrás.

## Atendente IA (addon)

**O que é?**
Um bot que atende e agenda pelos clientes no WhatsApp, sozinho. É opcional, contratado por
cima do plano base, com teto de conversas próprio por tier (Bot Solo/Time/Multi).

**Número Demandaê x número próprio - qual a diferença?**
- **Número Demandaê (compartilhado):** ativa na hora, sem setup. O bot se apresenta como o
  seu negócio (nome/tom que você configura). Você divulga um link `wa.me`.
- **Número próprio:** o bot atende no **seu** número de WhatsApp. Tem o setup único de
  R$1.497 (config da conta oficial na Meta) e leva alguns dias úteis pra ficar no ar. A
  mensalidade do addon **só começa quando ficar no ar**.

**Contratei o número próprio e ainda não está no ar.**
Normal. Depois que o setup é pago, nossa equipe configura a conta na Meta (verificação de
negócio, templates). Você recebe um e-mail quando ativar - e só aí a mensalidade conta.

**Como desativo o Atendente IA sem cancelar o plano?**
Em `/assinatura`, "Desativar Atendente IA". O bot atende até o fim do ciclo já pago; a partir
da próxima cobrança volta só o plano base.

## WhatsApp / conexão

**Como conecto meu WhatsApp?**
Em `/settings`, pelo botão de conectar (Embedded Signup da Meta). Precisa de um número que
**não** esteja ativo em outro WhatsApp Business API.

**Configurei os templates. Pra que servem?**
Sem template aprovado na Meta, mensagens automáticas (lembrete, cancelamento, remarcação) só
entregam se o cliente falou com você nas últimas 24h. Com template aprovado, entregam sempre.
O nome/idioma de cada um se configura em `/settings`.

## Notificações

**Quero receber avisos no meu WhatsApp, não só e-mail.**
Em `/settings`, ligue "Alertas de uso e cobrança por WhatsApp". Você recebe no WhatsApp do
responsável os avisos de uso perto do limite (90/95%) e de cobrança que falhou - só o
essencial. Precisa ter o telefone do responsável cadastrado. O e-mail continua chegando de
qualquer jeito.

**Onde vejo os avisos dentro do painel?**
No sino, no topo da barra lateral. Separa "Conta" (uso, cobrança, renovação) de "Novidades"
(updates do produto).
