import type { PlanTier } from '@haru/database';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TIER_LABEL } from '@/lib/billing-lite';
import { listPlans } from '@/lib/tenant-queries';

import { CreatePlanForm } from './create-plan-form';
import { PlanEditForm } from './plan-edit-form';

export const dynamic = 'force-dynamic';

const ALL_TIERS: PlanTier[] = ['ESSENCIAL', 'PROFISSIONAL', 'NEGOCIO', 'ENTERPRISE'];

export default async function PlanosPage() {
  const plans = await listPlans();
  const presentTiers = new Set(plans.map((p) => p.tier));
  const availableTiers = ALL_TIERS.filter((t) => !presentTiers.has(t));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Planos</h1>
        <p className="text-sm text-muted-foreground">
          Catálogo de planos (preços, limites e features). Editar aqui afeta novos assinantes e a
          página /precos; quem já assina mantém o snapshot.
        </p>
      </div>

      {plans.map((p) => (
        <Card key={p.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {TIER_LABEL[p.tier]}
              <span className="text-xs font-normal text-muted-foreground">({p.tier})</span>
              {!p.active && <Badge variant="neutral">inativo</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PlanEditForm
              id={p.id}
              defaults={{
                name: p.name,
                priceMonthlyCents: p.priceMonthlyCents,
                priceAnnualCents: p.priceAnnualCents,
                appointmentsPerMonth: p.appointmentsPerMonth,
                aiMessagesPerMonth: p.aiMessagesPerMonth,
                maxStaff: p.maxStaff,
                onlinePayments: p.onlinePayments,
                webhooks: p.webhooks,
                team: p.team,
                active: p.active,
                displayOrder: p.displayOrder,
              }}
            />
          </CardContent>
        </Card>
      ))}

      {availableTiers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Criar plano</CardTitle>
          </CardHeader>
          <CardContent>
            <CreatePlanForm availableTiers={availableTiers} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
