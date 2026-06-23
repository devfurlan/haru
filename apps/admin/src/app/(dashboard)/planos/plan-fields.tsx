'use client';

import { Field } from '@/components/form-ui';
import { Input } from '@/components/ui/input';
import { centsToReaisInput } from '@/lib/format';

export interface PlanDefaults {
  name: string;
  priceMonthlyCents: number;
  priceAnnualCents: number;
  appointmentsPerMonth: number | null;
  aiMessagesPerMonth: number | null;
  maxStaff: number | null;
  onlinePayments: boolean;
  webhooks: boolean;
  team: boolean;
  active: boolean;
  displayOrder: number;
}

/** Campos compartilhados entre criar e editar plano (controlados via defaultValue). */
export function PlanFields({ d }: { d: PlanDefaults }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" htmlFor="name">
          <Input id="name" name="name" defaultValue={d.name} required />
        </Field>
        <Field label="Ordem de exibição" htmlFor="displayOrder">
          <Input id="displayOrder" name="displayOrder" type="number" min={0} defaultValue={d.displayOrder} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Preço mensal (R$)" htmlFor="priceMonthly">
          <Input
            id="priceMonthly"
            name="priceMonthly"
            inputMode="decimal"
            defaultValue={centsToReaisInput(d.priceMonthlyCents)}
            required
          />
        </Field>
        <Field label="Preço anual (R$)" htmlFor="priceAnnual" hint="Total do ciclo anual (já com desconto).">
          <Input
            id="priceAnnual"
            name="priceAnnual"
            inputMode="decimal"
            defaultValue={centsToReaisInput(d.priceAnnualCents)}
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Agendamentos/mês" htmlFor="appointmentsPerMonth" hint="Vazio = ilimitado.">
          <Input
            id="appointmentsPerMonth"
            name="appointmentsPerMonth"
            type="number"
            min={0}
            defaultValue={d.appointmentsPerMonth ?? ''}
          />
        </Field>
        <Field label="Mensagens IA/mês" htmlFor="aiMessagesPerMonth" hint="Vazio = ilimitado.">
          <Input
            id="aiMessagesPerMonth"
            name="aiMessagesPerMonth"
            type="number"
            min={0}
            defaultValue={d.aiMessagesPerMonth ?? ''}
          />
        </Field>
        <Field label="Máx. usuários" htmlFor="maxStaff" hint="Vazio = ilimitado.">
          <Input id="maxStaff" name="maxStaff" type="number" min={0} defaultValue={d.maxStaff ?? ''} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Check name="onlinePayments" label="Pagamentos online" checked={d.onlinePayments} />
        <Check name="webhooks" label="Webhooks" checked={d.webhooks} />
        <Check name="team" label="Equipe (multiusuário)" checked={d.team} />
        <Check name="active" label="Ativo (visível em /precos)" checked={d.active} />
      </div>
    </div>
  );
}

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" name={name} defaultChecked={checked} className="size-4" />
      {label}
    </label>
  );
}
