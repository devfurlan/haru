'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { STATUS_LABEL, STATUS_STYLE } from '@/lib/appointment-status';
import type { CustomerAppointmentItem } from '@/lib/customer';
import { formatBRL, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

import { CancelDialog } from './agendamentos/cancel-dialog';
import { RescheduleDialog } from './agendamentos/reschedule-dialog';

// Card de um agendamento na área do cliente. Reusado no histórico e no início.
export function AppointmentCard({ item }: { item: CustomerAppointmentItem }) {
  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-xs">{item.tenant.name}</p>
          <p className="font-medium">{item.serviceName}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
            STATUS_STYLE[item.status],
          )}
        >
          {STATUS_LABEL[item.status]}
        </span>
      </div>

      <div className="text-muted-foreground mt-2 space-y-0.5 text-sm">
        <p className="text-foreground capitalize">{item.whenLabel}</p>
        <p>
          {item.professionalName ?? 'Profissional'} · {formatDuration(item.durationMinutes)} ·{' '}
          {formatBRL(item.priceCents)}
        </p>
        {item.payment?.status === 'PAID' && <p className="text-emerald-700">Pago</p>}
        {item.payment?.status === 'PENDING' && <p className="text-amber-700">Pagamento pendente</p>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {item.isActive && <RescheduleDialog item={item} />}
        {item.isActive && <CancelDialog item={item} />}
        {item.serviceActive && (
          <Button asChild variant={item.isActive ? 'ghost' : 'outline'} size="sm">
            <Link href={`/conta/agendar?from=${item.id}`}>Agendar de novo</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
