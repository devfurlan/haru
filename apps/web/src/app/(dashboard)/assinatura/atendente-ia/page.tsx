import { prisma } from '@haru/database';
import { isAddonActive, isSubscriptionActive } from '@haru/billing';
import { CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { requireAdmin } from '@/lib/auth';

import { EmbeddedSignup } from '../../settings/embedded-signup';
import { ActivationWizard, type AddonOffer } from './activation-wizard';

export const dynamic = 'force-dynamic';

export default async function AtendenteIaPage() {
  const { tenant } = await requireAdmin();
  const sub = tenant.subscription;

  // Precisa de assinatura base ativa pra contratar o addon.
  if (!sub || !isSubscriptionActive(sub)) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Atendente IA no WhatsApp</h1>
        <div className="bg-card rounded-2xl border p-6 text-sm">
          <p className="text-muted-foreground">
            Você precisa de uma assinatura ativa para contratar o Atendente IA.
          </p>
          <Button asChild className="mt-4">
            <Link href="/assinatura">Ver planos</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Já ativo: a gestão (uso, desativar) vive no painel de assinatura.
  if (isAddonActive(sub)) redirect('/assinatura');

  const addons = await prisma.addonPlan.findMany({
    where: { active: true },
    orderBy: { displayOrder: 'asc' },
    select: {
      tier: true,
      name: true,
      priceMonthlyCents: true,
      conversationsPerMonth: true,
      setupFeeCents: true,
    },
  });
  const offers: AddonOffer[] = addons.map((a) => ({
    tier: a.tier,
    name: a.name,
    priceMonthlyCents: a.priceMonthlyCents,
    conversationsPerMonth: a.conversationsPerMonth,
    setupFeeCents: a.setupFeeCents,
  }));

  // Número próprio já escolhido e com setup PAGO: aguardando a config da WABA. Aqui o tenant
  // conecta o WhatsApp dele (Embedded Signup) - a config técnica só libera após o setup pago.
  const awaitingVerification =
    sub.addonChannel === 'OWN' && sub.addonSetupChargedAt != null && sub.addonActivatedAt == null;

  if (awaitingVerification) {
    const connected = Boolean(tenant.whatsappPhoneNumberId && tenant.whatsappAccessToken);
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Atendente IA no WhatsApp</h1>
        <div className="bg-card space-y-4 rounded-2xl border p-6">
          <div className="flex items-center gap-2">
            <Clock className="text-amber-600 size-5" aria-hidden />
            <h2 className="font-medium">Estamos configurando seu atendente</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Recebemos o pagamento do setup. Nossa equipe está preparando sua conta oficial no
            WhatsApp (Meta) - costuma levar alguns dias úteis. Assim que estiver no ar, avisamos você
            por e-mail e a mensalidade começa a contar.
          </p>
          {connected ? (
            <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              Seu WhatsApp já está conectado. Falta só a nossa verificação final.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium">Conecte o WhatsApp do seu estabelecimento</p>
              <p className="text-muted-foreground text-sm">
                Faz parte do seu Atendente IA (número próprio): autoriza o Demandaê a atender pelo
                seu número. É rápido e você não sai daqui.
              </p>
              <EmbeddedSignup />
            </div>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          Precisa de ajuda? Fale com a gente pelo suporte (botão no canto da tela).
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          Ativar Atendente IA no WhatsApp
        </h1>
        <p className="text-muted-foreground text-sm">
          Um atendente de IA que conversa, tira dúvidas e agenda pelo WhatsApp - com teto próprio de
          conversas, somado ao seu plano.
        </p>
      </div>
      <ActivationWizard offers={offers} defaultDisplayName={tenant.botDisplayName ?? tenant.name} />
    </div>
  );
}
