'use client';

import { formatPhoneBR, matchesSearch } from '@haru/shared';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';

export interface ClientRow {
  id: string;
  name: string | null;
  phone: string | null;
  count: number;
  lastVisitLabel: string | null;
  lastVisitTs: number;
  totalLabel: string;
  totalCents: number;
  fav: string | null;
  tag: string | null;
}

type Sort = 'recentes' | 'az' | 'gasto';

function initials(row: ClientRow): string {
  const name = row.name?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    return ((parts[0][0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase();
  }
  return (row.phone ?? '').replace(/\D/g, '').slice(-2) || '?';
}

const displayName = (row: ClientRow) => row.name ?? formatPhoneBR(row.phone);

export function ClientsList({ clients }: { clients: ClientRow[] }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recentes');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const digits = query.replace(/\D/g, '');
    const filtered = clients.filter(
      (c) =>
        !query ||
        matchesSearch(query, c.name) ||
        (digits.length > 0 && (c.phone ?? '').includes(digits)),
    );
    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'az') return displayName(a).localeCompare(displayName(b), 'pt-BR');
      if (sort === 'gasto') return b.totalCents - a.totalCents;
      return b.lastVisitTs - a.lastVisitTs; // recentes
    });
    return sorted;
  }, [clients, query, sort]);

  const selected = clients.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4">
      <div>
        <h1 className="font-serif text-[28px] tracking-tight text-ink">Clientes</h1>
        <p className="mt-1 text-sm text-ink-50">Quem já passou por aqui - e quem tá chegando.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou telefone"
          className="min-w-[220px] flex-1 rounded-xl border border-edge bg-paper px-3.5 py-3 text-sm text-ink outline-none placeholder:text-ink-30 focus:border-green-deep"
        />
        <SegmentedControl
          value={sort}
          onChange={(v) => setSort(v as Sort)}
          options={[
            { label: 'Recentes', value: 'recentes' },
            { label: 'A-Z', value: 'az' },
            { label: 'Mais gastam', value: 'gasto' },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1 overflow-hidden rounded-[18px] border border-line bg-paper shadow-soft">
          {rows.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-ink-50">
              {query ? 'Nenhum cliente encontrado.' : 'Nenhum cliente ainda. Eles aparecem quando agendam.'}
            </div>
          ) : (
            rows.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  'flex w-full items-center gap-3.5 border-t border-dotted border-edge px-[18px] py-3 text-left first:border-0 hover:bg-cream-2',
                  selectedId === c.id && 'bg-cream-2',
                )}
              >
                <div className="flex size-[38px] flex-none items-center justify-center rounded-xl bg-chip text-xs font-bold text-green-emph">
                  {initials(c)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{displayName(c)}</span>
                    {c.tag && (
                      <span
                        className={cn(
                          'flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          c.tag === 'Recorrente' ? 'bg-chip text-green-emph' : 'bg-cream-2 text-ink-70',
                        )}
                      >
                        {c.tag}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-50">{formatPhoneBR(c.phone)}</div>
                </div>
                <Metric value={String(c.count)} label="agendamentos" className="hidden w-[110px] sm:block" />
                <Metric value={c.lastVisitLabel ?? '-'} label="última visita" className="hidden w-[90px] md:block" small />
                <Metric value={c.totalLabel} label="no total" className="w-[80px]" valueClass="text-green-emph" />
              </button>
            ))
          )}
        </div>

        {selected && (
          <div
            className="w-[300px] flex-none rounded-[18px] p-[18px] text-on-emerald shadow-soft"
            style={{ background: 'var(--emerald)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-serif text-[19px]">{displayName(selected)}</div>
                <div className="text-xs text-on-emerald-mut">{formatPhoneBR(selected.phone)}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-lg px-2 py-1 text-on-emerald-mut hover:bg-[rgba(250,245,234,.1)]"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            {selected.tag && (
              <span className="mt-2.5 inline-flex rounded-full bg-[rgba(47,211,122,.16)] px-2.5 py-1 text-[10.5px] font-semibold text-green-bright">
                {selected.tag}
              </span>
            )}
            <div className="my-3.5 border-t border-dashed border-[rgba(143,191,164,.4)]" />
            <div className="flex flex-col gap-2.5 text-[12.5px]">
              <RailStat label="Agendamentos" value={String(selected.count)} />
              <RailStat label="Última visita" value={selected.lastVisitLabel ?? '-'} />
              <RailStat label="Total gasto" value={selected.totalLabel} valueClass="text-green-bright font-serif text-[15px]" />
              {selected.fav && <RailStat label="Serviço de sempre" value={selected.fav} />}
            </div>
            <div className="my-3.5 border-t border-dashed border-[rgba(143,191,164,.4)]" />
            <div className="flex flex-col gap-2">
              <Link
                href="/appointments/new"
                className="rounded-xl bg-coral py-3 text-center text-[13px] font-semibold text-white no-underline"
              >
                Novo agendamento
              </Link>
              <Link
                href={`/clients/${selected.id}`}
                className="rounded-xl border border-[rgba(250,245,234,.25)] py-2.5 text-center text-[12.5px] font-semibold text-on-emerald no-underline hover:bg-[rgba(250,245,234,.08)]"
              >
                Ver histórico completo
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  value,
  label,
  className,
  valueClass,
  small,
}: {
  value: string;
  label: string;
  className?: string;
  valueClass?: string;
  small?: boolean;
}) {
  return (
    <div className={cn('flex-none text-right', className)}>
      <div className={cn(small ? 'text-[13px] font-semibold text-ink-70' : 'font-serif text-[15px] text-ink', valueClass)}>
        {value}
      </div>
      <div className="text-[10.5px] text-ink-50">{label}</div>
    </div>
  );
}

function RailStat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-on-emerald-mut">{label}</span>
      <span className={cn('text-right font-semibold', valueClass)}>{value}</span>
    </div>
  );
}
