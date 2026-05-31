import { Calendar, MessageCircle } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { formatBRL, formatDuration, minutesToHHMM } from '@/lib/format';

import { Button } from '@/components/ui/button';

import { loadPublicTenant } from './_tenant';
import { PublicBooking } from './public-booking';

const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Quantos dias adiante oferecer no agendamento online (só os com expediente entram).
const BOOKING_HORIZON_DAYS = 14;

/**
 * Próximos dias (a partir de hoje, no fuso do tenant) que têm ao menos um
 * ScheduleBlock no weekday, rotulados "sáb., 30/05". Calculado no servidor pra
 * usar o fuso do tenant — nunca o do browser do cliente.
 */
function buildBookingDays(
  timezone: string,
  blocks: { weekday: number }[],
): { value: string; label: string }[] {
  const openWeekdays = new Set(blocks.map((b) => b.weekday));
  if (openWeekdays.size === 0) return [];

  const isoFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const labelFmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
  const weekdayFmt = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' });
  const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  const days: { value: string; label: string }[] = [];
  const now = Date.now();
  for (let i = 0; i < BOOKING_HORIZON_DAYS; i++) {
    const date = new Date(now + i * 24 * 60 * 60 * 1000);
    const weekday = WD[weekdayFmt.format(date).slice(0, 3)] ?? 0;
    if (!openWeekdays.has(weekday)) continue;
    days.push({ value: isoFmt.format(date), label: labelFmt.format(date) });
  }
  return days;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await loadPublicTenant(slug);
  if (!tenant) return { title: 'Não encontrado' };
  return {
    title: tenant.name,
    description: `Agende online ou pelo WhatsApp em ${tenant.name}.`,
  };
}

export default async function TenantPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await loadPublicTenant(slug);
  if (!tenant) notFound();

  // Agrupa horários por weekday
  const byDay = new Map<number, { startMinute: number; endMinute: number }[]>();
  for (let i = 0; i < 7; i++) byDay.set(i, []);
  for (const b of tenant.scheduleBlocks) {
    byDay.get(b.weekday)!.push({ startMinute: b.startMinute, endMinute: b.endMinute });
  }
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];

  const waLink = tenant.whatsappDisplayPhone
    ? `https://wa.me/${tenant.whatsappDisplayPhone}?text=${encodeURIComponent('Olá! Quero agendar um horário.')}`
    : null;

  // Agendamento online: só mostra se ligado, com serviços e pelo menos um dia
  // com expediente nos próximos dias.
  const bookingDays = buildBookingDays(tenant.timezone, tenant.scheduleBlocks);
  const showBooking =
    tenant.publicBookingEnabled && tenant.services.length > 0 && bookingDays.length > 0;

  return (
    <main className="bg-muted/20 min-h-screen">
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
        <header className="space-y-2 text-center">
          <h1 className="font-serif text-4xl font-semibold tracking-[-0.01em]">{tenant.name}</h1>
          <p className="text-muted-foreground text-sm">
            {showBooking ? 'Agende seu horário em segundos.' : 'Agende pelo WhatsApp em segundos.'}
          </p>
        </header>

        {showBooking && (
          <PublicBooking
            slug={tenant.slug}
            services={tenant.services.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              durationMinutes: s.durationMinutes,
              priceCents: s.priceCents,
            }))}
            days={bookingDays}
          />
        )}

        {waLink && (
          <div className="flex flex-col items-center gap-2">
            {showBooking && (
              <p className="text-muted-foreground text-xs">Prefere conversar?</p>
            )}
            <Button asChild variant={showBooking ? 'outline' : 'coral'} size="pill">
              <a href={waLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" />
                Agendar pelo WhatsApp
              </a>
            </Button>
          </div>
        )}

        {/* Vitrine estática de serviços — só quando o agendamento online está
            indisponível. Com booking ativo, a vitrine vive dentro do <PublicBooking>
            (é o 1º passo: clicar num serviço inicia o agendamento), evitando listar
            os serviços duas vezes. */}
        {!showBooking && (
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-semibold">Serviços</h2>
            {tenant.services.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum serviço cadastrado ainda.</p>
            ) : (
              <ul className="space-y-2">
                {tenant.services.map((s) => (
                  <li
                    key={s.id}
                    className="bg-card flex items-start justify-between gap-3 rounded-lg border p-4 shadow-sm"
                  >
                    <div>
                      <div className="font-medium">{s.name}</div>
                      {s.description && (
                        <div className="text-muted-foreground text-sm">{s.description}</div>
                      )}
                      <div className="text-muted-foreground text-xs">
                        {formatDuration(s.durationMinutes)}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold">{formatBRL(s.priceCents)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
            <Calendar className="h-5 w-5" />
            Horários de atendimento
          </h2>
          <ul className="bg-card overflow-hidden rounded-lg border shadow-sm">
            {dayOrder.map((wd) => {
              const blocks = byDay.get(wd) ?? [];
              return (
                <li
                  key={wd}
                  className="flex items-center justify-between border-b px-4 py-2 text-sm last:border-b-0"
                >
                  <span className="font-medium">{WEEKDAY_NAMES[wd]}</span>
                  <span className="text-muted-foreground">
                    {blocks.length === 0
                      ? 'Fechado'
                      : blocks
                          .map(
                            (b) => `${minutesToHHMM(b.startMinute)}–${minutesToHHMM(b.endMinute)}`,
                          )
                          .join(', ')}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <footer className="text-muted-foreground pt-4 text-center text-xs">
          Powered by{' '}
          <a
            href={process.env.NEXT_PUBLIC_APP_URL || 'https://www.demandae.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground font-medium underline-offset-4 hover:underline"
          >
            Demandaê
          </a>
        </footer>
      </div>
    </main>
  );
}
