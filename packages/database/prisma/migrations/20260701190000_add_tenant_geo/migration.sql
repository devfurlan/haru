-- Coordenadas do estabelecimento p/ busca por proximidade no app (geocodificadas
-- do address via Nominatim ao salvar no painel).
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
