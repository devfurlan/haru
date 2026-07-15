'use client';

import { Field } from '@/components/form-ui';
import { Input } from '@/components/ui/input';
import { centsToReaisInput } from '@/lib/format';

export interface PlanDefaults {
  name: string;
  priceMonthlyCents: number;
  priceAnnualCents: number;
  whatsappRemindersPerMonth: number | null;
  maxProfessionals: number | null;
  maxReceptionists: number | null;
  onlinePayments: boolean;
  webhooks: boolean;
  team: boolean;
  waitlist: boolean;
  serviceSubscriptions: boolean;
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
          <Input
            id="displayOrder"
            name="displayOrder"
            type="number"
            min={0}
            defaultValue={d.displayOrder}
          />
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
        <Field
          label="Preço anual (R$)"
          htmlFor="priceAnnual"
          hint="Total do ciclo anual (já com desconto)."
        >
          <Input
            id="priceAnnual"
            name="priceAnnual"
            inputMode="decimal"
            defaultValue={centsToReaisInput(d.priceAnnualCents)}
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Lembretes WhatsApp/mês"
          htmlFor="whatsappRemindersPerMonth"
          hint="Cota mensal ativa: alerta ao dono em 80%; a 100% pausa só os lembretes por WhatsApp até o reset (e-mail e push nunca são afetados). Agendamentos são ilimitados. Vazio = ilimitado."
        >
          <Input
            id="whatsappRemindersPerMonth"
            name="whatsappRemindersPerMonth"
            type="number"
            min={0}
            defaultValue={d.whatsappRemindersPerMonth ?? ''}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Máx. profissionais"
          htmlFor="maxProfessionals"
          hint="Usuários com agenda própria. Vazio = ilimitado."
        >
          <Input
            id="maxProfessionals"
            name="maxProfessionals"
            type="number"
            min={0}
            defaultValue={d.maxProfessionals ?? ''}
          />
        </Field>
        <Field
          label="Máx. recepcionistas"
          htmlFor="maxReceptionists"
          hint="Usuários de apoio, sem agenda. Vazio = ilimitado."
        >
          <Input
            id="maxReceptionists"
            name="maxReceptionists"
            type="number"
            min={0}
            defaultValue={d.maxReceptionists ?? ''}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">
          Features liberadas por este plano (viram flags no snapshot de quem assinar)
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Check name="onlinePayments" label="Pagamentos online" checked={d.onlinePayments} />
          <Check name="webhooks" label="Webhooks" checked={d.webhooks} />
          <Check name="team" label="Equipe (multiusuário)" checked={d.team} />
          <Check name="waitlist" label="Fila de espera" checked={d.waitlist} />
          <Check
            name="serviceSubscriptions"
            label="Clube de assinatura e pacotes"
            checked={d.serviceSubscriptions}
          />
        </div>
      </div>

      <div className="space-y-1.5 border-t pt-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Check
            name="active"
            label="Público (listado em /precos e contratável no self-serve)"
            checked={d.active}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Desmarcado = plano <strong>personalizado</strong>: fica fora da vitrine e só é
          atribuído por você, na tela do cliente. Só pode existir um plano público por tier.
        </p>
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
