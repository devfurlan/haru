-- CreateTable
CREATE TABLE "ConversationRead" (
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationRead_pkey" PRIMARY KEY ("userId","conversationId")
);

-- CreateIndex
CREATE INDEX "ConversationRead_conversationId_idx" ON "ConversationRead"("conversationId");

-- CreateIndex
CREATE INDEX "Message_conversationId_direction_createdAt_idx" ON "Message"("conversationId", "direction", "createdAt");

-- AddForeignKey
ALTER TABLE "ConversationRead" ADD CONSTRAINT "ConversationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationRead" ADD CONSTRAINT "ConversationRead_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- Supabase Realtime + RLS
-- O painel web assina mudanças nas tabelas via Supabase Realtime. Pra não
-- vazar mensagens entre tenants pro browser (que usa a chave publishable),
-- habilitamos RLS e policies que escopam por tenant. O Prisma (bot + web)
-- conecta como owner do banco e BYPASSA RLS, então escritas/leituras
-- server-side continuam funcionando normalmente.
--
-- Tudo abaixo é condicional à existência do schema `auth` (criado pela stack
-- do Supabase, não pelo Prisma). Assim a migration aplica limpa no shadow DB
-- do Prisma e em CI sem Supabase - onde o realtime não roda mesmo -, e só
-- executa de fato nos bancos Supabase (local e prod).
-- =====================================================================
DO $rls$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    RAISE NOTICE 'schema auth ausente - pulando RLS/realtime (provável shadow DB ou CI sem Supabase)';
    RETURN;
  END IF;

  -- `prisma migrate reset` recria o schema public e derruba os grants padrão
  -- do Supabase. Sem USAGE no schema, a role `authenticated` nem chega a
  -- avaliar policies (permission denied for schema public) e o Realtime fica
  -- mudo. Reconcedemos USAGE pra authenticated/anon.
  GRANT USAGE ON SCHEMA public TO authenticated, anon;

  -- Tenant do usuário autenticado. SECURITY DEFINER pra ler "User" mesmo com
  -- RLS ligado; STABLE porque o resultado não muda dentro de uma query.
  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.current_tenant_id() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $body$
      SELECT "tenantId" FROM public."User" WHERE "authId" = auth.uid()::text LIMIT 1;
    $body$;
  $fn$;
  GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated;

  ALTER TABLE public."Conversation"     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public."Message"          ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public."ConversationRead" ENABLE ROW LEVEL SECURITY;

  -- Tabelas criadas pelo Prisma pertencem a `postgres` e NÃO herdam os grants
  -- que o Supabase concede por padrão. Sem o SELECT, a role `authenticated`
  -- nunca chega a avaliar as policies e o Realtime não entrega nenhum evento.
  -- O RLS continua sendo a barreira real (filtra por tenant linha a linha);
  -- o grant só concede o privilégio de tabela que o RLS então restringe.
  GRANT SELECT ON public."Conversation"     TO authenticated;
  GRANT SELECT ON public."Message"          TO authenticated;
  GRANT SELECT ON public."ConversationRead" TO authenticated;

  -- Conversa: só do próprio tenant.
  DROP POLICY IF EXISTS conv_tenant_read ON public."Conversation";
  CREATE POLICY conv_tenant_read ON public."Conversation"
    FOR SELECT TO authenticated USING ("tenantId" = public.current_tenant_id());

  -- Mensagem: não tem tenantId; escopamos pela Conversation dona.
  DROP POLICY IF EXISTS msg_tenant_read ON public."Message";
  CREATE POLICY msg_tenant_read ON public."Message"
    FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public."Conversation" c
              WHERE c.id = "Message"."conversationId"
                AND c."tenantId" = public.current_tenant_id()));

  -- Marca de leitura: só as do próprio usuário.
  DROP POLICY IF EXISTS cread_owner ON public."ConversationRead";
  CREATE POLICY cread_owner ON public."ConversationRead"
    FOR SELECT TO authenticated USING ("userId" IN (
      SELECT id FROM public."User" WHERE "authId" = auth.uid()::text));

  -- Payload completo de UPDATE/DELETE no realtime.
  ALTER TABLE public."Message"      REPLICA IDENTITY FULL;
  ALTER TABLE public."Conversation" REPLICA IDENTITY FULL;

  -- Adiciona as tabelas à publication do realtime (idempotente - a publication
  -- supabase_realtime já existe em qualquer projeto Supabase).
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'Message') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public."Message";
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'Conversation') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public."Conversation";
    END IF;
  END IF;
END
$rls$;
