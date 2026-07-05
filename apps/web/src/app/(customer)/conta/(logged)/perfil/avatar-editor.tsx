'use client';

import { Camera } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';

import { removeCustomerAvatar, updateAvatar } from '@/app/(customer)/actions';

// Recorta em quadrado (centro), reduz para `size`px e gera JPEG - o server só persiste
// os bytes (assume imagem já reduzida). Substitui o expo-image-manipulator do app.
function resizeToJpeg(file: File, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas'));
      const min = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), 'image/jpeg', 0.8);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error('img'));
    };
    img.src = objUrl;
  });
}

export function AvatarEditor({
  name,
  subtitle,
  avatarUrl,
}: {
  name: string;
  subtitle?: string;
  avatarUrl: string | null;
}) {
  const [url, setUrl] = useState(avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startRemove] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const blob = await resizeToJpeg(file, 256);
      const fd = new FormData();
      fd.append('file', blob, 'avatar.jpg');
      const res = await updateAvatar(fd);
      if ('error' in res) setError(res.error);
      else setUrl(res.avatarUrl);
    } catch {
      setError('Não foi possível processar a imagem.');
    } finally {
      setBusy(false);
    }
  }

  function onRemove() {
    setUrl(null);
    startRemove(async () => {
      await removeCustomerAvatar();
    });
  }

  return (
    <div className="flex items-center gap-[15px]">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Trocar foto de perfil"
        className="relative transition-transform active:scale-[0.97]"
      >
        <span className="bg-green-deep flex h-[66px] w-[66px] items-center justify-center overflow-hidden rounded-[22px]">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-green-bright font-serif text-[28px] font-semibold">{initial}</span>
          )}
          {busy ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-xs text-white">
              …
            </span>
          ) : null}
        </span>
        <span className="border-cream bg-green-bright absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2">
          <Camera className="text-green-deep h-3.5 w-3.5" />
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-ink truncate font-serif text-xl">{name || 'Minha conta'}</p>
        {subtitle ? <p className="text-sub mt-0.5 truncate text-[13px]">{subtitle}</p> : null}
        {url ? (
          <button type="button" onClick={onRemove} className="text-sub mt-0.5 text-[12px] underline">
            Remover foto
          </button>
        ) : null}
        {error ? <p className="text-destructive mt-0.5 text-xs">{error}</p> : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onPick}
        className="hidden"
      />
    </div>
  );
}
