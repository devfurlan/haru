'use client';

import { Loader2, Upload, User as UserIcon } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';

import { ImageCropDialog } from '@/components/image-crop-dialog';
import { Button } from '@/components/ui/button';

import type { LogoUploadResult, TenantActionResult } from '../settings/actions';

interface AvatarUploaderProps {
  avatarUrl: string | null;
  /** Sobe a foto (já reduzida a webp). Perfil próprio ou de um membro (admin). */
  upload: (fd: FormData) => Promise<LogoUploadResult>;
  remove: () => Promise<TenantActionResult>;
}

const AVATAR_SIZE = 256; // px - saída quadrada; cobre o maior uso (~80px) com folga de retina
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export function AvatarUploader({ avatarUrl, upload, remove }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, startRemove] = useTransition();

  function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError('Use uma imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError('Imagem muito grande (máx. 5 MB).');
      return;
    }
    setPendingFile(file);
  }

  async function handleCropped(blobs: Blob[]) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', new File([blobs[0]], 'avatar.webp', { type: 'image/webp' }));
      const result = await upload(fd);
      if ('error' in result) setError(result.error);
      else setPreview(`${result.logoUrl}?t=${Date.now()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload');
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  }

  return (
    <div className="space-y-2">
      {pendingFile && (
        <ImageCropDialog
          file={pendingFile}
          aspect={1}
          cropShape="round"
          outputs={[{ format: 'image/webp', maxWidth: AVATAR_SIZE, quality: 0.85 }]}
          title="Ajustar foto de perfil"
          onCancel={() => setPendingFile(null)}
          onCropped={handleCropped}
        />
      )}
      <span className="text-sm font-medium">Foto de perfil</span>
      <div className="flex items-center gap-4">
        <div className="bg-muted flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa (Supabase Storage), tamanho fixo
            <img src={preview} alt="Foto de perfil" className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="text-muted-foreground h-8 w-8" />
          )}
        </div>

        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) handleFile(file);
            }}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading || removing}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  Enviando…
                </>
              ) : (
                <>
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  {preview ? 'Trocar' : 'Enviar foto'}
                </>
              )}
            </Button>
            {preview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading || removing}
                onClick={() => {
                  if (!window.confirm('Remover a foto de perfil?')) return;
                  startRemove(() =>
                    remove().then((r) => {
                      if (r && 'error' in r) setError(r.error);
                      else setPreview(null);
                    }),
                  );
                }}
              >
                {removing ? 'Removendo…' : 'Remover'}
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            JPG, PNG ou WebP até 5 MB. Você recorta pra ficar quadrada.
          </p>
        </div>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
