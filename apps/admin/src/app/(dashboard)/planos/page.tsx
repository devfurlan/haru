import type { PlanTier } from '@haru/database';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TIER_LABEL } from '@/lib/billing-lite';
import { listPlans } from '@/lib/tenant-queries';

import { CreatePlanForm } from './create-plan-form';
import { PlanEditForm } from './plan-edit-form';

export const dynamic = 'force-dynamic';

const ALL_TIERS: PlanTier[] = ['ESSENCIAL', 'PROFISSIONAL', 'NEGOCIO', 'ENTERPRISE'];

type PlanRow = Awaited<ReturnType<typeof listPlans>>[number];

function PlanCard({ p }: { p: PlanRow }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {p.name}
          <span className="text-muted-foreground text-xs font-normal">
            {TIER_LABEL[p.tier]} · {p.tier}
          </span>
          {!p.active && <Badge variant="neutral">personalizado</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PlanEditForm
          id={p.id}
          defaults={{
            name: p.name,
            priceMonthlyCents: p.priceMonthlyCents,
            priceAnnualCents: p.priceAnnualCents,
            whatsappRemindersPerMonth: p.whatsappRemindersPerMonth,
            maxProfessionals: p.maxProfessionals,
            maxReceptionists: p.maxReceptionists,
            onlinePayments: p.onlinePayments,
            webhooks: p.webhooks,
            team: p.team,
            waitlist: p.waitlist,
            serviceSubscriptions: p.serviceSubscriptions,
            active: p.active,
            displayOrder: p.displayOrder,
          }}
        />
      </CardContent>
    </Card>
  );
}

export default async function PlanosPage() {
  const plans = await listPlans();
  // Público = listado em /precos + contratável no self-serve (um por tier). O resto é deal
  // sob medida, atribuído na tela do cliente.
  const publicPlans = plans.filter((p) => p.active);
  const customPlans = plans.filter((p) => !p.active);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Planos</h1>
        <p className="text-muted-foreground text-sm">
          Catálogo de planos (preços, limites e features). Editar aqui afeta novos assinantes e a
          página /precos; quem já assina mantém o snapshot.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-medium">Públicos</h2>
        <p className="text-muted-foreground -mt-3 text-xs">
          Listados em /precos e contratáveis no self-serve. Um por tier.
        </p>
        {publicPlans.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum plano público. Rode o seed (<code>seed:plans</code>) para criar Solo/Time/Multi.
          </p>
        ) : (
          publicPlans.map((p) => <PlanCard key={p.id} p={p} />)
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium">Personalizados</h2>
        <p className="text-muted-foreground -mt-3 text-xs">
          Fora da vitrine. Atribua na tela do cliente (Clientes → o estabelecimento → Plano). O
          mesmo plano pode ser atribuído a vários estabelecimentos.
        </p>
        {customPlans.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum plano personalizado ainda.</p>
        ) : (
          customPlans.map((p) => <PlanCard key={p.id} p={p} />)
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Criar plano</CardTitle>
        </CardHeader>
        <CardContent>
          <CreatePlanForm tiers={ALL_TIERS} />
        </CardContent>
      </Card>
    </div>
  );
}
