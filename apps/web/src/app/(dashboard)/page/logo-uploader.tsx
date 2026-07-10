'use client';

import { ImageIcon, Loader2, Upload } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';

import { ImageCropDialog } from '@/components/image-crop-dialog';
import { Button } from '@/components/ui/button';

import { removeTenantLogo, uploadTenantLogo } from '../settings/actions';

interface LogoUploaderProps {
  logoUrl: string | null;
}

const LOGO_SIZE = 512; // px - saída quadrada padronizada
const MAX_INPUT_BYTES = 5 * 1024 * 1024; // bucket aceita até 5MiB
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export function LogoUploader({ logoUrl }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(logoUrl);
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

  // Dois formatos do mesmo recorte: webp (storage/página pública, menor) e jpeg
  // (foto do perfil do WhatsApp - a Meta não aceita webp; fundo branco no jpeg
  // evita que transparência do PNG/WebP vire preto).
  async function handleCropped(blobs: Blob[]) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', new File([blobs[0]], 'logo.webp', { type: 'image/webp' }));
      fd.set('jpeg', new File([blobs[1]], 'logo.jpg', { type: 'image/jpeg' }));
      const result = await uploadTenantLogo(fd);
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
          outputs={[
            { format: 'image/webp', maxWidth: LOGO_SIZE, quality: 0.9 },
            { format: 'image/jpeg', maxWidth: LOGO_SIZE, quality: 0.9, background: '#ffffff' },
          ]}
          title="Ajustar logo"
          onCancel={() => setPendingFile(null)}
          onCropped={handleCropped}
        />
      )}
      <span className="text-sm font-medium">Logo</span>
      <div className="flex items-center gap-4">
        <div className="bg-muted flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa (Supabase Storage), tamanho fixo
            <img src={preview} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="text-muted-foreground h-7 w-7" />
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
                  {preview ? 'Trocar' : 'Enviar logo'}
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
                  if (!window.confirm('Remover a logo do estabelecimento?')) return;
                  startRemove(() =>
                    removeTenantLogo().then((r) => {
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
            JPG, PNG ou WebP até 5 MB. Você recorta pra ficar quadrada (512×512).
          </p>
        </div>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
