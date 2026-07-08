'use client';

import { ImagePlus, Loader2, Star, X } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';

import { cn } from '@/lib/utils';

import { removeCoverImage, setCoverMain, uploadCoverImage, type CoverResult } from './actions';

const MAX_COVERS = 5;
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 1600;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

// Redimensiona preservando o aspecto (cap no lado maior) e devolve webp. Diferente da
// logo (que é center-crop quadrado): a capa mantém o enquadramento do dono; o carrossel
// faz object-cover na exibição.
function toWebp(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível processar a imagem'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem'))),
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

export function CoverUploader({
  covers,
  onChange,
}: {
  covers: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function apply(result: CoverResult) {
    if ('error' in result) setError(result.error);
    else onChange(result.urls);
  }

  async function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED.includes(file.type)) return setError('Use uma imagem JPG, PNG ou WebP.');
    if (file.size > MAX_INPUT_BYTES) return setError('Imagem muito grande (máx. 5 MB).');

    setUploading(true);
    try {
      const webp = await toWebp(file);
      const fd = new FormData();
      fd.set('file', new File([webp], 'cover.webp', { type: 'image/webp' }));
      apply(await uploadCoverImage(fd));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-ink-70">Fotos de capa</span>
        <span className="text-xs font-medium text-ink-30">· até 5, viram carrossel na página</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {covers.map((u, i) => (
          <div
            key={u}
            className="group relative aspect-video overflow-hidden rounded-xl border border-edge bg-cream-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-green-deep px-2 py-0.5 text-[10px] font-bold text-cream">
                <Star className="size-2.5 fill-current" /> Principal
              </span>
            )}
            <div className="absolute inset-x-1 bottom-1 flex gap-1">
              {i !== 0 && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(() => setCoverMain(u).then(apply))}
                  className="flex-1 rounded-md bg-paper/90 px-2 py-1 text-[11px] font-semibold text-ink-70 backdrop-blur hover:bg-paper"
                >
                  Tornar principal
                </button>
              )}
              <button
                type="button"
                aria-label="Remover foto"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm('Remover esta foto de capa?')) return;
                  startTransition(() => removeCoverImage(u).then(apply));
                }}
                className="rounded-md bg-paper/90 p-1 text-coral-deep backdrop-blur hover:bg-paper"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        ))}

        {covers.length < MAX_COVERS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              'flex aspect-video flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-edge bg-cream-2 text-ink-50 transition-colors hover:bg-cream',
              uploading && 'pointer-events-none opacity-70',
            )}
          >
            {uploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="size-5" />
                <span className="text-[11px] font-semibold">Adicionar foto</span>
              </>
            )}
          </button>
        )}
      </div>

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
      <p className="text-[11px] text-ink-50">
        A principal (★) abre o carrossel na página e no app. JPG, PNG ou WebP até 5 MB.
      </p>
      {error && <p className="text-sm text-coral-deep">{error}</p>}
    </div>
  );
}
