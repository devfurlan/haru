import Link from 'next/link';

import { TenantAvatar } from '@/components/customer/tenant-avatar';
import type { CustomerAppointmentItem } from '@/lib/customer';
import { cn } from '@/lib/utils';

// Chip de status (mesmas cores do app): confirmado/a confirmar em chip verde; cancelado/
// realizado neutro; não compareceu destrutivo.
const STATUS: Record<CustomerAppointmentItem['status'], { text: string; cls: string }> = {
  PENDING: { text: 'A confirmar', cls: 'bg-chip text-green-deep' },
  CONFIRMED: { text: 'confirmado', cls: 'bg-chip text-green-deep' },
  CANCELED: { text: 'cancelado', cls: 'bg-ink/5 text-muted-foreground' },
  COMPLETED: { text: 'realizado', cls: 'bg-ink/5 text-sub' },
  NO_SHOW: { text: 'não compareceu', cls: 'bg-destructive/10 text-destructive' },
};

// "Sáb, 5 jul · 15h30" no fuso do tenant.
function whenLine(startsAt: Date, tz: string): string {
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('pt-BR', { timeZone: tz, ...o }).format(startsAt).replace('.', '');
  const wd = f({ weekday: 'short' });
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${f({ day: 'numeric' })} ${f({
    month: 'short',
  })} · ${f({ hour: '2-digit', minute: '2-digit' }).replace(':', 'h')}`;
}

// Card de um agendamento na lista da agenda. O card inteiro leva ao detalhe (onde ficam
// remarcar/cancelar). Espelha apps/mobile/src/components/appointment-card.tsx.
export function AppointmentCard({ item, first }: { item: CustomerAppointmentItem; first?: boolean }) {
  const status = STATUS[item.status];
  const dim = item.status === 'CANCELED' || item.isPast;

  return (
    <Link
      href={`/conta/agendamentos/${item.id}`}
      className={cn(
        'border-line bg-paper block rounded-[18px] border p-3.5 transition-transform active:scale-[0.99]',
        first && 'shadow-[0_6px_14px_-6px_rgba(10,51,36,0.18)]',
        dim && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-3">
        <TenantAvatar name={item.tenant.name} logoUrl={item.tenant.logoUrl} size={52} radius={15} />
        <div className="min-w-0 flex-1">
          <p className="text-ink truncate font-serif text-base">{item.tenant.name}</p>
          <p className="text-sub mt-0.5 truncate text-xs font-medium">
            {item.serviceName}
            {item.professionalName ? ` · com ${item.professionalName}` : ''}
          </p>
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-[5px] text-[11px] font-bold', status.cls)}>
          {status.text}
        </span>
      </div>

      <div className="border-line mt-3 flex items-center justify-between border-t pt-3">
        <span className="text-green-deep font-serif text-[17px]">
          {whenLine(item.startsAt, item.tenant.timezone)}
        </span>
        <span className="text-coral text-[13px] font-bold">Ver</span>
      </div>
    </Link>
  );
}
