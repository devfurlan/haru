'use client';

import { CalendarCheck, CheckCircle2, Clock } from 'lucide-react';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { type AvailableSlot } from '@/lib/availability';
import { formatBRL, formatDuration, formatPhoneBR } from '@/lib/format';

import {
  createPublicBooking,
  type CreatePublicBookingResult,
  getAvailableSlots,
} from './actions';

interface ServiceOption {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
}

interface DayOption {
  /** "YYYY-MM-DD" no fuso do tenant. */
  value: string;
  /** Ex.: "sáb., 30/05". */
  label: string;
}

interface PublicBookingProps {
  slug: string;
  services: ServiceOption[];
  days: DayOption[];
}

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="coral" size="pill" className="w-full" disabled={disabled || pending}>
      {pending ? 'Confirmando…' : 'Confirmar agendamento'}
    </Button>
  );
}

export function PublicBooking({ slug, services, days }: PublicBookingProps) {
  const [serviceId, setServiceId] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loadingSlots, startLoadingSlots] = useTransition();

  const [state, formAction] = useActionState<CreatePublicBookingResult, FormData>(
    createPublicBooking,
    undefined,
  );

  // Telefone: exibe com máscara BR, mas o valor cru (dígitos) vai no submit.
  const [phone, setPhone] = useState('');

  // Busca slots sempre que serviço + dia estiverem escolhidos.
  useEffect(() => {
    setSelectedSlot('');
    if (!serviceId || !dateStr) {
      setSlots([]);
      return;
    }
    startLoadingSlots(async () => {
      const result = await getAvailableSlots(slug, serviceId, dateStr);
      setSlots(result);
    });
  }, [slug, serviceId, dateStr]);

  // Sucesso: mostra resumo em vez do formulário.
  if (state && 'ok' in state) {
    const confirmed = state.status === 'CONFIRMED';
    return (
      <div className="bg-card space-y-3 rounded-lg border p-6 text-center shadow-sm">
        <CheckCircle2 className="text-coral mx-auto h-10 w-10" />
        <h3 className="font-serif text-xl font-semibold">
          {confirmed ? 'Agendamento confirmado!' : 'Pedido recebido!'}
        </h3>
        <p className="text-sm font-medium">{state.summary}</p>
        <p className="text-muted-foreground text-sm">
          {confirmed
            ? 'Te esperamos no horário marcado. 😊'
            : 'Recebemos seu pedido — em breve confirmamos seu horário.'}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="bg-card space-y-5 rounded-lg border p-6 shadow-sm">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="slotIso" value={selectedSlot} />
      <input type="hidden" name="phone" value={phone} />

      <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
        <CalendarCheck className="h-5 w-5" />
        Agende online
      </h2>

      {/* 1. Serviço */}
      <div className="space-y-2">
        <Label htmlFor="pb-service">Serviço</Label>
        <select
          id="pb-service"
          className={SELECT_CLASS}
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
        >
          <option value="" disabled>
            Selecione um serviço
          </option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {formatDuration(s.durationMinutes)} · {formatBRL(s.priceCents)}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Dia */}
      <div className="space-y-2">
        <Label htmlFor="pb-day">Dia</Label>
        <select
          id="pb-day"
          className={SELECT_CLASS}
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          disabled={!serviceId}
        >
          <option value="" disabled>
            {serviceId ? 'Escolha o dia' : 'Selecione o serviço primeiro'}
          </option>
          {days.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Horários */}
      {serviceId && dateStr && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Horários livres
          </Label>
          {loadingSlots ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-md" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum horário livre nesse dia. Tente outro.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => {
                const active = selectedSlot === slot.startsAtIso;
                return (
                  <Button
                    key={slot.startsAtIso}
                    type="button"
                    variant={active ? 'coral' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSlot(slot.startsAtIso)}
                  >
                    {slot.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Cadastro — aparece quando um slot está escolhido */}
      {selectedSlot && (
        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="pb-name">Seu nome</Label>
            <Input id="pb-name" name="name" placeholder="Maria Silva" required maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pb-phone">WhatsApp</Label>
            <Input
              id="pb-phone"
              type="tel"
              inputMode="numeric"
              placeholder="(11) 91234-5678"
              value={formatPhoneBR(phone) || phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 13))}
              required
            />
            <p className="text-muted-foreground text-xs">Usamos pra confirmar e lembrar você.</p>
          </div>

          {state && 'error' in state && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}

          <SubmitButton disabled={!selectedSlot} />
        </div>
      )}

      {/* Erro fora do bloco de cadastro (ex.: slot expirou antes de preencher) */}
      {!selectedSlot && state && 'error' in state && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}
    </form>
  );
}
