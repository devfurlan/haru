-- =====================================================================
-- RLS de escrita no bucket de Storage `tenant-assets`
-- O upload da logo é feito direto do browser (cliente Supabase com a chave
-- publishable, role `authenticated`) pro bucket `tenant-assets`. O bucket é
-- `public = true`, o que só libera LEITURA (SELECT em storage.objects). A
-- ESCRITA (INSERT/UPDATE/DELETE) continua barrada por RLS — sem policy, o
-- upload falha com "new row violates row-level security policy".
--
-- Aqui criamos policies que deixam cada usuário autenticado escrever APENAS
-- na pasta do próprio tenant: o path tem o formato `{tenantId}/arquivo.webp`,
-- então o primeiro segmento (storage.foldername(name))[1] tem que bater com
-- public.current_tenant_id() (mapeia auth.uid() -> User.tenantId, criada na
-- migration 20260529173318_conversations_realtime).
--
-- Tudo condicional à existência do schema `storage` (criado pela stack do
-- Supabase, não pelo Prisma). Assim a migration aplica limpa no shadow DB do
-- Prisma e em CI sem Supabase, e só executa de fato nos bancos Supabase.
-- =====================================================================
DO $storage_rls$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    RAISE NOTICE 'schema storage ausente — pulando RLS de storage (provável shadow DB ou CI sem Supabase)';
    RETURN;
  END IF;

  -- Garante a função de mapeamento de tenant mesmo que esta migration rode
  -- antes/independente da de realtime (idempotente — CREATE OR REPLACE).
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.current_tenant_id() RETURNS text
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $body$
        SELECT "tenantId" FROM public."User" WHERE "authId" = auth.uid()::text LIMIT 1;
      $body$;
    $fn$;
    GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated;
  END IF;

  -- INSERT: só na pasta do próprio tenant.
  DROP POLICY IF EXISTS tenant_assets_insert ON storage.objects;
  CREATE POLICY tenant_assets_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'tenant-assets'
      AND (storage.foldername(name))[1] = public.current_tenant_id()
    );

  -- UPDATE: o `upload(..., { upsert: true })` vira UPDATE quando o objeto já
  -- existe. Precisa de USING (linha atual) + WITH CHECK (linha nova), ambos
  -- escopados ao tenant.
  DROP POLICY IF EXISTS tenant_assets_update ON storage.objects;
  CREATE POLICY tenant_assets_update ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'tenant-assets'
      AND (storage.foldername(name))[1] = public.current_tenant_id()
    )
    WITH CHECK (
      bucket_id = 'tenant-assets'
      AND (storage.foldername(name))[1] = public.current_tenant_id()
    );

  -- DELETE: trocar/remover a logo apaga o objeto antigo da própria pasta.
  DROP POLICY IF EXISTS tenant_assets_delete ON storage.objects;
  CREATE POLICY tenant_assets_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'tenant-assets'
      AND (storage.foldername(name))[1] = public.current_tenant_id()
    );

  -- SELECT (leitura) já é coberto por `public = true` no bucket, mas o
  -- getPublicUrl não bate em RLS de qualquer forma. Não criamos policy de
  -- SELECT pra não conflitar com o acesso público do bucket.
END
$storage_rls$;
