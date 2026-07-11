-- Impede double-booking no nível do banco: nenhum profissional pode ter dois
-- agendamentos ATIVOS (PENDING/CONFIRMED) com faixas de horário [startsAt, endsAt)
-- sobrepostas. Fecha a janela de corrida do findFirst+create no app (createBookingCore,
-- createAppointmentSeries, criação manual e o bot) de uma vez só - é o fix de raiz que
-- cobre TODOS os caminhos de criação. Idempotente (nunca trava em re-aplicação).
--
-- Semântica casada com o app (appointment-mutations.ts): só PENDING/CONFIRMED bloqueiam;
-- CANCELED/COMPLETED/NO_SHOW liberam o horário. Range [startsAt, endsAt) meio-aberto:
-- dois horários encostados (um termina 10h, o outro começa 10h) NÃO conflitam.
--
-- ATENÇÃO no deploy: se o banco já tiver overlaps ATIVOS (double-bookings antigos), o
-- ADD CONSTRAINT falha. Resolver as duplicatas (cancelar/remarcar) e reaplicar. Consulta
-- pra achar overlaps existentes:
--   SELECT a.id, b.id FROM "Appointment" a JOIN "Appointment" b
--     ON a."professionalId"=b."professionalId" AND a.id<b.id
--     AND a.status IN ('PENDING','CONFIRMED') AND b.status IN ('PENDING','CONFIRMED')
--     AND tsrange(a."startsAt",a."endsAt") && tsrange(b."startsAt",b."endsAt");
--
-- NB: startsAt/endsAt são timestamp(3) sem timezone (default do Prisma para DateTime),
-- por isso tsrange. Se algum dia virarem @db.Timestamptz, trocar tsrange por tstzrange.

CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN
  ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_no_overlap"
    EXCLUDE USING gist (
      "professionalId" WITH =,
      tsrange("startsAt", "endsAt") WITH &&
    )
    WHERE (status IN ('PENDING', 'CONFIRMED'));
EXCEPTION WHEN duplicate_object THEN null; END $$;
