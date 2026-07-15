import { formatPhoneBR } from '@haru/shared';
import Link from 'next/link';

import type { LapsedResult, LapsedRow } from '@/lib/lapsed-clients';

const BRL0 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const money = (cents: number) => BRL0.format(Math.round(cents / 100));

const displayName = (r: LapsedRow) => r.name ?? (formatPhoneBR(r.phone) || 'Cliente');
const firstName = (r: LapsedRow) => (r.name ?? '').trim().split(/\s+/)[0] || 'tudo bem';

function initials(r: LapsedRow): string {
  const name = r.name?.trim();
  if (name) {
    const p = name.split(/\s+/);
    return ((p[0][0] ?? '') + (p.length > 1 ? (p[p.length - 1][0] ?? '') : '')).toUpperCase();
  }
  return (r.phone ?? '').replace(/\D/g, '').slice(-2) || '?';
}

function cadenceLabel(days: number): string {
  if (days <= 9) return 'vinha toda semana';
  if (days <= 18) return 'vinha a cada 15 dias';
  if (days <= 45) return 'vinha todo mês';
  return `vinha a cada ${days} dias`;
}

// Link wa.me pro dono chamar o cliente do próprio WhatsApp, com a mensagem pronta.
// Telefone vai bruto (E.164) - valor consumido por máquina.
function waLink(r: LapsedRow): string | null {
  if (!r.phone) return null;
  const svc = r.favService ? `seu ${r.favService.toLowerCase()}` : 'seu horário';
  const text = `Oi ${firstName(r)}! Faz um tempo que você não aparece por aqui 😊 Bora marcar ${svc}?`;
  return `https://wa.me/${r.phone}?text=${encodeURIComponent(text)}`;
}

export function LapsedClientsCard({
  data,
  tz,
  lapseDays,
}: {
  data: LapsedResult;
  tz: string;
  lapseDays: number;
}) {
  if (data.count === 0) return null;

  const dateFmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    day: '2-digit',
    month: '2-digit',
  });
  const rows = data.rows.slice(0, 12);

  return (
    <div className="border-line bg-paper shadow-soft overflow-hidden rounded-[20px] border">
      {/* faixa esmeralda - o dinheiro */}
      <div className="text-on-emerald flex flex-wrap items-center gap-x-8 gap-y-4 px-6 py-5 [background:radial-gradient(560px_260px_at_8%_-30%,rgba(47,211,122,.16),transparent_60%),radial-gradient(460px_300px_at_108%_140%,rgba(255,90,54,.12),transparent_60%),var(--color-green-deep)]">
        <div className="min-w-[260px] flex-[1_1_320px]">
          <div className="text-on-emerald-mut text-[11px] font-bold uppercase tracking-[0.14em]">
            Dinheiro parado na mesa
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <div className="text-green-bright font-serif text-[46px] leading-[0.9] tracking-tight">
              {money(data.totalMonthlyCents)}
            </div>
            <div className="text-on-emerald-mut text-base font-medium">/ mês</div>
          </div>
          <p className="text-on-emerald-mut mt-2 max-w-[440px] text-[13.5px] leading-relaxed">
            é o que{' '}
            <strong className="text-on-emerald font-semibold">
              {data.count} {data.count === 1 ? 'cliente rendia' : 'clientes rendiam'}
            </strong>{' '}
            quando vinham sempre - e não voltam há {lapseDays}+ dias.
          </p>
        </div>
        <div className="min-w-[240px] flex-[0_1_310px]">
          <p className="text-on-emerald-mut text-[12.5px] leading-relaxed">
            Cada um leva um toque seu no WhatsApp:{' '}
            <span className="text-on-emerald font-serif italic">"Sumiu, hein! Bora marcar?"</span> -
            a mensagem já vai pronta, você só confirma e manda.
          </p>
        </div>
      </div>

      {/* lista - quem sumiu */}
      <div className="border-line border-t">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-5 pb-2.5 pt-4">
          <div className="text-ink font-serif text-[17px] leading-tight">Quem sumiu</div>
          <div className="text-ink-50 text-[11.5px] font-medium">os que mais rendiam, primeiro</div>
          <Link
            href="/clients"
            className="text-green-emph ml-auto text-xs font-semibold no-underline hover:underline"
          >
            Ver em Clientes →
          </Link>
        </div>

        {rows.map((r) => {
          const wa = waLink(r);
          return (
            <div
              key={r.id}
              className="border-edge flex items-center gap-3 border-t border-dotted px-5 py-2.5"
            >
              <div className="flex size-[38px] flex-none items-center justify-center rounded-xl bg-[#fdf0d5] text-xs font-bold text-[#8a6116]">
                {initials(r)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-ink truncate text-sm font-semibold">{displayName(r)}</div>
                <div className="text-ink-50 truncate text-[11.5px] font-medium">
                  {r.favService ? `${r.favService} · ` : ''}
                  {cadenceLabel(r.cadenceDays)}
                </div>
              </div>
              <div className="w-[92px] flex-none text-right">
                <div className="text-coral-deep text-[12.5px] font-semibold">
                  há {r.goneDays} dias
                </div>
                <div className="text-ink-50 text-[10.5px] font-medium">
                  última {dateFmt.format(r.lastVisit)}
                </div>
              </div>
              <div className="hidden w-[84px] flex-none text-right sm:block">
                <div className="text-green-emph font-serif text-[15px] leading-none">
                  {money(r.monthlyCents)}
                </div>
                <div className="text-ink-50 text-[10px] font-medium">por mês</div>
              </div>
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-coral flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-[11.5px] font-semibold text-white no-underline transition hover:brightness-105 active:scale-95"
                >
                  Chamar
                </a>
              ) : (
                <Link
                  href={`/clients/${r.id}`}
                  className="border-line text-ink-70 hover:bg-cream flex-none whitespace-nowrap rounded-full border px-3.5 py-2 text-[11.5px] font-semibold no-underline"
                >
                  Ver
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
