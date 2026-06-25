'use client';

import type { Service } from '@haru/database';
import { Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBRL, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

import { deleteService, toggleServiceActive } from './actions';
import { ServiceForm, type ProfessionalOption } from './service-form';

export interface ServiceWithProfessionals extends Service {
  professionalIds: string[];
}

interface ServicesPanelProps {
  services: ServiceWithProfessionals[];
  professionals: ProfessionalOption[];
}

export function ServicesPanel({ services, professionals }: ServicesPanelProps) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {creating ? (
        <Card>
          <CardHeader>
            <CardTitle>Novo serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceForm
              professionals={professionals}
              onSuccess={() => setCreating(false)}
              onCancel={() => setCreating(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Adicionar serviço
        </Button>
      )}

      {services.length === 0 && !creating ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Você ainda não cadastrou nenhum serviço.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {services.map((service) =>
            editingId === service.id ? (
              <Card key={service.id}>
                <CardHeader>
                  <CardTitle>Editar serviço</CardTitle>
                </CardHeader>
                <CardContent>
                  <ServiceForm
                    defaults={{
                      id: service.id,
                      name: service.name,
                      description: service.description,
                      durationMinutes: service.durationMinutes,
                      priceCents: service.priceCents,
                    }}
                    professionals={professionals}
                    selectedProfessionalIds={service.professionalIds}
                    onSuccess={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                </CardContent>
              </Card>
            ) : (
              <ServiceRow
                key={service.id}
                service={service}
                onEdit={() => setEditingId(service.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function ServiceRow({ service, onEdit }: { service: Service; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm',
        !service.active && 'opacity-60',
      )}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{service.name}</span>
          {!service.active && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              inativo
            </span>
          )}
        </div>
        {service.description && (
          <div className="text-sm text-muted-foreground">{service.description}</div>
        )}
        <div className="mt-1 text-sm">
          {formatDuration(service.durationMinutes)} · {formatBRL(service.priceCents)}
        </div>
      </div>

      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          disabled={pending}
          onClick={() => startTransition(() => toggleServiceActive(service.id, !service.active))}
          title={service.active ? 'Desativar' : 'Ativar'}
        >
          <Power className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onEdit} title="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Excluir "${service.name}"?`)) return;
            startTransition(() => deleteService(service.id));
          }}
          title="Excluir"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
