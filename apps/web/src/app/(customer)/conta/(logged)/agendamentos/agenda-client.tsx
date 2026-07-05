'use client';

import { CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { TenantAvatar } from '@/components/customer/tenant-avatar';
import type { CustomerAppointmentItem } from '@/lib/customer';

import { AppointmentCard } from '../appointment-card';

// "21 jun" no fuso do tenant (linha compacta dos concluídos).
function shortDate(startsAt: Date, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: tz, day: 'numeric', month: 'short' })
    .format(startsAt)
    .replace('.', '');
}

function ConcluidosPreview({ items }: { items: CustomerAppointmentItem[] }) {
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-ink font-serif text-[15px]">Concluídos</h2>
        <span className="border-edge bg-paper text-sub rounded-full border px-[11px] py-1.5 text-xs font-semibold">
          Últimos 30 dias
        </span>
      </div>
      <div className="mt-3 space-y-3">
        {items.slice(0, 3).map((p) => (
          <Link
            key={p.id}
            href={`/conta/agendamentos/${p.id}`}
            className="flex items-center gap-3 opacity-[0.85] transition-opacity active:opacity-60"
          >
            <TenantAvatar name={p.tenant.name} logoUrl={p.tenant.logoUrl} size={44} radius={13} />
            <div className="min-w-0 flex-1">
              <p className="text-ink truncate text-sm font-semibold">{p.tenant.name}</p>
              <p className="text-sub truncate text-[11.5px] font-medium">
                {p.serviceName} · {shortDate(p.startsAt, p.tenant.timezone)}
              </p>
            </div>
            <span className="text-green-deep text-[12px] font-bold">Reagendar</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function AgendaClient({
  upcoming,
  past,
}: {
  upcoming: CustomerAppointmentItem[];
  past: CustomerAppointmentItem[];
}) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="px-5 pt-6">
      <h1 className="text-ink font-serif text-[28px] tracking-tight">Sua agenda</h1>

      <div className="mt-4 flex gap-2">
        {(
          [
            ['upcoming', 'Próximos'],
            ['past', 'Histórico'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-xl py-2.5 text-[13.5px] transition-colors ${
              tab === key
                ? 'bg-green-deep text-cream font-bold'
                : 'border-edge bg-paper text-ink border font-semibold'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="pt-[18px]">
        {list.length === 0 ? (
          <div className="mt-12 flex flex-col items-center px-6 text-center">
            <div className="bg-coral/10 mb-4 flex h-20 w-20 items-center justify-center rounded-full">
              <CalendarDays className="text-coral h-[34px] w-[34px]" />
            </div>
            <p className="text-ink font-serif text-xl">
              Tá tudo <em className="text-green-deep italic">livre</em>
            </p>
            <p className="text-muted-foreground mt-2 text-base leading-6">
              {tab === 'upcoming'
                ? 'Encontre um estabelecimento e agende - vai aparecer tudo por aqui.'
                : 'Seus agendamentos anteriores vão aparecer por aqui.'}
            </p>
            {tab === 'upcoming' ? (
              <Link
                href="/conta/buscar"
                className="bg-coral mt-6 rounded-2xl px-6 py-4 text-[15px] font-bold text-white transition-transform active:scale-[0.97]"
              >
                Buscar estabelecimento
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {list.map((item, i) => (
                <AppointmentCard key={item.id} item={item} first={i === 0} />
              ))}
            </div>
            {tab === 'upcoming' && past.length > 0 ? <ConcluidosPreview items={past} /> : null}
          </>
        )}
      </div>
    </div>
  );
}
