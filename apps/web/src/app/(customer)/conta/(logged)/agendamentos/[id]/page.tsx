import { MapPin } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ScreenHeader } from '@/components/customer/screen-header';
import { TenantAvatar } from '@/components/customer/tenant-avatar';
import { requireCustomerAccount } from '@/lib/customer-auth';
import { getCustomerAppointments, type CustomerAppointmentItem } from '@/lib/customer';
import { getCustomerReview } from '@/lib/reviews';
import { formatBRL, formatDuration } from '@haru/shared';

import { CancelDialog } from '../cancel-dialog';
import { RescheduleDialog } from '../reschedule-dialog';
import { ReviewDialog } from '../review-dialog';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<CustomerAppointmentItem['status'], string> = {
  PENDING: 'pendente',
  CONFIRMED: 'confirmado',
  CANCELED: 'cancelado',
  COMPLETED: 'concluído',
  NO_SHOW: 'não compareceu',
};

// "Como chegar": Google Maps universal (abre app ou navegador). Destino por coordenadas
// quando houver; senão o endereço.
function directionsUrl(t: CustomerAppointmentItem['tenant']): string {
  const dest =
    t.latitude != null && t.longitude != null ? `${t.latitude},${t.longitude}` : (t.address ?? '');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}

const MAP_H = 110;
const TILE = 256;
const MAP_ZOOM = 16;

// Pino coral (teardrop) com a ponta no centro do container (marca o ponto exato).
function MapMarker() {
  return (
    <span
      aria-hidden
      className="bg-coral absolute left-1/2 top-1/2 h-[26px] w-[26px] rounded-br-[13px] rounded-tl-[13px] rounded-tr-[13px] shadow-[0_4px_8px_rgba(255,90,54,0.6)]"
      style={{ marginLeft: -13, marginTop: -17, transform: 'rotate(-45deg)' }}
    />
  );
}

// Miniatura de mapa real: grade 3x3 de tiles do OpenStreetMap centrada nas coordenadas.
// Keyless (só <img>), espelha o MapThumb do app. Centralização por CSS (`left: calc(50%
// + …)`) - não precisa medir a largura. ponytail: tiles direto do OSM servem no tamanho
// atual; se escalar, migrar pra provider com key (a política do OSM desencoraja tráfego
// alto sem User-Agent identificando o app).
function MapThumb({ lat, lng }: { lat: number; lng: number }) {
  const n = 2 ** MAP_ZOOM;
  // Coordenadas fracionárias de tile (projeção Web Mercator / slippy map).
  const fx = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const fy = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const tx0 = Math.floor(fx);
  const ty0 = Math.floor(fy);

  const tiles: { tx: number; ty: number }[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const tx = tx0 + dx;
      const ty = ty0 + dy;
      if (tx >= 0 && ty >= 0 && tx < n && ty < n) tiles.push({ tx, ty });
    }
  }

  return (
    <div className="relative overflow-hidden bg-[#dfe7df]" style={{ height: MAP_H }}>
      {tiles.map(({ tx, ty }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${tx}-${ty}`}
          src={`https://tile.openstreetmap.org/${MAP_ZOOM}/${tx}/${ty}.png`}
          alt=""
          width={TILE}
          height={TILE}
          className="absolute max-w-none"
          style={{
            left: `calc(50% + ${((tx - fx) * TILE).toFixed(2)}px)`,
            top: `calc(${MAP_H / 2}px + ${((ty - fy) * TILE).toFixed(2)}px)`,
          }}
        />
      ))}
      <MapMarker />
      {/* Atribuição exigida pela licença do OpenStreetMap. */}
      <span className="absolute bottom-[3px] right-[5px] text-[8px] text-[#5a6b60]">
        © OpenStreetMap
      </span>
    </div>
  );
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await requireCustomerAccount();
  const { upcoming, past } = await getCustomerAppointments(account);
  const item = [...upcoming, ...past].find((a) => a.id === id);
  if (!item) notFound();

  // Só atendimento concluído pode ser avaliado; pré-carrega a nota atual pra editar.
  const review =
    item.status === 'COMPLETED' ? await getCustomerReview(account, item.tenant.id) : null;

  return (
    <div className="mx-auto max-w-[720px]">
      <ScreenHeader title="Agendamento" backHref="/conta/agendamentos" />

      <div className="space-y-3.5 px-5 pb-32 pt-[18px]">
        {/* HERO escuro */}
        <div className="bg-green-deep relative overflow-hidden rounded-[22px] px-[18px] pb-4 pt-[18px]">
          <div
            className="bg-green-bright/10 absolute -right-6 -top-10 h-32 w-40 rounded-full"
            aria-hidden
          />
          <div className="relative flex items-center gap-3">
            <TenantAvatar
              name={item.tenant.name}
              logoUrl={item.tenant.logoUrl}
              size={50}
              radius={15}
            />
            <div className="min-w-0 flex-1">
              <p className="text-paper truncate font-serif text-[17px]">{item.tenant.name}</p>
              <p className="mt-0.5 truncate text-xs text-[#8fbfa4]">
                {item.serviceName}
                {item.professionalName ? ` · com ${item.professionalName}` : ''}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                item.isActive ? 'bg-green-bright text-green-deep' : 'bg-white/10 text-[#8fbfa4]'
              }`}
            >
              {STATUS_LABEL[item.status]}
            </span>
          </div>

          <div className="relative my-[15px] border-t border-dashed border-[rgba(143,191,164,0.4)]" />

          <div className="relative flex justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-[#8fbfa4]">Quando</p>
              <p className="text-cream mt-1 font-serif text-[17px] capitalize">{item.whenLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[#8fbfa4]">Valor</p>
              <p className="text-coral mt-1 font-serif text-[17px]">{formatBRL(item.priceCents)}</p>
            </div>
          </div>
        </div>

        {/* Endereço + mapa + como chegar */}
        {item.tenant.address ? (
          <a
            href={directionsUrl(item.tenant)}
            target="_blank"
            rel="noopener noreferrer"
            className="border-line bg-paper block overflow-hidden rounded-[18px] border transition-transform active:scale-[0.99]"
          >
            {item.tenant.latitude != null && item.tenant.longitude != null ? (
              <MapThumb lat={item.tenant.latitude} lng={item.tenant.longitude} />
            ) : (
              <div className="relative h-[110px] bg-gradient-to-br from-[#cfe0d5] to-[#9fc0ab]">
                <MapMarker />
              </div>
            )}
            <div className="flex items-center justify-between px-[15px] py-[13px]">
              <p className="text-ink line-clamp-2 flex-1 pr-3 text-sm font-semibold">
                {item.tenant.address}
              </p>
              <span className="bg-chip text-green-deep flex items-center gap-1 rounded-full px-3 py-2 text-[12.5px] font-bold">
                <MapPin className="h-3.5 w-3.5" /> Como chegar
              </span>
            </div>
          </a>
        ) : null}

        {/* Duração + profissional */}
        <div className="border-line bg-paper rounded-[18px] border px-[15px]">
          <div className="flex items-center justify-between py-3.5">
            <span className="text-muted-foreground text-sm">Duração</span>
            <span className="text-ink text-sm font-semibold">
              {formatDuration(item.durationMinutes)}
            </span>
          </div>
          {item.professionalName ? (
            <div className="border-line flex items-center justify-between border-t py-3.5">
              <span className="text-muted-foreground text-sm">Profissional</span>
              <span className="text-ink text-sm font-semibold">{item.professionalName}</span>
            </div>
          ) : null}
        </div>

        {/* Avaliação: só em atendimento concluído (o gate real está no server). */}
        {item.status === 'COMPLETED' ? (
          <div className="border-line bg-paper rounded-[18px] border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-ink font-serif text-[16px]">
                  {review ? 'Sua avaliação' : 'Como foi o atendimento?'}
                </p>
                {review ? (
                  <p
                    className="text-coral mt-0.5 text-sm font-bold"
                    aria-label={`${review.rating} de 5`}
                  >
                    {'★'.repeat(review.rating)}
                    <span className="text-[#d6cbb2]">{'★'.repeat(5 - review.rating)}</span>
                  </p>
                ) : (
                  <p className="text-sub mt-0.5 text-[13px]">Sua nota ajuda outras pessoas.</p>
                )}
              </div>
              <ReviewDialog
                tenantId={item.tenant.id}
                tenantName={item.tenant.name}
                initialRating={review?.rating ?? 0}
                initialComment={review?.comment ?? ''}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Rodapé fixo de ação. Reusa os dialogs de remarcar/cancelar (com SlotPicker). */}
      <div className="border-line bg-cream fixed inset-x-0 bottom-0 z-10 md:sticky md:bottom-auto">
        <div className="mx-auto flex max-w-[720px] items-center gap-3 px-5 pb-[calc(env(safe-area-inset-bottom)+72px)] pt-3.5 md:pb-4">
          {item.isActive ? (
            <>
              <RescheduleDialog item={item} />
              <CancelDialog item={item} />
            </>
          ) : item.serviceActive ? (
            <Link
              href={`/conta/agendar?from=${item.id}`}
              className="bg-coral rounded-2xl px-6 py-3 text-[15px] font-bold text-white transition-transform active:scale-[0.97]"
            >
              Agendar de novo
            </Link>
          ) : (
            <p className="text-muted-foreground text-sm">
              Este serviço não está mais disponível para novo agendamento.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
