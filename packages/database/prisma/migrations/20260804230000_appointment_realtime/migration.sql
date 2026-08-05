-- =====================================================================
-- Realtime da AGENDA/COCKPIT (Appointment)
--
-- O painel (agenda + início) assinava nada e revalidava de 45 em 45s por aba
-- aberta - render RSC + queries completas mesmo sem ter mudado nada. Com o
-- realtime o browser recebe o evento e revalida SÓ quando muda de fato.
--
-- Mesmo molde de 20260529173318_conversations_realtime: RLS escopa por tenant
-- pro browser (que usa a chave publishable); o Prisma (web/bot/cron) conecta
-- como owner do banco e BYPASSA RLS, então nada server-side muda.
--
-- Tudo condicional à existência do schema `auth` (criado pela stack do
-- Supabase, não pelo Prisma), pra aplicar limpa no shadow DB e em CI.
-- =====================================================================
DO $rls$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    RAISE NOTICE 'schema auth ausente - pulando RLS/realtime (provável shadow DB ou CI sem Supabase)';
    RETURN;
  END IF;

  -- `prisma migrate reset` recria o schema public e derruba os grants padrão do
  -- Supabase; sem USAGE a role `authenticated` nem avalia policy.
  GRANT USAGE ON SCHEMA public TO authenticated, anon;

  -- Quem pode ler um agendamento, na MESMA regra do painel (lib/permissions.ts):
  -- dono e apoio veem os do tenant inteiro; profissional só os DELE. SECURITY
  -- DEFINER porque a role `authenticated` não tem SELECT em "User".
  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.can_read_appointment(p_tenant_id text, p_professional_id text)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $body$
      SELECT EXISTS (
        SELECT 1 FROM public."User" u
        WHERE u."authId" = auth.uid()::text
          AND u."tenantId" = p_tenant_id
          AND (u.role = 'OWNER' OR NOT u."isProfessional" OR u.id = p_professional_id)
      );
    $body$;
  $fn$;
  GRANT EXECUTE ON FUNCTION public.can_read_appointment(text, text) TO authenticated;

  ALTER TABLE public."Appointment" ENABLE ROW LEVEL SECURITY;

  -- Tabelas do Prisma pertencem a `postgres` e não herdam os grants do Supabase.
  -- Sem o SELECT a role nunca chega a avaliar a policy e o realtime fica mudo; o
  -- RLS continua sendo a barreira real (filtra linha a linha).
  GRANT SELECT ON public."Appointment" TO authenticated;

  DROP POLICY IF EXISTS appt_panel_read ON public."Appointment";
  CREATE POLICY appt_panel_read ON public."Appointment"
    FOR SELECT TO authenticated
    USING (public.can_read_appointment("tenantId", "professionalId"));

  -- ponytail: sem REPLICA IDENTITY FULL de propósito. O painel ignora o payload
  -- (só chama router.refresh()), e agendamento não é apagado - cancelar é UPDATE
  -- de status. FULL só serviria pra filtrar DELETE por RLS, ao custo de escrever
  -- a linha velha inteira no WAL em todo UPDATE.

  -- Publication do realtime (idempotente; ela já existe em qualquer projeto Supabase).
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'Appointment') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public."Appointment";
    END IF;
  END IF;
END
$rls$;
