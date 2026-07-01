'use client';

import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  PartyPopper,
  QrCode,
  Repeat,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { type AvailableSlot } from '@/lib/availability';
import { buildBookingDays, isoDateInTz, labelFromIso, type BookingDay } from '@/lib/booking-days';
import {
  formatBRL,
  formatDuration,
  formatPhoneBR,
  isValidCpfCnpj,
  maskCpfCnpjInput,
} from '@/lib/format';
import { RECURRENCE_OCCURRENCE_OPTIONS, type RecurrenceFrequency } from '@/lib/recurrence';

import {
  createPublicBooking,
  type CreatePublicBookingResult,
  getAvailableSlots,
  lookupContact,
} from './actions';
import { createPaymentForAppointment } from './payments-actions';

interface ServiceOption {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  /** Profissionais que atendem este serviço. */
  professionalIds: string[];
}

interface ProfessionalOption {
  id: string;
  name: string | null;
}

interface PublicBookingProps {
  slug: string;
  services: ServiceOption[];
  /** Profissionais com agenda - usados no passo "escolha o profissional". */
  professionals: ProfessionalOption[];
  /** Fuso do tenant - toda conta de data sai dele, nunca do browser. */
  timezone: string;
  /** Dias-da-semana com expediente (0=domingo … 6=sábado). */
  openWeekdays: number[];
  /** Até quantos dias adiante o agendamento é oferecido. */
  horizonDays: number;
}

/**
 * Passos do fluxo (curto: o cliente vê serviço e horário antes de dar qualquer
 * dado; o contato é pedido junto com a confirmação, no fim):
 *  0      - Vitrine de serviços (estado inicial).
 *  1      - Dia e horário.
 *  2      - Contato + resumo / confirmação.
 *  'done' - Tela de sucesso pós-submit.
 */
type Step = 0 | 1 | 2 | 'done';

type FrequencyChoice = 'NONE' | RecurrenceFrequency;

const FREQUENCY_LABELS: Record<FrequencyChoice, string> = {
  NONE: 'Uma vez',
  WEEKLY: 'Toda semana',
  BIWEEKLY: 'A cada 15 dias',
  MONTHLY: 'Todo mês',
};

const FREQUENCY_ORDER: FrequencyChoice[] = ['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'];

const TOTAL_STEPS = 3;

const STEP_TITLES: Record<Exclude<Step, 'done'>, string> = {
  0: 'Escolha o serviço',
  1: 'Escolha dia e horário',
  2: 'Confirme seus dados',
};

/** Número humano do passo (1..3) a partir do estado interno. */
const STEP_NUMBER: Record<Exclude<Step, 'done'>, 1 | 2 | 3> = {
  0: 1,
  1: 2,
  2: 3,
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

/** Indicador de progresso (bolinhas + texto), só para os passos do wizard. */
function ProgressDots({ step }: { step: Exclude<Step, 'done'> }) {
  const current = STEP_NUMBER[step];
  return (
    <div
      className="flex items-center justify-between gap-3"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-valuenow={current}
      aria-label={`Passo ${current} de ${TOTAL_STEPS}: ${STEP_TITLES[step]}`}
    >
      <div className="flex items-center gap-2" aria-hidden="true">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
          <span
            key={n}
            className={
              'h-2 w-2 rounded-full transition-colors ' +
              (n === current ? 'bg-coral' : n < current ? 'bg-coral/40' : 'bg-muted')
            }
          />
        ))}
      </div>
      <span className="text-muted-foreground text-xs font-medium">
        Passo {current} de {TOTAL_STEPS}
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
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1"
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

/** Botão de submit final - usa useFormStatus para o estado "pending". */
function ConfirmButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="coral"
      size="pill"
      className="w-full"
      disabled={pending || disabled}
      aria-busy={pending}
    >
      {pending ? 'Confirmando…' : 'Confirmar agendamento'}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Passo 0 - Vitrine de serviços (estado inicial)
// ---------------------------------------------------------------------------

function StepVitrine({
  services,
  onSelect,
  headingRef,
}: {
  services: ServiceOption[];
  onSelect: (service: ServiceOption) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        title={STEP_TITLES[0]}
        description="Toque no serviço que você quer agendar."
        headingRef={headingRef}
      />

      {services.length === 0 ? (
        <p className="bg-muted text-muted-foreground rounded-lg border p-4 text-sm">
          Nenhum serviço disponível no momento.
        </p>
      ) : (
        <ul className="space-y-3" aria-label="Serviços disponíveis">
          {services.map((service) => (
            <li key={service.id}>
              <button
                type="button"
                onClick={() => onSelect(service)}
                className="bg-card focus-visible:ring-ring hover:border-coral/50 w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2"
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
                    <span className="text-coral whitespace-nowrap font-semibold">
                      {formatBRL(service.priceCents)}
                    </span>
                    <ChevronRight className="text-muted-foreground h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date-picker de mês (acessível por qualquer dia futuro dentro do horizonte)
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
// Cabeçalho da grade começando no domingo (igual Date#getUTCDay()).
const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Pad de 2 dígitos sem locale. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "YYYY-MM-DD" de um trio civil (sem fuso - comparação pura de calendário). */
function ymd(year: number, month0: number, day: number): string {
  return `${year}-${pad2(month0 + 1)}-${pad2(day)}`;
}

/**
 * Calendário de mês num Dialog. Permite pular pra qualquer dia dentro da janela
 * [minDate, maxDate] que tenha expediente (`openWeekdays`). Tudo é comparação de
 * string "YYYY-MM-DD" - as datas-limite já vêm calculadas no fuso do tenant, então
 * o calendário nunca precisa do fuso do browser.
 */
function MonthCalendar({
  minDate,
  maxDate,
  openWeekdays,
  selectedDate,
  onSelect,
}: {
  /** Primeiro dia selecionável, "YYYY-MM-DD" (hoje no fuso do tenant). */
  minDate: string;
  /** Último dia selecionável, "YYYY-MM-DD" (hoje + horizonte). */
  maxDate: string;
  openWeekdays: number[];
  selectedDate: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const openSet = useMemo(() => new Set(openWeekdays), [openWeekdays]);

  // Mês exibido (0-based). Começa no mês da data selecionada (ou do mínimo).
  const [view, setView] = useState(() => {
    const [y, m] = (selectedDate || minDate).split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  // Ao (re)abrir, reposiciona o mês na seleção atual - sem prender o usuário no
  // mês onde ele estava navegando da última vez.
  useEffect(() => {
    if (open) {
      const [y, m] = (selectedDate || minDate).split('-').map(Number);
      setView({ year: y, month: m - 1 });
    }
  }, [open, selectedDate, minDate]);

  // Limites de navegação: não vira pra antes do mês de hoje nem depois do teto.
  const minYM = minDate.slice(0, 7);
  const maxYM = maxDate.slice(0, 7);
  const viewYM = `${view.year}-${pad2(view.month + 1)}`;
  const canPrev = viewYM > minYM;
  const canNext = viewYM < maxYM;

  function shiftMonth(delta: number) {
    setView((v) => {
      let y = v.year;
      let m = v.month + delta;
      if (m < 0) {
        m = 11;
        y -= 1;
      } else if (m > 11) {
        m = 0;
        y += 1;
      }
      return { year: y, month: m };
    });
  }

  // Grade do mês: usa UTC só pra contar dias/posição - nenhuma conversão de fuso.
  const firstWeekday = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay(); // 0=dom
  const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Abrir calendário"
          title="Escolher outra data"
        >
          <CalendarDays className="h-4 w-4" />
          Outras datas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs gap-4">
        <DialogHeader>
          <DialogTitle className="text-xl">Escolha o dia</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canPrev}
            aria-label="Mês anterior"
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">
            {MONTH_NAMES[view.month]} {view.year}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canNext}
            aria-label="Próximo mês"
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_INITIALS.map((w, i) => (
            <span key={i} className="text-muted-foreground py-1 text-xs font-medium">
              {w}
            </span>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <span key={`empty-${i}`} />;
            const value = ymd(view.year, view.month, day);
            const weekday = new Date(Date.UTC(view.year, view.month, day)).getUTCDay();
            const disabled = value < minDate || value > maxDate || !openSet.has(weekday);
            const isSelected = value === selectedDate;
            return (
              <button
                key={value}
                type="button"
                disabled={disabled}
                aria-label={value}
                aria-current={isSelected ? 'date' : undefined}
                onClick={() => {
                  onSelect(value);
                  setOpen(false);
                }}
                className={
                  'focus-visible:ring-ring flex aspect-square items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 ' +
                  (isSelected
                    ? 'bg-coral font-semibold text-white'
                    : disabled
                      ? 'text-muted-foreground/40 cursor-not-allowed'
                      : 'hover:bg-coral/10 text-foreground')
                }
              >
                {day}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Passo 2 - Dia / Hora
// ---------------------------------------------------------------------------

function StepDiaHora({
  days,
  timezone,
  minDate,
  maxDate,
  openWeekdays,
  selectedDate,
  onSelectDate,
  slots,
  loadingSlots,
  selectedSlotIso,
  onSelectSlot,
  notice,
  professionalPicker,
  onBack,
  headingRef,
}: {
  days: BookingDay[];
  /** Fuso do tenant - pra rotular um dia escolhido pelo date-picker. */
  timezone: string;
  /** Primeiro dia selecionável no calendário ("YYYY-MM-DD", fuso do tenant). */
  minDate: string;
  /** Último dia selecionável no calendário ("YYYY-MM-DD", fuso do tenant). */
  maxDate: string;
  openWeekdays: number[];
  selectedDate: string;
  onSelectDate: (value: string) => void;
  slots: AvailableSlot[];
  loadingSlots: boolean;
  selectedSlotIso: string;
  onSelectSlot: (slot: AvailableSlot) => void;
  /** Aviso opcional exibido no topo (ex.: horário escolhido expirou). */
  notice: string | null;
  /** Seletor de profissional (renderizado acima do calendário quando houver >1). */
  professionalPicker?: React.ReactNode;
  onBack: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  // Rola o carrossel até o chip escolhido (ex.: quando vem do date-picker).
  const railRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedDate || !railRef.current) return;
    const chip = railRef.current.querySelector<HTMLElement>(`[data-day="${selectedDate}"]`);
    chip?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [selectedDate]);

  // Dia escolhido pelo calendário pode cair fora do carrossel (sábado distante,
  // p.ex.). Nesse caso anexamos um chip-resumo no fim pra não ficar "selecionado
  // mas invisível" - `buildBookingDays` só inclui os dias da janela contínua.
  const selectedDay = days.find((d) => d.value === selectedDate) ?? null;
  const railDays =
    selectedDate && !selectedDay
      ? [...days, { value: selectedDate, label: labelFromIso(selectedDate, timezone), open: true }]
      : days;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <StepHeader title={STEP_TITLES[1]} onBack={onBack} headingRef={headingRef} />
        <div className="shrink-0 pt-7">
          <MonthCalendar
            minDate={minDate}
            maxDate={maxDate}
            openWeekdays={openWeekdays}
            selectedDate={selectedDate}
            onSelect={onSelectDate}
          />
        </div>
      </div>

      {professionalPicker}

      {/* Aviso quando o usuário foi trazido de volta por expiração de horário. */}
      {notice ? (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border p-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </p>
      ) : null}

      {/* Faixa horizontal rolável de chips de dia. */}
      <div
        ref={railRef}
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
        role="radiogroup"
        aria-label="Escolha o dia"
      >
        {railDays.length === 0 ? (
          <p className="text-muted-foreground px-1 text-sm">Nenhuma data disponível.</p>
        ) : (
          railDays.map((day) => {
            const { weekday, date } = splitDayLabel(day.label);
            const isSelected = day.value === selectedDate;
            const isClosed = !day.open;
            return (
              <button
                key={day.value}
                type="button"
                role="radio"
                data-day={day.value}
                disabled={isClosed}
                aria-checked={isSelected}
                aria-current={isSelected ? 'date' : undefined}
                aria-label={isClosed ? `${day.label} - sem atendimento` : day.label}
                onClick={isClosed ? undefined : () => onSelectDate(day.value)}
                className={
                  'focus-visible:ring-ring min-w-18 flex min-h-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-3 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 ' +
                  (isSelected
                    ? 'border-coral bg-coral text-white'
                    : isClosed
                      ? 'bg-muted/40 text-muted-foreground/50 cursor-not-allowed border-dashed'
                      : 'bg-card text-foreground hover:border-coral/50')
                }
              >
                <span
                  className={
                    'text-[11px] font-medium uppercase ' +
                    (isSelected
                      ? 'text-white/90'
                      : isClosed
                        ? 'text-muted-foreground/50'
                        : 'text-muted-foreground')
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
          {selectedDate ? (
            <span className="text-muted-foreground font-normal capitalize">
              · {railDays.find((d) => d.value === selectedDate)?.label ?? selectedDate}
            </span>
          ) : null}
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
                  className="h-11"
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
// Passo 2 - Contato + resumo / confirmação (form de submit real)
// ---------------------------------------------------------------------------

function StepConfirmar({
  slug,
  service,
  professionalId,
  dayLabel,
  slot,
  name,
  onChangeName,
  phone,
  onChangePhone,
  lookingUp,
  frequency,
  occurrences,
  onChangeFrequency,
  onChangeOccurrences,
  error,
  formAction,
  onBack,
  headingRef,
}: {
  slug: string;
  service: ServiceOption;
  /** Profissional escolhido ('' = sem preferência). Vai no submit. */
  professionalId: string;
  dayLabel: string;
  slot: AvailableSlot;
  name: string;
  onChangeName: (value: string) => void;
  phone: string;
  onChangePhone: (digits: string) => void;
  /** true enquanto o lookup automático do nome está em andamento. */
  lookingUp: boolean;
  frequency: FrequencyChoice;
  occurrences: number;
  onChangeFrequency: (f: FrequencyChoice) => void;
  onChangeOccurrences: (n: number) => void;
  error: string | null;
  formAction: (formData: FormData) => void;
  onBack: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const phoneOk = phone.length >= 10;
  const nameOk = name.trim().length >= 2;

  return (
    <div className="space-y-6">
      <StepHeader title={STEP_TITLES[2]} onBack={onBack} headingRef={headingRef} />

      {/* Resumo do que já foi escolhido (serviço + dia/hora), só leitura. */}
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
      </dl>

      {/* Recorrência é propriedade do próprio agendamento - fica junto do resumo
          (lei da proximidade), antes de pedir contato ou oferecer conta. */}
      <div className="space-y-3">
        <p className="text-foreground flex items-center gap-1.5 text-sm font-medium">
          <Repeat className="h-4 w-4" aria-hidden="true" />
          Repetir agendamento?
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Repetição">
          {FREQUENCY_ORDER.map((f) => (
            <Button
              key={f}
              type="button"
              variant={frequency === f ? 'coral' : 'outline'}
              size="sm"
              aria-pressed={frequency === f}
              onClick={() => onChangeFrequency(f)}
            >
              {FREQUENCY_LABELS[f]}
            </Button>
          ))}
        </div>
        {frequency !== 'NONE' ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Quantas vezes no total?</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Número de ocorrências">
              {RECURRENCE_OCCURRENCE_OPTIONS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={occurrences === n ? 'coral' : 'outline'}
                  size="sm"
                  aria-pressed={occurrences === n}
                  onClick={() => onChangeOccurrences(n)}
                >
                  {n}×
                </Button>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Pulamos automaticamente datas sem horário livre (até 90 dias).
            </p>
          </div>
        ) : null}
      </div>

      {/* Contato: só agora pedimos os dados, já preenchidos com o que houver salvo. */}
      <div className="space-y-4">
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
            Pra confirmar o agendamento pelo WhatsApp. Inclua o DDD.
          </p>
        </div>

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
      </div>

      {/* Convite opcional pra criar conta - não bloqueia o agendamento (o guest é o
          caminho principal). Abre em nova aba pra não perder o que já foi preenchido;
          a sessão é compartilhada por cookie, então ao confirmar aqui o agendamento já
          vincula à conta recém-criada (mesmo WhatsApp). */}
      <div className="border-green/20 bg-accent space-y-3 rounded-xl border p-4">
        <p className="text-foreground flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="text-green h-4 w-4 shrink-0" aria-hidden="true" />
          Quer agilizar da próxima vez?
        </p>
        <ul className="text-muted-foreground space-y-1 text-xs">
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="text-green mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Não precisa digitar nome e WhatsApp toda vez
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="text-green mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Receba lembretes e confirmações no WhatsApp
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="text-green mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Acompanhe, remarque ou cancele quando quiser
          </li>
        </ul>
        <Button asChild size="sm" className="w-full">
          <Link
            href={phone ? `/conta/criar?phone=${encodeURIComponent(phone)}` : '/conta/criar'}
            target="_blank"
            rel="noopener noreferrer"
          >
            <UserIcon className="h-4 w-4" />
            Criar minha conta
          </Link>
        </Button>
        <p className="text-muted-foreground text-center text-[11px]">
          É opcional - dá pra agendar sem conta.
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="serviceId" value={service.id} />
        <input type="hidden" name="professionalId" value={professionalId} />
        <input type="hidden" name="slotIso" value={slot.startsAtIso} />
        <input type="hidden" name="name" value={name.trim()} />
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="frequency" value={frequency} />
        {frequency !== 'NONE' ? (
          <input type="hidden" name="occurrences" value={occurrences} />
        ) : null}

        {error ? (
          <p
            role="alert"
            className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm"
          >
            {error}
          </p>
        ) : null}

        <ConfirmButton disabled={!phoneOk || !nameOk || lookingUp} />
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tela de sucesso
// ---------------------------------------------------------------------------

/**
 * Convite pra criar a área do cliente, com o telefone usado pré-preenchido (vira o
 * elo que liga a conta aos agendamentos). Aparece ao fim de cada agendamento.
 */
function CreateAccountCta({ phone }: { phone: string }) {
  const href = phone ? `/conta/criar?phone=${encodeURIComponent(phone)}` : '/conta/criar';
  return (
    <div className="space-y-2 border-t pt-4 text-center">
      <p className="text-muted-foreground text-sm">
        Crie sua conta e não digite nome e WhatsApp toda vez - receba lembretes e acompanhe,
        remarque ou cancele quando quiser.
      </p>
      <Button asChild variant="outline" size="pill">
        <Link href={href}>
          <UserIcon className="h-4 w-4" />
          Criar minha conta
        </Link>
      </Button>
    </div>
  );
}

function SuccessScreen({
  confirmed,
  summary,
  slug,
  appointmentId,
  paymentAvailable,
  phone,
}: {
  confirmed: boolean;
  summary: string;
  slug: string;
  appointmentId: string;
  paymentAvailable: boolean;
  phone: string;
}) {
  return (
    <div className="space-y-5 text-center">
      <div className="flex justify-center">
        {confirmed ? (
          <CheckCircle2 className="text-green h-12 w-12" aria-hidden="true" />
        ) : (
          <PartyPopper className="text-coral h-12 w-12" aria-hidden="true" />
        )}
      </div>
      <div className="space-y-2">
        <h2 className="text-foreground font-serif text-2xl">
          {confirmed ? 'Agendamento confirmado!' : 'Horário reservado!'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {confirmed
            ? 'Está tudo certo! Enviamos os detalhes no seu WhatsApp e te esperamos no horário.'
            : 'Seu horário já está reservado. O estabelecimento confirma pelo WhatsApp - você não precisa fazer mais nada.'}
        </p>
      </div>
      <p className="bg-card text-foreground whitespace-pre-line rounded-xl border p-4 text-left text-sm">
        {summary}
      </p>

      {paymentAvailable ? <PaymentBlock slug={slug} appointmentId={appointmentId} /> : null}

      <CreateAccountCta phone={phone} />
    </div>
  );
}

/**
 * Tela de sucesso de uma série recorrente: mostra quantas ocorrências entraram e
 * quais datas foram puladas (horário ocupado / fora do expediente). Não oferece
 * pagamento online (cobrança de série fica fora de escopo nesta versão).
 */
function SeriesSuccessScreen({
  confirmed,
  summary,
  createdCount,
  skipped,
  beyondHorizon,
  timezone,
  phone,
}: {
  confirmed: boolean;
  summary: string;
  createdCount: number;
  skipped: string[];
  beyondHorizon: number;
  timezone: string;
  phone: string;
}) {
  const skippedFmt = skipped.map((iso) =>
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso)),
  );
  return (
    <div className="space-y-5 text-center">
      <div className="flex justify-center">
        {confirmed ? (
          <CheckCircle2 className="text-green h-12 w-12" aria-hidden="true" />
        ) : (
          <PartyPopper className="text-coral h-12 w-12" aria-hidden="true" />
        )}
      </div>
      <div className="space-y-2">
        <h2 className="text-foreground font-serif text-2xl">
          {confirmed ? 'Agendamentos confirmados!' : 'Horários reservados!'}
        </h2>
        <p className="text-muted-foreground text-sm">
          Criamos {createdCount} {createdCount === 1 ? 'agendamento' : 'agendamentos'} recorrente
          {createdCount === 1 ? '' : 's'}. Enviamos os detalhes no seu WhatsApp.
        </p>
      </div>
      <p className="bg-card text-foreground whitespace-pre-line rounded-xl border p-4 text-left text-sm">
        A partir de {summary}
      </p>
      {skippedFmt.length > 0 ? (
        <div className="bg-muted text-muted-foreground rounded-xl border p-4 text-left text-sm">
          <p className="text-foreground font-medium">
            Pulamos {skippedFmt.length}{' '}
            {skippedFmt.length === 1 ? 'data sem horário livre' : 'datas sem horário livre'}:
          </p>
          <ul className="mt-1 list-inside list-disc">
            {skippedFmt.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {beyondHorizon > 0 ? (
        <p className="text-muted-foreground text-xs">
          {beyondHorizon} {beyondHorizon === 1 ? 'data ficou' : 'datas ficaram'} além do limite de
          90 dias.
        </p>
      ) : null}

      <CreateAccountCta phone={phone} />
    </div>
  );
}

/**
 * Bloco de pagamento opcional na tela de sucesso. Gera a cobrança sob demanda
 * (Pix mostra QR + copia-e-cola; cartão abre o checkout hospedado do gateway).
 * Não bloqueia a agenda - pagamento é opcional.
 */
function PaymentBlock({ slug, appointmentId }: { slug: string; appointmentId: string }) {
  const [paying, startPaying] = useTransition();
  const [pix, setPix] = useState<{ qrCode: string | null; copyPaste: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // CPF do pagador: só aparece quando o servidor pede (`needsDocument`). Cliente
  // recorrente com documento já salvo paga sem nunca ver o campo.
  const [document, setDocument] = useState('');
  const [askDocument, setAskDocument] = useState(false);
  const documentRef = useRef<HTMLInputElement>(null);

  // Foca o campo de CPF assim que ele aparece (após o servidor pedir o documento).
  useEffect(() => {
    if (askDocument) documentRef.current?.focus();
  }, [askDocument]);

  function pay(method: 'PIX' | 'CREDIT_CARD') {
    if (paying) return;
    // Se já estamos pedindo o CPF, valida localmente antes de ir ao servidor.
    if (askDocument && !isValidCpfCnpj(document)) {
      setError('CPF inválido. Confira os números e tente de novo.');
      documentRef.current?.focus();
      return;
    }
    setError(null);
    startPaying(async () => {
      const result = await createPaymentForAppointment(
        slug,
        appointmentId,
        method,
        document || undefined,
      );
      if ('error' in result) {
        setError(result.error);
        if (result.needsDocument) setAskDocument(true);
        return;
      }
      if (method === 'PIX') {
        setPix({ qrCode: result.pixQrCode, copyPaste: result.pixCopyPaste });
      } else if (result.checkoutUrl) {
        window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
      } else {
        setError('Não foi possível abrir o pagamento. Tente novamente.');
      }
    });
  }

  return (
    <div className="bg-card space-y-4 rounded-xl border p-4 text-left">
      <div>
        <p className="text-foreground text-sm font-medium">Pagamento</p>
        <p className="text-muted-foreground text-xs">
          Opcional - você pode pagar agora ou no dia do atendimento.
        </p>
      </div>

      {/* Campo de CPF: surge quando o gateway exige documento do pagador. */}
      {askDocument && !pix ? (
        <div className="space-y-1.5">
          <Label htmlFor="payment-document">CPF</Label>
          <Input
            id="payment-document"
            ref={documentRef}
            name="payment-document"
            type="text"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={maskCpfCnpjInput(document)}
            onChange={(e) => setDocument(e.target.value.replace(/\D/g, '').slice(0, 14))}
            aria-invalid={document.length > 0 && !isValidCpfCnpj(document)}
            aria-describedby="payment-document-hint"
          />
          <p id="payment-document-hint" className="text-muted-foreground text-xs">
            Necessário para gerar o pagamento.
          </p>
        </div>
      ) : null}

      {pix ? (
        <div className="space-y-3">
          {pix.qrCode ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pix.qrCode}
              alt="QR Code do Pix"
              className="mx-auto h-48 w-48 rounded-lg border bg-white p-2"
            />
          ) : null}
          {pix.copyPaste ? (
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Pix copia e cola</Label>
              <div className="flex items-center gap-2">
                <code className="bg-muted flex-1 break-all rounded px-2 py-1 text-xs">
                  {pix.copyPaste}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    if (!pix.copyPaste) return;
                    navigator.clipboard.writeText(pix.copyPaste).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    });
                  }}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </div>
          ) : null}
          <p className="text-muted-foreground text-xs">
            Após o pagamento, a confirmação chega automaticamente. Você já pode fechar esta tela.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="coral"
            className="flex-1"
            disabled={paying}
            onClick={() => pay('PIX')}
          >
            <QrCode className="mr-2 h-4 w-4" />
            {paying ? 'Gerando…' : 'Pagar com Pix'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={paying}
            onClick={() => pay('CREDIT_CARD')}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Pagar com cartão
          </Button>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente raiz - máquina de estados
// ---------------------------------------------------------------------------

// Contato salvo no dispositivo pra não redigitar WhatsApp/nome a cada agendamento.
// localStorage (não cookie): o dado só interessa ao cliente, não precisa ir pro
// servidor. Chave global (sem o slug) porque a pessoa usa o mesmo número em
// qualquer negócio Demandaê.
const CONTACT_STORAGE_KEY = 'demandae:booking-contact';

type SavedContact = { phone: string; name: string };

function readSavedContact(): SavedContact | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONTACT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedContact>;
    const phone =
      typeof parsed.phone === 'string' ? parsed.phone.replace(/\D/g, '').slice(0, 13) : '';
    if (phone.length < 10) return null;
    return { phone, name: typeof parsed.name === 'string' ? parsed.name : '' };
  } catch {
    // localStorage indisponível (modo privado / cota) ou JSON corrompido - ignora.
    return null;
  }
}

function saveContact(contact: SavedContact) {
  if (typeof window === 'undefined') return;
  try {
    const phone = contact.phone.replace(/\D/g, '').slice(0, 13);
    if (phone.length < 10) return;
    window.localStorage.setItem(
      CONTACT_STORAGE_KEY,
      JSON.stringify({ phone, name: contact.name.trim() }),
    );
  } catch {
    // localStorage indisponível (modo privado / cota) - ignora.
  }
}

export function PublicBooking({
  slug,
  services,
  professionals,
  timezone,
  openWeekdays,
  horizonDays,
}: PublicBookingProps) {
  const [step, setStep] = useState<Step>(0);

  // Dias atendíveis (carrossel) + janela do date-picker, gerados no fuso do tenant.
  // openWeekdays nunca muda, então memoiza o Set; os dias só dependem dele e do
  // horizonte. min/max são "hoje" e "hoje + horizonte" no fuso do tenant.
  const openWeekdaysSet = useMemo(() => new Set(openWeekdays), [openWeekdays]);
  const days = useMemo(
    () => buildBookingDays(timezone, openWeekdaysSet, horizonDays),
    [timezone, openWeekdaysSet, horizonDays],
  );
  const minDate = useMemo(() => isoDateInTz(new Date(), timezone), [timezone]);
  const maxDate = useMemo(
    () => isoDateInTz(new Date(Date.now() + (horizonDays - 1) * 86_400_000), timezone),
    [timezone, horizonDays],
  );

  // Serviço escolhido (passo 0).
  const [serviceId, setServiceId] = useState('');
  // Profissional escolhido no passo 1 (dia/hora). '' = sem preferência (sistema atribui).
  const [professionalId, setProfessionalId] = useState('');

  // Contato (pedido só no passo final). phone = dígitos crus.
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [lookingUp, startLookup] = useTransition();
  // Último telefone já consultado, pra não repetir o lookup automático do nome.
  const lookedUpPhoneRef = useRef('');

  // Pré-preenche o contato salvo de um agendamento anterior (mesmo dispositivo).
  // Roda só no mount, via effect, pra não causar mismatch de hidratação (o SSR
  // não tem acesso ao localStorage). O usuário começa no passo 0 (vitrine), então
  // o campo de contato já chega preenchido quando ele avança pro passo 1.
  useEffect(() => {
    const saved = readSavedContact();
    if (!saved) return;
    setPhone(saved.phone);
    if (saved.name) setName(saved.name);
  }, []);

  // Auto-preenche o nome de quem já é cliente assim que o telefone fica válido -
  // sem o campo de nome "aparecer do nada". Não sobrescreve o que o cliente já
  // tiver digitado (ou preenchido a partir do dispositivo).
  useEffect(() => {
    if (phone.length < 10 || name.trim()) return;
    if (lookedUpPhoneRef.current === phone) return;
    lookedUpPhoneRef.current = phone;
    startLookup(async () => {
      try {
        const result = await lookupContact(slug, phone);
        if (result.exists && result.name) {
          setName((cur) => (cur.trim() ? cur : (result.name as string)));
        }
      } catch {
        // Erro de rede: silencioso - o cliente preenche o nome manualmente.
      }
    });
  }, [phone, name, slug]);

  // Passo 1 - dia / hora
  const [dateStr, setDateStr] = useState('');
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlotIso, setSelectedSlotIso] = useState('');
  const [loadingSlots, startLoadingSlots] = useTransition();
  // Aviso exibido no passo 1 quando o usuário é trazido de volta por expiração
  // do horário/serviço que tinha escolhido (em vez de pular de tela em silêncio).
  const [expiryNotice, setExpiryNotice] = useState<string | null>(null);

  // Recorrência (opcional, no passo de confirmação). 'NONE' = agendamento único.
  const [frequency, setFrequency] = useState<FrequencyChoice>('NONE');
  const [occurrences, setOccurrences] = useState(4);

  const [state, formAction] = useActionState<CreatePublicBookingResult, FormData>(
    createPublicBooking,
    undefined,
  );

  // Foco gerenciado: ao TROCAR de passo, leva o foco pro título do passo. Pula
  // o primeiro efeito (mount) pra não roubar o foco do usuário na vitrine.
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
  // Profissionais que atendem o serviço escolhido. O seletor só aparece com >1.
  const serviceProfs = useMemo(
    () =>
      selectedService
        ? professionals.filter((p) => selectedService.professionalIds.includes(p.id))
        : [],
    [professionals, selectedService],
  );
  const showProfPicker = serviceProfs.length > 1;
  // Rótulo do dia escolhido pro resumo. Usa o do carrossel quando existe; senão
  // (dia vindo do date-picker, fora dos chips) rotula a data ISO no fuso do tenant.
  const selectedDayLabel = useMemo(() => {
    if (!dateStr) return '';
    return days.find((d) => d.value === dateStr)?.label ?? labelFromIso(dateStr, timezone);
  }, [days, dateStr, timezone]);
  const selectedSlot = useMemo(
    () => slots.find((s) => s.startsAtIso === selectedSlotIso) ?? null,
    [slots, selectedSlotIso],
  );

  // Busca slots sempre que serviço + dia estiverem escolhidos. Reseta o slot
  // selecionado a cada mudança - trocar de dia ou de serviço (voltando atrás)
  // recarrega tudo, então um horário que expirou some da grade na re-busca.
  useEffect(() => {
    setSelectedSlotIso('');
    if (!serviceId || !dateStr) {
      setSlots([]);
      return;
    }
    startLoadingSlots(async () => {
      const result = await getAvailableSlots(slug, serviceId, dateStr, professionalId || undefined);
      setSlots(result);
    });
  }, [slug, serviceId, dateStr, professionalId]);

  // Sucesso do submit → tela final. Salva o contato pra pré-preencher no próximo
  // agendamento feito deste dispositivo.
  useEffect(() => {
    if (state && 'ok' in state && state.ok) {
      saveContact({ phone, name });
      setStep('done');
    }
  }, [state]);

  const submitError = state && 'error' in state ? state.error : null;

  // Robustez: se chegamos no passo 2 (confirmação) mas o slot/serviço escolhido
  // sumiu (ex.: a re-busca o removeu por ter expirado), volta pro passo 1 pra
  // reescolher. Não dispara durante uma re-busca em andamento (loadingSlots) nem
  // após o sucesso (step vira 'done'), evitando bounce indevido antes do sucesso.
  // Diferente do bounce silencioso: avisa o usuário POR QUÊ ele voltou de tela.
  useEffect(() => {
    if (step === 2 && !loadingSlots && (!selectedService || !selectedSlot)) {
      setExpiryNotice('Esse horário não está mais disponível. Escolha outro, por favor.');
      setStep(1);
    }
  }, [step, loadingSlots, selectedService, selectedSlot]);

  // --- Transições explícitas --------------------------------------------------

  function handleSelectService(service: ServiceOption) {
    setServiceId(service.id);
    // Troca de serviço pode mudar quem atende: volta pra "sem preferência".
    setProfessionalId('');
    // Vai direto pro dia/hora: o cliente vê os horários antes de dar qualquer dado.
    setStep(1);
  }

  /** Escolher um dia limpa o aviso de expiração (o usuário já está reescolhendo). */
  function handleSelectDate(value: string) {
    setExpiryNotice(null);
    setDateStr(value);
  }

  function handleSelectSlot(slot: AvailableSlot) {
    setExpiryNotice(null);
    setSelectedSlotIso(slot.startsAtIso);
    setStep(2);
  }

  // --- Render -----------------------------------------------------------------

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      {step !== 'done' && step !== 0 ? <ProgressDots step={step} /> : null}

      {step === 0 ? (
        <StepVitrine services={services} onSelect={handleSelectService} headingRef={headingRef} />
      ) : null}

      {step === 1 ? (
        <StepDiaHora
          days={days}
          timezone={timezone}
          minDate={minDate}
          maxDate={maxDate}
          openWeekdays={openWeekdays}
          selectedDate={dateStr}
          onSelectDate={handleSelectDate}
          slots={slots}
          loadingSlots={loadingSlots}
          selectedSlotIso={selectedSlotIso}
          onSelectSlot={handleSelectSlot}
          notice={expiryNotice}
          professionalPicker={
            showProfPicker ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="public-professional"
                  className="text-foreground text-sm font-medium"
                >
                  Profissional
                </label>
                <select
                  id="public-professional"
                  className="border-input focus-visible:ring-ring bg-card flex h-10 w-full rounded-lg border px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2"
                  value={professionalId}
                  onChange={(e) => {
                    setExpiryNotice(null);
                    setProfessionalId(e.target.value);
                  }}
                >
                  <option value="">Sem preferência</option>
                  {serviceProfs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name ?? 'Profissional'}
                    </option>
                  ))}
                </select>
              </div>
            ) : null
          }
          onBack={() => setStep(0)}
          headingRef={headingRef}
        />
      ) : null}

      {step === 2 && selectedService && selectedSlot ? (
        <StepConfirmar
          slug={slug}
          service={selectedService}
          professionalId={professionalId}
          dayLabel={selectedDayLabel}
          slot={selectedSlot}
          name={name}
          onChangeName={setName}
          phone={phone}
          onChangePhone={setPhone}
          lookingUp={lookingUp}
          frequency={frequency}
          occurrences={occurrences}
          onChangeFrequency={setFrequency}
          onChangeOccurrences={setOccurrences}
          error={submitError}
          formAction={formAction}
          onBack={() => setStep(1)}
          headingRef={headingRef}
        />
      ) : null}

      {step === 'done' && state && 'ok' in state && state.ok ? (
        'series' in state ? (
          <SeriesSuccessScreen
            confirmed={state.status === 'CONFIRMED'}
            summary={state.summary}
            createdCount={state.createdCount}
            skipped={state.skipped}
            beyondHorizon={state.beyondHorizon}
            timezone={timezone}
            phone={phone}
          />
        ) : (
          <SuccessScreen
            confirmed={state.status === 'CONFIRMED'}
            summary={state.summary}
            slug={slug}
            appointmentId={state.appointmentId}
            paymentAvailable={state.paymentAvailable}
            phone={phone}
          />
        )
      ) : null}
    </div>
  );
}
