import { CalendarPlus, Heart, Search } from 'lucide-react';
import Link from 'next/link';

import { TenantAvatar } from '@/components/customer/tenant-avatar';
import { requireCustomerAccount } from '@/lib/customer-auth';
import { getCustomerAppointments, type CustomerAppointmentItem } from '@/lib/customer';
import { getFavorites } from '@/app/(customer)/actions';

import { ConfirmPhoneDialog } from './confirm-phone-dialog';
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

// "15h30" + "Sáb" no fuso do tenant.
function whenParts(startsAt: Date, tz: string) {
  const f = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('pt-BR', { timeZone: tz, ...opts }).format(startsAt).replace('.', '');
  const wd = f({ weekday: 'short' });
  return {
    time: f({ hour: '2-digit', minute: '2-digit' }).replace(':', 'h'),
    weekday: `${wd.charAt(0).toUpperCase()}${wd.slice(1)}`,
  };
}

function NextAppointmentCard({ item }: { item: CustomerAppointmentItem }) {
  const { time, weekday } = whenParts(item.startsAt, item.tenant.timezone);
  return (
    <div className="bg-green-card shadow-soft rounded-[22px] border border-[rgba(47,211,122,0.32)] p-4">
      <div className="flex items-center gap-3">
        <TenantAvatar name={item.tenant.name} logoUrl={item.tenant.logoUrl} size={50} radius={15} />
        <div className="min-w-0 flex-1">
          <p className="text-paper truncate font-serif text-[17px]">{item.tenant.name}</p>
          <p className="truncate text-[12.5px] font-medium text-[#8fbfa4]">
            {item.serviceName}
            {item.professionalName ? ` · com ${item.professionalName}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-cream text-[15px] font-bold">{time}</p>
          <p className="text-xs text-[#8fbfa4]">{weekday}</p>
        </div>
      </div>

      <div className="my-4 border-t border-dashed border-[rgba(143,191,164,0.4)]" />

      <div className="flex gap-2.5">
        <Link
          href={`/conta/agendamentos/${item.id}`}
          className="bg-coral flex-1 rounded-[13px] py-3 text-center text-sm font-bold text-white transition-transform active:scale-[0.97]"
        >
          Ver detalhes
        </Link>
        <Link
          href={`/conta/agendamentos/${item.id}`}
          className="text-cream flex-1 rounded-[13px] border border-[rgba(250,245,234,0.26)] py-3 text-center text-sm font-bold transition-transform active:scale-[0.97]"
        >
          Remarcar
        </Link>
      </div>
    </div>
  );
}

function EmptyNextCard() {
  return (
    <div className="border-line bg-paper rounded-[22px] border p-5">
      <p className="text-ink font-serif text-lg">
        Tá tudo <em className="text-green-bright italic">livre</em>
      </p>
      <p className="text-sub mt-1 text-[13px]">Nenhum horário marcado.</p>
      <Link
        href="/conta/buscar"
        className="bg-coral mt-4 block rounded-2xl py-3.5 text-center text-[15px] font-bold text-white transition-transform active:scale-[0.97]"
      >
        Buscar estabelecimento
      </Link>
    </div>
  );
}

function Shortcut({
  href,
  icon,
  iconBg,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="border-line bg-paper flex-1 rounded-[18px] border p-3.5 transition-transform active:scale-[0.98]"
    >
      <div
        className={`flex h-[38px] w-[38px] items-center justify-center rounded-xl ${iconBg}`}
        aria-hidden
      >
        {icon}
      </div>
      <p className="text-ink mt-2.5 text-[14.5px] font-semibold">{title}</p>
      <p className="text-sub mt-0.5 text-[11.5px]">{subtitle}</p>
    </Link>
  );
}

export default async function CustomerHomePage() {
  const account = await requireCustomerAccount();
  const [{ upcoming, past }, favorites] = await Promise.all([
    getCustomerAppointments(account),
    getFavorites(),
  ]);
  const next = upcoming[0] ?? null;
  const firstName = (account.name ?? '').trim().split(/\s+/)[0];
  const initial = (firstName || account.email || 'D').charAt(0).toUpperCase();
  // Sem telefone confirmado, a conta ainda não "enxerga" nenhum agendamento (o claim
  // por OTP não rodou). O vazio não é "não tem" - é "falta confirmar o WhatsApp".
  const phonePending = !account.phone;

  return (
    <div className="pb-4">
      {/* HEADER esmeralda: saudação + próximo agendamento */}
      <div className="bg-green-deep rounded-b-[28px] px-5 pb-6 pt-6 md:rounded-[28px] md:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#8fbfa4]">{greeting()}</p>
            <h1 className="text-cream mt-0.5 truncate font-serif text-[27px] leading-none">
              {firstName || 'Bem-vindo'}
            </h1>
          </div>
          <Link
            href="/conta/perfil"
            aria-label="Meu perfil"
            className="bg-green-bright text-green-deep flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] font-serif text-base transition-transform active:scale-[0.95]"
          >
            {account.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </Link>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="bg-green-bright h-[7px] w-[7px] rounded-full" aria-hidden />
            <p className="text-green-bright text-[11px] font-bold uppercase tracking-[0.14em]">
              Próximo agendamento
              {next ? ` · ${relativeDay(next.startsAt, next.tenant.timezone)}` : ''}
            </p>
          </div>
          {next ? <NextAppointmentCard item={next} /> : <EmptyNextCard />}
        </div>
      </div>

      <div className="space-y-6 px-5 pt-6">
        {phonePending ? (
          <PendingPhoneNotice pendingPhone={account.pendingPhone} />
        ) : null}

        {/* Atalhos */}
        <div className="flex gap-3">
          <Shortcut
            href="/conta/buscar"
            iconBg="bg-chip"
            icon={<Search className="h-[21px] w-[21px] text-green-deep" />}
            title="Buscar perto"
            subtitle="barbearias, salões…"
          />
          <Shortcut
            href="/conta/buscar?tab=favoritos"
            iconBg="bg-[#ffeee9]"
            icon={<Heart className="h-[21px] w-[21px] fill-coral text-coral" />}
            title="Favoritos"
            subtitle={`${favorites.length} ${favorites.length === 1 ? 'lugar' : 'lugares'}`}
          />
        </div>

        {/* Volte pra… (favoritos ou "agendar de novo" a partir do histórico) */}
        {favorites.length > 0 ? (
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-ink font-serif text-lg">Volte pra…</h2>
              <Link href="/conta/buscar?tab=favoritos" className="text-coral text-[13px] font-semibold">
                ver tudo
              </Link>
            </div>
            <div className="-mx-5 mt-3.5 flex gap-3 overflow-x-auto px-5 pb-1">
              {favorites.map((f) => (
                <Link key={f.tenantId} href={`/${f.slug}`} className="w-[150px] shrink-0">
                  <div className="border-line bg-paper h-[98px] overflow-hidden rounded-[18px] border">
                    <TenantAvatar name={f.name} logoUrl={f.logoUrl} size={150} radius={18} className="h-[98px] w-[150px]" />
                  </div>
                  <p className="text-ink mt-2 truncate text-[14.5px] font-semibold">{f.name}</p>
                  {f.address ? (
                    <p className="text-sub mt-0.5 truncate text-xs">{f.address}</p>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        ) : past.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-ink font-serif text-lg">Agendar de novo</h2>
              <Link href="/conta/agendamentos" className="text-coral text-[13px] font-semibold">
                ver histórico
              </Link>
            </div>
            <div className="space-y-3">
              {past.slice(0, 3).map((item) => (
                <Link
                  key={item.id}
                  href={`/conta/agendamentos/${item.id}`}
                  className="border-line bg-paper flex items-center gap-3 rounded-[18px] border p-3.5 transition-transform active:scale-[0.99]"
                >
                  <TenantAvatar name={item.tenant.name} logoUrl={item.tenant.logoUrl} size={44} radius={13} />
                  <div className="min-w-0 flex-1">
                    <p className="text-ink truncate text-sm font-semibold">{item.tenant.name}</p>
                    <p className="text-sub truncate text-[11.5px] font-medium">{item.serviceName}</p>
                  </div>
                  <span className="text-green-deep text-[12px] font-bold">Reagendar</span>
                </Link>
              ))}
            </div>
          </section>
        ) : !phonePending && !next ? (
          <div className="border-line bg-paper rounded-2xl border border-dashed p-6 text-center">
            <CalendarPlus className="text-sub mx-auto h-6 w-6" aria-hidden />
            <p className="text-sub mt-2 text-sm">
              Favorite estabelecimentos pra agendar com um toque.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
