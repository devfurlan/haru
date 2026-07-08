'use client';

import { CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import type { CustomerAppointmentItem } from '@/lib/customer';

import { AppointmentCard } from '../appointment-card';

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
    <div className="mx-auto max-w-[980px] px-5 py-7 md:px-8 md:py-9">
      <h1 className="text-ink font-serif text-[28px] tracking-tight md:text-[34px]">Sua agenda</h1>

      <div className="mt-5 flex gap-2">
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
            className={`rounded-full border px-6 py-2.5 text-[13.5px] font-bold transition-colors ${
              tab === key
                ? 'bg-green-deep text-cream border-green-deep'
                : 'border-edge bg-paper text-ink hover:bg-cream-2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {list.length === 0 ? (
          <div className="border-edge bg-paper rounded-[22px] border border-dashed p-12 text-center">
            <div className="bg-coral-tint mx-auto flex h-14 w-14 items-center justify-center rounded-full">
              <CalendarDays className="text-coral h-6 w-6" />
            </div>
            <p className="text-ink mt-4 font-serif text-[24px]">
              Tá tudo <em className="text-green-deep italic">livre</em>
            </p>
            <p className="text-sub mx-auto mt-1.5 max-w-md text-[14px] leading-6">
              {tab === 'upcoming'
                ? 'Encontre um estabelecimento e agende - vai aparecer tudo por aqui.'
                : 'Seus agendamentos anteriores vão aparecer por aqui.'}
            </p>
            {tab === 'upcoming' ? (
              <Link
                href="/conta/buscar"
                className="bg-coral mt-5 inline-block rounded-2xl px-6 py-3.5 text-[14px] font-bold text-white transition-transform active:scale-[0.97]"
              >
                Buscar estabelecimento
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <div className="space-y-3.5">
              {list.map((item) => (
                <AppointmentCard key={item.id} item={item} variant={tab} />
              ))}
            </div>
            {tab === 'upcoming' ? (
              <p className="text-ink-30 mt-3.5 text-[12.5px]">
                Cancelamento grátis até 2h antes. A gente te lembra antes, relaxa.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
