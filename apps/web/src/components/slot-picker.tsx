'use client';

import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { type AvailableSlot } from '@/lib/availability';
import { buildBookingDays, isoDateInTz, labelFromIso, type BookingDay } from '@/lib/booking-days';

// Seletor de dia + horário pré-definido pelo painel. Mesma lógica visual do
// agendamento público (carrossel de dias + calendário + grade de horários), mas
// genérico: recebe a função que carrega os slots (server action), então quem usa
// decide a regra (ex.: a remarcação exclui o próprio agendamento da colisão).
//
// Toda conta de data sai do fuso do TENANT (passado em `timezone`), nunca do
// browser - igual ao booking público.

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
 * Quebra o label do servidor ("sáb., 30/05") em duas linhas para o chip de dia.
 * Tolerante: se o formato mudar, cai no label inteiro como fallback.
 */
function splitDayLabel(label: string): { weekday: string; date: string } {
  const [rawWeekday, ...rest] = label.split(',');
  const date = rest.join(',').trim();
  if (!date) return { weekday: label.trim(), date: '' };
  return { weekday: rawWeekday.trim().replace(/\.$/, ''), date };
}

/**
 * Calendário de mês num Dialog. Permite pular pra qualquer dia da janela
 * [minDate, maxDate] que tenha expediente (`openWeekdays`). Tudo é comparação de
 * string "YYYY-MM-DD" - as datas-limite já vêm no fuso do tenant.
 */
function MonthCalendar({
  minDate,
  maxDate,
  openWeekdays,
  selectedDate,
  onSelect,
}: {
  minDate: string;
  maxDate: string;
  openWeekdays: number[];
  selectedDate: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const openSet = useMemo(() => new Set(openWeekdays), [openWeekdays]);

  const [view, setView] = useState(() => {
    const [y, m] = (selectedDate || minDate).split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  // Ao (re)abrir, reposiciona o mês na seleção atual.
  useEffect(() => {
    if (open) {
      const [y, m] = (selectedDate || minDate).split('-').map(Number);
      setView({ year: y, month: m - 1 });
    }
  }, [open, selectedDate, minDate]);

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

  // Grade do mês: UTC só pra contar dias/posição - nenhuma conversão de fuso.
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
          size="icon"
          aria-label="Abrir calendário"
          title="Escolher outra data"
        >
          <CalendarDays className="h-4 w-4" />
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
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : disabled
                      ? 'text-muted-foreground/40 cursor-not-allowed'
                      : 'hover:bg-accent text-foreground')
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

interface SlotPickerProps {
  /** Serviço escolhido - sem ele não há como saber a duração/grade. */
  serviceId: string;
  /** Fuso do tenant - toda conta de data sai dele, nunca do browser. */
  timezone: string;
  /** Dias-da-semana com expediente (0=domingo … 6=sábado). */
  openWeekdays: number[];
  /** Até quantos dias adiante oferecer. */
  horizonDays: number;
  /** Slot escolhido (ISO UTC) ou '' - controlado pelo pai. */
  value: string;
  onChange: (slotIso: string) => void;
  /** Carrega os horários livres do dia (server action injetada). */
  loadSlots: (serviceId: string, dateStr: string) => Promise<AvailableSlot[]>;
  /**
   * Dia inicial (YYYY-MM-DD no fuso do tenant) pré-selecionado ao montar - ex.:
   * o dia do horário atual na remarcação. Opcional.
   */
  initialDate?: string;
}

export function SlotPicker({
  serviceId,
  timezone,
  openWeekdays,
  horizonDays,
  value,
  onChange,
  loadSlots,
  initialDate,
}: SlotPickerProps) {
  const openWeekdaysSet = useMemo(() => new Set(openWeekdays), [openWeekdays]);
  const days = useMemo<BookingDay[]>(
    () => buildBookingDays(timezone, openWeekdaysSet, horizonDays),
    [timezone, openWeekdaysSet, horizonDays],
  );
  const minDate = useMemo(() => isoDateInTz(new Date(), timezone), [timezone]);
  const maxDate = useMemo(
    () => isoDateInTz(new Date(Date.now() + (horizonDays - 1) * 86_400_000), timezone),
    [timezone, horizonDays],
  );

  // Dia inicial só é válido se cair dentro da janela [hoje, hoje+horizonte].
  const [dateStr, setDateStr] = useState(() =>
    initialDate && initialDate >= minDate && initialDate <= maxDate ? initialDate : '',
  );
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, startLoading] = useTransition();

  // (Re)carrega slots quando serviço ou dia mudam. Limpa a seleção a cada troca:
  // mudar de dia recarrega tudo, então um horário que sumiu deixa de estar marcado.
  useEffect(() => {
    onChange('');
    if (!serviceId || !dateStr) {
      setSlots([]);
      return;
    }
    startLoading(async () => {
      const result = await loadSlots(serviceId, dateStr);
      setSlots(result);
    });
    // onChange/loadSlots são estáveis o bastante; só re-busca em serviço/dia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, dateStr]);

  // Rola o carrossel até o chip selecionado (ex.: quando vem do date-picker).
  const railRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!dateStr || !railRef.current) return;
    const chip = railRef.current.querySelector<HTMLElement>(`[data-day="${dateStr}"]`);
    chip?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [dateStr]);

  // Dia escolhido pelo calendário pode cair fora do carrossel contínuo; anexa um
  // chip-resumo no fim pra não ficar "selecionado mas invisível".
  const selectedDay = days.find((d) => d.value === dateStr) ?? null;
  const railDays =
    dateStr && !selectedDay
      ? [...days, { value: dateStr, label: labelFromIso(dateStr, timezone) }]
      : days;

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-foreground flex items-center gap-1.5 text-sm font-medium">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Escolha o dia
        </p>
        <MonthCalendar
          minDate={minDate}
          maxDate={maxDate}
          openWeekdays={openWeekdays}
          selectedDate={dateStr}
          onSelect={setDateStr}
        />
      </div>

      {/* Faixa horizontal rolável de chips de dia. */}
      <div
        ref={railRef}
        className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-2"
        role="radiogroup"
        aria-label="Escolha o dia"
      >
        {railDays.length === 0 ? (
          <p className="text-muted-foreground px-1 text-sm">Nenhuma data disponível.</p>
        ) : (
          railDays.map((day) => {
            const { weekday, date } = splitDayLabel(day.label);
            const isSelected = day.value === dateStr;
            return (
              <button
                key={day.value}
                type="button"
                role="radio"
                data-day={day.value}
                aria-checked={isSelected}
                aria-current={isSelected ? 'date' : undefined}
                aria-label={day.label}
                onClick={() => setDateStr(day.value)}
                className={
                  'focus-visible:ring-ring min-w-18 flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 ' +
                  (isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:border-primary/50')
                }
              >
                <span
                  className={
                    'text-[11px] font-medium uppercase ' +
                    (isSelected ? 'text-primary-foreground/90' : 'text-muted-foreground')
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
      <div className="space-y-2">
        <p className="text-foreground flex items-center gap-1.5 text-sm font-medium">
          <Clock className="h-4 w-4" aria-hidden="true" />
          Horários disponíveis
        </p>
        {!dateStr ? (
          <p className="bg-muted text-muted-foreground rounded-lg border p-4 text-sm">
            Selecione um dia para ver os horários.
          </p>
        ) : loading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-md" />
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
              const isSelected = slot.startsAtIso === value;
              return (
                <Button
                  key={slot.startsAtIso}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  aria-pressed={isSelected}
                  onClick={() => onChange(slot.startsAtIso)}
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
