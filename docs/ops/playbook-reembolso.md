# Playbook de reembolso (garantia de 30 dias)

Como lidar com reembolso dentro da garantia de satisfação. **Uso interno.** A regra é
simples; a maioria dos casos o próprio cliente resolve sozinho. Este doc existe pros casos
que chegam no suporte e pra você não improvisar política.

## A regra

Todo cliente tem **30 dias de garantia** a partir da contratação (`Subscription.guaranteeUntil`).
Dentro desse prazo: **reembolso integral da mensalidade, sem burocracia**. Fora do prazo: sem
reembolso, mas o acesso segue até o fim do período já pago.

O que **não** entra na garantia:
- **Setup do Atendente IA (R$1.497, número próprio):** não é reembolsável. Paga o trabalho de
  configurar a conta oficial na Meta, que já foi executado. É cobrança avulsa, separada da
  mensalidade - o estorno automático da garantia nem a alcança.

## Caminho 1 - self-service (o normal, prefira este)

O cliente cancela sozinho em `/assinatura` → "Cancelar assinatura". O sistema faz tudo:

1. Se está **dentro da garantia**: estorna automaticamente a **última cobrança paga da
   assinatura** (Asaas), encerra o acesso na hora, e envia o e-mail **"Reembolso processado"**.
2. Se está **fora da garantia**: não estorna, mantém o acesso até `currentPeriodEnd`, e envia
   o e-mail **"Assinatura cancelada"** (com a data até quando o acesso vale).

Você não precisa fazer nada. Se o cliente te procurar antes de cancelar, oriente a usar esse
caminho - é mais rápido e já dispara a comunicação certa.

## Caminho 2 - reembolso manual pelo suporte (exceção)

Use só quando o self-service não serve: cobrança que precisa de estorno mas o cliente não
consegue/não quer mexer, caso de mais de uma cobrança, disputa, etc.

1. Confirme a elegibilidade no painel admin: `guaranteeUntil` no futuro? Qual cobrança
   estornar (a última paga da assinatura)?
2. Estorne pela **fatura no Asaas** (dashboard da plataforma). O Asaas recusa estornar a
   mesma cobrança duas vezes - se já foi, pare.
3. Ajuste o acesso se necessário (cancelar a assinatura pra não cobrar de novo).

> ⚠️ **Atenção à comunicação:** um estorno feito **direto no Asaas** dispara o webhook
> `PAYMENT_REFUNDED`, que hoje manda o e-mail genérico de **"assinatura suspensa"** - **não**
> o e-mail bonito de "reembolso processado" (esse só sai pelo caminho self-service). Então,
> ao reembolsar manualmente, **avise o cliente você mesmo** que o reembolso foi feito e o
> prazo de volta do valor. Não deixe ele só com o e-mail de "suspensa".

## O que comunicar ao cliente

Sempre, em linguagem humana:
- Que o reembolso **foi feito** (não "será analisado").
- **Prazo de volta do valor:** cartão volta em alguns dias, conforme o banco/operadora; Pix
  volta pra conta que pagou. Não prometa data exata - depende do banco.
- Que o acesso foi encerrado (garantia) ou vai até tal data (fim de ciclo).
- Que a porta fica aberta: pode voltar quando quiser.

Não peça motivo como condição pro reembolso. Se ele quiser contar por que saiu, ouça - é ouro
pro produto -, mas o reembolso não depende disso.

## Casos de borda

- **Setup do Atendente IA:** não reembolsa (ver acima). Se o cliente insistir e o setup ainda
  **não foi executado** (WABA não configurada), aí sim cabe estornar por bom senso - registre.
- **Pagou anual e cancela no dia 20:** dentro da garantia = reembolso integral do anual.
- **Múltiplas cobranças (ex.: plano + addon):** o estorno automático pega a última cobrança da
  assinatura. Se houver cobrança separada (setup), trate à parte, manualmente.
- **Chargeback (cliente abriu disputa no cartão):** não é reembolso nosso - a operadora
  reverteu. O acesso é suspenso pelo webhook. Não estorne por cima (viraria duplo).
- **Fora dos 30 dias pedindo reembolso:** política é não reembolsar, mas o acesso continua até
  o fim do ciclo pago. Ofereça isso com clareza; se for caso extremo (cobrança indevida, bug
  nosso), use bom senso e registre a exceção.

## O que registrar

Pra cada reembolso: cliente, valor, data, dentro/fora da garantia, caminho (self-service ou
manual), motivo declarado (se houve) e qualquer exceção aberta. Isso alimenta a taxa de
reembolso e mostra padrões (se todo mundo sai no dia X por motivo Y, é problema de produto).
