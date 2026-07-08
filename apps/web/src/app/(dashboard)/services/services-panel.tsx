'use client';

import type { Service } from '@haru/database';
import { Pencil, Scissors } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { formatBRL, formatDuration } from '@haru/shared';
import { cn } from '@/lib/utils';

import { toggleServiceActive } from './actions';
import { ServiceForm, type ProfessionalOption } from './service-form';

export interface ServiceWithProfessionals extends Service {
  professionalIds: string[];
}

interface ServicesPanelProps {
  services: ServiceWithProfessionals[];
  professionals: ProfessionalOption[];
}

export function ServicesPanel({ services, professionals }: ServicesPanelProps) {
  // null = fechado; 'new' = criar; senão = serviço em edição.
  const [modal, setModal] = useState<'new' | ServiceWithProfessionals | null>(null);
  const editing = modal && modal !== 'new' ? modal : null;

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[220px] flex-1">
          <h1 className="font-serif text-[28px] tracking-tight text-ink">Serviços</h1>
          <p className="mt-1 text-sm text-ink-50">O cardápio que seus clientes veem no app e na página.</p>
        </div>
        <Button variant="coral" onClick={() => setModal('new')}>
          Adicionar serviço
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge bg-paper px-6 py-12 text-center text-sm text-ink-50">
          Você ainda não cadastrou nenhum serviço.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-line bg-paper shadow-soft">
          {services.map((service) => (
            <ServiceRow key={service.id} service={service} onEdit={() => setModal(service)} />
          ))}
        </div>
      )}

      <p className="text-xs text-ink-50">
        Desligou, sumiu: o serviço some do app e da página na hora - sem apagar nada.
      </p>

      <Dialog open={modal !== null} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent dismissable={false}>
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editing ? 'Editar' : 'Novo'} <em className="text-green-emph">serviço</em>
            </DialogTitle>
          </DialogHeader>
          {modal !== null && (
            <ServiceForm
              key={editing?.id ?? 'new'}
              defaults={
                editing
                  ? {
                      id: editing.id,
                      name: editing.name,
                      description: editing.description,
                      durationMinutes: editing.durationMinutes,
                      priceCents: editing.priceCents,
                    }
                  : undefined
              }
              professionals={professionals}
              selectedProfessionalIds={editing?.professionalIds}
              onSuccess={() => setModal(null)}
              onCancel={() => setModal(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ServiceRow({ service, onEdit }: { service: ServiceWithProfessionals; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={cn(
        'flex items-center gap-3.5 border-t border-dotted border-edge px-[18px] py-3 first:border-0',
        !service.active && 'opacity-55',
      )}
    >
      <div className="flex size-10 flex-none items-center justify-center rounded-xl bg-chip text-green-emph">
        <Scissors className="size-[19px]" strokeWidth={2.1} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink">{service.name}</div>
        <div className="mt-0.5 truncate text-xs text-ink-50">
          {formatDuration(service.durationMinutes)}
          {service.description ? ` · ${service.description}` : ''}
        </div>
      </div>
      <div className="flex-none font-serif text-[17px] text-ink">{formatBRL(service.priceCents)}</div>
      <button
        type="button"
        onClick={onEdit}
        title="Editar"
        className="flex-none rounded-[10px] p-1.5 text-ink-30 hover:bg-cream-2 hover:text-ink-70"
      >
        <Pencil className="size-4" />
      </button>
      <Switch
        checked={service.active}
        disabled={pending}
        onCheckedChange={(next) => startTransition(() => toggleServiceActive(service.id, next))}
      />
    </div>
  );
}
