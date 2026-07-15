'use client';

import { useState } from 'react';

import type { AttendanceStats } from '@/lib/attendance';

const pct = (r: number) => `${Math.round(r * 100)}%`;

export function AttendanceCard({
  stats7,
  stats30,
}: {
  stats7: AttendanceStats;
  stats30: AttendanceStats;
}) {
  const [range, setRange] = useState<7 | 30>(30);
  const s = range === 7 ? stats7 : stats30;

  // Sem histórico fechado ainda: nada a mostrar.
  if (stats30.total === 0) return null;

  return (
    <div className="border-line bg-paper shadow-soft overflow-hidden rounded-[18px] border">
      <div className="flex flex-wrap items-center gap-2.5 px-[18px] pb-2 pt-4">
        <div className="text-ink font-serif text-lg">Comparecimento</div>
        <div className="text-ink-50 text-xs font-medium">quem veio, quem faltou</div>
        <div className="bg-cream ml-auto flex gap-1 rounded-full p-0.5">
          {([7, 30] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                range === r ? 'bg-paper text-ink shadow-soft' : 'text-ink-50'
              }`}
            >
              {r} dias
            </button>
          ))}
        </div>
      </div>

      {s.total === 0 ? (
        <p className="text-ink-50 px-[18px] pb-4 text-[13px]">
          Nenhum atendimento fechado nesse período.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-2 px-[18px] pb-1">
            <div>
              <div className="text-green-emph font-serif text-[40px] leading-none">
                {pct(s.attendanceRate)}
              </div>
              <div className="text-ink-50 mt-1 text-[11.5px] font-medium">
                compareceram · {s.attended} de {s.total}
              </div>
            </div>
            <div>
              <div className="text-coral-deep font-serif text-2xl leading-none">
                {pct(s.noShowRate)}
              </div>
              <div className="text-ink-50 mt-1 text-[11.5px] font-medium">
                faltaram · {s.noShow} {s.noShow === 1 ? 'falta' : 'faltas'}
              </div>
            </div>
          </div>

          {/* Confiança do dado: quanto você confirmou vs o sistema fechou sozinho. */}
          <div className="text-ink-50 px-[18px] pt-1 text-[11px] font-medium">
            {s.confirmedShare >= 1
              ? '✓ Tudo confirmado por você'
              : `✓ ${pct(s.confirmedShare)} confirmado por você · o resto o sistema fechou automaticamente`}
          </div>

          {s.pros.length > 1 && (
            <div className="border-line mt-2.5 border-t">
              {s.pros.map((p) => (
                <div
                  key={p.professionalId}
                  className="border-edge flex items-center gap-3 border-t border-dotted px-[18px] py-2 first:border-t-0"
                >
                  <div className="text-ink min-w-0 flex-1 truncate text-[13px] font-semibold">
                    {(p.professionalName ?? 'Profissional').split(/\s+/)[0]}
                  </div>
                  <div className="bg-line h-1.5 w-24 flex-none overflow-hidden rounded-full">
                    <div
                      className="bg-green-bright h-full rounded-full"
                      // ponytail: runtime, Tailwind nao gera
                      style={{ width: pct(p.attendanceRate) }}
                    />
                  </div>
                  <div className="text-ink-70 w-[38px] flex-none text-right font-serif text-[13px]">
                    {pct(p.attendanceRate)}
                  </div>
                  <div className="text-ink-50 w-[52px] flex-none text-right text-[10.5px] font-medium">
                    {p.noShow > 0 ? `${p.noShow} falta${p.noShow === 1 ? '' : 's'}` : 'sem falta'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
