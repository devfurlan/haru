-- Foto de perfil do dono/staff (User) e do cliente final (CustomerAccount).
-- Guarda a URL pública da imagem já reduzida no bucket tenant-assets.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "CustomerAccount" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
