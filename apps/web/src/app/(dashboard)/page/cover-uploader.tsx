'use client';

import { ImagePlus, Loader2, Star, X } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';

import { ImageCropDialog } from '@/components/image-crop-dialog';
import { cn } from '@/lib/utils';

import { removeCoverImage, setCoverMain, uploadCoverImage, type CoverResult } from './actions';

const MAX_COVERS = 5;
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 1600;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export function CoverUploader({
  covers,
  onChange,
}: {
  covers: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function apply(result: CoverResult) {
    if ('error' in result) setError(result.error);
    else onChange(result.urls);
  }

  function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED.includes(file.type)) return setError('Use uma imagem JPG, PNG ou WebP.');
    if (file.size > MAX_INPUT_BYTES) return setError('Imagem muito grande (máx. 5 MB).');
    setPendingFile(file);
  }

  // Recorte 16:9 (a capa é exibida em aspect-video no carrossel da página e do app).
  async function handleCropped(blobs: Blob[]) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', new File([blobs[0]], 'cover.webp', { type: 'image/webp' }));
      apply(await uploadCoverImage(fd));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload');
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {pendingFile && (
        <ImageCropDialog
          file={pendingFile}
          aspect={16 / 9}
          outputs={[{ format: 'image/webp', maxWidth: MAX_SIDE, quality: 0.85 }]}
          title="Ajustar foto de capa"
          onCancel={() => setPendingFile(null)}
          onCropped={handleCropped}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink-70 text-xs font-semibold">Fotos de capa</span>
        <span className="text-ink-30 text-xs font-medium">· até 5, viram carrossel na página</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {covers.map((u, i) => (
          <div
            key={u}
            className="border-edge bg-cream-2 group relative aspect-video overflow-hidden rounded-xl border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="bg-green-deep text-cream absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold">
                <Star className="size-2.5 fill-current" /> Principal
              </span>
            )}
            <div className="absolute inset-x-1 bottom-1 flex gap-1">
              {i !== 0 && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(() => setCoverMain(u).then(apply))}
                  className="bg-paper/90 text-ink-70 hover:bg-paper flex-1 rounded-md px-2 py-1 text-[11px] font-semibold backdrop-blur"
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
                className="bg-paper/90 text-coral-deep hover:bg-paper rounded-md p-1 backdrop-blur"
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
              'border-edge bg-cream-2 text-ink-50 hover:bg-cream flex aspect-video flex-col items-center justify-center gap-1 rounded-xl border border-dashed transition-colors',
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
          e.target.value = '';
          if (file) handleFile(file);
        }}
      />
      <p className="text-ink-50 text-[11px]">
        A principal (★) abre o carrossel na página e no app. JPG, PNG ou WebP até 5 MB.
      </p>
      {error && <p className="text-coral-deep text-sm">{error}</p>}
    </div>
  );
}
