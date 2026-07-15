// Self-check da métrica de comparecimento (parte pura). Roda com:
//   tsx apps/web/src/lib/attendance.test.ts

import { computeAttendanceStats, type AttendanceApptInput } from './attendance';

let passed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else passed++;
}
function eq(a: unknown, b: unknown, msg: string) {
  assert(
    JSON.stringify(a) === JSON.stringify(b),
    `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`,
  );
}

const appt = (
  status: AttendanceApptInput['status'],
  professionalId: string,
  attendanceConfirmed = false,
): AttendanceApptInput => ({
  status,
  attendanceConfirmed,
  professionalId,
  professionalName: professionalId,
});

// Vazio: tudo zero, sem divisão por zero.
{
  const s = computeAttendanceStats([]);
  eq([s.total, s.attendanceRate, s.noShowRate, s.confirmedShare], [0, 0, 0, 0], 'vazio -> zeros');
  eq(s.pros.length, 0, 'vazio -> sem pros');
}

// Mistura: 3 atendidos (2 confirmados) + 1 falta, dois profissionais.
{
  const s = computeAttendanceStats([
    appt('COMPLETED', 'leo', true),
    appt('CONFIRMED', 'leo', false), // passado ainda aberto = compareceu (janela pré-cron)
    appt('COMPLETED', 'ana', true),
    appt('NO_SHOW', 'ana', true),
  ]);
  eq([s.total, s.attended, s.noShow], [4, 3, 1], 'contagem geral');
  eq(s.attendanceRate, 0.75, 'taxa comparecimento 3/4');
  eq(s.noShowRate, 0.25, 'taxa no-show 1/4');
  eq(s.confirmedShare, 0.75, 'confiança 3/4 confirmados');
  // Léo: 2 total, 0 falta, 100%. Ana: 2 total, 1 falta, 50%. Ordenado por total desc (empate estável).
  const ana = s.pros.find((p) => p.professionalId === 'ana')!;
  eq([ana.total, ana.noShow, ana.attendanceRate], [2, 1, 0.5], 'ana 50%');
  const leo = s.pros.find((p) => p.professionalId === 'leo')!;
  eq([leo.total, leo.noShow, leo.attendanceRate], [2, 0, 1], 'leo 100%');
}

console.log(passed, 'asserts OK');
