import { prisma } from '@haru/database';
import type { AppointmentStatus } from '@haru/database';

/**
 * Métrica de comparecimento. Denominador = atendimentos que JÁ TERMINARAM e não foram
 * cancelados (o universo do "veio ou faltou"). "Compareceu" = tudo que não é NO_SHOW (mesma
 * regra do isAttended); "faltou" = NO_SHOW. `confirmedShare` mede a confiança do dado: quanto
 * foi confirmado pelo dono vs fechado automaticamente pelo cron (attendanceConfirmed=false).
 */

export interface AttendanceApptInput {
  status: AppointmentStatus; // já filtrado: passado, não cancelado
  attendanceConfirmed: boolean;
  professionalId: string;
  professionalName: string | null;
}

export interface AttendanceProStat {
  professionalId: string;
  professionalName: string | null;
  total: number;
  attended: number;
  noShow: number;
  attendanceRate: number; // 0..1
  noShowRate: number; // 0..1
}

export interface AttendanceStats {
  total: number;
  attended: number;
  noShow: number;
  attendanceRate: number; // 0..1
  noShowRate: number; // 0..1
  confirmedShare: number; // 0..1 - fração confirmada pelo dono (confiança do dado)
  pros: AttendanceProStat[]; // ordenado por total desc
}

const rate = (n: number, d: number): number => (d > 0 ? n / d : 0);

export function computeAttendanceStats(appts: AttendanceApptInput[]): AttendanceStats {
  const total = appts.length;
  const noShow = appts.filter((a) => a.status === 'NO_SHOW').length;
  const attended = total - noShow;
  const confirmed = appts.filter((a) => a.attendanceConfirmed).length;

  const byPro = new Map<string, AttendanceApptInput[]>();
  for (const a of appts) {
    const list = byPro.get(a.professionalId);
    if (list) list.push(a);
    else byPro.set(a.professionalId, [a]);
  }

  const pros: AttendanceProStat[] = [...byPro.values()]
    .map((list) => {
      const t = list.length;
      const ns = list.filter((a) => a.status === 'NO_SHOW').length;
      return {
        professionalId: list[0].professionalId,
        professionalName: list[0].professionalName,
        total: t,
        attended: t - ns,
        noShow: ns,
        attendanceRate: rate(t - ns, t),
        noShowRate: rate(ns, t),
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    total,
    attended,
    noShow,
    attendanceRate: rate(attended, total),
    noShowRate: rate(noShow, total),
    confirmedShare: rate(confirmed, total),
    pros,
  };
}

/**
 * Estatística de comparecimento do tenant num período [from, to). Só atendimentos que já
 * terminaram (endsAt < now) e não cancelados. Puxa as linhas cruas uma vez; o cockpit deriva
 * janelas menores (7d) filtrando em memória.
 */
export async function getAttendanceRows(
  tenantId: string,
  from: Date,
): Promise<{ startsAt: Date; input: AttendanceApptInput }[]> {
  const rows = await prisma.appointment.findMany({
    where: {
      tenantId,
      status: { not: 'CANCELED' },
      endsAt: { lt: new Date() },
      startsAt: { gte: from },
    },
    select: {
      startsAt: true,
      status: true,
      attendanceConfirmed: true,
      professionalId: true,
      professional: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    startsAt: r.startsAt,
    input: {
      status: r.status,
      attendanceConfirmed: r.attendanceConfirmed,
      professionalId: r.professionalId,
      professionalName: r.professional.name,
    },
  }));
}
