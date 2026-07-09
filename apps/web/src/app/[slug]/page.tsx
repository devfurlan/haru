import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BOOKING_HORIZON_DAYS, buildBookingDays, minutesToHHMM } from '@haru/shared';

import { nextOpening, openStatus } from '@/lib/business-hours';
import { getCustomerAccount } from '@/lib/customer-auth';
import { getPublicReviews } from '@/lib/reviews';
import { isWhatsappConnected } from '@/lib/whatsapp-status';

import type { PublicBookingProps } from './public-booking';
import { PublicProfile, type PublicProfileHours } from './public-profile';
import { loadPublicTenant } from './_tenant';

// Índice getDay() → abreviação BR. WEEKDAY_ABBR[1] = "Seg".
const WEEKDAY_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** "10:30" -> "10h30"; "08:00" -> "8h" (padrão BR do produto). */
function brTime(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  const hh = String(Number(h));
  return m === '00' ? `${hh}h` : `${hh}h${m}`;
}

/** ["Ter","Qui"] -> "Ter e Qui"; ["Seg","Qua","Dom"] -> "Seg, Qua e Dom". */
function joinTokens(tokens: string[]): string {
  if (tokens.length <= 1) return tokens[0] ?? '';
  return `${tokens.slice(0, -1).join(', ')} e ${tokens[tokens.length - 1]}`;
}

/**
 * Formata os dias de um grupo (posições consecutivas em Seg…Dom + abreviações), comprimindo
 * corridas de 3+ dias seguidos em "X a Y". Ex.: Seg-Sex -> "Seg a Sex"; Ter,Qui -> "Ter e Qui".
 */
function formatDayGroup(positions: number[], abbrs: string[]): string {
  const tokens: string[] = [];
  let i = 0;
  while (i < positions.length) {
    let j = i;
    while (j + 1 < positions.length && positions[j + 1] === positions[j] + 1) j++;
    if (j - i >= 2) tokens.push(`${abbrs[i]} a ${abbrs[j]}`);
    else for (let k = i; k <= j; k++) tokens.push(abbrs[k]);
    i = j + 1;
  }
  return joinTokens(tokens);
}

/** "há 2 dias" / "há 1 semana" / "há 3 meses" a partir de uma data (relativo a agora). */
function timeAgoBR(d: Date): string {
  const secs = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  const days = Math.floor(secs / 86_400);
  if (days >= 365) {
    const y = Math.floor(days / 365);
    return `há ${y} ${y === 1 ? 'ano' : 'anos'}`;
  }
  if (days >= 30) {
    const mo = Math.floor(days / 30);
    return `há ${mo} ${mo === 1 ? 'mês' : 'meses'}`;
  }
  if (days >= 7) {
    const w = Math.floor(days / 7);
    return `há ${w} ${w === 1 ? 'semana' : 'semanas'}`;
  }
  if (days >= 1) return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  const hrs = Math.floor(secs / 3600);
  if (hrs >= 1) return `há ${hrs} ${hrs === 1 ? 'hora' : 'horas'}`;
  return 'agora há pouco';
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
    description: tenant.about ?? `Agende online ou pelo WhatsApp em ${tenant.name}.`,
  };
}

export default async function TenantPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await loadPublicTenant(slug);
  if (!tenant) notFound();

  const [customerAccount, reviewsRaw] = await Promise.all([
    getCustomerAccount(),
    getPublicReviews(tenant.id),
  ]);

  // Grade de expediente por weekday (0=dom … 6=sáb).
  const byDay = new Map<number, { startMinute: number; endMinute: number }[]>();
  for (let i = 0; i < 7; i++) byDay.set(i, []);
  for (const b of tenant.scheduleBlocks) {
    byDay.get(b.weekday)!.push({ startMinute: b.startMinute, endMinute: b.endMinute });
  }
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];

  // Uma linha por dia (Seg…Dom), depois agrupadas por horário igual (dias com o mesmo
  // expediente viram "Ter e Qui"); grupos fechados vão pro fim (cinza).
  const dayRows = dayOrder.map((wd, pos) => {
    const blocks = byDay.get(wd) ?? [];
    const closed = blocks.length === 0;
    return {
      pos,
      abbr: WEEKDAY_ABBR[wd],
      closed,
      value: closed
        ? 'Fechado'
        : blocks
            .map((b) => `${brTime(minutesToHHMM(b.startMinute))} - ${brTime(minutesToHHMM(b.endMinute))}`)
            .join(', '),
    };
  });
  const groups: { pos: number[]; abbrs: string[]; value: string; closed: boolean }[] = [];
  for (const r of dayRows) {
    const g = groups.find((g) => g.value === r.value);
    if (g) {
      g.pos.push(r.pos);
      g.abbrs.push(r.abbr);
    } else groups.push({ pos: [r.pos], abbrs: [r.abbr], value: r.value, closed: r.closed });
  }
  groups.sort((a, b) => Number(a.closed) - Number(b.closed));
  const hours: PublicProfileHours[] = groups.map((g) => ({
    days: formatDayGroup(g.pos, g.abbrs),
    value: g.value,
    closed: g.closed,
  }));

  // Status (aberto/fechado) - selo do topo e do trilho.
  const st = openStatus(tenant.scheduleBlocks, tenant.timezone);
  const shortLabel = st.open ? 'Aberto agora' : 'Fechado agora';
  const longLabel = st.open
    ? st.untilLabel
      ? `Aberto agora · fecha às ${st.untilLabel}`
      : 'Aberto agora'
    : (() => {
        const nx = nextOpening(tenant.scheduleBlocks, tenant.timezone);
        return nx ? `Fechado · abre ${nx}` : 'Fechado agora';
      })();

  // WhatsApp só quando o número está de fato ativo (bot conectado e não banido).
  const whatsappActive = isWhatsappConnected(tenant) && !tenant.whatsappBannedAt;
  const waLink =
    whatsappActive && tenant.whatsappDisplayPhone
      ? `https://wa.me/${tenant.whatsappDisplayPhone}?text=${encodeURIComponent('Olá! Quero agendar um horário.')}`
      : null;

  // Agendamento online: ligado, com serviços e pelo menos um dia atendível no horizonte.
  const openWeekdays = [...new Set(tenant.scheduleBlocks.map((b) => b.weekday))];
  const hasBookableDay = buildBookingDays(tenant.timezone, new Set(openWeekdays)).some((d) => d.open);
  const canBook = tenant.publicBookingEnabled && tenant.services.length > 0 && hasBookableDay;

  const mapHref =
    tenant.latitude != null && tenant.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${tenant.latitude},${tenant.longitude}`
      : tenant.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenant.address)}`
        : null;

  const booking: PublicBookingProps = {
    slug: tenant.slug,
    tenantName: tenant.name,
    logoUrl: tenant.logoUrl,
    coverUrl: tenant.coverImageUrls[0] ?? null,
    segment: tenant.segment,
    openUntilLabel: st.untilLabel,
    ratingAvg: tenant.ratingAvg ?? null,
    ratingCount: tenant.ratingCount ?? 0,
    services: tenant.services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
      professionalIds: s.professionals.map((p) => p.professionalId),
    })),
    professionals: tenant.users.map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl })),
    timezone: tenant.timezone,
    openWeekdays,
    horizonDays: BOOKING_HORIZON_DAYS,
    loggedIn: !!customerAccount,
    customerName: customerAccount?.name ?? null,
    customerPhone: customerAccount?.phone ?? customerAccount?.pendingPhone ?? null,
  };

  return (
    <PublicProfile
      booking={booking}
      canBook={canBook}
      waLink={waLink}
      account={{
        href: customerAccount ? '/conta' : `/login?next=/${slug}`,
        label: customerAccount ? 'Minha conta' : 'Entrar',
      }}
      covers={tenant.coverImageUrls}
      address={tenant.address}
      instagram={tenant.instagram}
      phone={tenant.whatsappDisplayPhone}
      about={tenant.about}
      amenities={tenant.amenities}
      reviews={reviewsRaw.map((r) => ({
        name: r.name,
        rating: r.rating,
        comment: r.comment,
        ago: timeAgoBR(r.createdAt),
      }))}
      status={{ open: st.open, shortLabel, longLabel }}
      hours={hours}
      mapHref={mapHref}
    />
  );
}
