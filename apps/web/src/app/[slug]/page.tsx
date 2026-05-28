import { Calendar, MessageCircle } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { prisma } from '@haru/database';

import { Button } from '@/components/ui/button';

const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Slugs reservados — não bater com rotas conhecidas
const RESERVED_SLUGS = new Set([
  'login',
  'signup',
  'dashboard',
  'appointments',
  'conversations',
  'schedule',
  'services',
  'settings',
  'blog',
  'api',
  'admin',
]);

const FILE_LIKE_SLUG = /\.[a-z0-9]+$/i;

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function loadTenant(slug: string) {
  if (RESERVED_SLUGS.has(slug) || FILE_LIKE_SLUG.test(slug)) return null;
  return prisma.tenant.findUnique({
    where: { slug },
    include: {
      services: { where: { active: true }, orderBy: { name: 'asc' } },
      scheduleBlocks: { orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }] },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await loadTenant(slug);
  if (!tenant) return { title: 'Não encontrado' };
  return {
    title: tenant.name,
    description: `Agende pelo WhatsApp em ${tenant.name}.`,
  };
}

export default async function TenantPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await loadTenant(slug);
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

  return (
    <main className="bg-muted/20 min-h-screen">
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
        <header className="space-y-2 text-center">
          <h1 className="font-serif text-4xl font-semibold tracking-[-0.01em]">{tenant.name}</h1>
          <p className="text-muted-foreground text-sm">Agende pelo WhatsApp em segundos.</p>
        </header>

        {waLink && (
          <div className="flex justify-center">
            <Button asChild variant="coral" size="pill">
              <a href={waLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" />
                Agendar pelo WhatsApp
              </a>
            </Button>
          </div>
        )}

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
          Powered by Demandaê
        </footer>
      </div>
    </main>
  );
}
