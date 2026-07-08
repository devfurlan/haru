import { Heart, Scissors, Sparkles, Stethoscope } from 'lucide-react';
import Link from 'next/link';

import { RatingBadge } from '@/components/customer/rating-badge';
import { TenantAvatar } from '@/components/customer/tenant-avatar';
import { requireCustomerAccount } from '@/lib/customer-auth';
import {
  getCustomerAppointments,
  getRecentTenants,
  type CustomerAppointmentItem,
  type RecentTenant,
} from '@/lib/customer';
import { getFavorites, type FavoriteItem } from '@/app/(customer)/actions';
import { formatBRL } from '@haru/shared';

import { PendingPhoneNotice } from './pending-phone-notice';

export const dynamic = 'force-dynamic';

// Saudação pela hora em São Paulo (fuso padrão do produto); server-safe, sem hidratação.
function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return 'Bom dia,';
  if (hour < 18) return 'Boa tarde,';
  return 'Boa noite,';
}

// "hoje" / "amanhã" / "em N dias" no fuso do tenant.
function relativeDay(startsAt: Date, tz: string): string {
  const ymd = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  const diff = Math.round((Date.parse(ymd(startsAt)) - Date.parse(ymd(new Date()))) / 86400000);
  if (diff <= 0) return 'hoje';
  if (diff === 1) return 'amanhã';
  return `em ${diff} dias`;
}

// "15h30" no fuso do tenant.
function timeLabel(startsAt: Date, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(startsAt)
    .replace(':', 'h');
}

// "Qua, 9 jul" no fuso do tenant.
function dayLabel(startsAt: Date, tz: string): string {
  const wd = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, weekday: 'short' })
    .format(startsAt)
    .replace('.', '');
  const day = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, day: 'numeric' }).format(startsAt);
  const mon = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, month: 'short' })
    .format(startsAt)
    .replace('.', '');
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${day} ${mon}`;
}

function capitalize(s: string | null): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Card do próximo agendamento (coluna direita do hero esmeralda).
function NextAppointmentCard({ item }: { item: CustomerAppointmentItem }) {
  const tz = item.tenant.timezone;
  return (
    <div className="bg-green-card shadow-soft rounded-[22px] border border-[rgba(47,211,122,0.32)] p-5">
      <div className="flex items-center gap-3">
        <TenantAvatar name={item.tenant.name} logoUrl={item.tenant.logoUrl} size={52} radius={15} />
        <div className="min-w-0 flex-1">
          <p className="text-paper truncate font-serif text-[17px]">{item.tenant.name}</p>
          <p className="truncate text-[12.5px] font-medium text-[#8fbfa4]">
            {item.serviceName}
            {item.professionalName ? ` · com ${item.professionalName}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-cream font-serif text-[22px] leading-none">
            {timeLabel(item.startsAt, tz)}
          </p>
          <p className="mt-1 text-xs font-medium text-[#8fbfa4]">{dayLabel(item.startsAt, tz)}</p>
        </div>
      </div>

      <div className="my-4 border-t border-dashed border-[rgba(143,191,164,0.4)]" />

      <div className="flex items-center gap-2.5">
        <div className="flex-1">
          <p className="text-[12px] font-medium text-[#8fbfa4]">valor</p>
          <p className="text-green-bright font-serif text-[19px]">{formatBRL(item.priceCents)}</p>
        </div>
        <Link
          href={`/conta/agendamentos/${item.id}`}
          className="text-cream rounded-xl border border-[rgba(250,245,234,0.26)] px-4 py-2.5 text-[13px] font-bold transition-colors hover:bg-[rgba(250,245,234,0.08)]"
        >
          Remarcar
        </Link>
        <Link
          href={`/conta/agendamentos/${item.id}`}
          className="bg-coral rounded-xl px-4 py-2.5 text-[13px] font-bold text-white transition-transform active:scale-[0.97]"
        >
          Ver detalhes
        </Link>
      </div>
    </div>
  );
}

// Bloco de capa reusável (imagem ou fallback com a logo/inicial).
function CoverBox({
  name,
  coverUrl,
  logoUrl,
  className,
}: {
  name: string;
  coverUrl: string | null;
  logoUrl: string | null;
  className?: string;
}) {
  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={coverUrl} alt={name} className={`object-cover ${className ?? ''}`} />
    );
  }
  return (
    <div className={`bg-chip flex items-center justify-center ${className ?? ''}`}>
      <TenantAvatar name={name} logoUrl={logoUrl} size={56} radius={16} />
    </div>
  );
}

// Card de estabelecimento recente ("Volte pra…").
function RecentCard({ t }: { t: RecentTenant }) {
  return (
    <Link
      href={`/${t.slug}`}
      className="border-line bg-paper block overflow-hidden rounded-[18px] border p-2.5 transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_36px_-22px_rgba(10,51,36,0.4)]"
    >
      <div className="relative">
        <CoverBox
          name={t.name}
          coverUrl={t.coverUrl}
          logoUrl={t.logoUrl}
          className="h-[110px] w-full rounded-[13px]"
        />
        <RatingBadge avg={t.ratingAvg} count={t.ratingCount} className="absolute left-2 top-2" />
      </div>
      <div className="px-1.5 pb-1 pt-2.5">
        <p className="text-ink truncate font-serif text-[15px]">{t.name}</p>
        {t.segment ? (
          <p className="text-sub mt-0.5 truncate text-[12px]">{capitalize(t.segment)}</p>
        ) : null}
      </div>
    </Link>
  );
}

// Linha da sidebar "Seus favoritos".
function FavoriteRow({ f }: { f: FavoriteItem }) {
  return (
    <div className="border-line bg-paper flex items-center gap-3 rounded-[16px] border p-3 transition-colors hover:border-[#d8cfba]">
      <CoverBox
        name={f.name}
        coverUrl={f.coverUrl}
        logoUrl={f.logoUrl}
        className="h-11 w-11 shrink-0 rounded-[13px]"
      />
      <Link href={`/${f.slug}`} className="min-w-0 flex-1">
        <p className="text-ink truncate text-[14px] font-semibold">{f.name}</p>
        {f.segment ? (
          <p className="text-sub truncate text-[11.5px]">{capitalize(f.segment)}</p>
        ) : null}
      </Link>
      <Link
        href={`/${f.slug}`}
        className="text-coral shrink-0 rounded-full border border-[#ffd9cd] px-3.5 py-2 text-[12.5px] font-bold transition-colors hover:bg-[#ffeee9]"
      >
        Agendar
      </Link>
    </div>
  );
}

const CATEGORY_CARDS = [
  { label: 'Barbearia', sub: 'corte, barba, navalha', icon: Scissors, cat: 'barbearia' },
  { label: 'Salão', sub: 'cabelo, unhas, estética', icon: Sparkles, cat: 'salão' },
  { label: 'Clínica', sub: 'saúde e bem-estar', icon: Stethoscope, cat: 'clínica' },
];

export default async function CustomerHomePage() {
  const account = await requireCustomerAccount();
  const [{ upcoming }, favorites, recents] = await Promise.all([
    getCustomerAppointments(account),
    getFavorites(),
    getRecentTenants(account),
  ]);
  const next = upcoming[0] ?? null;
  const firstName = (account.name ?? '').trim().split(/\s+/)[0];
  // Sem telefone confirmado, a conta ainda não "enxerga" nenhum agendamento (o claim
  // por OTP não rodou). O vazio não é "não tem" - é "falta confirmar o WhatsApp".
  const phonePending = !account.phone;
  const emptyBelow = recents.length === 0 && favorites.length === 0;

  return (
    <div>
      {/* HERO esmeralda full-bleed: saudação + próximo agendamento (ou "tá tudo livre") */}
      <section className="bg-green-deep relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(520px 300px at 85% 0%, rgba(47,211,122,0.20), transparent), radial-gradient(460px 300px at 6% 100%, rgba(255,90,54,0.13), transparent)',
          }}
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-[1280px] flex-col items-start gap-8 px-5 py-10 md:flex-row md:items-center md:gap-12 md:px-8 md:py-11">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-[#8fbfa4]">{greeting()}</p>
            <h1 className="text-cream mt-1 font-serif text-[34px] leading-[1.02] tracking-[-0.02em] md:text-[46px]">
              {firstName || 'Bem-vindo'}
            </h1>
            {next ? (
              <>
                <p className="mt-3.5 max-w-[380px] text-[15px] leading-[1.55] text-[#8fbfa4]">
                  Seu próximo horário está marcado. A gente te lembra antes, relaxa.
                </p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Link
                    href="/conta/buscar"
                    className="bg-coral rounded-[14px] px-6 py-3 text-[14px] font-bold text-white transition-transform active:scale-[0.97]"
                  >
                    Agendar outro horário
                  </Link>
                  <Link
                    href="/conta/agendamentos"
                    className="text-cream rounded-[14px] border border-[rgba(250,245,234,0.28)] px-6 py-3 text-[14px] font-bold transition-colors hover:bg-[rgba(250,245,234,0.08)]"
                  >
                    Ver agenda
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-cream mt-4 font-serif text-[26px] leading-[1.15] tracking-[-0.01em] md:text-[30px]">
                  Tá tudo <em className="text-green-bright italic">livre</em> por aqui
                </p>
                <p className="mt-2.5 max-w-[400px] text-[15px] leading-[1.55] text-[#8fbfa4]">
                  Nenhum horário marcado. Escolhe um lugar que a gente marca em segundos.
                </p>
                <Link
                  href="/conta/buscar"
                  className="bg-coral mt-5 inline-block rounded-[15px] px-7 py-3.5 text-[15px] font-bold text-white transition-transform active:scale-[0.97]"
                >
                  Buscar estabelecimento
                </Link>
              </>
            )}
          </div>

          <div className="w-full md:w-[480px] md:flex-none">
            {next ? (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="bg-green-bright h-[7px] w-[7px] animate-pulse rounded-full"
                    aria-hidden
                  />
                  <p className="text-green-bright text-[11px] font-bold uppercase tracking-[0.14em]">
                    Próximo agendamento · {relativeDay(next.startsAt, next.tenant.timezone)}
                  </p>
                </div>
                <NextAppointmentCard item={next} />
              </>
            ) : (
              <div className="rounded-[22px] border border-dashed border-[rgba(143,191,164,0.4)] bg-[rgba(255,253,248,0.05)] p-7 text-center">
                <div className="bg-green-bright/15 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
                  <Heart className="text-green-bright h-6 w-6" aria-hidden />
                </div>
                <p className="text-cream mt-3.5 font-serif text-[17px]">
                  Seu primeiro agendamento aparece aqui
                </p>
                <p className="mt-1.5 text-[13px] leading-[1.5] text-[#8fbfa4]">
                  Com lembrete antes do horário e remarcação num toque.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Abaixo do hero: aviso de WhatsApp + "Volte pra…" + favoritos */}
      <div className="mx-auto max-w-[1280px] space-y-8 px-5 py-8 md:px-8 md:py-10">
        {phonePending ? <PendingPhoneNotice pendingPhone={account.pendingPhone} /> : null}

        {emptyBelow ? (
          <section>
            <h2 className="text-ink font-serif text-[21px]">Comece por aqui</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {CATEGORY_CARDS.map((c) => {
                const Icon = c.icon;
                return (
                  <Link
                    key={c.cat}
                    href={`/conta/buscar?cat=${encodeURIComponent(c.cat)}`}
                    className="border-line bg-paper block rounded-[18px] border p-[18px] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_36px_-22px_rgba(10,51,36,0.4)]"
                  >
                    <div className="bg-chip flex h-[42px] w-[42px] items-center justify-center rounded-[13px]">
                      <Icon className="text-green-deep h-5 w-5" aria-hidden />
                    </div>
                    <p className="text-ink mt-3 font-serif text-[16px]">{c.label}</p>
                    <p className="text-sub mt-0.5 text-[12.5px]">{c.sub}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          <div className="flex flex-col gap-10 md:flex-row md:items-start">
            {recents.length > 0 ? (
              <section className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-ink font-serif text-[21px]">Volte pra…</h2>
                  <Link href="/conta/buscar" className="text-coral text-[13px] font-semibold">
                    ver tudo
                  </Link>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {recents.map((t) => (
                    <RecentCard key={t.id} t={t} />
                  ))}
                </div>
              </section>
            ) : null}

            {favorites.length > 0 ? (
              <aside className="w-full md:w-[360px] md:flex-none">
                <h2 className="text-ink font-serif text-[21px]">Seus favoritos</h2>
                <div className="mt-4 flex flex-col gap-2.5">
                  {favorites.map((f) => (
                    <FavoriteRow key={f.tenantId} f={f} />
                  ))}
                  <Link
                    href="/conta/buscar?tab=favoritos"
                    className="text-sub rounded-[14px] border border-dashed border-[#d8cfba] py-2.5 text-center text-[12.5px] font-semibold transition-colors hover:bg-[#f4efe2]"
                  >
                    Gerenciar favoritos em Buscar
                  </Link>
                </div>
              </aside>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
