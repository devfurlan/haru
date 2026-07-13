'use client';

import {
  ChevronLeft,
  ChevronRight,
  Instagram,
  MapPin,
  MessageCircle,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { formatBRL, formatDuration, formatPhoneBR } from '@haru/shared';

import { Logo } from '@/components/logo';
import { MapThumb } from '@/components/map-thumb';
import { TenantAvatar } from '@/components/customer/tenant-avatar';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AMENITIES } from '@/lib/amenities';
import { cn } from '@/lib/utils';

import { PublicBooking, type PublicBookingProps } from './public-booking';
import { SubscriptionPlans, type PublicPlan, type PlanMembershipState } from './subscription-plans';

export interface PublicProfileReview {
  name: string | null;
  rating: number;
  comment: string;
  ago: string;
}

export interface PublicProfileHours {
  /** "Ter e Qui", "Sex", "Seg, Qua e Dom". */
  days: string;
  /** "10h30 - 19h30" ou "Fechado". */
  value: string;
  closed: boolean;
}

export interface PublicProfileProps {
  /** Props completas do wizard - reusadas no modal E como fonte de serviços/equipe da página. */
  booking: PublicBookingProps;
  /** Agendamento online disponível (liga os botões "Agendar"). */
  canBook: boolean;
  /** Link wa.me quando o WhatsApp está ativo - fallback dos CTAs sem booking. */
  waLink: string | null;
  /** Destino do "Minha conta" / "Entrar" no topo. */
  account: { href: string; label: string };
  covers: string[];
  address: string | null;
  instagram: string | null;
  phone: string | null;
  about: string | null;
  amenities: string[];
  reviews: PublicProfileReview[];
  status: { open: boolean; shortLabel: string; longLabel: string };
  hours: PublicProfileHours[];
  /** Link pro mapa (Google Maps) - null quando não há endereço nem coordenadas. */
  mapHref: string | null;
  /** Coordenadas geocodificadas - renderizam o mapa real (tiles OSM). null = sem mapa. */
  coords: { lat: number; lng: number } | null;
  /** Volta da fila pós-login (URL ?fila=1&s&p&d): reabre o modal no passo dia/horário
   *  com o contexto (serviço, profissional, dia) que o cliente tinha. null = fluxo normal. */
  resume?: { serviceId: string; professionalId: string; dateStr: string } | null;
  /** Planos do Clube (assinatura) ativos - vazio quando o dono não tem a feature/plano. */
  clubPlans: PublicPlan[];
  /** Assinaturas do cliente logado neste tenant (estado "você já assina" na vitrine). */
  clubMemberships: PlanMembershipState[];
}

function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function serviceMetaLine(
  s: PublicBookingProps['services'][number],
  professionals: PublicBookingProps['professionals'],
): string {
  const names = s.professionalIds
    .map((id) => professionals.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n);
  const dur = formatDuration(s.durationMinutes);
  if (names.length === 0) return dur;
  const who =
    names.length <= 2 ? names.join(' ou ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  return `${dur} · ${who}`;
}

/** Selo de status (aberto/fechado) - bolinha + rótulo. */
function StatusPill({
  open,
  label,
  className,
}: {
  open: boolean;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap', className)}>
      <span
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          open ? 'bg-green-bright animate-pulse-ring' : 'bg-ink-30',
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}

function Stars({ rating }: { rating: number }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="font-serif text-[13px] leading-none" aria-label={`${full} de 5 estrelas`}>
      <span className="text-green-emph">{'★'.repeat(full)}</span>
      <span className="text-ink-30">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

export function PublicProfile({
  booking,
  canBook,
  waLink,
  account,
  covers,
  address,
  instagram,
  phone,
  about,
  amenities,
  reviews,
  status,
  hours,
  mapHref,
  coords,
  resume = null,
  clubPlans,
  clubMemberships,
}: PublicProfileProps) {
  const { tenantName, logoUrl, segment, ratingAvg, ratingCount, services, professionals } = booking;

  const [cvIdx, setCvIdx] = useState(0);
  // Volta da fila pós-login: já abre o modal no serviço do contexto salvo.
  const [bookOpen, setBookOpen] = useState(!!resume);
  const [bookServiceId, setBookServiceId] = useState<string | null>(resume?.serviceId ?? null);
  // O contexto da fila só vale pra reabertura automática; qualquer "Agendar" manual o
  // limpa, senão o wizard priorizaria o dia/serviço antigo da fila sobre o novo escolhido.
  const [resumeState, setResumeState] = useState(resume);

  function openBooking(serviceId: string | null) {
    setResumeState(null);
    setBookServiceId(serviceId ?? services[0]?.id ?? null);
    setBookOpen(true);
  }

  const shownAmenities = AMENITIES.filter((a) => amenities.includes(a.key));
  const ratingLabel = ratingAvg != null ? ratingAvg.toFixed(1).replace('.', ',') : null;
  const hasRating = ratingLabel != null && ratingCount > 0;
  // Só o segmento é capitalizado (palavra única); o endereço é texto livre e mantém o
  // case original (senão "de Novembro"/"d'Oeste"/"SP" viram "De"/"D'Oeste"/"Sp").
  const metaBits: { text: string; cap: boolean }[] = [];
  if (segment) metaBits.push({ text: segment, cap: true });
  if (address) metaBits.push({ text: address, cap: false });

  const coverCount = covers.length;
  const goto = (i: number) => setCvIdx((coverCount + i) % Math.max(1, coverCount));

  function scrollToReviews(e: React.MouseEvent) {
    e.preventDefault();
    const el = document.getElementById('avaliacoes');
    if (el)
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 70,
        behavior: 'smooth',
      });
  }

  // CTA principal (topo/trilho): abre o booking, cai no WhatsApp, ou some.
  function PrimaryCTA({ className }: { className?: string }) {
    if (canBook)
      return (
        <button type="button" onClick={() => openBooking(null)} className={className}>
          Agendar agora
        </button>
      );
    if (waLink)
      return (
        <a href={waLink} target="_blank" rel="noopener noreferrer" className={className}>
          Falar no WhatsApp
        </a>
      );
    return null;
  }

  return (
    <div className="bg-cream text-ink min-h-screen">
      {/* topo fixo */}
      <div className="border-line bg-paper/95 sticky top-0 z-40 flex items-center gap-3.5 border-b px-4 py-2.5 backdrop-blur sm:px-6">
        <Logo variant="full" size="sm" />
        <div className="flex-1" />
        <Link
          href={account.href}
          className="text-ink-50 hover:text-ink hidden items-center gap-1.5 text-xs font-medium sm:inline-flex"
        >
          <UserRound className="h-4 w-4" />
          {account.label}
        </Link>
        <StatusPill
          open={status.open}
          label={status.shortLabel}
          className="text-ink-50 text-xs font-medium"
        />
        <PrimaryCTA className="bg-coral shadow-coral inline-flex items-center rounded-full px-4 py-2.5 text-[12.5px] font-semibold text-white transition-transform active:scale-95" />
      </div>

      {/* capa / carrossel - só fotos reais do estabelecimento (a logo agora fica ao lado
          do título; sem fotos, não mostramos uma capa vazia) */}
      {coverCount > 0 && (
        <div className="mx-auto mt-4 box-border w-full max-w-[1040px] px-4 sm:px-6">
          <div className="relative h-[240px] w-full overflow-hidden rounded-[20px] bg-[#efe9d8] sm:h-[320px]">
            {covers.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
                style={{
                  opacity: cvIdx === i ? 1 : 0,
                  pointerEvents: cvIdx === i ? 'auto' : 'none',
                }}
              />
            ))}

            {coverCount > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Foto anterior"
                  onClick={() => goto(cvIdx - 1)}
                  className="text-ink hover:bg-paper absolute left-3 top-1/2 z-[6] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(255,253,248,.92)] shadow-[0_2px_8px_rgba(10,51,36,.2)]"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Próxima foto"
                  onClick={() => goto(cvIdx + 1)}
                  className="text-ink hover:bg-paper absolute right-3 top-1/2 z-[6] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(255,253,248,.92)] shadow-[0_2px_8px_rgba(10,51,36,.2)]"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="text-cream absolute left-3.5 top-3 z-[6] rounded-full bg-[rgba(10,51,36,.65)] px-2.5 py-1.5 text-[10.5px] font-bold">
                  {cvIdx + 1}/{coverCount}
                </div>
                <div className="absolute bottom-2.5 left-0 right-0 z-[6] flex justify-center gap-1.5">
                  {covers.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Foto ${i + 1}`}
                      onClick={() => setCvIdx(i)}
                      className={cn(
                        'h-2 w-2 rounded-full shadow-[0_1px_3px_rgba(10,51,36,.3)]',
                        cvIdx === i ? 'bg-cream' : 'bg-[rgba(250,245,234,.45)]',
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* corpo */}
      <div className="mx-auto box-border flex w-full max-w-[1040px] flex-col items-start gap-7 px-4 pb-16 pt-6 sm:px-6 lg:flex-row">
        {/* coluna principal */}
        <div className="flex min-w-0 flex-1 flex-col gap-7">
          {/* título - logo do estabelecimento + nome/avaliação/status */}
          <div className="flex items-start gap-4">
            <TenantAvatar
              name={tenantName}
              logoUrl={logoUrl}
              size={72}
              radius={18}
              className="border-line border shadow-[0_4px_14px_rgba(10,51,36,0.14)]"
            />
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-[30px] font-medium leading-[1.08] tracking-[-0.02em] sm:text-[34px]">
                {tenantName}
              </h1>
              <div className="text-ink-70 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-medium">
                {hasRating ? (
                  <>
                    <span className="font-serif text-[13.5px] font-semibold">★ {ratingLabel}</span>
                    <a
                      href="#avaliacoes"
                      onClick={scrollToReviews}
                      className="text-green-emph font-semibold no-underline hover:underline"
                    >
                      {ratingCount} {ratingCount === 1 ? 'avaliação' : 'avaliações'}
                    </a>
                  </>
                ) : null}
                {metaBits.map((m, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {(i > 0 || hasRating) && <span className="text-ink-30">·</span>}
                    <span className={m.cap ? 'capitalize' : undefined}>{m.text}</span>
                  </span>
                ))}
              </div>
              <StatusPill
                open={status.open}
                label={status.longLabel}
                className={cn(
                  'mt-2 text-[12.5px] font-semibold',
                  status.open ? 'text-green-emph' : 'text-ink-50',
                )}
              />
            </div>
          </div>

          {/* sobre */}
          {about ? (
            <p className="text-ink-70 max-w-[620px] text-[15px] leading-[1.65]">{about}</p>
          ) : null}

          {/* serviços */}
          {services.length > 0 ? (
            <section>
              <h2 className="mb-3 font-serif text-[22px] font-medium tracking-[-0.02em]">
                Serviços
              </h2>
              <div className="border-line bg-paper overflow-hidden rounded-[18px] border shadow-[0_2px_10px_rgba(10,51,36,.05)]">
                {services.map((s, i) => (
                  <div
                    key={s.id}
                    className={cn(
                      'flex items-center gap-3.5 px-4 py-3.5 sm:px-[18px]',
                      i > 0 && 'border-edge border-t border-dotted',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-semibold leading-[1.25]">{s.name}</p>
                      <p className="text-ink-50 mt-px text-[12px] font-medium">
                        {serviceMetaLine(s, professionals)}
                      </p>
                    </div>
                    <div className="shrink-0 font-serif text-[17px] font-semibold">
                      {formatBRL(s.priceCents)}
                    </div>
                    {canBook ? (
                      <button
                        type="button"
                        onClick={() => openBooking(s.id)}
                        className="border-green-deep text-green-deep hover:bg-chip shrink-0 whitespace-nowrap rounded-full border-[1.5px] px-4 py-2.5 text-[12.5px] font-semibold transition-[transform,background-color] active:scale-95"
                      >
                        Agendar
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* assinaturas (Clube) - só aparece com plano ativo do dono (gate no server) */}
          <SubscriptionPlans
            slug={booking.slug}
            plans={clubPlans}
            memberships={clubMemberships}
            loggedIn={booking.loggedIn}
          />

          {/* equipe */}
          {professionals.length > 0 ? (
            <section>
              <h2 className="mb-3 font-serif text-[22px] font-medium tracking-[-0.02em]">
                Quem atende
              </h2>
              <div className="flex flex-wrap gap-3">
                {professionals.map((p) => (
                  <div
                    key={p.id}
                    className="border-line bg-paper flex items-center gap-2.5 rounded-2xl border px-4 py-3"
                  >
                    <span className="bg-chip text-green-emph flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-[13px] font-serif text-sm font-semibold">
                      {p.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.avatarUrl}
                          alt={p.name ?? ''}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initialsOf(p.name)
                      )}
                    </span>
                    <div>
                      <div className="font-serif text-[14.5px] font-semibold leading-tight">
                        {p.name ?? '-'}
                      </div>
                      <div className="text-ink-50 text-[11.5px] font-medium">Profissional</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* comodidades */}
          {shownAmenities.length > 0 ? (
            <section>
              <h2 className="mb-3 font-serif text-[22px] font-medium tracking-[-0.02em]">
                Comodidades
              </h2>
              <div className="flex flex-wrap gap-2">
                {shownAmenities.map(({ key, label, Icon }) => (
                  <span
                    key={key}
                    className="bg-chip inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-semibold text-[#14513a]"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {/* avaliações - seção fixa (com estado vazio quando ainda não há avaliação) */}
          <section id="avaliacoes">
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="font-serif text-[22px] font-medium tracking-[-0.02em]">Avaliações</h2>
              {hasRating ? (
                <>
                  <div className="font-serif text-[15px] font-semibold">★ {ratingLabel}</div>
                  <div className="text-ink-50 text-[12.5px] font-medium">
                    {ratingCount} {ratingCount === 1 ? 'avaliação' : 'avaliações'}
                  </div>
                </>
              ) : null}
            </div>
            {reviews.length > 0 ? (
              <div className="flex flex-col gap-3">
                {reviews.map((r, i) => (
                  <div
                    key={i}
                    className="border-line bg-paper rounded-2xl border px-4 py-4 sm:px-[18px]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="bg-chip text-green-emph flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold">
                        {initialsOf(r.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-semibold leading-[1.25]">
                          {r.name ?? 'Cliente'}
                        </div>
                        <div className="text-ink-50 text-[11.5px] font-medium">{r.ago}</div>
                      </div>
                      <Stars rating={r.rating} />
                    </div>
                    <p className="text-ink-70 mt-2.5 text-[13.5px] leading-[1.6]">{r.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-line bg-paper text-ink-50 rounded-2xl border px-4 py-8 text-center text-sm">
                {ratingCount > 0
                  ? 'Ainda sem comentários por aqui.'
                  : 'Ainda sem avaliações. Quem já foi atendido pode avaliar pela conta.'}
              </div>
            )}
          </section>
        </div>

        {/* trilho */}
        <aside className="flex w-full flex-none flex-col gap-3.5 lg:sticky lg:top-[74px] lg:w-[300px]">
          <div className="border-line bg-paper flex flex-col gap-3.5 rounded-[18px] border p-[18px] shadow-[0_2px_10px_rgba(10,51,36,.05)]">
            <StatusPill
              open={status.open}
              label={status.longLabel}
              className={cn(
                'text-[13px] font-semibold',
                status.open ? 'text-green-emph' : 'text-ink-50',
              )}
            />

            {coords ? (
              <a
                href={mapHref ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ver no mapa"
                className="border-line block overflow-hidden rounded-[14px] border transition-shadow hover:shadow-[0_4px_14px_rgba(10,51,36,0.15)]"
              >
                <MapThumb lat={coords.lat} lng={coords.lng} height={118} />
              </a>
            ) : mapHref ? (
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="border-edge text-ink-50 hover:border-green-deep hover:text-green-emph flex h-24 items-center justify-center gap-2 rounded-[14px] border border-dashed text-[11.5px] font-semibold transition-colors"
              >
                <MapPin className="h-4.5 w-4.5" />
                Ver no mapa
              </a>
            ) : null}

            {address ? (
              <div className="text-ink-70 text-[12.5px] font-medium leading-[1.5]">{address}</div>
            ) : null}

            {phone || instagram ? (
              <div className="text-ink-70 flex flex-col gap-1.5 text-[12px] font-semibold">
                {phone ? (
                  <a
                    href={`tel:+${phone.replace(/\D/g, '')}`}
                    className="inline-flex items-center gap-1.5 no-underline hover:underline"
                  >
                    <MessageCircle className="text-green-emph h-3.5 w-3.5" />
                    {formatPhoneBR(phone)}
                  </a>
                ) : null}
                {instagram ? (
                  <a
                    href={`https://instagram.com/${instagram.replace(/^@+/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 no-underline hover:underline"
                  >
                    <Instagram className="text-green-emph h-3.5 w-3.5" />@
                    {instagram.replace(/^@+/, '')}
                  </a>
                ) : null}
              </div>
            ) : null}

            {hours.length > 0 ? (
              <>
                <div className="border-edge border-t border-dashed" />
                <div className="flex flex-col gap-1.5 text-[12px] font-medium">
                  {hours.map((h, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex justify-between gap-3',
                        h.closed ? 'text-ink-30' : 'text-ink-70',
                      )}
                    >
                      <span>{h.days}</span>
                      <span className={cn(!h.closed && 'text-ink font-serif font-semibold')}>
                        {h.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {canBook ? (
              <>
                <button
                  type="button"
                  onClick={() => openBooking(null)}
                  className="bg-coral shadow-coral rounded-[14px] py-3.5 text-center text-[14px] font-semibold text-white transition-transform active:scale-95"
                >
                  Agendar agora
                </button>
                <p className="text-ink-50 text-center text-[11px] font-medium leading-[1.5]">
                  Confirmação na hora. A gente te lembra antes, relaxa.
                </p>
              </>
            ) : waLink ? (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-coral shadow-coral flex items-center justify-center gap-2 rounded-[14px] py-3.5 text-center text-[14px] font-semibold text-white transition-transform active:scale-95"
              >
                <MessageCircle className="h-4.5 w-4.5" />
                Falar no WhatsApp
              </a>
            ) : null}
          </div>
        </aside>
      </div>

      {/* rodapé */}
      <footer className="border-line border-t px-6 pb-8 pt-6 text-center">
        <div className="font-serif text-sm font-semibold">
          Feito com Demanda<span className="text-coral">ê</span>
        </div>
        <p className="text-ink-50 mt-1 text-[11.5px] font-medium leading-[1.5]">
          Agendamento online pra negócios de serviço ·{' '}
          <a href="https://www.demandae.com" className="no-underline hover:underline">
            demandae.com
          </a>
        </p>
      </footer>

      {/* modal de agendamento - reusa o wizard completo */}
      {canBook ? (
        <Dialog open={bookOpen} onOpenChange={setBookOpen}>
          <DialogContent dismissable={false} className="max-w-md p-5 sm:p-6">
            <DialogTitle className="sr-only">Agendar</DialogTitle>
            {bookOpen ? (
              <PublicBooking
                {...booking}
                asModal
                initialServiceId={bookServiceId}
                onRequestClose={() => setBookOpen(false)}
                resume={resumeState}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
