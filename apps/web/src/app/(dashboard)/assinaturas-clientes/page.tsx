import { CreditCard, Lock, ShieldCheck } from 'lucide-react';

import { prisma, type PaymentProvider } from '@haru/database';
import { hasServiceSubscriptions } from '@haru/billing';

import { Button } from '@/components/ui/button';
import { requireUserAndTenant } from '@/lib/auth';
import { getSubscriptionsOverview } from '@/lib/subscriptions-panel';

import { SubscriptionsPanel } from './subscriptions-panel';

const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  ASAAS: 'Asaas',
  MERCADO_PAGO: 'Mercado Pago',
  PAGBANK: 'PagBank',
  PAGARME: 'Pagar.me',
};

/** Cabeçalho compartilhado - deixa claro que é a assinatura DO CLIENTE ao estabelecimento. */
function PageHeader() {
  return (
    <div className="min-w-[260px] flex-1">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#1b7a4b]">
        <span className="mr-1.5 inline-block size-1.5 rounded-full bg-[var(--brand-green-bright)] align-middle" />
        Receita recorrente
      </div>
      <h1 className="text-ink mt-1.5 font-serif text-[30px] tracking-tight">Assinaturas</h1>
      <p className="text-ink-70 mt-1 max-w-[600px] text-[13px] leading-relaxed">
        Planos que <strong className="text-ink font-semibold">seus clientes</strong> assinam e pagam
        todo mês pra usar seus serviços. É a sua receita que se repete sozinha -{' '}
        <span className="text-ink-50">nada a ver com o seu plano Demandaê.</span>
      </p>
    </div>
  );
}

export default async function AssinaturasClientesPage() {
  const { tenant } = await requireUserAndTenant();

  // Gate de tier: assinatura de serviços é feature Time+. Decisão de produto: NÃO esconder da
  // barra pro Solo - mostrar a seção com um upsell. É uma feature que gera receita, então a
  // descoberta vale mais que a ocultação (esconder mataria a alavanca de upgrade). O write
  // continua barrado no servidor (plans.ts), então o teaser não é burlável.
  if (!hasServiceSubscriptions(tenant.subscription)) {
    return (
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
        <PageHeader />
        <div className="border-edge bg-paper shadow-soft rounded-[22px] border border-dashed px-7 py-11 text-center">
          <div className="bg-chip text-green-emph mx-auto mb-3.5 flex size-[60px] items-center justify-center rounded-[17px]">
            <Lock className="size-6" />
          </div>
          <div className="text-ink font-serif text-[25px] tracking-tight">
            Uma ferramenta do plano <em className="text-green-emph italic">Time</em>
          </div>
          <p className="text-ink-70 mx-auto mt-2.5 max-w-[460px] text-[13.5px] leading-relaxed">
            Crie planos - tipo &quot;4 cortes por mês&quot; - e transforme cliente fiel em receita
            que se repete sozinha, todo mês, direto na sua conta. Disponível a partir do{' '}
            <strong className="text-ink font-semibold">Time</strong>.
          </p>
          <Button asChild variant="coral" className="mt-5">
            <a href="/assinatura">Ver planos do Demandaê</a>
          </Button>
        </div>
      </div>
    );
  }

  const paymentConnected = Boolean(
    tenant.paymentProvider &&
      (tenant.paymentAsaasApiKeyEnc ||
        tenant.paymentMercadoPagoTokenEnc ||
        tenant.paymentPagBankTokenEnc ||
        tenant.paymentPagarmeApiKeyEnc),
  );
  const providerLabel = tenant.paymentProvider ? PROVIDER_LABEL[tenant.paymentProvider] : null;

  const [overview, services] = await Promise.all([
    getSubscriptionsOverview(tenant.id, tenant.timezone),
    prisma.service.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, priceCents: true },
    }),
  ]);

  // Sem conta de pagamento E sem nenhum plano ainda: pré-requisito primeiro (não dá pra vender).
  // Tom de pré-requisito natural, não de bloqueio. Se já existem planos, o painel mostra um aviso
  // mais leve e deixa gerenciar o catálogo.
  if (!paymentConnected && overview.plans.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
        <PageHeader />
        <div className="border-edge bg-paper shadow-soft rounded-[22px] border border-dashed px-7 py-9">
          <div className="mx-auto max-w-[560px] text-center">
            <div className="bg-chip text-green-emph mx-auto mb-3.5 flex size-[60px] items-center justify-center rounded-[17px]">
              <CreditCard className="size-6" />
            </div>
            <div className="text-ink font-serif text-[25px] tracking-tight">
              Falta só uma conta pra você <em className="text-green-emph italic">receber</em>
            </div>
            <p className="text-ink-70 mx-auto mt-2.5 max-w-[460px] text-[13.5px] leading-relaxed">
              Assinatura é dinheiro entrando todo mês - e ele cai{' '}
              <strong className="text-ink font-semibold">direto na sua conta</strong>. Por isso a
              gente precisa saber qual é. Conecta uma e tá pronto pra vender.
            </p>
            <Button asChild variant="coral" className="mt-5">
              <a href="/settings">Conectar conta de pagamento</a>
            </Button>
            <div className="text-ink-50 mt-4 flex items-center justify-center gap-2 text-[12px]">
              <ShieldCheck className="size-3.5 flex-none text-[#1b7a4b]" />
              Leva 2 minutos. A cobrança é feita pelo Demandaê usando a sua conta - a gente nunca
              toca no seu saldo.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SubscriptionsPanel
      overview={overview}
      services={services}
      providerLabel={providerLabel}
      paymentConnected={paymentConnected}
    />
  );
}
