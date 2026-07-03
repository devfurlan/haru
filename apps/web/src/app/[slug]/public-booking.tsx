'use client';

import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  PartyPopper,
  Pencil,
  QrCode,
  Repeat,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useFormStatus } from 'react-dom';

import { CustomerSignupForm } from '@/app/(customer)/conta/(public)/criar/signup-form';
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
import { cn } from '@/lib/utils';
import { type AvailableSlotWithProfessionals } from '@haru/shared';
import { buildBookingDays, isoDateInTz, labelFromIso, type BookingDay } from '@haru/shared';
import {
  formatBRL,
  formatDuration,
  formatPhoneBR,
  isValidCpfCnpj,
  maskCpfCnpjInput,
} from '@haru/shared';
import { RECURRENCE_OCCURRENCE_OPTIONS, type RecurrenceFrequency } from '@/lib/recurrence';

import {
  createPublicBooking,
  type CreatePublicBookingResult,
  getAvailableSlots,
  lookupContact,
} from './actions';
import { createPaymentForAppointment } from './payments-actions';

type AvailableSlot = AvailableSlotWithProfessionals;

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
  /** Nome do negócio - mostrado no hero (passo vitrine) e no cabeçalho compacto. */
  tenantName: string;
  /** Logo do negócio (opcional) - hero + card de sucesso. */
  logoUrl: string | null;
  services: ServiceOption[];
  /** Profissionais com agenda - usados no passo "profissional e serviço". */
  professionals: ProfessionalOption[];
  /** Fuso do tenant - toda conta de data sai dele, nunca do browser. */
  timezone: string;
  /** Dias-da-semana com expediente (0=domingo … 6=sábado). */
  openWeekdays: number[];
  /** Até quantos dias adiante o agendamento é oferecido. */
  horizonDays: number;
  /** Cliente já chegou logado (sessão de CustomerAccount no servidor). */
  loggedIn: boolean;
  /** Nome da conta logada, pra saudar e pré-preencher - null quando convidado. */
  customerName: string | null;
  /** Telefone da conta (confirmado ou pendente), pra pré-preencher - null se convidado. */
  customerPhone: string | null;
}

/**
 * Passos do fluxo, espelhando o app mobile (o cliente vê serviço, profissional e
 * horário antes de dar qualquer dado; o contato vem junto da confirmação, no fim):
 *  'vitrine' - Capa (hero) + lista de serviços.
 *  'select'  - Profissional (avatares) + serviço (radio). Pulado se não há profissionais.
 *  'slot'    - Dia + horário.
 *  'contact' - Contato + resumo / recorrência / conta / confirmação.
 *  'done'    - Tela de sucesso animada.
 */
type Step = 'vitrine' | 'select' | 'slot' | 'contact' | 'done';

type FrequencyChoice = 'NONE' | RecurrenceFrequency;

const FREQUENCY_LABELS: Record<FrequencyChoice, string> = {
  NONE: 'Uma vez',
  WEEKLY: 'Toda semana',
  BIWEEKLY: 'A cada 15 dias',
  MONTHLY: 'Todo mês',
};

const FREQUENCY_ORDER: FrequencyChoice[] = ['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'];

/** "15:30" -> "15h30"; "14:00" -> "14h" (formato do app mobile). */
function fmtTime(hhmm: string): string {
  return hhmm.replace(':', 'h').replace(/h00$/, 'h');
}

/** "45 min · só Téo" / "50 min · Téo, Ana" - duração + quem atende (igual mobile). */
function serviceMeta(s: ServiceOption, professionals: ProfessionalOption[]): string {
  const names = s.professionalIds
    .map((id) => professionals.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n);
  const pros = names.length === 1 ? `só ${names[0]}` : names.join(', ');
  return `${formatDuration(s.durationMinutes)}${pros ? ` · ${pros}` : ''}`;
}

/** "Sáb, 15h30 · com Téo" pro rodapé do passo de horário (fuso do tenant). */
function buildSlotSummary(
  slot: AvailableSlot,
  professionals: ProfessionalOption[],
  timezone: string,
): string {
  const wdRaw = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, weekday: 'short' })
    .format(new Date(slot.startsAtIso))
    .replace('.', '');
  const wd = wdRaw.charAt(0).toUpperCase() + wdRaw.slice(1);
  const time = fmtTime(slot.label);
  const proId = slot.professionalIds?.[0];
  const proName = proId ? (professionals.find((p) => p.id === proId)?.name ?? null) : null;
  return `${wd}, ${time}${proName ? ` · com ${proName}` : ''}`;
}

/**
 * Quebra o label do servidor ("sáb., 30/05") em weekday + data para as células.
 * Tolerante: se o formato mudar, cai no label inteiro.
 */
function splitDayLabel(label: string): { weekday: string; date: string } {
  const [rawWeekday, ...rest] = label.split(',');
  const date = rest.join(',').trim();
  if (!date) return { weekday: label.trim(), date: '' };
  return { weekday: rawWeekday.trim().replace(/\.$/, ''), date };
}

// ---------------------------------------------------------------------------
// Ícones inline (SVG) portados do app mobile
// ---------------------------------------------------------------------------

/** "Duas pessoas" - avatar "Qualquer" profissional + ícone do card de serviço. */
function PeopleIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx={9} cy={8} r={3.2} stroke="#2fd37a" strokeWidth={2} />
      <circle cx={16} cy={8} r={3.2} stroke="#2fd37a" strokeWidth={2} />
      <path
        d="M3 19c0-3 2.7-5 6-5M13 19c0-3 2.7-5 6-5"
        stroke="#2fd37a"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Chrome dos passos (hero, cabeçalho compacto, rodapé sticky)
// ---------------------------------------------------------------------------

/** Capa do negócio no topo do passo vitrine (fundo esmeralda + nome em Fraunces). */
function Hero({ tenantName, logoUrl }: { tenantName: string; logoUrl: string | null }) {
  return (
    <div className="bg-green-deep relative flex min-h-40 flex-col justify-end overflow-hidden rounded-2xl px-5 pb-5 pt-6">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="mb-3 h-12 w-12 rounded-2xl object-cover ring-1 ring-white/15"
        />
      ) : null}
      <h1 className="text-paper font-serif text-3xl leading-tight tracking-[-0.01em]">
        {tenantName}
      </h1>
    </div>
  );
}

/** Cabeçalho compacto (voltar + nome + subtítulo + barra de progresso opcional). */
function StepChrome({
  tenantName,
  subtitle,
  progress,
  onBack,
  headingRef,
}: {
  tenantName: string;
  subtitle: string;
  /** 50 ou 100 pra mostrar a barra; null pra escondê-la. */
  progress: number | null;
  onBack: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="bg-card focus-visible:ring-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform focus-visible:outline-none focus-visible:ring-2 active:scale-95"
        >
          <ChevronLeft className="text-green-deep h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-foreground truncate text-sm font-semibold outline-none"
          >
            {tenantName}
          </h2>
          <p className="text-muted-foreground text-[11.5px]">{subtitle}</p>
        </div>
      </div>
      {progress != null ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-[#e6dcc6]">
          <div
            className="bg-green-bright h-full rounded-full transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Barra de ação fixada na base (resumo corrente + CTA), como no app mobile. */
function StickyFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background sticky bottom-0 z-10 mt-5 flex items-center gap-3.5 border-t pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-10px_28px_-18px_rgba(10,51,36,0.45)]">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Passo vitrine - hero + lista de serviços
// ---------------------------------------------------------------------------

function StepVitrine({
  tenantName,
  logoUrl,
  services,
  lowestPrice,
  onSelectService,
  onQuickBook,
}: {
  tenantName: string;
  logoUrl: string | null;
  services: ServiceOption[];
  lowestPrice: number | null;
  onSelectService: (service: ServiceOption) => void;
  onQuickBook: () => void;
}) {
  return (
    <>
      <div className="space-y-5">
        <Hero tenantName={tenantName} logoUrl={logoUrl} />

        {services.length === 0 ? (
          <p className="bg-muted text-muted-foreground rounded-xl border p-4 text-sm">
            Nenhum serviço disponível no momento.
          </p>
        ) : (
          <div className="space-y-2.5">
            <p className="text-foreground font-serif text-lg">Serviços</p>
            <ul className="space-y-2.5" aria-label="Serviços disponíveis">
              {services.map((service) => (
                <li key={service.id}>
                  <button
                    type="button"
                    onClick={() => onSelectService(service)}
                    className="bg-card focus-visible:ring-ring hover:border-coral/40 flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-[transform,border-color] focus-visible:outline-none focus-visible:ring-2 active:scale-[0.99]"
                  >
                    <div className="min-w-0">
                      <p className="text-foreground text-[15px] font-semibold">{service.name}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {formatDuration(service.durationMinutes)}
                      </p>
                      {service.description ? (
                        <p className="text-muted-foreground mt-1 text-sm leading-5">
                          {service.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-green-deep shrink-0 font-serif text-lg">
                      {formatBRL(service.priceCents)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {services.length > 0 && lowestPrice != null ? (
        <StickyFooter>
          <div>
            <p className="text-muted-foreground text-[11.5px]">a partir de</p>
            <p className="text-foreground font-serif text-2xl">{formatBRL(lowestPrice)}</p>
          </div>
          <Button
            type="button"
            variant="coral"
            size="pill"
            className="flex-1 active:scale-[0.98]"
            onClick={onQuickBook}
          >
            Agendar
          </Button>
        </StickyFooter>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Passo select - profissional (avatares) + serviço (radio)
// ---------------------------------------------------------------------------

/** Avatar de profissional (quadrado esmeralda). Selecionado = borda coral. */
function ProAvatar({
  selected,
  onClick,
  label,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-95"
    >
      <span
        className={cn(
          'bg-green-deep flex h-[60px] w-[60px] items-center justify-center rounded-[18px] border-2',
          selected ? 'border-coral' : 'border-transparent',
        )}
      >
        {children}
      </span>
      <span
        className={cn(
          'max-w-[64px] truncate text-xs',
          selected ? 'text-foreground font-semibold' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </button>
  );
}

function StepSelect({
  tenantName,
  services,
  serviceProfs,
  serviceId,
  professionalId,
  professionalLabel,
  onPickProfessional,
  onPickService,
  onBack,
  onContinue,
  headingRef,
  professionals,
}: {
  tenantName: string;
  services: ServiceOption[];
  /** Profissionais que atendem o serviço escolhido (avatares). */
  serviceProfs: ProfessionalOption[];
  serviceId: string;
  professionalId: string;
  /** Rótulo do profissional pro rodapé ("Qualquer prof." / nome). */
  professionalLabel: string;
  onPickProfessional: (id: string) => void;
  onPickService: (service: ServiceOption) => void;
  onBack: () => void;
  onContinue: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  professionals: ProfessionalOption[];
}) {
  const service = services.find((s) => s.id === serviceId) ?? null;
  return (
    <>
      <div className="space-y-5">
        <StepChrome
          tenantName={tenantName}
          subtitle="Passo 1 de 2 · Profissional e serviço"
          progress={50}
          onBack={onBack}
          headingRef={headingRef}
        />

        {serviceProfs.length > 0 ? (
          <div className="space-y-2.5">
            <p className="text-foreground text-[13px] font-semibold">Profissional</p>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1" role="radiogroup">
              <ProAvatar
                selected={professionalId === ''}
                onClick={() => onPickProfessional('')}
                label="Qualquer"
              >
                <PeopleIcon />
              </ProAvatar>
              {serviceProfs.map((p) => (
                <ProAvatar
                  key={p.id}
                  selected={professionalId === p.id}
                  onClick={() => onPickProfessional(p.id)}
                  label={p.name ?? '—'}
                >
                  <span className="text-green-bright font-serif text-2xl">
                    {(p.name ?? '?').trim().charAt(0).toUpperCase()}
                  </span>
                </ProAvatar>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between">
            <p className="text-foreground text-[13px] font-semibold">Serviço</p>
            {serviceProfs.length > 0 ? (
              <p className="text-muted-foreground text-[11.5px]">de todos os profissionais</p>
            ) : null}
          </div>
          <div className="space-y-2.5">
            {services.map((s) => {
              const sel = s.id === serviceId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onPickService(s)}
                  aria-pressed={sel}
                  className={cn(
                    'bg-card flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-[transform,border-color,box-shadow] active:scale-[0.99]',
                    sel
                      ? 'border-green-deep border-[1.5px] shadow-[0_8px_18px_-10px_rgba(10,51,36,0.55)]'
                      : 'border',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-[15px] font-semibold">{s.name}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {serviceMeta(s, professionals)}
                    </p>
                  </div>
                  <span className="text-green-deep shrink-0 font-serif text-lg">
                    {formatBRL(s.priceCents)}
                  </span>
                  {sel ? (
                    <span className="bg-green-deep flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="h-6 w-6 shrink-0 rounded-full border-2 border-[#d6cbb2]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <StickyFooter>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground truncate text-[11.5px]">
            {service?.name} · {professionalLabel}
          </p>
          <p className="text-foreground font-serif text-xl">
            {service ? formatBRL(service.priceCents) : ''}
          </p>
        </div>
        <Button
          type="button"
          variant="coral"
          size="pill"
          className="px-8 active:scale-[0.98]"
          onClick={onContinue}
        >
          Continuar
        </Button>
      </StickyFooter>
    </>
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
// Passo slot - dia (carrossel) + horário (chips)
// ---------------------------------------------------------------------------

function StepDiaHora({
  tenantName,
  service,
  professionals,
  days,
  timezone,
  minDate,
  maxDate,
  openWeekdays,
  selectedDate,
  onSelectDate,
  slots,
  loadingSlots,
  selectedSlot,
  selectedSlotIso,
  onSelectSlot,
  notice,
  error,
  twoStep,
  onBack,
  onEditService,
  onContinue,
  continueLabel,
  continueDisabled,
  onOpenOptions,
  headingRef,
}: {
  tenantName: string;
  service: ServiceOption;
  professionals: ProfessionalOption[];
  days: BookingDay[];
  timezone: string;
  minDate: string;
  maxDate: string;
  openWeekdays: number[];
  selectedDate: string;
  onSelectDate: (value: string) => void;
  slots: AvailableSlot[];
  loadingSlots: boolean;
  selectedSlot: AvailableSlot | null;
  selectedSlotIso: string;
  onSelectSlot: (slot: AvailableSlot) => void;
  /** Aviso opcional exibido no topo (ex.: horário escolhido expirou). */
  notice: string | null;
  /** Erro do submit direto (logado que confirma pelo rodapé). */
  error: string | null;
  /** true quando há passo de profissional (mostra "Passo 2 de 2" + progresso). */
  twoStep: boolean;
  onBack: () => void;
  onEditService: () => void;
  onContinue: () => void;
  /** Rótulo do botão do rodapé ("Continuar" p/ visitante, "Confirmar" p/ logado). */
  continueLabel: string;
  continueDisabled?: boolean;
  /** Logado que confirma direto: link discreto pra abrir opções (recorrência). */
  onOpenOptions?: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  // Rola o carrossel até o chip escolhido (ex.: quando vem do date-picker).
  const railRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedDate || !railRef.current) return;
    const chip = railRef.current.querySelector<HTMLElement>(`[data-day="${selectedDate}"]`);
    chip?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [selectedDate]);

  // Dia do date-picker pode cair fora do carrossel; anexa um chip no fim pra não
  // ficar "selecionado mas invisível".
  const selectedDay = days.find((d) => d.value === selectedDate) ?? null;
  const railDays =
    selectedDate && !selectedDay
      ? [...days, { value: selectedDate, label: labelFromIso(selectedDate, timezone), open: true }]
      : days;

  return (
    <>
      <div className="space-y-5">
        <StepChrome
          tenantName={tenantName}
          subtitle={twoStep ? 'Passo 2 de 2 · Dia e horário' : 'Dia e horário'}
          progress={twoStep ? 100 : null}
          onBack={onBack}
          headingRef={headingRef}
        />

        {/* Resumo do serviço escolhido (toca -> volta pra trocar). */}
        <button
          type="button"
          onClick={onEditService}
          className="bg-card flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-transform active:scale-[0.99]"
        >
          <span className="bg-green-deep flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <PeopleIcon size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-[14.5px] font-semibold">{service.name}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {formatDuration(service.durationMinutes)} · {formatBRL(service.priceCents)}
            </p>
          </div>
          <span className="text-coral text-xs font-bold">Editar</span>
        </button>

        {notice || error ? (
          <p
            role="alert"
            className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border p-3 text-sm"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error || notice}</span>
          </p>
        ) : null}

        {/* Dia: carrossel de células esmeralda. */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-foreground text-[13px] font-semibold">Dia</p>
            <MonthCalendar
              minDate={minDate}
              maxDate={maxDate}
              openWeekdays={openWeekdays}
              selectedDate={selectedDate}
              onSelect={onSelectDate}
            />
          </div>
          <div
            ref={railRef}
            className="-mx-1 flex gap-[9px] overflow-x-auto px-1 pb-1"
            role="radiogroup"
            aria-label="Escolha o dia"
          >
            {railDays.length === 0 ? (
              <p className="text-muted-foreground px-1 text-sm">Nenhuma data disponível.</p>
            ) : (
              railDays.map((day) => {
                const { weekday, date } = splitDayLabel(day.label);
                // slice direto preserva o acento ("sáb" -> "SÁB"); /\W/ removeria o "á".
                const wd = weekday.slice(0, 3).toUpperCase();
                const num = date.split('/')[0] || date || day.label;
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
                    aria-label={isClosed ? `${day.label} - sem atendimento` : day.label}
                    onClick={isClosed ? undefined : () => onSelectDate(day.value)}
                    className={cn(
                      'relative flex w-[52px] shrink-0 flex-col items-center rounded-[14px] py-2.5 transition-colors',
                      isSelected
                        ? 'bg-green-deep'
                        : isClosed
                          ? 'cursor-not-allowed border border-[#e6dcc6] bg-[#f2ebda]'
                          : 'bg-card hover:border-coral/50 border',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[11px] font-medium',
                        isSelected
                          ? 'text-[#8fbfa4]'
                          : isClosed
                            ? 'text-[#b9ad93]'
                            : 'text-muted-foreground',
                      )}
                    >
                      {wd}
                    </span>
                    <span
                      className={cn(
                        'font-serif text-lg',
                        isSelected ? 'text-cream' : isClosed ? 'text-[#b9ad93]' : 'text-foreground',
                      )}
                    >
                      {num}
                    </span>
                    {isClosed ? (
                      <span className="pointer-events-none absolute left-[9px] right-[9px] top-1/2 h-[1.5px] -rotate-[18deg] bg-[#cbbf9f]" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Horário: chips creme; ocupados riscados. */}
        <div className="space-y-2.5">
          <p className="text-foreground text-[13px] font-semibold">Horário</p>
          {!selectedDate ? (
            <p className="bg-muted text-muted-foreground rounded-lg border p-4 text-sm">
              Selecione um dia para ver os horários.
            </p>
          ) : loadingSlots ? (
            <div className="flex flex-wrap gap-[9px]" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-[42px] w-[76px] rounded-xl" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p className="bg-muted text-muted-foreground rounded-lg border p-4 text-sm">
              Nenhum horário livre nesse dia.
            </p>
          ) : (
            <div className="flex flex-wrap gap-[9px]" role="group" aria-label="Horários disponíveis">
              {slots.map((slot) => {
                const busy = slot.available === false;
                const isSelected = slot.startsAtIso === selectedSlotIso;
                return (
                  <button
                    key={slot.startsAtIso}
                    type="button"
                    disabled={busy}
                    aria-pressed={isSelected}
                    onClick={() => onSelectSlot(slot)}
                    className={cn(
                      'w-[76px] rounded-xl py-[11px] text-center text-sm transition-[transform,background-color,border-color]',
                      busy
                        ? 'cursor-not-allowed bg-[#f2ebda] font-semibold text-[#b9ad93] line-through'
                        : isSelected
                          ? 'bg-coral font-bold text-white'
                          : 'bg-card text-foreground hover:border-coral border font-semibold active:scale-95',
                    )}
                  >
                    {fmtTime(slot.label)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedSlot ? (
        <StickyFooter>
          <div className="w-full space-y-2.5">
            {/* Logado agenda direto; quem quiser repetir abre as opções (recorrência). */}
            {onOpenOptions ? (
              <button
                type="button"
                onClick={onOpenOptions}
                className="text-muted-foreground hover:text-foreground mx-auto flex items-center gap-1.5 text-xs underline-offset-2 transition-colors hover:underline"
              >
                <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
                Repetir esse horário? Ver opções
              </button>
            ) : null}
            <div className="flex items-center gap-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground truncate text-[11.5px]">
                  {buildSlotSummary(selectedSlot, professionals, timezone)}
                </p>
                <p className="text-foreground font-serif text-xl">
                  {formatBRL(service.priceCents)}
                </p>
              </div>
              <Button
                type="button"
                variant="coral"
                size="pill"
                className="px-8 active:scale-[0.98]"
                onClick={onContinue}
                disabled={continueDisabled}
                aria-busy={continueDisabled}
              >
                {continueLabel}
              </Button>
            </div>
          </div>
        </StickyFooter>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Passo contact - contato + resumo / recorrência / conta / confirmação
// ---------------------------------------------------------------------------

/** Botão de submit final - usa useFormStatus para o estado "pending". */
function ConfirmButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="coral"
      size="pill"
      className="w-full active:scale-[0.99]"
      disabled={pending || disabled}
      aria-busy={pending}
    >
      {pending ? 'Confirmando…' : 'Confirmar agendamento'}
    </Button>
  );
}

function StepConfirmar({
  tenantName,
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
  loggedIn,
  accountCreated,
  onAccountCreated,
  customerName,
}: {
  tenantName: string;
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
  /** Cliente já logado ao abrir a página (sessão do servidor). */
  loggedIn: boolean;
  /** Conta criada agora, pelo modal inline (sinal do componente raiz). */
  accountCreated: boolean;
  onAccountCreated: () => void;
  customerName: string | null;
}) {
  const phoneOk = phone.length >= 10;
  const nameOk = name.trim().length >= 2;

  // Já tem conta? (logado ao chegar OU criou agora.) Aí o contato vira texto + "Editar".
  const hasAccount = loggedIn || accountCreated;

  // Primeiro nome pra saudar (da conta logada ou do que ele digitou).
  const firstName = (customerName || name).trim().split(/\s+/)[0] ?? '';

  // Modal de cadastro inline - não tira o cliente do agendamento. Fecha via onSuccess.
  const [signupOpen, setSignupOpen] = useState(false);

  // Modal de edição de contato (nome + telefone), só pra quem tem conta. Draft local.
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftPhone, setDraftPhone] = useState(phone);
  const draftNameOk = draftName.trim().length >= 2;
  const draftPhoneOk = draftPhone.length >= 10;
  function openEdit() {
    setDraftName(name);
    setDraftPhone(phone);
    setEditOpen(true);
  }
  function saveEdit() {
    if (!draftNameOk || !draftPhoneOk) return;
    onChangeName(draftName.trim());
    onChangePhone(draftPhone);
    setEditOpen(false);
  }

  return (
    <div className="space-y-5">
      <StepChrome
        tenantName={tenantName}
        subtitle="Seus dados"
        progress={null}
        onBack={onBack}
        headingRef={headingRef}
      />

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

      {/* Recorrência é propriedade do próprio agendamento - fica junto do resumo. */}
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

      {/* Contato. Com conta: texto + "Editar". Convidado: campos abertos. */}
      {hasAccount ? (
        <div className="bg-card flex items-start justify-between gap-3 rounded-xl border p-4">
          <dl className="min-w-0 space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">WhatsApp</dt>
              <dd className="text-foreground font-medium">{formatPhoneBR(phone) || phone || '-'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="text-foreground font-medium">{name || '-'}</dd>
            </div>
          </dl>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={openEdit}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent dismissable={false} className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Editar seus dados</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone">WhatsApp</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="(11) 91234-5678"
                    value={formatPhoneBR(draftPhone) || draftPhone}
                    onChange={(e) => setDraftPhone(e.target.value.replace(/\D/g, '').slice(0, 13))}
                    aria-invalid={draftPhone.length > 0 && !draftPhoneOk}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">Nome</Label>
                  <Input
                    id="edit-name"
                    autoComplete="name"
                    placeholder="Como podemos te chamar?"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    aria-invalid={draftName.length > 0 && !draftNameOk}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={saveEdit} disabled={!draftNameOk || !draftPhoneOk}>
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
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
      )}

      {/* Estado da conta (boas-vindas / logado / convite). */}
      {accountCreated ? (
        <div className="border-green/30 bg-green/5 space-y-1 rounded-xl border p-4">
          <p className="text-foreground flex items-center gap-1.5 text-sm font-medium">
            <PartyPopper className="text-green h-4 w-4 shrink-0" aria-hidden="true" />
            Boas-vindas{firstName ? `, ${firstName}` : ''}! Sua conta está pronta.
          </p>
          <p className="text-muted-foreground text-sm">
            É só confirmar o agendamento abaixo. Pra ele entrar no seu histórico, valide seu WhatsApp
            na sua conta.
          </p>
        </div>
      ) : loggedIn ? null : (
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
          <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="sm" className="w-full">
                <UserIcon className="h-4 w-4" />
                Criar minha conta
              </Button>
            </DialogTrigger>
            <DialogContent dismissable={false} className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">Criar minha conta</DialogTitle>
              </DialogHeader>
              <p className="text-muted-foreground -mt-2 text-sm">
                Acompanhe, remarque e repita seus horários em um só lugar. Você continua aqui no
                agendamento.
              </p>
              <CustomerSignupForm
                inline
                defaultName={name}
                defaultPhone={phone}
                onSuccess={() => {
                  setSignupOpen(false);
                  onAccountCreated();
                }}
              />
            </DialogContent>
          </Dialog>
          <p className="text-muted-foreground text-center text-[11px]">
            É opcional - dá pra agendar sem conta.
          </p>
        </div>
      )}

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
// Tela de sucesso (hero animado + blocos web-only abaixo)
// ---------------------------------------------------------------------------

/**
 * Painel de sucesso animado (espelha o overlay do app mobile): o card verde-escuro
 * sobe da base, o selo entra com "mola" + anel pulsando, e título/card escalonam.
 */
function SuccessShell({
  confirmed,
  tenantName,
  logoUrl,
  summary,
  priceLabel,
}: {
  confirmed: boolean;
  tenantName: string;
  logoUrl: string | null;
  summary: string;
  priceLabel: string | null;
}) {
  return (
    <div className="animate-sheet-up bg-green-deep overflow-hidden rounded-2xl px-6 pb-7 pt-9 text-center">
      <div className="flex justify-center">
        <span
          className={cn(
            'animate-seal-pop flex h-20 w-20 items-center justify-center rounded-[26px]',
            confirmed ? 'bg-green-bright animate-pulse-ring' : 'bg-coral animate-pulse-ring-coral',
          )}
        >
          <Check
            className={cn('h-9 w-9', confirmed ? 'text-green-deep' : 'text-white')}
            strokeWidth={3}
          />
        </span>
      </div>

      <h2
        className="animate-rise text-cream mt-6 font-serif text-3xl"
        style={{ animationDelay: '0.12s' }}
      >
        {confirmed ? 'Tá ' : 'Horário '}
        <span className={cn('italic', confirmed ? 'text-green-bright' : 'text-coral-soft')}>
          {confirmed ? 'marcado!' : 'reservado!'}
        </span>
      </h2>
      <p
        className="animate-rise mx-auto mt-2.5 max-w-[16rem] text-sm leading-6 text-[#8fbfa4]"
        style={{ animationDelay: '0.18s' }}
      >
        {confirmed
          ? 'Enviamos os detalhes no seu WhatsApp e te esperamos no horário.'
          : 'O estabelecimento confirma pelo WhatsApp - você não precisa fazer mais nada.'}
      </p>

      <div className="animate-rise mt-6" style={{ animationDelay: '0.24s' }}>
        <div className="rounded-2xl border border-[rgba(47,211,122,0.28)] bg-[rgba(255,253,248,0.06)] p-4 text-left">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
            ) : (
              <span className="bg-coral/20 text-coral flex h-11 w-11 items-center justify-center rounded-xl font-serif text-lg">
                {tenantName.charAt(0)}
              </span>
            )}
            <p className="text-paper truncate font-serif text-base">{tenantName}</p>
          </div>
          <div className="my-3 border-t border-dashed border-[rgba(143,191,164,0.4)]" />
          <div className="flex items-center justify-between gap-3">
            <p className="text-cream flex-1 text-sm">{summary}</p>
            {priceLabel ? (
              <p className="text-coral shrink-0 font-serif text-base">{priceLabel}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Convite pra criar a área do cliente, com o telefone usado pré-preenchido.
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

/** Fecho pra quem JÁ tem conta: só um atalho pra área do cliente. */
function AccountLinkedCta() {
  return (
    <div className="space-y-2 border-t pt-4 text-center">
      <p className="text-muted-foreground text-sm">
        Acompanhe, remarque ou cancele este agendamento na sua conta quando quiser.
      </p>
      <Button asChild variant="outline" size="pill">
        <Link href="/conta">
          <UserIcon className="h-4 w-4" />
          Ver na minha conta
        </Link>
      </Button>
    </div>
  );
}

function SuccessScreen({
  confirmed,
  tenantName,
  logoUrl,
  summary,
  priceLabel,
  slug,
  appointmentId,
  paymentAvailable,
  phone,
  hasAccount,
}: {
  confirmed: boolean;
  tenantName: string;
  logoUrl: string | null;
  summary: string;
  priceLabel: string | null;
  slug: string;
  appointmentId: string;
  paymentAvailable: boolean;
  phone: string;
  /** Já tem conta (logado ou criada no fluxo): não reoferecer "Criar conta". */
  hasAccount: boolean;
}) {
  return (
    <div className="space-y-6">
      <SuccessShell
        confirmed={confirmed}
        tenantName={tenantName}
        logoUrl={logoUrl}
        summary={summary}
        priceLabel={priceLabel}
      />

      {paymentAvailable ? <PaymentBlock slug={slug} appointmentId={appointmentId} /> : null}

      {hasAccount ? <AccountLinkedCta /> : <CreateAccountCta phone={phone} />}
    </div>
  );
}

/**
 * Sucesso de uma série recorrente: hero animado + quantas ocorrências entraram e
 * quais datas foram puladas. Não oferece pagamento online (fora de escopo).
 */
function SeriesSuccessScreen({
  confirmed,
  tenantName,
  logoUrl,
  summary,
  createdCount,
  skipped,
  beyondHorizon,
  timezone,
  phone,
  hasAccount,
}: {
  confirmed: boolean;
  tenantName: string;
  logoUrl: string | null;
  summary: string;
  createdCount: number;
  skipped: string[];
  beyondHorizon: number;
  timezone: string;
  phone: string;
  hasAccount: boolean;
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
    <div className="space-y-6">
      <SuccessShell
        confirmed={confirmed}
        tenantName={tenantName}
        logoUrl={logoUrl}
        summary={`${createdCount} ${createdCount === 1 ? 'horário' : 'horários'} · a partir de ${summary}`}
        priceLabel={null}
      />

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
        <p className="text-muted-foreground text-center text-xs">
          {beyondHorizon} {beyondHorizon === 1 ? 'data ficou' : 'datas ficaram'} além do limite de
          90 dias.
        </p>
      ) : null}

      {hasAccount ? <AccountLinkedCta /> : <CreateAccountCta phone={phone} />}
    </div>
  );
}

/**
 * Bloco de pagamento opcional na tela de sucesso. Gera a cobrança sob demanda
 * (Pix mostra QR + copia-e-cola; cartão abre o checkout hospedado do gateway).
 */
function PaymentBlock({ slug, appointmentId }: { slug: string; appointmentId: string }) {
  const [paying, startPaying] = useTransition();
  const [pix, setPix] = useState<{ qrCode: string | null; copyPaste: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [document, setDocument] = useState('');
  const [askDocument, setAskDocument] = useState(false);
  const documentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (askDocument) documentRef.current?.focus();
  }, [askDocument]);

  function pay(method: 'PIX' | 'CREDIT_CARD') {
    if (paying) return;
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
  tenantName,
  logoUrl,
  services,
  professionals,
  timezone,
  openWeekdays,
  horizonDays,
  loggedIn,
  customerName,
  customerPhone,
}: PublicBookingProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('vitrine');

  // Há profissionais pra escolher? Define se o passo "select" existe.
  const hasProfessionals = professionals.length > 0;

  // Conta criada agora, pelo modal inline do passo de confirmação.
  const [accountCreated, setAccountCreated] = useState(false);
  const hasAccount = loggedIn || accountCreated;
  function handleAccountCreated() {
    setAccountCreated(true);
    router.refresh();
  }

  // Dias atendíveis (carrossel) + janela do date-picker, gerados no fuso do tenant.
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

  // Serviço escolhido (passo vitrine).
  const [serviceId, setServiceId] = useState('');
  // Profissional escolhido no passo select. '' = sem preferência (sistema atribui).
  const [professionalId, setProfessionalId] = useState('');

  // Contato (pedido só no passo final). phone = dígitos crus.
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [lookingUp, startLookup] = useTransition();
  const lookedUpPhoneRef = useRef('');

  // Pré-preenche o contato salvo de um agendamento anterior (mesmo dispositivo).
  useEffect(() => {
    if (loggedIn) {
      if (customerName) setName(customerName);
      if (customerPhone) setPhone(customerPhone.replace(/\D/g, '').slice(0, 13));
      return;
    }
    const saved = readSavedContact();
    if (!saved) return;
    setPhone(saved.phone);
    if (saved.name) setName(saved.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only; props do servidor são estáveis.
  }, []);

  // Auto-preenche o nome de quem já é cliente assim que o telefone fica válido.
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

  // Passo slot - dia / hora. Já abre no 1º dia com expediente (como o app mobile),
  // então os horários carregam de cara em vez de "selecione um dia". buildBookingDays
  // apara as pontas fechadas, então days[0] é sempre atendível.
  const [dateStr, setDateStr] = useState<string>(() => days[0]?.value ?? '');
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlotIso, setSelectedSlotIso] = useState('');
  const [loadingSlots, startLoadingSlots] = useTransition();
  const [expiryNotice, setExpiryNotice] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Recorrência (opcional, no passo de confirmação). 'NONE' = agendamento único.
  const [frequency, setFrequency] = useState<FrequencyChoice>('NONE');
  const [occurrences, setOccurrences] = useState(4);

  const [state, formAction, isSubmitting] = useActionState<CreatePublicBookingResult, FormData>(
    createPublicBooking,
    undefined,
  );

  // Foco gerenciado: ao TROCAR de passo, leva o foco pro título do passo.
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
  // Profissionais que atendem o serviço escolhido (avatares do passo select).
  const serviceProfs = useMemo(
    () =>
      selectedService
        ? professionals.filter((p) => selectedService.professionalIds.includes(p.id))
        : [],
    [professionals, selectedService],
  );
  const selectedDayLabel = useMemo(() => {
    if (!dateStr) return '';
    return days.find((d) => d.value === dateStr)?.label ?? labelFromIso(dateStr, timezone);
  }, [days, dateStr, timezone]);
  const selectedSlot = useMemo(
    () => slots.find((s) => s.startsAtIso === selectedSlotIso) ?? null,
    [slots, selectedSlotIso],
  );
  const professionalLabel = professionalId
    ? (professionals.find((p) => p.id === professionalId)?.name ?? 'Profissional')
    : 'Qualquer prof.';
  const lowestPrice = services.length ? Math.min(...services.map((s) => s.priceCents)) : null;

  // Busca slots sempre que serviço + dia estiverem escolhidos. Reseta o slot
  // selecionado a cada mudança (trocar dia/serviço/prof. some com o horário expirado).
  useEffect(() => {
    setSelectedSlotIso('');
    setSubmitError(null);
    if (!serviceId || !dateStr) {
      setSlots([]);
      return;
    }
    startLoadingSlots(async () => {
      const result = await getAvailableSlots(slug, serviceId, dateStr, professionalId || undefined);
      setSlots(result);
    });
  }, [slug, serviceId, dateStr, professionalId]);

  // Sucesso do submit → tela final. Salva o contato pro próximo agendamento.
  useEffect(() => {
    if (state && 'ok' in state && state.ok) {
      saveContact({ phone, name });
      setStep('done');
    }
  }, [state]);

  // Espelha o erro da action pro estado local (limpa ao reescolher dia/horário).
  useEffect(() => {
    if (state && 'error' in state) setSubmitError(state.error);
  }, [state]);

  // Robustez: se chegamos na confirmação mas o slot/serviço sumiu (expirou), volta
  // pro passo de horário pra reescolher, com aviso.
  useEffect(() => {
    if (step === 'contact' && !loadingSlots && (!selectedService || !selectedSlot)) {
      setExpiryNotice('Esse horário não está mais disponível. Escolha outro, por favor.');
      setStep('slot');
    }
  }, [step, loadingSlots, selectedService, selectedSlot]);

  // --- Transições explícitas --------------------------------------------------

  function handleSelectService(service: ServiceOption) {
    setServiceId(service.id);
    // Troca de serviço pode mudar quem atende: volta pra "sem preferência".
    setProfessionalId('');
    // Com profissionais, passa pelo "profissional e serviço"; senão vai direto ao horário.
    setStep(hasProfessionals ? 'select' : 'slot');
  }

  /** Botão "Agendar" do rodapé da vitrine: começa pelo 1º serviço. */
  function handleQuickBook() {
    const first = services[0];
    if (first) handleSelectService(first);
  }

  /** Trocar de serviço dentro do passo select (mantém o passo). */
  function handlePickServiceInSelect(service: ServiceOption) {
    setServiceId(service.id);
    // Anti-beco: prof. escolhido que não faz o serviço volta pra "Qualquer".
    if (professionalId && !service.professionalIds.includes(professionalId)) {
      setProfessionalId('');
    }
  }

  /** Escolher um dia limpa o aviso de expiração (o usuário já está reescolhendo). */
  function handleSelectDate(value: string) {
    setExpiryNotice(null);
    setDateStr(value);
  }

  /** Tocar num horário só o SELECIONA (fica coral); o rodapé "Continuar" avança. */
  function handleSelectSlot(slot: AvailableSlot) {
    setExpiryNotice(null);
    setSubmitError(null);
    setSelectedSlotIso(slot.startsAtIso);
  }

  // Cliente logado com nome+telefone da conta já agenda direto pelo rodapé do
  // horário (igual ao app mobile): não faz sentido pedir "Seus dados" de quem já
  // tem conta. Visitante (ou logado sem contato completo) segue pro passo de dados.
  const contactReady = name.trim().length >= 2 && phone.length >= 10;
  const canDirectConfirm = loggedIn && contactReady;

  /** Submete o agendamento direto (sem passar pelo passo "Seus dados"). */
  function submitDirect() {
    if (!selectedService || !selectedSlotIso) return;
    const fd = new FormData();
    fd.set('slug', slug);
    fd.set('serviceId', serviceId);
    fd.set('professionalId', professionalId);
    fd.set('slotIso', selectedSlotIso);
    fd.set('name', name.trim());
    fd.set('phone', phone);
    fd.set('frequency', 'NONE');
    // Dentro de startTransition pra o isSubmitting (isPending) do useActionState
    // atualizar - chamar a action solta, fora de transition, não reflete o pending.
    startTransition(() => formAction(fd));
  }

  // Voltar do passo slot: pro select (se existe) ou pra vitrine.
  const slotBackStep: Step = hasProfessionals ? 'select' : 'vitrine';
  const donePrice = selectedService ? formatBRL(selectedService.priceCents) : null;

  // --- Render -----------------------------------------------------------------

  return (
    <div className="mx-auto w-full max-w-md">
      {step === 'vitrine' ? (
        <StepVitrine
          tenantName={tenantName}
          logoUrl={logoUrl}
          services={services}
          lowestPrice={lowestPrice}
          onSelectService={handleSelectService}
          onQuickBook={handleQuickBook}
        />
      ) : null}

      {step === 'select' && selectedService ? (
        <StepSelect
          tenantName={tenantName}
          services={services}
          serviceProfs={serviceProfs}
          serviceId={serviceId}
          professionalId={professionalId}
          professionalLabel={professionalLabel}
          onPickProfessional={setProfessionalId}
          onPickService={handlePickServiceInSelect}
          onBack={() => setStep('vitrine')}
          onContinue={() => setStep('slot')}
          headingRef={headingRef}
          professionals={professionals}
        />
      ) : null}

      {step === 'slot' && selectedService ? (
        <StepDiaHora
          tenantName={tenantName}
          service={selectedService}
          professionals={professionals}
          days={days}
          timezone={timezone}
          minDate={minDate}
          maxDate={maxDate}
          openWeekdays={openWeekdays}
          selectedDate={dateStr}
          onSelectDate={handleSelectDate}
          slots={slots}
          loadingSlots={loadingSlots}
          selectedSlot={selectedSlot}
          selectedSlotIso={selectedSlotIso}
          onSelectSlot={handleSelectSlot}
          notice={expiryNotice}
          error={submitError}
          twoStep={hasProfessionals}
          onBack={() => setStep(slotBackStep)}
          onEditService={() => setStep(slotBackStep)}
          // Logado com contato: confirma direto (pula "Seus dados"). Visitante avança.
          onContinue={canDirectConfirm ? submitDirect : () => setStep('contact')}
          continueLabel={
            canDirectConfirm ? (isSubmitting ? 'Confirmando…' : 'Confirmar') : 'Continuar'
          }
          continueDisabled={canDirectConfirm && isSubmitting}
          // Logado confirma direto, mas pode abrir "Seus dados" (onde vive a recorrência).
          onOpenOptions={canDirectConfirm ? () => setStep('contact') : undefined}
          headingRef={headingRef}
        />
      ) : null}

      {step === 'contact' && selectedService && selectedSlot ? (
        <StepConfirmar
          tenantName={tenantName}
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
          onBack={() => setStep('slot')}
          headingRef={headingRef}
          loggedIn={loggedIn}
          accountCreated={accountCreated}
          onAccountCreated={handleAccountCreated}
          customerName={customerName}
        />
      ) : null}

      {step === 'done' && state && 'ok' in state && state.ok ? (
        'series' in state ? (
          <SeriesSuccessScreen
            confirmed={state.status === 'CONFIRMED'}
            tenantName={tenantName}
            logoUrl={logoUrl}
            summary={state.summary}
            createdCount={state.createdCount}
            skipped={state.skipped}
            beyondHorizon={state.beyondHorizon}
            timezone={timezone}
            phone={phone}
            hasAccount={hasAccount}
          />
        ) : (
          <SuccessScreen
            confirmed={state.status === 'CONFIRMED'}
            tenantName={tenantName}
            logoUrl={logoUrl}
            summary={state.summary}
            priceLabel={donePrice}
            slug={slug}
            appointmentId={state.appointmentId}
            paymentAvailable={state.paymentAvailable}
            phone={phone}
            hasAccount={hasAccount}
          />
        )
      ) : null}
    </div>
  );
}
