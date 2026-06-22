'use client';

import { ImageIcon, Loader2, Upload } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';

import { removeTenantLogo, uploadTenantLogo } from '../settings/actions';

interface LogoUploaderProps {
  logoUrl: string | null;
}

const LOGO_SIZE = 512; // px — saída quadrada padronizada
const MAX_INPUT_BYTES = 5 * 1024 * 1024; // bucket aceita até 5MiB
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

// Redimensiona pra quadrado (center-crop) e devolve um Blob webp.
function toSquareWebp(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = LOGO_SIZE;
      canvas.height = LOGO_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível processar a imagem'));
        return;
      }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, LOGO_SIZE, LOGO_SIZE);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem'))),
        'image/webp',
        0.9,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Imagem inválida'));
    };
    img.src = url;
  });
}

export function LogoUploader({ logoUrl }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(logoUrl);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, startRemove] = useTransition();

  async function handleFile(file: File) {
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError('Use uma imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError('Imagem muito grande (máx. 5 MB).');
      return;
    }

    setUploading(true);
    try {
      const blob = await toSquareWebp(file);

      const fd = new FormData();
      fd.set('file', new File([blob], 'logo.webp', { type: 'image/webp' }));
      const result = await uploadTenantLogo(fd);
      if ('error' in result) {
        setError(result.error);
        return;
      }

      setPreview(`${result.logoUrl}?t=${Date.now()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
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
              if (file) void handleFile(file);
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
            JPG, PNG ou WebP até 5 MB. Recortamos no centro pra ficar quadrada (512×512).
          </p>
        </div>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
