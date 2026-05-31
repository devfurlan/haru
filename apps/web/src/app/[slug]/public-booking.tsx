'use client';

import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  PartyPopper,
  User as UserIcon,
} from 'lucide-react';
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react';
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

/** Passos do wizard. "done" é a tela de sucesso pós-submit. */
type Step = 1 | 2 | 3 | 4 | 'done';

const TOTAL_STEPS = 4;

const STEP_TITLES: Record<Exclude<Step, 'done'>, string> = {
  1: 'Seus dados',
  2: 'Escolha o serviço',
  3: 'Escolha dia e horário',
  4: 'Confira e confirme',
};

/**
 * Quebra o label do servidor ("sáb., 30/05") em duas linhas para o chip de dia:
 * o weekday abreviado em cima e o "dia/mês" embaixo. É tolerante: se o formato
 * mudar, cai no label inteiro como fallback.
 */
function splitDayLabel(label: string): { weekday: string; date: string } {
  const [rawWeekday, ...rest] = label.split(',');
  const date = rest.join(',').trim();
  if (!date) return { weekday: label.trim(), date: '' };
  return { weekday: rawWeekday.trim().replace(/\.$/, ''), date };
}

/** Indicador de progresso (bolinhas + texto), só para os 4 passos do wizard. */
function ProgressDots({ step }: { step: Exclude<Step, 'done'> }) {
  return (
    <div
      className="flex items-center justify-between gap-3"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-valuenow={step}
      aria-label={`Passo ${step} de ${TOTAL_STEPS}: ${STEP_TITLES[step]}`}
    >
      <div className="flex items-center gap-2" aria-hidden="true">
        {([1, 2, 3, 4] as const).map((n) => (
          <span
            key={n}
            className={
              'h-2 w-2 rounded-full transition-colors ' +
              (n === step ? 'bg-coral' : n < step ? 'bg-coral/40' : 'bg-muted')
            }
          />
        ))}
      </div>
      <span className="text-muted-foreground text-xs font-medium">
        Passo {step} de {TOTAL_STEPS}
      </span>
    </div>
  );
}

/** Cabeçalho de passo com botão "Voltar" opcional. Recebe a ref de foco. */
function StepHeader({
  title,
  description,
  onBack,
  headingRef,
}: {
  title: string;
  description?: string;
  onBack?: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="space-y-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded-md text-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </button>
      ) : null}
      <div className="space-y-1">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-foreground font-serif text-xl outline-none"
        >
          {title}
        </h2>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
    </div>
  );
}

/** Botão de submit final — usa useFormStatus para o estado "pending". */
function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="coral"
      size="pill"
      className="w-full"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? 'Confirmando…' : 'Confirmar agendamento'}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Passo 1 — Cadastro (nome + WhatsApp)
// ---------------------------------------------------------------------------

function StepCadastro({
  name,
  phone,
  onChangeName,
  onChangePhone,
  onContinue,
  headingRef,
}: {
  name: string;
  phone: string;
  onChangeName: (value: string) => void;
  onChangePhone: (digits: string) => void;
  onContinue: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const nameOk = name.trim().length >= 2;
  const phoneOk = phone.length >= 10;
  const canContinue = nameOk && phoneOk;

  return (
    <div className="space-y-6">
      <StepHeader
        title={STEP_TITLES[1]}
        description="Pra confirmar o agendamento pelo WhatsApp."
        headingRef={headingRef}
      />

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canContinue) onContinue();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="booking-name">Nome</Label>
          <Input
            id="booking-name"
            name="display-name"
            autoComplete="name"
            placeholder="Como podemos te chamar?"
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
            aria-invalid={name.length > 0 && !nameOk}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="booking-phone">WhatsApp</Label>
          <Input
            id="booking-phone"
            name="display-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="(11) 91234-5678"
            value={formatPhoneBR(phone) || phone}
            onChange={(e) => onChangePhone(e.target.value.replace(/\D/g, '').slice(0, 13))}
            aria-invalid={phone.length > 0 && !phoneOk}
            aria-describedby="booking-phone-hint"
          />
          <p id="booking-phone-hint" className="text-muted-foreground text-xs">
            Inclua o DDD. Ex.: (11) 91234-5678.
          </p>
        </div>

        <Button type="submit" variant="coral" size="pill" className="w-full" disabled={!canContinue}>
          Continuar
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Passo 2 — Serviço
// ---------------------------------------------------------------------------

function StepServico({
  services,
  selectedId,
  onSelect,
  onBack,
  headingRef,
}: {
  services: ServiceOption[];
  selectedId: string;
  onSelect: (service: ServiceOption) => void;
  onBack: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="space-y-6">
      <StepHeader title={STEP_TITLES[2]} onBack={onBack} headingRef={headingRef} />

      {services.length === 0 ? (
        <p className="bg-muted text-muted-foreground rounded-lg border p-4 text-sm">
          Nenhum serviço disponível no momento.
        </p>
      ) : (
        <ul className="space-y-3" aria-label="Serviços disponíveis">
          {services.map((service) => {
            const isSelected = service.id === selectedId;
            return (
              <li key={service.id}>
                <button
                  type="button"
                  onClick={() => onSelect(service)}
                  aria-pressed={isSelected}
                  className={
                    'bg-card focus-visible:ring-ring w-full rounded-xl border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none ' +
                    (isSelected ? 'border-coral ring-coral ring-1' : 'hover:border-coral/50')
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-foreground font-medium">{service.name}</p>
                      {service.description ? (
                        <p className="text-muted-foreground text-sm">{service.description}</p>
                      ) : null}
                      <p className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatDuration(service.durationMinutes)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-coral font-semibold whitespace-nowrap">
                        {formatBRL(service.priceCents)}
                      </span>
                      <ChevronRight className="text-muted-foreground h-4 w-4" aria-hidden="true" />
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Passo 3 — Dia / Hora
// ---------------------------------------------------------------------------

function StepDiaHora({
  days,
  selectedDate,
  onSelectDate,
  slots,
  loadingSlots,
  selectedSlotIso,
  onSelectSlot,
  onBack,
  headingRef,
}: {
  days: DayOption[];
  selectedDate: string;
  onSelectDate: (value: string) => void;
  slots: AvailableSlot[];
  loadingSlots: boolean;
  selectedSlotIso: string;
  onSelectSlot: (slot: AvailableSlot) => void;
  onBack: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="space-y-6">
      <StepHeader title={STEP_TITLES[3]} onBack={onBack} headingRef={headingRef} />

      {/* Faixa horizontal rolável de chips de dia. */}
      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
        role="radiogroup"
        aria-label="Escolha o dia"
      >
        {days.length === 0 ? (
          <p className="text-muted-foreground px-1 text-sm">Nenhuma data disponível.</p>
        ) : (
          days.map((day) => {
            const { weekday, date } = splitDayLabel(day.label);
            const isSelected = day.value === selectedDate;
            return (
              <button
                key={day.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-current={isSelected ? 'date' : undefined}
                aria-label={day.label}
                onClick={() => onSelectDate(day.value)}
                className={
                  'focus-visible:ring-ring flex min-w-18 shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-center transition-colors focus-visible:ring-2 focus-visible:outline-none ' +
                  (isSelected
                    ? 'border-coral bg-coral text-white'
                    : 'bg-card text-foreground hover:border-coral/50')
                }
              >
                <span
                  className={
                    'text-[11px] font-medium uppercase ' +
                    (isSelected ? 'text-white/90' : 'text-muted-foreground')
                  }
                >
                  {weekday.slice(0, 3)}
                </span>
                <span className="text-sm font-semibold">{date || day.label}</span>
              </button>
            );
          })
        )}
      </div>

      {/* Grade de horários. */}
      <div className="space-y-3">
        <p className="text-foreground flex items-center gap-1.5 text-sm font-medium">
          <Clock className="h-4 w-4" aria-hidden="true" />
          Horários disponíveis
        </p>
        {!selectedDate ? (
          <p className="bg-muted text-muted-foreground rounded-lg border p-4 text-sm">
            Selecione um dia para ver os horários.
          </p>
        ) : loadingSlots ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <p className="bg-muted text-muted-foreground rounded-lg border p-4 text-sm">
            Nenhum horário livre nesse dia.
          </p>
        ) : (
          <div
            className="grid grid-cols-3 gap-2 sm:grid-cols-4"
            role="group"
            aria-label="Horários disponíveis"
          >
            {slots.map((slot) => {
              const isSelected = slot.startsAtIso === selectedSlotIso;
              return (
                <Button
                  key={slot.startsAtIso}
                  type="button"
                  variant={isSelected ? 'coral' : 'outline'}
                  size="sm"
                  aria-pressed={isSelected}
                  onClick={() => onSelectSlot(slot)}
                >
                  {slot.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Passo 4 — Resumo / confirmação (form de submit real)
// ---------------------------------------------------------------------------

function StepResumo({
  slug,
  service,
  dayLabel,
  slot,
  name,
  phone,
  error,
  formAction,
  onBack,
  headingRef,
}: {
  slug: string;
  service: ServiceOption;
  dayLabel: string;
  slot: AvailableSlot;
  name: string;
  phone: string;
  error: string | null;
  formAction: (formData: FormData) => void;
  onBack: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="space-y-6">
      <StepHeader title={STEP_TITLES[4]} onBack={onBack} headingRef={headingRef} />

      <dl className="bg-card space-y-3 rounded-xl border p-4 text-sm">
        <div className="flex items-start gap-3">
          <CalendarCheck className="text-coral mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <dt className="text-muted-foreground">Serviço</dt>
            <dd className="text-foreground font-medium">{service.name}</dd>
            <dd className="text-muted-foreground">
              {formatDuration(service.durationMinutes)} · {formatBRL(service.priceCents)}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="text-coral mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <dt className="text-muted-foreground">Dia e horário</dt>
            <dd className="text-foreground font-medium capitalize">
              {dayLabel} às {slot.label}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <UserIcon className="text-coral mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <dt className="text-muted-foreground">Seus dados</dt>
            <dd className="text-foreground font-medium">{name.trim()}</dd>
            <dd className="text-muted-foreground">{formatPhoneBR(phone) || phone}</dd>
          </div>
        </div>
      </dl>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="serviceId" value={service.id} />
        <input type="hidden" name="slotIso" value={slot.startsAtIso} />
        <input type="hidden" name="name" value={name.trim()} />
        <input type="hidden" name="phone" value={phone} />

        {error ? (
          <p
            role="alert"
            className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm"
          >
            {error}
          </p>
        ) : null}

        <ConfirmButton />
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tela de sucesso
// ---------------------------------------------------------------------------

function SuccessScreen({ confirmed, summary }: { confirmed: boolean; summary: string }) {
  return (
    <div className="space-y-5 text-center">
      <div className="flex justify-center">
        {confirmed ? (
          <CheckCircle2 className="text-coral h-12 w-12" aria-hidden="true" />
        ) : (
          <PartyPopper className="text-coral h-12 w-12" aria-hidden="true" />
        )}
      </div>
      <div className="space-y-2">
        <h2 className="text-foreground font-serif text-2xl">
          {confirmed ? 'Agendamento confirmado!' : 'Pedido recebido!'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {confirmed
            ? 'Está tudo certo. Te esperamos no horário combinado.'
            : 'Recebemos seu pedido. Em breve confirmamos pelo WhatsApp.'}
        </p>
      </div>
      <p className="bg-card text-foreground rounded-xl border p-4 text-left text-sm whitespace-pre-line">
        {summary}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente raiz — máquina de estados
// ---------------------------------------------------------------------------

export function PublicBooking({ slug, services, days }: PublicBookingProps) {
  const [step, setStep] = useState<Step>(1);

  // Passo 1
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(''); // dígitos crus

  // Passo 2
  const [serviceId, setServiceId] = useState('');

  // Passo 3
  const [dateStr, setDateStr] = useState('');
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlotIso, setSelectedSlotIso] = useState('');
  const [loadingSlots, startLoadingSlots] = useTransition();

  const [state, formAction] = useActionState<CreatePublicBookingResult, FormData>(
    createPublicBooking,
    undefined,
  );

  // Foco gerenciado: ao TROCAR de passo, leva o foco pro título do passo. Pula
  // o primeiro efeito (mount) pra não roubar o foco do usuário no passo 1.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isMountedRef = useRef(false);
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );
  const selectedDay = useMemo(() => days.find((d) => d.value === dateStr) ?? null, [days, dateStr]);
  const selectedSlot = useMemo(
    () => slots.find((s) => s.startsAtIso === selectedSlotIso) ?? null,
    [slots, selectedSlotIso],
  );

  // Busca slots sempre que serviço + dia estiverem escolhidos. Reseta o slot
  // selecionado a cada mudança — trocar de dia ou de serviço (voltando atrás)
  // recarrega tudo, então um horário que expirou some da grade na re-busca.
  useEffect(() => {
    setSelectedSlotIso('');
    if (!serviceId || !dateStr) {
      setSlots([]);
      return;
    }
    startLoadingSlots(async () => {
      const result = await getAvailableSlots(slug, serviceId, dateStr);
      setSlots(result);
    });
  }, [slug, serviceId, dateStr]);

  // Sucesso do submit → tela final.
  useEffect(() => {
    if (state && 'ok' in state && state.ok) {
      setStep('done');
    }
  }, [state]);

  const submitError = state && 'error' in state ? state.error : null;

  // Robustez: se chegamos no passo 4 mas o slot/serviço escolhido sumiu (ex.: a
  // re-busca o removeu por ter expirado), volta pro passo 3 pra reescolher. Não
  // dispara durante uma re-busca em andamento (loadingSlots) nem após o sucesso
  // (step vira 'done'), evitando bounce indevido antes da tela de sucesso.
  useEffect(() => {
    if (step === 4 && !loadingSlots && (!selectedService || !selectedSlot)) {
      setStep(3);
    }
  }, [step, loadingSlots, selectedService, selectedSlot]);

  // Transições explícitas.
  function handleSelectService(service: ServiceOption) {
    setServiceId(service.id);
    setStep(3);
  }

  function handleSelectSlot(slot: AvailableSlot) {
    setSelectedSlotIso(slot.startsAtIso);
    setStep(4);
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      {step !== 'done' ? <ProgressDots step={step} /> : null}

      {step === 1 ? (
        <StepCadastro
          name={name}
          phone={phone}
          onChangeName={setName}
          onChangePhone={setPhone}
          onContinue={() => setStep(2)}
          headingRef={headingRef}
        />
      ) : null}

      {step === 2 ? (
        <StepServico
          services={services}
          selectedId={serviceId}
          onSelect={handleSelectService}
          onBack={() => setStep(1)}
          headingRef={headingRef}
        />
      ) : null}

      {step === 3 ? (
        <StepDiaHora
          days={days}
          selectedDate={dateStr}
          onSelectDate={setDateStr}
          slots={slots}
          loadingSlots={loadingSlots}
          selectedSlotIso={selectedSlotIso}
          onSelectSlot={handleSelectSlot}
          onBack={() => setStep(2)}
          headingRef={headingRef}
        />
      ) : null}

      {step === 4 && selectedService && selectedSlot ? (
        <StepResumo
          slug={slug}
          service={selectedService}
          dayLabel={selectedDay?.label ?? ''}
          slot={selectedSlot}
          name={name}
          phone={phone}
          error={submitError}
          formAction={formAction}
          onBack={() => setStep(3)}
          headingRef={headingRef}
        />
      ) : null}

      {step === 'done' && state && 'ok' in state && state.ok ? (
        <SuccessScreen confirmed={state.status === 'CONFIRMED'} summary={state.summary} />
      ) : null}
    </div>
  );
}
