'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cropToBlobs, type CropOutput } from '@/lib/crop-image';

export type { CropOutput };

type Props = {
  /** Arquivo escolhido pelo usuário; o dialog abre enquanto for != null. */
  file: File;
  /** Proporção travada do recorte (1 = quadrado, 16/9 = capa). */
  aspect: number;
  /** Formatos/tamanhos gerados; devolvidos a onCropped na mesma ordem. */
  outputs: CropOutput[];
  title?: string;
  description?: string;
  /** 'round' mostra máscara circular (avatares). A saída continua retangular. */
  cropShape?: 'rect' | 'round';
  confirmLabel?: string;
  onCancel: () => void;
  /** Recebe os blobs recortados; deve fazer o upload e então o pai fecha o dialog. */
  onCropped: (blobs: Blob[]) => void | Promise<void>;
};

export function ImageCropDialog({
  file,
  aspect,
  outputs,
  title = 'Ajustar foto',
  description = 'Arraste pra reposicionar e use o zoom. O recorte segue o formato onde a foto aparece.',
  cropShape = 'rect',
  confirmLabel = 'Salvar',
  onCancel,
  onCropped,
}: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  async function confirm() {
    if (!imageSrc || !area) return;
    setBusy(true);
    setError(null);
    try {
      const blobs = await cropToBlobs(imageSrc, area, outputs);
      await onCropped(blobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao recortar a imagem');
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o && !busy) onCancel();
      }}
    >
      <DialogContent dismissable={false} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="relative h-[min(55vh,360px)] w-full overflow-hidden rounded-xl bg-neutral-900">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={cropShape === 'rect'}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onComplete}
              minZoom={1}
              maxZoom={4}
              zoomSpeed={0.2}
              restrictPosition
            />
          ) : null}
        </div>

        <label className="flex items-center gap-3">
          <span className="text-muted-foreground w-10 text-xs">Zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="accent-primary h-1 flex-1 cursor-pointer"
            aria-label="Zoom"
          />
        </label>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" size="sm" disabled={busy || !area} onClick={confirm}>
            {busy ? (
              <>
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                Processando…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
