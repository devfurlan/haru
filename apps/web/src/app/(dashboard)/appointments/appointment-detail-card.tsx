'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState, useTransition } from 'react';

import type { AppointmentStatus } from '@haru/database';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { STATUS_LABEL } from '@/lib/appointment-status';
import { formatPhoneBR } from '@haru/shared';

import {
  cancelAppointment,
  cancelAppointmentSeries,
  completeAppointment,
  confirmAppointment,
  markNoShow,
} from './actions';
import type { CalendarAppointment } from './appointments-day-view';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const PILL: Record<AppointmentStatus, string> = {
  PENDING: 'bg-coral/22 text-[#FFD9CE]',
  CONFIRMED: 'bg-green-bright/18 text-green-bright',
  COMPLETED: 'bg-[rgba(250,245,234,.14)] text-on-emerald-mut',
  CANCELED: 'bg-[rgba(250,245,234,.14)] text-on-emerald-mut',
  NO_SHOW: 'bg-coral/18 text-[#FFD9CE]',
};

function formatTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

interface AppointmentDetailCardProps {
  appointment: CalendarAppointment;
  professionalName: string | null;
  timezone: string;
  onClose: () => void;
}

export function AppointmentDetailCard({
  appointment,
  professionalName,
  timezone,
  onClose,
}: AppointmentDetailCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cancelTarget, setCancelTarget] = useState<null | 'single' | 'series'>(null);
  const [notifyClient, setNotifyClient] = useState(true);

  const { status } = appointment;
  const client = appointment.contactName ?? formatPhoneBR(appointment.contactPhone) ?? 'Cliente';
  const pill = PILL[status];

  function act(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
      onClose();
    });
  }

  const openCancel = (target: 'single' | 'series') => {
    setNotifyClient(true);
    setCancelTarget(target);
  };

  const confirmCancel = () => {
    const target = cancelTarget;
    setCancelTarget(null);
    act(() =>
      target === 'series' && appointment.seriesId
        ? cancelAppointmentSeries(appointment.seriesId, { notifyClient })
        : cancelAppointment(appointment.id, { notifyClient }),
    );
  };

  const isPending = status === 'PENDING';
  const isActive = status === 'CONFIRMED';
  // Presença corrigível pra sempre: já atendido/faltou no passado ainda troca (percebeu depois).
  const isPast = new Date(appointment.startsAt).getTime() < Date.now();
  const isDone = status === 'COMPLETED' || status === 'NO_SHOW';

  return (
    <div className="text-on-emerald shadow-soft p-4.5 rounded-[18px] bg-[var(--emerald)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-serif text-[19px] leading-tight">{client}</div>
          <div className="text-on-emerald-mut text-xs font-medium">
            {formatPhoneBR(appointment.contactPhone) ?? '—'}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-on-emerald-mut flex-none rounded-lg px-2 py-1 text-sm font-semibold hover:bg-white/10"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>

      <span
        className={`mt-2.5 inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${pill}`}
      >
        {STATUS_LABEL[status] ?? status}
      </span>

      <div className="border-[var(--on-emerald-mut)]/40 my-3.5 border-t border-dashed" />

      <dl className="flex flex-col gap-2.5 text-[12.5px] font-medium">
        <Row label="Serviço" value={appointment.serviceName} />
        {professionalName && <Row label="Profissional" value={professionalName} />}
        <Row
          label="Horário"
          value={
            <span className="font-serif text-sm">
              {formatTime(appointment.startsAt, timezone)}–
              {formatTime(appointment.endsAt, timezone)}
            </span>
          }
        />
        <Row
          label="Valor"
          value={
            <span className="text-green font-serif text-[15px]">
              {BRL.format(appointment.priceCents / 100)}
            </span>
          }
        />
      </dl>

      {(isPending || isActive) && (
        <>
          <div className="border-[var(--on-emerald-mut)]/40 my-3.5 border-t border-dashed" />

          {isPending && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => act(() => confirmAppointment(appointment.id))}
                className="bg-coral rounded-xl p-3 text-center text-[13px] font-semibold text-white transition active:scale-[.965] disabled:opacity-50"
              >
                Confirmar horário
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm('Recusar este pedido?')) return;
                  act(() => cancelAppointment(appointment.id, { notifyClient: true }));
                }}
                className="text-on-emerald-mut rounded-[10px] p-2.5 text-center text-[12.5px] font-semibold hover:bg-white/[.08] disabled:opacity-50"
              >
                Recusar pedido
              </button>
            </div>
          )}

          {isActive && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => act(() => completeAppointment(appointment.id))}
                className="border-green/40 bg-green/[.16] text-green rounded-xl border p-3 text-center text-[13px] font-semibold transition active:scale-[.965] disabled:opacity-50"
              >
                ✓ Marcar como atendido
              </button>
              <div className="flex gap-2">
                <Button
                  asChild
                  className="text-on-emerald flex-1 rounded-[11px] border border-white/25 bg-transparent p-2.5 text-center text-[12.5px] font-semibold hover:bg-white/[.08]"
                >
                  <Link href={`/appointments/${appointment.id}/reschedule`}>Remarcar</Link>
                </Button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => openCancel('single')}
                  className="text-on-emerald-mut flex-1 rounded-[11px] p-2.5 text-center text-[12.5px] font-semibold hover:bg-white/[.08] disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
              <div className="flex items-center justify-center gap-4 pt-0.5">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act(() => markNoShow(appointment.id))}
                  className="text-on-emerald-faint hover:text-on-emerald-mut text-[11.5px] font-semibold disabled:opacity-50"
                >
                  Não compareceu
                </button>
                {appointment.seriesId && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => openCancel('series')}
                    className="text-on-emerald-faint hover:text-on-emerald-mut text-[11.5px] font-semibold disabled:opacity-50"
                  >
                    Cancelar série
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {isPast && isDone && (
        <>
          <div className="border-[var(--on-emerald-mut)]/40 my-3.5 border-t border-dashed" />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || status === 'COMPLETED'}
              onClick={() => act(() => completeAppointment(appointment.id))}
              className="border-green/40 bg-green/[.16] text-green enabled:hover:bg-green/[.24] flex-1 rounded-[11px] border p-2.5 text-center text-[12.5px] font-semibold transition active:scale-[.965] disabled:opacity-100"
            >
              ✓ Atendido
            </button>
            <button
              type="button"
              disabled={pending || status === 'NO_SHOW'}
              onClick={() => act(() => markNoShow(appointment.id))}
              className="text-on-emerald flex-1 rounded-[11px] border border-white/25 bg-transparent p-2.5 text-center text-[12.5px] font-semibold transition active:scale-[.965] enabled:hover:bg-white/[.08] disabled:bg-white/[.12] disabled:opacity-100"
            >
              Não compareceu
            </button>
          </div>
          <p className="text-on-emerald-faint mt-2 text-center text-[11px]">
            Dá pra corrigir quando quiser.
          </p>
        </>
      )}

      {/* confirmação de cancelamento — preserva a escolha de avisar o cliente (evita
          duplo aviso quando o cancelamento faz parte de uma remarcação). */}
      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(o) => {
          if (!o) setCancelTarget(null);
        }}
      >
        <DialogContent dismissable={false}>
          <DialogHeader>
            <DialogTitle className="text-xl">
              {cancelTarget === 'series' ? 'Cancelar série recorrente' : 'Cancelar agendamento'}
            </DialogTitle>
            <p className="text-muted-foreground text-sm">
              {cancelTarget === 'series'
                ? 'Cancela todas as ocorrências futuras dessa série. Os horários ficam livres na agenda.'
                : 'O horário fica livre na sua agenda.'}
            </p>
          </DialogHeader>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={notifyClient}
              onChange={(e) => setNotifyClient(e.target.checked)}
              className="mt-0.5 size-4"
            />
            <span>
              Avisar o cliente pelo WhatsApp
              <span className="text-muted-foreground mt-0.5 block text-xs">
                Desmarque se isso faz parte de uma remarcação - o cliente já foi movido pra outro
                horário e não precisa receber um aviso de cancelamento.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCancelTarget(null)}>
              Voltar
            </Button>
            <Button type="button" variant="destructive" onClick={confirmCancel}>
              {cancelTarget === 'series' ? 'Cancelar série' : 'Cancelar agendamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-2.5">
      <dt className="text-on-emerald-mut">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
