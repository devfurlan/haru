'use client';

import { Star } from 'lucide-react';
import Link from 'next/link';

import { TenantAvatar } from '@/components/customer/tenant-avatar';
import { isReviewable } from '@/lib/appointment-status';
import type { CustomerAppointmentItem } from '@/lib/customer';
import { cn } from '@/lib/utils';
import { formatBRL } from '@haru/shared';

import { CancelDialog } from './agendamentos/cancel-dialog';
import { RescheduleDialog } from './agendamentos/reschedule-dialog';

// Chip de status (mesmas cores do app): confirmado/a confirmar em chip verde; cancelado/
// realizado neutro; não compareceu destrutivo.
const STATUS: Record<CustomerAppointmentItem['status'], { text: string; cls: string }> = {
  PENDING: { text: 'a confirmar', cls: 'bg-chip text-green-deep' },
  CONFIRMED: { text: 'confirmado', cls: 'bg-chip text-green-deep' },
  CANCELED: { text: 'cancelado', cls: 'bg-coral-tint text-coral-deep' },
  COMPLETED: { text: 'concluído', cls: 'bg-chip text-green-deep' },
  NO_SHOW: { text: 'não compareceu', cls: 'bg-destructive/10 text-destructive' },
};

// Partes da data no fuso do tenant, pra caixa de data e linha compacta.
function parts(startsAt: Date, tz: string) {
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('pt-BR', { timeZone: tz, ...o }).format(startsAt).replace('.', '');
  const wd = f({ weekday: 'short' });
  return {
    weekdayUpper: wd.toUpperCase(),
    weekdayCap: `${wd.charAt(0).toUpperCase()}${wd.slice(1)}`,
    day: f({ day: 'numeric' }),
    month: f({ month: 'short' }),
    time: f({ hour: '2-digit', minute: '2-digit' }).replace(':', 'h'),
  };
}

// Card de um agendamento. `upcoming` = linha larga com caixa de data + ações inline
// (remarcar/cancelar reusam os mesmos dialogs do detalhe). `past` = linha compacta com
// "agendar de novo". Espelha apps/mobile/src/components/appointment-card.tsx.
export function AppointmentCard({
  item,
  variant,
  reviewRating = null,
}: {
  item: CustomerAppointmentItem;
  variant: 'upcoming' | 'past';
  /** Nota do cliente pra este estabelecimento (null = ainda não avaliou). Só usada no histórico. */
  reviewRating?: number | null;
}) {
  const p = parts(item.startsAt, item.tenant.timezone);
  const status = STATUS[item.status];
  const canReview = variant === 'past' && isReviewable(item);

  if (variant === 'past') {
    return (
      <div className="border-line bg-paper flex flex-wrap items-center gap-4 rounded-[18px] border p-3.5">
        <Link
          href={`/conta/agendamentos/${item.id}`}
          className="flex min-w-0 flex-1 items-center gap-3.5"
        >
          <TenantAvatar
            name={item.tenant.name}
            logoUrl={item.tenant.logoUrl}
            size={44}
            radius={13}
          />
          <div className="min-w-0">
            <p className="text-ink truncate font-serif text-[15px]">{item.tenant.name}</p>
            <p className="text-sub mt-0.5 truncate text-[12.5px] font-medium">
              {item.serviceName}
              {item.professionalName ? ` · com ${item.professionalName}` : ''}
            </p>
          </div>
        </Link>
        <span className="text-ink-70 shrink-0 font-serif text-[14px]">
          {p.weekdayCap}, {p.day} {p.month} · {p.time}
        </span>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-[5px] text-[11.5px] font-semibold',
            status.cls,
          )}
        >
          {status.text}
        </span>
        {canReview ? (
          reviewRating != null ? (
            <span className="bg-chip text-green-deep flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold">
              <span className="text-coral" aria-hidden>
                ★
              </span>
              {reviewRating},0 · sua nota
            </span>
          ) : (
            <Link
              href={`/conta/agendamentos/${item.id}/avaliar`}
              className="text-green-deep flex shrink-0 items-center gap-1.5 rounded-full border border-[#cfe3d6] px-4 py-2 text-[12.5px] font-bold transition-colors hover:bg-[#eaf6ee]"
            >
              <Star className="h-3.5 w-3.5" strokeWidth={2} />
              Avaliar
            </Link>
          )
        ) : null}
        {item.serviceActive ? (
          <Link
            href={`/conta/agendar?from=${item.id}`}
            className="text-coral shrink-0 rounded-full border border-[#ffd9cd] px-4 py-2 text-[12.5px] font-bold transition-colors hover:bg-[#ffeee9]"
          >
            Agendar de novo
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="border-line bg-paper flex flex-wrap items-center gap-4 rounded-[20px] border p-4 transition-shadow hover:shadow-[0_22px_40px_-26px_rgba(10,51,36,0.45)]">
      <Link
        href={`/conta/agendamentos/${item.id}`}
        className="flex min-w-0 flex-1 items-center gap-4"
      >
        <div className="bg-green-deep shrink-0 rounded-[15px] px-3 py-2.5 text-center">
          <p className="text-[10.5px] font-bold tracking-[0.1em] text-[#8fbfa4]">
            {p.weekdayUpper}
          </p>
          <p className="text-cream font-serif text-[25px] leading-[1.05]">{p.day}</p>
          <p className="text-[11px] font-medium text-[#8fbfa4]">{p.month}</p>
        </div>
        <div className="min-w-0">
          <p className="text-ink truncate font-serif text-[17px]">{item.tenant.name}</p>
          <p className="text-sub mt-0.5 truncate text-[13px] font-medium">
            {item.serviceName}
            {item.professionalName ? ` · com ${item.professionalName}` : ''}
          </p>
          <span
            className={cn(
              'mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
              status.cls,
            )}
          >
            <span className="bg-green-bright h-1.5 w-1.5 rounded-full" aria-hidden />
            {status.text}
          </span>
        </div>
      </Link>

      <div className="text-right">
        <p className="text-ink font-serif text-[21px] leading-none">{p.time}</p>
        <p className="text-green-deep mt-1 font-serif text-[14px]">{formatBRL(item.priceCents)}</p>
      </div>

      {item.isActive ? (
        <div className="flex items-center gap-2">
          <RescheduleDialog item={item} />
          <CancelDialog item={item} />
        </div>
      ) : null}
    </div>
  );
}
