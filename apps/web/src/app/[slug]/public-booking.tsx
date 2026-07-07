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
import { type AvailableSlotWithProfessionals, type SeriesOccurrencePreview } from '@haru/shared';
import { buildBookingDays, isoDateInTz, labelFromIso, type BookingDay } from '@haru/shared';
import {
  formatBRL,
  formatDuration,
  formatPhoneBR,
  isValidCpfCnpj,
  maskCpfCnpjInput,
} from '@haru/shared';
import {
  RECURRENCE_MAX_HORIZON_DAYS,
  RECURRENCE_OCCURRENCE_OPTIONS,
  type RecurrenceFrequency,
} from '@/lib/recurrence';

import {
  createPublicBooking,
  type CreatePublicBookingResult,
  getAvailableSlots,
  getSeriesDaySlots,
  lookupContact,
  previewPublicSeries,
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
  avatarUrl: string | null;
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
  NONE: 'Não',
  WEEKLY: 'Toda semana',
  BIWEEKLY: 'A cada 15 dias',
  MONTHLY: 'Todo mês',
};

const FREQUENCY_ORDER: FrequencyChoice[] = ['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'];

// Input "paper" do passo de contato - espelha o app mobile (e os campos de auth do web).
const FIELD_INPUT =
  'border-edge bg-paper text-ink placeholder:text-[#9aa8a0] focus:border-green-deep w-full rounded-[14px] border px-4 py-[15px] text-base outline-none focus:border-[1.5px]';

/** "15:30" -> "15h30"; "14:00" -> "14h" (formato do app mobile). */
function fmtTime(hhmm: string): string {
  return hhmm.replace(':', 'h').replace(/h00$/, 'h');
}

/** "Qui, 02/07 · 09h30" a partir de um ISO, no fuso do tenant (linha em serif do card
 *  de sucesso). Espelha buildConfirmWhen do app mobile. */
function buildConfirmWhen(iso: string, timezone: string): string {
  const d = new Date(iso);
  const wdRaw = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, weekday: 'short' })
    .format(d)
    .replace('.', '');
  const wd = wdRaw.charAt(0).toUpperCase() + wdRaw.slice(1);
  const dm = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
  }).format(d);
  return `${wd}, ${dm} · ${fmtOccurrenceTime(iso, timezone)}`;
}

/** "Sáb, 05/07" a partir de um ISO, no fuso do tenant (linha da prévia de recorrência). */
function fmtOccurrenceDate(iso: string, tz: string): string {
  const d = new Date(iso);
  const wdRaw = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, weekday: 'short' })
    .format(d)
    .replace('.', '');
  const wd = wdRaw.charAt(0).toUpperCase() + wdRaw.slice(1);
  const dm = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    day: '2-digit',
    month: '2-digit',
  }).format(d);
  return `${wd}, ${dm}`;
}

/** "10h" / "10h30" a partir de um ISO, no fuso do tenant. */
function fmtOccurrenceTime(iso: string, tz: string): string {
  return fmtTime(
    new Intl.DateTimeFormat('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(
      new Date(iso),
    ),
  );
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
    <div className="bg-green-deep relative flex min-h-[240px] flex-col justify-end overflow-hidden rounded-[20px] px-5 pb-6 pt-7">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="mb-3 h-12 w-12 rounded-2xl object-cover ring-1 ring-white/15"
        />
      ) : null}
      <h1 className="text-paper font-serif text-[26px] font-semibold leading-tight">
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
          className="bg-card focus-visible:ring-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border-line border transition-transform focus-visible:outline-none focus-visible:ring-2 active:scale-95"
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
          <p className="text-sub text-[11.5px]">{subtitle}</p>
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
    <div className="bg-background border-line sticky bottom-0 z-10 mt-5 flex items-center gap-3.5 border-t pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_28px_-18px_rgba(10,51,36,0.45)]">
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
          <p className="bg-muted text-sub rounded-xl border p-4 text-sm">
            Nenhum serviço disponível no momento.
          </p>
        ) : (
          <div className="space-y-2.5">
            <p className="text-foreground font-serif text-lg font-semibold">Serviços</p>
            <ul className="space-y-2.5" aria-label="Serviços disponíveis">
              {services.map((service) => (
                <li key={service.id}>
                  <button
                    type="button"
                    onClick={() => onSelectService(service)}
                    className="bg-card focus-visible:ring-ring border-line hover:border-coral/40 flex w-full items-center justify-between gap-3 rounded-[15px] border p-4 text-left transition-[transform,border-color] focus-visible:outline-none focus-visible:ring-2 active:scale-[0.99]"
                  >
                    <div className="min-w-0">
                      <p className="text-foreground text-[15px] font-semibold">{service.name}</p>
                      <p className="text-sub mt-0.5 text-xs">
                        {formatDuration(service.durationMinutes)}
                      </p>
                      {service.description ? (
                        <p className="text-sub mt-1 text-sm leading-5">
                          {service.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-green-deep shrink-0 font-serif text-lg font-semibold">
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
            <p className="text-sub text-[11.5px]">a partir de</p>
            <p className="text-foreground font-serif text-2xl font-semibold">{formatBRL(lowestPrice)}</p>
          </div>
          <Button
            type="button"
            variant="coral"
            size="pill"
            className="flex-1 rounded-[16px] text-[15px] font-bold active:scale-[0.98]"
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
          'bg-green-deep flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-[18px] border-[2.5px]',
          selected ? 'border-coral' : 'border-transparent',
        )}
      >
        {children}
      </span>
      <span
        className={cn(
          'max-w-[64px] truncate text-xs',
          selected ? 'text-foreground font-semibold' : 'text-sub',
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

        {/* Só faz sentido escolher profissional quando há mais de uma opção para o serviço. */}
        {serviceProfs.length > 1 ? (
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
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL externa (Supabase Storage), tamanho fixo
                    <img
                      src={p.avatarUrl}
                      alt={p.name ?? ''}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-green-bright font-serif text-2xl font-semibold">
                      {(p.name ?? '?').trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                </ProAvatar>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between">
            <p className="text-foreground text-[13px] font-semibold">Serviço</p>
            {serviceProfs.length > 1 ? (
              <p className="text-sub text-[11.5px]">de todos os profissionais</p>
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
                    'bg-card flex w-full items-center gap-3 rounded-[16px] px-4 py-3.5 text-left transition-[transform,border-color,box-shadow] active:scale-[0.99]',
                    sel
                      ? 'border-green-deep border-[1.5px] shadow-[0_8px_18px_-10px_rgba(10,51,36,0.55)]'
                      : 'border-edge border',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-[15px] font-semibold">{s.name}</p>
                    <p className="text-sub mt-0.5 text-xs">
                      {serviceMeta(s, professionals)}
                    </p>
                  </div>
                  <span className="text-green-deep shrink-0 font-serif text-lg font-semibold">
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
          <p className="text-sub truncate text-[11.5px]">
            {service?.name} · {professionalLabel}
          </p>
          <p className="text-foreground font-serif text-xl font-semibold">
            {service ? formatBRL(service.priceCents) : ''}
          </p>
        </div>
        <Button
          type="button"
          variant="coral"
          size="pill"
          className="rounded-[16px] px-8 text-[15px] font-bold active:scale-[0.98]"
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
            <span key={i} className="text-sub py-1 text-xs font-medium">
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
                      ? 'text-sub/40 cursor-not-allowed'
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
          className="bg-card border-line flex w-full items-center gap-3 rounded-[15px] border p-3 text-left transition-transform active:scale-[0.99]"
        >
          <span className="bg-green-deep flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]">
            <PeopleIcon size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-[14.5px] font-semibold">{service.name}</p>
            <p className="text-sub mt-0.5 text-xs">
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
              <p className="text-sub px-1 text-sm">Nenhuma data disponível.</p>
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
                          : 'bg-card border-edge hover:border-coral/50 border',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[11px] font-medium',
                        isSelected
                          ? 'text-[#8fbfa4]'
                          : isClosed
                            ? 'text-[#b9ad93]'
                            : 'text-sub',
                      )}
                    >
                      {wd}
                    </span>
                    <span
                      className={cn(
                        'font-serif text-lg font-semibold',
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
            <p className="bg-muted text-sub rounded-lg border p-4 text-sm">
              Selecione um dia para ver os horários.
            </p>
          ) : loadingSlots ? (
            <div className="flex flex-wrap gap-[9px]" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[42px] w-[76px] rounded-[12px]" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p className="bg-muted text-sub rounded-lg border p-4 text-sm">
              Nenhum horário livre nesse dia.
            </p>
          ) : (
            <div
              className="flex flex-wrap gap-[9px]"
              role="group"
              aria-label="Horários disponíveis"
            >
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
                      'w-[76px] rounded-[12px] py-[11px] text-center text-sm transition-[transform,background-color,border-color]',
                      busy
                        ? 'cursor-not-allowed bg-[#f2ebda] font-semibold text-[#b9ad93] line-through'
                        : isSelected
                          ? 'bg-coral font-bold text-white'
                          : 'bg-card text-foreground border-edge hover:border-coral border font-semibold active:scale-95',
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
                className="text-sub hover:text-foreground mx-auto flex items-center gap-1.5 text-xs underline-offset-2 transition-colors hover:underline"
              >
                <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
                Repetir toda semana? Ver opções
              </button>
            ) : null}
            <div className="flex items-center gap-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sub truncate text-[11.5px]">
                  {buildSlotSummary(selectedSlot, professionals, timezone)}
                </p>
                <p className="text-foreground font-serif text-xl font-semibold">
                  {formatBRL(service.priceCents)}
                </p>
              </div>
              <Button
                type="button"
                variant="coral"
                size="pill"
                className="rounded-[16px] px-8 text-[15px] font-bold active:scale-[0.98]"
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

/** Botão de submit final - usa useFormStatus para o estado "pending". Visual do app
 *  mobile: coral cheio, rounded-2xl, esmaecido (coral/50) quando desabilitado. */
function ConfirmButton({ disabled, label }: { disabled?: boolean; label?: string }) {
  const { pending } = useFormStatus();
  const off = pending || disabled;
  return (
    <button
      type="submit"
      disabled={off}
      aria-busy={pending}
      className={cn(
        'w-full rounded-[16px] py-4 text-[15px] font-bold text-white transition-transform',
        off ? 'bg-coral/50' : 'bg-coral active:scale-[0.99]',
      )}
    >
      {pending ? 'Confirmando…' : (label ?? 'Confirmar agendamento')}
    </button>
  );
}

const OCCURRENCE_STATUS_META: Record<
  SeriesOccurrencePreview['status'],
  { tag: string; tone: 'ok' | 'warn' | 'muted' }
> = {
  free: { tag: 'livre', tone: 'ok' },
  taken: { tag: 'ocupado', tone: 'warn' },
  closed: { tag: 'sem expediente', tone: 'warn' },
  past: { tag: 'fora do prazo', tone: 'muted' },
  beyond: { tag: 'além de 90 dias', tone: 'muted' },
};

/**
 * Uma linha da prévia: data (mesmo dia/horário do 1º agendamento) + status. "Trocar
 * dia/horário" abre um seletor - horários do próprio dia (já vieram na prévia) e um
 * calendário pra saltar pra outro dia (feriado/lotado) buscando os horários DAQUELE dia,
 * sempre do MESMO profissional da série. A 1ª (âncora) é fixa.
 */
function OccurrenceRow({
  occ,
  index,
  timezone,
  edit,
  slug,
  serviceId,
  professionalId,
  minDate,
  maxDate,
  openWeekdays,
  onSwap,
  onRemove,
  onRestore,
}: {
  occ: SeriesOccurrencePreview;
  index: number;
  timezone: string;
  edit: string | 'removed' | undefined;
  slug: string;
  serviceId: string;
  /** Profissional resolvido da série - os horários trocados têm que ser DELE. */
  professionalId: string;
  minDate: string;
  maxDate: string;
  openWeekdays: number[];
  onSwap: (pickIso: string) => void;
  onRemove: () => void;
  onRestore: () => void;
}) {
  const isAnchor = index === 0;
  const removed = edit === 'removed';
  // 'removed' também é string - só é ISO trocado quando NÃO é o marcador de remoção.
  const swappedIso = !removed && typeof edit === 'string' ? edit : null;
  const shownIso = swappedIso ?? occ.targetIso;
  const meta = OCCURRENCE_STATUS_META[occ.status];
  const dropped = occ.status === 'past' || occ.status === 'beyond';
  const conflict = !isAnchor && !removed && !swappedIso && meta.tone === 'warn';

  const [open, setOpen] = useState(false);
  const occDate = isoDateInTz(new Date(occ.targetIso), timezone);
  const [viewDate, setViewDate] = useState(occDate);
  const [fetched, setFetched] = useState<Record<string, { startsAtIso: string; label: string }[]>>(
    {},
  );
  const [loading, setLoading] = useState(false);

  // Horários do dia em foco: o dia original já veio na prévia (occ.slots); outros dias buscam.
  const daySlots = viewDate === occDate ? occ.slots : (fetched[viewDate] ?? []);

  async function pickDate(d: string) {
    setViewDate(d);
    if (d === occDate || fetched[d]) return;
    setLoading(true);
    try {
      // Busca de série (90 dias, profissional fixo) - não a de avulso, que corta em 60.
      const slots = await getSeriesDaySlots(slug, serviceId, professionalId, d);
      setFetched((f) => ({
        ...f,
        [d]: slots
          .filter((s) => s.available !== false)
          .map((s) => ({ startsAtIso: s.startsAtIso, label: s.label })),
      }));
    } catch {
      setFetched((f) => ({ ...f, [d]: [] }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <li
      className={cn(
        'rounded-[16px] border-edge border p-3 text-sm transition-colors',
        removed || dropped ? 'bg-muted/40 border-dashed' : 'bg-card',
        conflict ? 'border-amber-300/70 bg-amber-50/40' : '',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'font-medium capitalize',
              removed || dropped ? 'text-sub line-through' : 'text-foreground',
            )}
          >
            {fmtOccurrenceDate(shownIso, timezone)}
            <span className="text-sub ml-1.5 font-normal normal-case">
              · {fmtOccurrenceTime(shownIso, timezone)}
            </span>
          </p>
        </div>

        {/* Tag à direita (mesmo padrão em todas as linhas, inclusive a âncora). */}
        {isAnchor ? (
          <span className="text-green flex shrink-0 items-center gap-1 text-xs font-medium">
            <Check className="h-3.5 w-3.5" /> 1º horário
          </span>
        ) : removed ? (
          <button
            type="button"
            onClick={onRestore}
            className="text-coral shrink-0 text-xs font-semibold underline-offset-2 hover:underline"
          >
            Desfazer
          </button>
        ) : dropped ? (
          <span className="text-sub shrink-0 text-xs">{meta.tag}</span>
        ) : swappedIso ? (
          <span className="text-green flex shrink-0 items-center gap-1 text-xs font-medium">
            <Check className="h-3.5 w-3.5" /> trocado
          </span>
        ) : occ.status === 'free' ? (
          <span className="text-green flex shrink-0 items-center gap-1 text-xs font-medium">
            <Check className="h-3.5 w-3.5" /> {meta.tag}
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" /> {meta.tag}
          </span>
        )}
      </div>

      {/* Ações - âncora é fixa; descartadas/removidas não editam. */}
      {!isAnchor && !removed && !dropped ? (
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-foreground text-xs font-semibold underline-offset-2 hover:underline"
          >
            {open ? 'Fechar' : 'Trocar dia/horário'}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-sub hover:text-destructive text-xs underline-offset-2 hover:underline"
          >
            Remover
          </button>
        </div>
      ) : null}

      {/* Seletor: dia (calendário) + horários daquele dia. */}
      {open && !removed ? (
        <div className="mt-3 space-y-2 border-t pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sub text-xs capitalize">
              {labelFromIso(viewDate, timezone)}
            </p>
            <MonthCalendar
              minDate={minDate}
              maxDate={maxDate}
              openWeekdays={openWeekdays}
              selectedDate={viewDate}
              onSelect={pickDate}
            />
          </div>
          {loading ? (
            <div className="flex flex-wrap gap-2" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-16 rounded-lg" />
              ))}
            </div>
          ) : daySlots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {daySlots.map((s) => {
                const sel = shownIso === s.startsAtIso;
                return (
                  <button
                    key={s.startsAtIso}
                    type="button"
                    onClick={() => {
                      onSwap(s.startsAtIso);
                      setOpen(false);
                    }}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                      sel
                        ? 'bg-coral border-coral text-white'
                        : 'bg-card hover:border-coral text-foreground',
                    )}
                  >
                    {fmtTime(s.label)}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sub text-xs">
              Sem horário livre nesse dia. Toque em &quot;Outras datas&quot; pra escolher outro, ou
              remova.
            </p>
          )}
        </div>
      ) : null}
    </li>
  );
}

/**
 * Prévia editável das ocorrências de uma série. Cada linha é uma OccurrenceRow (com seu
 * próprio seletor de dia/horário). Não sabe do submit - reporta as escolhas via callbacks;
 * o pai calcula os ISOs finais.
 */
function SeriesPreviewList({
  preview,
  loading,
  error,
  timezone,
  edits,
  slug,
  serviceId,
  professionalId,
  minDate,
  maxDate,
  openWeekdays,
  onSwap,
  onRemove,
  onRestore,
  chosenCount,
}: {
  preview: SeriesOccurrencePreview[] | null;
  loading: boolean;
  error: string | null;
  timezone: string;
  edits: Record<string, string | 'removed'>;
  slug: string;
  serviceId: string;
  /** Profissional resolvido da série (vem da prévia); '' até a prévia chegar. */
  professionalId: string;
  minDate: string;
  maxDate: string;
  openWeekdays: number[];
  onSwap: (targetIso: string, pickIso: string) => void;
  onRemove: (targetIso: string) => void;
  onRestore: (targetIso: string) => void;
  chosenCount: number;
}) {
  if (loading) {
    return (
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <p
        role="alert"
        className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm"
      >
        {error}
      </p>
    );
  }
  if (!preview || preview.length === 0) return null;

  return (
    <div className="space-y-2">
      <ul className="space-y-2" aria-label="Datas da recorrência">
        {preview.map((occ, i) => (
          <OccurrenceRow
            key={occ.targetIso}
            occ={occ}
            index={i}
            timezone={timezone}
            edit={edits[occ.targetIso]}
            slug={slug}
            serviceId={serviceId}
            professionalId={professionalId}
            minDate={minDate}
            maxDate={maxDate}
            openWeekdays={openWeekdays}
            onSwap={(pick) => onSwap(occ.targetIso, pick)}
            onRemove={() => onRemove(occ.targetIso)}
            onRestore={() => onRestore(occ.targetIso)}
          />
        ))}
      </ul>

      <p className="text-sub text-xs">
        {chosenCount} {chosenCount === 1 ? 'horário será marcado' : 'horários serão marcados'}.
        {preview.some((o) => o.status === 'beyond') ? ' Datas além de 90 dias não entram.' : ''}
      </p>
    </div>
  );
}

function StepConfirmar({
  tenantName,
  slug,
  service,
  professionalId,
  dayLabel,
  slot,
  timezone,
  minDate,
  maxDate,
  openWeekdays,
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
  /** Janela do date-picker de troca de dia (mesmos limites do passo de horário). */
  minDate: string;
  maxDate: string;
  openWeekdays: number[];
  /** Fuso do tenant - pra formatar as datas da prévia de recorrência. */
  timezone: string;
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

  // Já tem conta? (logado ao chegar OU criou agora.)
  const hasAccount = loggedIn || accountCreated;
  // Logado (com nome da conta) não precisa ver/editar contato - a identidade é a conta e o
  // WhatsApp é opcional. Sem conta, mostra os campos (nome + WhatsApp opcional) que também
  // pré-preenchem a criação de conta abaixo.
  const hideContact = hasAccount && nameOk;

  // Primeiro nome pra saudar (da conta logada ou do que ele digitou).
  const firstName = (customerName || name).trim().split(/\s+/)[0] ?? '';

  // Modal de cadastro inline - não tira o cliente do agendamento. Fecha via onSuccess.
  const [signupOpen, setSignupOpen] = useState(false);

  // --- Prévia editável da recorrência --------------------------------------
  // Por ISO-alvo, a decisão do cliente: string = horário escolhido (o alvo ou um trocado);
  // 'removed' = data tirada da série. Sem entrada = default por status (livre entra, conflito não).
  const [preview, setPreview] = useState<SeriesOccurrencePreview[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string | 'removed'>>({});
  // Profissional resolvido da série (vem da prévia); usado ao trocar o dia de uma ocorrência.
  const [previewProfessionalId, setPreviewProfessionalId] = useState('');

  // Recarrega a prévia quando muda frequência/quantidade/slot/profissional; reseta edições.
  useEffect(() => {
    if (frequency === 'NONE') {
      setPreview(null);
      setEdits({});
      setPreviewError(null);
      return;
    }
    let active = true;
    setPreviewLoading(true);
    setPreviewError(null);
    previewPublicSeries({
      slug,
      serviceId: service.id,
      professionalId: professionalId || undefined,
      slotIso: slot.startsAtIso,
      frequency,
      occurrences,
    })
      .then((res) => {
        if (!active) return;
        if ('error' in res) {
          setPreview(null);
          setPreviewError(res.error);
        } else {
          setPreview(res.occurrences);
          setPreviewProfessionalId(res.professionalId);
          setEdits({});
        }
      })
      .catch(() => {
        if (active) setPreviewError('Não foi possível carregar as datas. Tente de novo.');
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [frequency, occurrences, slug, service.id, professionalId, slot.startsAtIso]);

  // ISOs finais do submit: âncora sempre entra; livres no alvo; conflitos só se trocados;
  // removidos/passados/além ficam de fora.
  const chosenIsos = useMemo(() => {
    if (frequency === 'NONE' || !preview) return [];
    const out: string[] = [];
    preview.forEach((occ, i) => {
      if (i === 0) {
        out.push(occ.targetIso);
        return;
      }
      const e = edits[occ.targetIso];
      if (e === 'removed') return;
      if (typeof e === 'string') out.push(e);
      else if (occ.status === 'free') out.push(occ.targetIso);
    });
    return out;
  }, [frequency, preview, edits]);

  const isSeries = frequency !== 'NONE';

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
      <dl className="border-edge bg-paper space-y-3 rounded-[16px] border p-4 text-sm">
        <div className="flex items-start gap-3">
          <CalendarCheck className="text-coral mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <dt className="text-sub">Serviço</dt>
            <dd className="text-foreground font-medium">{service.name}</dd>
            <dd className="text-sub">
              {formatDuration(service.durationMinutes)} · {formatBRL(service.priceCents)}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="text-coral mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <dt className="text-sub">Dia e horário</dt>
            <dd className="text-foreground font-medium capitalize">
              {dayLabel} às {slot.label}
            </dd>
          </div>
        </div>
      </dl>

      {/* Recorrência é propriedade do próprio agendamento - fica junto do resumo.
          Pills rounded-full coral/paper espelhando o app mobile. */}
      <div className="space-y-2.5">
        <p className="text-ink-soft text-[12.5px] font-semibold">Repetir agendamento?</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Repetição">
          {FREQUENCY_ORDER.map((f) => {
            const sel = frequency === f;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={sel}
                onClick={() => onChangeFrequency(f)}
                className={cn(
                  'rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors',
                  sel ? 'bg-coral text-white' : 'border-edge bg-paper text-ink border',
                )}
              >
                {FREQUENCY_LABELS[f]}
              </button>
            );
          })}
        </div>
        {isSeries ? (
          <div className="space-y-3 pt-0.5">
            <div className="space-y-2">
              <p className="text-sub text-xs">Quantas vezes no total?</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Número de ocorrências">
                {RECURRENCE_OCCURRENCE_OPTIONS.map((n) => {
                  const sel = occurrences === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={sel}
                      onClick={() => onChangeOccurrences(n)}
                      className={cn(
                        'rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
                        sel ? 'bg-coral text-white' : 'border-edge bg-paper text-ink border',
                      )}
                    >
                      {n}×
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-sub text-[11.5px]">
              Mantemos o mesmo dia da semana e horário. Onde não há vaga, você troca ou remove.
            </p>

            <SeriesPreviewList
              preview={preview}
              loading={previewLoading}
              error={previewError}
              timezone={timezone}
              edits={edits}
              slug={slug}
              serviceId={service.id}
              professionalId={previewProfessionalId}
              minDate={minDate}
              maxDate={maxDate}
              openWeekdays={openWeekdays}
              onSwap={(iso, pick) => setEdits((e) => ({ ...e, [iso]: pick }))}
              onRemove={(iso) => setEdits((e) => ({ ...e, [iso]: 'removed' }))}
              onRestore={(iso) =>
                setEdits((e) => {
                  const copy = { ...e };
                  delete copy[iso];
                  return copy;
                })
              }
              chosenCount={chosenIsos.length}
            />
          </div>
        ) : null}
      </div>

      {/* Contato. Logado com dados completos não vê nada (a conta já tem). Convidado
          (ou logado sem telefone) preenche os campos. Ordem (Nome, WhatsApp) e visual
          "paper" espelham o app mobile. */}
      {hideContact ? null : (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="booking-name"
              className="text-ink-soft mb-1.5 block text-[12.5px] font-semibold"
            >
              Nome
            </label>
            <input
              id="booking-name"
              name="display-name"
              autoComplete="name"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
              aria-invalid={name.length > 0 && !nameOk}
              className={FIELD_INPUT}
            />
          </div>

          <div>
            <label
              htmlFor="booking-phone"
              className="text-ink-soft mb-1.5 block text-[12.5px] font-semibold"
            >
              WhatsApp <span className="text-sub font-normal">(opcional)</span>
            </label>
            <input
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
              className={FIELD_INPUT}
            />
            <p id="booking-phone-hint" className="text-sub mt-1.5 text-[11.5px]">
              Se quiser receber lembretes por lá. Inclua o DDD.
            </p>
          </div>
        </div>
      )}

      {/* Estado da conta (boas-vindas / logado / convite). */}
      {accountCreated ? (
        <div className="border-green/30 bg-green/5 space-y-1 rounded-2xl border p-4">
          <p className="text-foreground flex items-center gap-1.5 text-sm font-medium">
            <PartyPopper className="text-green h-4 w-4 shrink-0" aria-hidden="true" />
            Boas-vindas{firstName ? `, ${firstName}` : ''}! Sua conta está pronta.
          </p>
          <p className="text-sub text-sm">
            É só confirmar o agendamento abaixo. Pra ele entrar no seu histórico, valide seu
            WhatsApp na sua conta.
          </p>
        </div>
      ) : loggedIn ? null : (
        <div className="border-green/20 bg-accent space-y-3 rounded-2xl border p-4">
          <p className="text-foreground flex items-center gap-1.5 text-sm font-medium">
            <Sparkles className="text-green h-4 w-4 shrink-0" aria-hidden="true" />
            Crie sua conta pra confirmar
          </p>
          <ul className="text-sub space-y-1 text-xs">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="text-green mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Recebe a confirmação por e-mail e na sua conta
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="text-green mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Acompanha, remarca ou cancela quando quiser
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="text-green mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              WhatsApp é opcional - só se quiser lembretes por lá
            </li>
          </ul>
          <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="sm" className="w-full rounded-xl">
                <UserIcon className="h-4 w-4" />
                Criar minha conta
              </Button>
            </DialogTrigger>
            <DialogContent dismissable={false} className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl font-semibold">Criar minha conta</DialogTitle>
              </DialogHeader>
              <p className="text-sub -mt-2 text-sm">
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
          <p className="text-sub text-center text-[11px]">
            Já tem conta?{' '}
            <Link
              href={`/login?next=/${slug}`}
              className="text-coral font-semibold underline underline-offset-2"
            >
              Entrar
            </Link>
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
        {isSeries
          ? chosenIsos.map((iso) => <input key={iso} type="hidden" name="slotIsos" value={iso} />)
          : null}

        {error ? (
          <p
            role="alert"
            className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm"
          >
            {error}
          </p>
        ) : null}

        <ConfirmButton
          disabled={
            !hasAccount ||
            !nameOk ||
            lookingUp ||
            (isSeries && (previewLoading || chosenIsos.length < 2))
          }
          label={
            isSeries
              ? `Confirmar ${chosenIsos.length} ${chosenIsos.length === 1 ? 'horário' : 'horários'}`
              : undefined
          }
        />
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tela de sucesso (hero animado + blocos web-only abaixo)
// ---------------------------------------------------------------------------

// A confirmação de agendamento hoje sai por e-mail + área logada (app/web) - NÃO por WhatsApp:
// o plano base não dispara confirmação por WhatsApp (não há template 'created' na plataforma).
// Deixar false até A6 (saída transacional de confirmação pelo número da plataforma). Quando
// existir, virar por-tenant (canal ativo) em vez de constante. Ver issue A6.
const WHATSAPP_CONFIRMATION_ACTIVE = false;

/**
 * Painel de sucesso animado (espelha o overlay do app mobile): o card verde-escuro
 * sobe da base, o selo entra com "mola" + anel pulsando, e título/card escalonam.
 */
function SuccessShell({
  confirmed,
  tenantName,
  logoUrl,
  serviceLine,
  whenLine,
  priceLabel,
  title,
  message,
}: {
  confirmed: boolean;
  tenantName: string;
  logoUrl: string | null;
  /** Subtítulo do card (nome do serviço), sob o nome do negócio - como no app. */
  serviceLine: string | null;
  /** Data/hora em serif de destaque ("Sáb, 05/07 · 15h30") - como no app. */
  whenLine: string | null;
  priceLabel: string | null;
  /** Override do título (a série usa "Tudo marcado!"). Default = confirmado/pendente. */
  title?: { plain: string; accent: string };
  /** Override da mensagem (a série tem copy própria). Default = confirmado/pendente. */
  message?: string;
}) {
  const heading =
    title ??
    (confirmed ? { plain: 'Tá', accent: 'marcado!' } : { plain: 'Horário', accent: 'reservado!' });
  const body =
    message ??
    (confirmed
      ? WHATSAPP_CONFIRMATION_ACTIVE
        ? 'Enviamos a confirmação pro seu WhatsApp e e-mail. A gente te lembra antes, relaxa.'
        : 'Enviamos a confirmação pro seu e-mail e ela está na sua conta. A gente te lembra antes, relaxa.'
      : WHATSAPP_CONFIRMATION_ACTIVE
        ? 'O estabelecimento vai confirmar - você não precisa fazer mais nada. Avisamos pelo WhatsApp e e-mail.'
        : 'O estabelecimento vai confirmar - você não precisa fazer mais nada. Avisamos por e-mail e na sua conta.');
  return (
    <div className="animate-sheet-up bg-green-deep overflow-hidden rounded-[20px] px-6 pb-7 pt-9 text-center">
      <div className="flex justify-center">
        <span
          className={cn(
            'animate-seal-pop flex h-[84px] w-[84px] items-center justify-center rounded-[28px]',
            confirmed ? 'bg-green-bright animate-pulse-ring' : 'bg-coral animate-pulse-ring-coral',
          )}
        >
          <Check
            className={cn('h-11 w-11', confirmed ? 'text-green-deep' : 'text-white')}
            strokeWidth={3}
          />
        </span>
      </div>

      <h2
        className="animate-rise text-cream mt-6 font-serif text-[32px] font-medium"
        style={{ animationDelay: '0.12s' }}
      >
        {heading.plain}{' '}
        <span className={cn('italic', confirmed ? 'text-green-bright' : 'text-coral-soft')}>
          {heading.accent}
        </span>
      </h2>
      <p
        className="animate-rise mx-auto mt-2.5 max-w-[16rem] text-sm leading-6 text-[#8fbfa4]"
        style={{ animationDelay: '0.18s' }}
      >
        {body}
      </p>

      <div className="animate-rise mt-6" style={{ animationDelay: '0.24s' }}>
        <div className="rounded-[20px] border border-[rgba(47,211,122,0.28)] bg-[rgba(255,253,248,0.06)] p-4 text-left">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-[14px] object-cover" />
            ) : (
              <span className="bg-coral/20 text-coral flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] font-serif text-lg font-semibold">
                {tenantName.charAt(0)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-paper truncate font-serif text-base font-semibold">{tenantName}</p>
              {serviceLine ? (
                <p className="mt-0.5 truncate text-xs font-medium text-[#8fbfa4]">{serviceLine}</p>
              ) : null}
            </div>
          </div>
          {whenLine || priceLabel ? (
            <>
              <div className="my-3 border-t border-dashed border-[rgba(143,191,164,0.4)]" />
              <div className="flex items-center justify-between gap-3">
                {whenLine ? (
                  <p className="text-cream flex-1 font-serif text-xl font-semibold capitalize">
                    {whenLine}
                  </p>
                ) : (
                  <span className="flex-1" />
                )}
                {priceLabel ? (
                  <p className="text-coral shrink-0 font-serif text-base font-semibold">
                    {priceLabel}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
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
      <p className="text-sub text-sm">
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
      <p className="text-sub text-sm">
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
  serviceLine,
  whenLine,
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
  serviceLine: string | null;
  whenLine: string | null;
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
        serviceLine={serviceLine}
        whenLine={whenLine}
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
  serviceLine,
  whenLine,
  priceLabel,
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
  serviceLine: string | null;
  whenLine: string | null;
  priceLabel: string | null;
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
        serviceLine={serviceLine}
        whenLine={whenLine}
        priceLabel={priceLabel}
        title={{ plain: 'Tudo', accent: 'marcado!' }}
        message={`Criamos ${createdCount} ${createdCount === 1 ? 'horário recorrente' : 'horários recorrentes'}. ${
          WHATSAPP_CONFIRMATION_ACTIVE
            ? 'Enviamos a confirmação pro seu WhatsApp e e-mail.'
            : 'Você acompanha tudo na sua conta e a gente te lembra antes de cada horário.'
        }`}
      />

      {skippedFmt.length > 0 ? (
        <div className="bg-muted text-sub rounded-xl border p-4 text-left text-sm">
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
        <p className="text-sub text-center text-xs">
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
        <p className="text-sub text-xs">
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
          <p id="payment-document-hint" className="text-sub text-xs">
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
              <Label className="text-sub text-xs">Pix copia e cola</Label>
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
          <p className="text-sub text-xs">
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
  // Troca de dia de uma ocorrência alcança o horizonte de recorrência (90d), maior que o
  // de agendamento avulso (maxDate). Vai só pro calendário do StepConfirmar.
  const seriesMaxDate = useMemo(
    () =>
      isoDateInTz(new Date(Date.now() + (RECURRENCE_MAX_HORIZON_DAYS - 1) * 86_400_000), timezone),
    [timezone],
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

  // Cliente logado já agenda direto pelo rodapé do horário (igual ao app mobile): não faz
  // sentido pedir "Seus dados" de quem já tem conta. O WhatsApp é opcional, então basta ter
  // um nome (que vem da conta). Sem conta, segue pro passo de confirmar (entrar/criar conta).
  const contactReady = name.trim().length >= 2;
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
  // Card de sucesso: serviço (subtítulo) + data/hora do slot (linha em serif), separados
  // como no app - em vez do `summary` concatenado do servidor.
  const doneServiceLine = selectedService?.name ?? null;
  const doneWhen = selectedSlot ? buildConfirmWhen(selectedSlot.startsAtIso, timezone) : null;

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
          timezone={timezone}
          minDate={minDate}
          maxDate={seriesMaxDate}
          openWeekdays={openWeekdays}
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
            serviceLine={doneServiceLine}
            whenLine={doneWhen}
            priceLabel={donePrice}
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
            serviceLine={doneServiceLine}
            whenLine={doneWhen}
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
