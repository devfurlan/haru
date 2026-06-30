import { Calendar, MessageCircle, UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { formatBRL, formatDuration, minutesToHHMM } from '@/lib/format';

import { Button } from '@/components/ui/button';

import { BOOKING_HORIZON_DAYS, buildBookingDays } from '@/lib/booking-days';
import { getCustomerAccount } from '@/lib/customer-auth';

import { loadPublicTenant } from './_tenant';
import { PublicBooking } from './public-booking';

const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

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
  // com expediente nos próximos dias. A lista de dias em si é gerada no client
  // (carrossel + date-picker) a partir do fuso + dias-da-semana com expediente;
  // aqui só precisamos saber se EXISTE algum dia atendível no horizonte.
  const openWeekdays = [...new Set(tenant.scheduleBlocks.map((b) => b.weekday))];
  const hasBookableDay = buildBookingDays(tenant.timezone, new Set(openWeekdays)).length > 0;
  const showBooking = tenant.publicBookingEnabled && tenant.services.length > 0 && hasBookableDay;

  const customerAccount = await getCustomerAccount();

  return (
    <main className="bg-muted/20 min-h-screen">
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
        <div className="flex justify-end">
          <Button asChild variant="ghost" size="sm">
            <Link href={customerAccount ? '/conta' : '/conta/entrar'}>
              <UserRound className="h-4 w-4" />
              {customerAccount ? 'Minha conta' : 'Entrar na minha conta'}
            </Link>
          </Button>
        </div>
        <header className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-3">
            {tenant.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
            )}
            <h1 className="font-serif text-4xl font-semibold tracking-[-0.01em]">{tenant.name}</h1>
          </div>
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
              professionalIds: s.professionals.map((p) => p.professionalId),
            }))}
            professionals={tenant.users.map((u) => ({ id: u.id, name: u.name }))}
            timezone={tenant.timezone}
            openWeekdays={openWeekdays}
            horizonDays={BOOKING_HORIZON_DAYS}
          />
        )}

        {waLink && (
          <div className="flex flex-col items-center gap-2">
            {showBooking && <p className="text-muted-foreground text-xs">Prefere conversar?</p>}
            <Button asChild variant={showBooking ? 'outline' : 'coral'} size="pill">
              <a href={waLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" />
                Agendar pelo WhatsApp
              </a>
            </Button>
          </div>
        )}

        {/* Vitrine estática de serviços - só quando o agendamento online está
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
