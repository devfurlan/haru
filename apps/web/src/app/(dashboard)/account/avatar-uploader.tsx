'use client';

import { Loader2, Upload, User as UserIcon } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';

import { removeUserAvatar, uploadUserAvatar } from '../settings/actions';

interface AvatarUploaderProps {
  avatarUrl: string | null;
}

const AVATAR_SIZE = 128; // px - saída quadrada reduzida; cobre o maior uso (~80px) com folga de retina
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

// Recorta no centro pra quadrado e devolve um webp reduzido (menor que o original).
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
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Não foi possível processar a imagem'));
      ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem'))),
        'image/webp',
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Imagem inválida'));
    };
    img.src = url;
  });
}

export function AvatarUploader({ avatarUrl }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
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
      const webp = await toSquareWebp(file);
      const fd = new FormData();
      fd.set('file', new File([webp], 'avatar.webp', { type: 'image/webp' }));
      const result = await uploadUserAvatar(fd);
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
                  if (!window.confirm('Remover sua foto de perfil?')) return;
                  startRemove(() =>
                    removeUserAvatar().then((r) => {
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
            JPG, PNG ou WebP até 5 MB. Recortamos no centro pra ficar quadrada.
          </p>
        </div>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
